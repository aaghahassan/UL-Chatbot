import { logger } from "./logger";
import { type KnowledgeSectionRow } from "./retrieve-knowledge";
import {
  composeProfessionalAnswer,
  enforceLayyahSpelling,
} from "./compose-answer";
import { renderAnswerInLanguage, type ChatLanguage } from "./chat-language";

export type ChatTurn = { role: "user" | "assistant"; content: string };

export type StreamChatArgs = {
  systemPrompt: string;
  history: ChatTurn[];
  onToken: (token: string) => void;
  userQuery?: string;
  /** Full KB rows — preferred for professional local answers */
  allSections?: KnowledgeSectionRow[];
  language?: ChatLanguage;
};

export type ChatProvider =
  | "cerebras"
  | "groq"
  | "gemini"
  | "ollama"
  | "local";

type OpenAICompatConfig = {
  name: "cerebras" | "groq";
  baseUrl: string;
  apiKey: string;
  model: string;
};

function isUsableKey(value: string | undefined): value is string {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  const placeholders = [
    "your_gemini_api_key_here",
    "your_cerebras_api_key_here",
    "your_groq_api_key_here",
    "changeme",
  ];
  return !placeholders.includes(trimmed.toLowerCase());
}

let cloudBlockedUntil = 0;
let cloudBlockReason = "";

function isCloudBlocked(): boolean {
  return Date.now() < cloudBlockedUntil;
}

function rememberCloudFailure(provider: string, err: unknown): void {
  const msg = String((err as Error)?.message || err);
  if (
    /402|payment_required|quota|429|rate limit/i.test(msg)
  ) {
    cloudBlockedUntil = Date.now() + 30 * 60 * 1000;
    cloudBlockReason = provider;
    logger.warn({ provider }, "Cloud AI quota/payment blocked — using university knowledge desk");
  }
}

function getPreferredProvider(): ChatProvider | "auto" {
  const raw = (process.env.AI_PROVIDER || "auto").toLowerCase().trim();
  if (raw === "cerebras") return "cerebras";
  if (raw === "groq" || raw === "gorq") return "groq";
  if (raw === "gemini" || raw === "google") return "gemini";
  if (raw === "ollama") return "ollama";
  if (raw === "local" || raw === "offline" || raw === "kb") return "local";
  return "auto";
}

function cerebrasConfig(): OpenAICompatConfig | null {
  const apiKey = process.env.CEREBRAS_API_KEY;
  if (!isUsableKey(apiKey)) return null;
  return {
    name: "cerebras",
    baseUrl: (process.env.CEREBRAS_BASE_URL || "https://api.cerebras.ai/v1").replace(
      /\/$/,
      "",
    ),
    apiKey,
    model: process.env.CEREBRAS_MODEL || "gpt-oss-120b",
  };
}

function groqConfig(): OpenAICompatConfig | null {
  const apiKey = process.env.GROQ_API_KEY;
  if (!isUsableKey(apiKey)) return null;
  return {
    name: "groq",
    baseUrl: (process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1").replace(
      /\/$/,
      "",
    ),
    apiKey,
    // 70B is professional; 8B-instant is faster but weaker. Override with GROQ_MODEL.
    model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
  };
}

function hasGemini(): boolean {
  return isUsableKey(
    process.env.GEMINI_API_KEY || process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  );
}

async function isOllamaUp(baseUrl: string): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl}/api/tags`, {
      signal: AbortSignal.timeout(1500),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function ollamaBaseUrl(): string {
  return (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(
    /\/$/,
    "",
  );
}

/** Kept for optional local Ollama; cloud providers do not need warm-up. */
export async function warmOllama(): Promise<void> {
  if (getPreferredProvider() !== "ollama") return;
  const baseUrl = ollamaBaseUrl();
  const model = process.env.OLLAMA_MODEL || "llama3.2";
  if (!(await isOllamaUp(baseUrl))) return;
  try {
    await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt: "hi",
        stream: false,
        keep_alive: "30m",
        options: { num_predict: 1 },
      }),
      signal: AbortSignal.timeout(120000),
    });
    logger.info({ model }, "Ollama model warmed");
  } catch (err) {
    logger.warn({ err }, "Ollama warm-up skipped");
  }
}

function buildChatMessages(args: StreamChatArgs): Array<{
  role: "system" | "user" | "assistant";
  content: string;
}> {
  const recent = args.history.slice(-6);
  return [
    { role: "system", content: args.systemPrompt },
    ...recent.map((m) => ({
      role: (m.role === "assistant" ? "assistant" : "user") as
        | "assistant"
        | "user",
      content: m.content,
    })),
  ];
}

/**
 * Stream an OpenAI-compatible chat API (Cerebras / Groq).
 * Accept-Encoding: identity avoids gzip-compressed SSE that previously
 * truncated Groq replies ("data compression" issue).
 */
async function streamOpenAICompatible(
  config: OpenAICompatConfig,
  args: StreamChatArgs,
): Promise<void> {
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
      Accept: "text/event-stream",
      "Accept-Encoding": "identity",
    },
    body: JSON.stringify({
      model: config.model,
      messages: buildChatMessages(args),
      stream: true,
      temperature: 0.2,
      max_tokens: Number(process.env.AI_MAX_TOKENS || 800),
    }),
    signal: AbortSignal.timeout(45000),
  });

  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `${config.name} error ${response.status}: ${text || response.statusText}`,
    );
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let carry = "";

  const flushCarry = (force: boolean) => {
    if (!carry) return;
    if (!force && carry.length <= 48) return;
    const flush = force ? carry : carry.slice(0, -24);
    const keep = force ? "" : carry.slice(-24);
    if (flush) args.onToken(enforceLayyahSpelling(flush));
    carry = keep;
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(":")) continue;
      const payload = trimmed.startsWith("data:")
        ? trimmed.slice(5).trim()
        : trimmed;
      if (!payload || payload === "[DONE]") continue;
      try {
        const json = JSON.parse(payload);
        const token =
          json?.choices?.[0]?.delta?.content ??
          json?.choices?.[0]?.message?.content ??
          "";
        if (!token) continue;
        carry += token;
        flushCarry(false);
      } catch {
        // ignore partial JSON
      }
    }
  }
  flushCarry(true);
}

async function streamOllama(args: StreamChatArgs): Promise<void> {
  const baseUrl = ollamaBaseUrl();
  const model = process.env.OLLAMA_MODEL || "llama3.2";

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: buildChatMessages(args),
      stream: true,
      keep_alive: "30m",
      options: {
        temperature: 0.1,
        num_predict: Number(process.env.OLLAMA_NUM_PREDICT || 450),
        num_ctx: Number(process.env.OLLAMA_NUM_CTX || 2048),
      },
    }),
  });

  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => "");
    throw new Error(`Ollama error ${response.status}: ${text || response.statusText}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let carry = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const json = JSON.parse(trimmed);
        const token = json?.message?.content;
        if (!token) continue;
        carry += token;
        if (carry.length > 48) {
          const flush = carry.slice(0, -24);
          const keep = carry.slice(-24);
          args.onToken(enforceLayyahSpelling(flush));
          carry = keep;
        }
      } catch {
        // ignore
      }
    }
  }
  if (carry) args.onToken(enforceLayyahSpelling(carry));
}

async function streamGemini(args: StreamChatArgs): Promise<void> {
  const { ai } = await import("@workspace/integrations-gemini-ai");
  const contents = args.history.slice(-6).map((m) => ({
    role: m.role === "assistant" ? ("model" as const) : ("user" as const),
    parts: [{ text: m.content }],
  }));

  const stream = await ai.models.generateContentStream({
    model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
    contents,
    config: {
      systemInstruction: args.systemPrompt,
      maxOutputTokens: 1024,
    },
  });

  for await (const chunk of stream) {
    const text = chunk.text;
    if (text) args.onToken(enforceLayyahSpelling(text));
  }
}

export function answerFromKnowledgeLocal(
  query: string,
  sections: KnowledgeSectionRow[],
  language: ChatLanguage = "en",
): string {
  return renderAnswerInLanguage(composeProfessionalAnswer(query, sections), language);
}

async function streamLocal(
  args: StreamChatArgs,
  sections: KnowledgeSectionRow[],
): Promise<void> {
  const lastUser =
    args.userQuery ||
    [...args.history].reverse().find((m) => m.role === "user")?.content ||
    "";
  const kb = args.allSections?.length ? args.allSections : sections;
  const text = answerFromKnowledgeLocal(lastUser, kb, args.language || "en");
  const chunkSize = 400;
  for (let i = 0; i < text.length; i += chunkSize) {
    args.onToken(text.slice(i, i + chunkSize));
  }
}

function cloudQueue(preferred: ChatProvider | "auto"): Array<
  | { kind: "openai"; config: OpenAICompatConfig }
  | { kind: "gemini" }
  | { kind: "ollama" }
> {
  const cerebras = cerebrasConfig();
  const groq = groqConfig();
  const queue: Array<
    | { kind: "openai"; config: OpenAICompatConfig }
    | { kind: "gemini" }
    | { kind: "ollama" }
  > = [];

  const pushOpenAI = (cfg: OpenAICompatConfig | null) => {
    if (cfg) queue.push({ kind: "openai", config: cfg });
  };

  if (preferred === "cerebras") {
    pushOpenAI(cerebras);
    pushOpenAI(groq);
    if (hasGemini()) queue.push({ kind: "gemini" });
  } else if (preferred === "groq") {
    pushOpenAI(groq);
    pushOpenAI(cerebras);
    if (hasGemini()) queue.push({ kind: "gemini" });
  } else if (preferred === "gemini") {
    if (hasGemini()) queue.push({ kind: "gemini" });
    pushOpenAI(cerebras);
    pushOpenAI(groq);
  } else if (preferred === "ollama") {
    queue.push({ kind: "ollama" });
    pushOpenAI(cerebras);
    pushOpenAI(groq);
    if (hasGemini()) queue.push({ kind: "gemini" });
  } else {
    // auto: fastest professional cloud first, never Ollama unless asked
    pushOpenAI(cerebras);
    pushOpenAI(groq);
    if (hasGemini()) queue.push({ kind: "gemini" });
  }

  return queue;
}

export async function streamAssistantReply(
  args: StreamChatArgs & { retrievedSections: KnowledgeSectionRow[] },
): Promise<ChatProvider> {
  const preferred = getPreferredProvider();
  const hasCloud = !!(cerebrasConfig() || groqConfig() || hasGemini()) && !isCloudBlocked();

  // Cloud LLMs are fast — let them write Gemini-style answers.
  // Without a working cloud key, use the conversational university desk.
  const forceLocal =
    preferred === "local" ||
    process.env.FORCE_LOCAL_FACTUAL === "1" ||
    isCloudBlocked() ||
    (!hasCloud && process.env.FORCE_LOCAL_FACTUAL !== "0");

  if (forceLocal) {
    await streamLocal(args, args.retrievedSections);
    return "local";
  }

  for (const item of cloudQueue(preferred)) {
    try {
      if (item.kind === "openai") {
        await streamOpenAICompatible(item.config, args);
        return item.config.name;
      }
      if (item.kind === "gemini") {
        await streamGemini(args);
        return "gemini";
      }
      if (item.kind === "ollama") {
        if (!(await isOllamaUp(ollamaBaseUrl()))) {
          logger.warn("Ollama not reachable — skipping");
          continue;
        }
        await streamOllama(args);
        return "ollama";
      }
    } catch (err) {
      rememberCloudFailure(
        item.kind === "openai" ? item.config.name : item.kind,
        err,
      );
      logger.warn(
        { err, provider: item.kind === "openai" ? item.config.name : item.kind },
        "Provider failed — falling back",
      );
    }
  }

  await streamLocal(args, args.retrievedSections);
  return "local";
}

export async function getAiStatus(): Promise<{
  provider: string;
  cerebrasConfigured: boolean;
  groqConfigured: boolean;
  geminiConfigured: boolean;
  ollama: boolean;
  model: string;
  note: string;
}> {
  const preferred = getPreferredProvider();
  const cerebras = cerebrasConfig();
  const groq = groqConfig();
  const geminiConfigured = hasGemini();
  const ollama = await isOllamaUp(ollamaBaseUrl());

  let model = "offline-knowledge";
  let note =
    "Instant factual answers from UL knowledge. Add a free Cerebras key for Gemini-quality chat (see HOW-TO-RUN.md).";

  if (preferred === "local" || isCloudBlocked()) {
    model = "university-desk";
    note = cloudBlockReason
      ? `${cloudBlockReason} quota/payment paused. Answering from official UL knowledge.`
      : "Professional answers from the University of Layyah knowledge base.";
  } else if (cerebras && (preferred === "auto" || preferred === "cerebras")) {
    model = cerebras.model;
    note = "Cerebras gpt-oss-120b — free, ~3000 tok/s, professional answers.";
  } else if (groq && (preferred === "auto" || preferred === "groq")) {
    model = groq.model;
    note = "Groq Llama 3.3 70B — free, very fast, compact RAG (no payload compression).";
  } else if (geminiConfigured && (preferred === "auto" || preferred === "gemini")) {
    model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
    note = "Gemini with compact RAG. Free-tier quota can still run out.";
  } else if (preferred === "ollama") {
    model = process.env.OLLAMA_MODEL || "llama3.2";
    note = ollama
      ? "Local Ollama (slower, smaller model)."
      : "Ollama is not running. Start it or switch to Cerebras.";
  } else if (cerebras) {
    model = cerebras.model;
    note = "Cerebras ready.";
  } else if (groq) {
    model = groq.model;
    note = "Groq ready.";
  }

  return {
    provider: preferred,
    cerebrasConfigured: !!cerebras,
    groqConfigured: !!groq,
    geminiConfigured,
    ollama,
    model,
    note,
  };
}
