import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import path from "path";
import fs from "fs";
import { db, conversations, messages } from "@workspace/db";
import {
  GetGeminiConversationParams,
  DeleteGeminiConversationParams,
  ListGeminiMessagesParams,
  SendGeminiMessageParams,
  SendGeminiMessageBody,
  CreateGeminiConversationBody,
} from "@workspace/api-zod";
import { ai } from "@workspace/integrations-gemini-ai";
import { logger } from "../../lib/logger";

const router: IRouter = Router();

const workspaceRoot = process.cwd().endsWith(path.join("artifacts", "api-server"))
  ? path.resolve(process.cwd(), "../..")
  : process.cwd();

let knowledgeBase: string = "";
try {
  const kbPath = path.resolve(workspaceRoot, "artifacts/api-server/data/university-knowledge.json");
  const raw = fs.readFileSync(kbPath, "utf-8");
  knowledgeBase = JSON.stringify(JSON.parse(raw), null, 2);
} catch (err) {
  logger.warn({ err }, "Could not load university knowledge base");
}

const SYSTEM_PROMPT = `You are the UL AI Assistant — the official AI-powered digital representative of the University of Layyah (UOL), located in Layyah, Punjab, Pakistan.

Your role is to assist prospective students, current students, parents, faculty, and visitors by answering questions about the university accurately and helpfully.

## Knowledge Base
Use the following university information to answer questions accurately:

${knowledgeBase}

## Guidelines
- Always respond in the language the user is writing in (English or Urdu).
- Be warm, professional, and helpful — like a knowledgeable university advisor.
- Provide specific, accurate information from the knowledge base above.
- If asked about something not in the knowledge base, be honest and suggest the user contact the relevant office directly.
- Keep responses concise but complete. Use bullet points or numbered lists when listing multiple items.
- When answering about fees, always mention that fees are subject to change and the user should confirm with the Accounts Section.
- Never make up information. If you're uncertain, say so clearly.
- Always end responses about admissions by mentioning the Admission Office contact: admissions@uol.edu.pk or +92-606-412340.
- When users ask in Urdu, respond fully in Urdu.
- You are proud to represent University of Layyah and its mission of providing quality education to southern Punjab.`;

router.get("/gemini/conversations", async (req, res): Promise<void> => {
  const result = await db
    .select()
    .from(conversations)
    .orderBy(conversations.createdAt);
  res.json(result);
});

router.post("/gemini/conversations", async (req, res): Promise<void> => {
  const parsed = CreateGeminiConversationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [conv] = await db
    .insert(conversations)
    .values({ title: parsed.data.title })
    .returning();
  res.status(201).json(conv);
});

router.get("/gemini/conversations/:id", async (req, res): Promise<void> => {
  const params = GetGeminiConversationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [conv] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, params.data.id));
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, params.data.id))
    .orderBy(messages.createdAt);
  res.json({ ...conv, messages: msgs });
});

router.delete("/gemini/conversations/:id", async (req, res): Promise<void> => {
  const params = DeleteGeminiConversationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [conv] = await db
    .delete(conversations)
    .where(eq(conversations.id, params.data.id))
    .returning();
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/gemini/conversations/:id/messages", async (req, res): Promise<void> => {
  const params = ListGeminiMessagesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, params.data.id))
    .orderBy(messages.createdAt);
  res.json(msgs);
});

router.post("/gemini/conversations/:id/messages", async (req, res): Promise<void> => {
  const params = SendGeminiMessageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = SendGeminiMessageBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const conversationId = params.data.id;
  const userContent = body.data.content;

  const [conv] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, conversationId));
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  await db.insert(messages).values({
    conversationId,
    role: "user",
    content: userContent,
  });

  const history = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt);

  const chatMessages = history.map((m) => ({
    role: m.role === "assistant" ? "model" as const : "user" as const,
    parts: [{ text: m.content }],
  }));

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  let fullResponse = "";

  try {
    const stream = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents: chatMessages,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        maxOutputTokens: 8192,
      },
    });

    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) {
        fullResponse += text;
        res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
      }
    }

    await db.insert(messages).values({
      conversationId,
      role: "assistant",
      content: fullResponse,
    });

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err }, "Gemini streaming error");
    res.write(`data: ${JSON.stringify({ error: "Failed to generate response. Please try again." })}\n\n`);
    res.end();
  }
});

router.post("/gemini/generate-image", async (req, res): Promise<void> => {
  res.status(501).json({ error: "Image generation not enabled" });
});

export default router;
