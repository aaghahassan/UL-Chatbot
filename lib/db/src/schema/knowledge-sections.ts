import { pgTable, serial, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const knowledgeSections = pgTable("knowledge_sections", {
  id: serial("id").primaryKey(),
  sectionKey: text("section_key").notNull().unique(),
  title: text("title").notNull(),
  data: jsonb("data").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertKnowledgeSectionSchema = createInsertSchema(knowledgeSections).omit({
  id: true,
  updatedAt: true,
});

export const updateKnowledgeSectionSchema = z.object({
  title: z.string().optional(),
  data: z.unknown(),
});

export type KnowledgeSection = typeof knowledgeSections.$inferSelect;
export type InsertKnowledgeSection = z.infer<typeof insertKnowledgeSectionSchema>;
