import path from "path";
import fs from "fs";
import { db, knowledgeSections } from "@workspace/db";
import { logger } from "./logger";

const SECTION_TITLES: Record<string, string> = {
  university: "University Overview",
  vision_mission: "Vision & Mission",
  administration: "Administration",
  campuses: "Campuses",
  faculties: "Faculties & Programs",
  admissions: "Admissions",
  fees: "Fee Structure",
  scholarships: "Scholarships",
  facilities: "Facilities & Campus Life",
  student_rules_and_regulations: "Student Rules & Regulations",
  events: "Events & Activities",
  contact_info: "Contact Information",
};

export async function seedKnowledgeBase(): Promise<void> {
  try {
    const existing = await db.select().from(knowledgeSections).limit(1);
    if (existing.length > 0) {
      logger.info("Knowledge base already seeded — skipping.");
      return;
    }

    const workspaceRoot = process.cwd().endsWith(path.join("artifacts", "api-server"))
      ? path.resolve(process.cwd(), "../..")
      : process.cwd();

    const kbPath = path.resolve(workspaceRoot, "artifacts/api-server/data/university-knowledge.json");
    const raw = fs.readFileSync(kbPath, "utf-8");
    const kb = JSON.parse(raw);

    const rows = Object.entries(kb).map(([key, data]) => ({
      sectionKey: key,
      title: SECTION_TITLES[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      data: data as any,
    }));

    await db.insert(knowledgeSections).values(rows);
    logger.info({ count: rows.length }, "Knowledge base seeded from JSON.");
  } catch (err) {
    logger.warn({ err }, "Could not seed knowledge base — continuing with JSON fallback.");
  }
}
