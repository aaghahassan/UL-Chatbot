import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, knowledgeSections } from "@workspace/db";
import { z } from "zod/v4";

const router: IRouter = Router();

const UpdateSectionBody = z.object({
  title: z.string().min(1),
  data: z.unknown(),
});

router.get("/admin/knowledge-sections", async (req, res): Promise<void> => {
  const result = await db
    .select()
    .from(knowledgeSections)
    .orderBy(knowledgeSections.sectionKey);
  res.json(result);
});

router.get("/admin/knowledge-sections/:key", async (req, res): Promise<void> => {
  const { key } = req.params;
  const [section] = await db
    .select()
    .from(knowledgeSections)
    .where(eq(knowledgeSections.sectionKey, key))
    .limit(1);
  if (!section) {
    res.status(404).json({ error: "Section not found" });
    return;
  }
  res.json(section);
});

router.put("/admin/knowledge-sections/:key", async (req, res): Promise<void> => {
  const { key } = req.params;
  const parsed = UpdateSectionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(knowledgeSections)
    .where(eq(knowledgeSections.sectionKey, key))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Section not found" });
    return;
  }

  const [updated] = await db
    .update(knowledgeSections)
    .set({
      title: parsed.data.title,
      data: parsed.data.data as any,
      updatedAt: new Date(),
    })
    .where(eq(knowledgeSections.sectionKey, key))
    .returning();

  res.json(updated);
});

export default router;
