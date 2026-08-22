import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, conversations, messages, knowledgeSections } from "@workspace/db";
import {
  GetGeminiConversationParams,
  DeleteGeminiConversationParams,
  ListGeminiMessagesParams,
  SendGeminiMessageParams,
  SendGeminiMessageBody,
  CreateGeminiConversationBody,
  UpdateGeminiConversationParams,
  UpdateGeminiConversationBody,
} from "@workspace/api-zod";
import { logger } from "../../lib/logger";
import {
  retrieveRelevantKnowledge,
  buildAssistantSystemPrompt,
} from "../../lib/retrieve-knowledge";
import { streamAssistantReply, getAiStatus } from "../../lib/chat-provider";
import { resolveChatLanguage, languageSystemHint } from "../../lib/chat-language";
import { requireAuth } from "../../lib/auth";

const router: IRouter = Router();

router.get("/ai/status", async (_req, res): Promise<void> => {
  res.json(await getAiStatus());
});

router.get("/gemini/conversations", requireAuth, async (req, res): Promise<void> => {
  const { desc } = await import("drizzle-orm");
  const result = await db
    .select()
    .from(conversations)
    .where(eq(conversations.userId, req.user!.id))
    .orderBy(desc(conversations.pinned), desc(conversations.createdAt));
  res.json(result);
});

router.post("/gemini/conversations", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateGeminiConversationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [conv] = await db
    .insert(conversations)
    .values({ title: parsed.data.title, userId: req.user!.id })
    .returning();
  res.status(201).json(conv);
});

router.get("/gemini/conversations/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetGeminiConversationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [conv] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, params.data.id), eq(conversations.userId, req.user!.id)));
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

router.delete("/gemini/conversations/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteGeminiConversationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [conv] = await db
    .delete(conversations)
    .where(and(eq(conversations.id, params.data.id), eq(conversations.userId, req.user!.id)))
    .returning();
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  res.sendStatus(204);
});

router.patch("/gemini/conversations/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateGeminiConversationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = UpdateGeminiConversationBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const updates: { title?: string; pinned?: boolean } = {};
  if (body.data.title !== undefined) updates.title = body.data.title;
  if (body.data.pinned !== undefined) updates.pinned = body.data.pinned;
  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }
  const [conv] = await db
    .update(conversations)
    .set(updates)
    .where(and(eq(conversations.id, params.data.id), eq(conversations.userId, req.user!.id)))
    .returning();
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  res.json(conv);
});

router.get("/gemini/conversations/:id/messages", requireAuth, async (req, res): Promise<void> => {
  const params = ListGeminiMessagesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [conv] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, params.data.id), eq(conversations.userId, req.user!.id)));
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, params.data.id))
    .orderBy(messages.createdAt);
  res.json(msgs);
});

router.post("/gemini/conversations/:id/messages", requireAuth, async (req, res): Promise<void> => {
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
  const language = resolveChatLanguage(
    (req.body as { language?: string } | undefined)?.language,
    userContent,
  );

  const [conv] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, conversationId), eq(conversations.userId, req.user!.id)));
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

  // Keep prompt small: last 8 turns only
  const recent = history.slice(-8).map((m) => ({
    role: (m.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
    content: m.content,
  }));

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  let fullResponse = "";

  try {
    const sections = await db.select().from(knowledgeSections);
    const mapped = sections.map((s) => ({
      sectionKey: s.sectionKey,
      title: s.title,
      data: s.data,
    }));
    const { selected, kbJson } = retrieveRelevantKnowledge(userContent, mapped, {
      maxSections: 4,
    });
    const systemPrompt =
      buildAssistantSystemPrompt(kbJson) + languageSystemHint(language);

    const used = await streamAssistantReply({
      systemPrompt,
      history: recent,
      retrievedSections: selected,
      allSections: mapped,
      userQuery: userContent,
      language,
      onToken: (token) => {
        fullResponse += token;
        res.write(`data: ${JSON.stringify({ content: token })}\n\n`);
      },
    });

    if (!fullResponse.trim()) {
      fullResponse =
        "I could not generate a reply right now. Please try again. For fast free chat, add a Cerebras API key (HOW-TO-RUN.md).";
      res.write(`data: ${JSON.stringify({ content: fullResponse })}\n\n`);
    }

    await db.insert(messages).values({
      conversationId,
      role: "assistant",
      content: fullResponse,
    });

    logger.info({ provider: used, sections: selected.map((s) => s.sectionKey) }, "Chat reply generated");
    res.write(`data: ${JSON.stringify({ done: true, provider: used })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err }, "Chat streaming error");
    const msg =
      "Failed to generate a response. Offline knowledge mode should still answer many questions. For Gemini-quality speed, add a free Cerebras key (HOW-TO-RUN.md).";
    res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
    res.end();
  }
});

router.post("/gemini/generate-image", async (_req, res): Promise<void> => {
  res.status(501).json({ error: "Image generation not enabled" });
});

export default router;
