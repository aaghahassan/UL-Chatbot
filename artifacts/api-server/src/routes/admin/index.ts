import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, knowledgeSections } from "@workspace/db";

const router: IRouter = Router();

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
  const { title, data } = req.body ?? {};

  if (typeof title !== "string" || title.trim() === "") {
    res.status(400).json({ error: "title is required" });
    return;
  }
  if (data === undefined) {
    res.status(400).json({ error: "data is required" });
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
    .set({ title: title.trim(), data: data as any, updatedAt: new Date() })
    .where(eq(knowledgeSections.sectionKey, key))
    .returning();

  res.json(updated);
});

export default router;
