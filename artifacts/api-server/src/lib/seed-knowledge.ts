import path from "path";
import fs from "fs";
import { eq } from "drizzle-orm";
import { db, knowledgeSections } from "@workspace/db";
import { logger } from "./logger";

const SECTION_TITLES: Record<string, string> = {
  university: "University Overview",
  vision_mission: "Vision & Mission",
  administration: "Administration",
  campuses: "Campuses & Maps",
  faculties: "Faculties & Departments",
  programs: "Programs Overview",
  admissions: "Admissions",
  fee_structure: "Fee Structure",
  scholarships: "Scholarships",
  campus_facilities: "Facilities & Campus Life",
  academic_system: "Academic System",
  examination_guidelines: "Examination Guidelines",
  student_life: "Student Life",
  announcements: "Latest Announcements & News",
  contact_information: "Contact Information",
  visitor_guide: "Visitor & Student Guide",
  live_website_data: "Official Website Snapshot (ul.edu.pk)",
  website_stats: "Live Website Statistics",
  ul_academics_hierarchy: "Official Academics Hierarchy",
  department_locations: "Department Locations",
  teaching_staff: "Deans, HODs & Teaching Staff",
  laboratories: "Laboratories",
  libraries: "Libraries",
  transport: "Bus Timings & Routes",
};

function resolveKnowledgePath(): string {
  const candidates = [
    path.resolve(process.cwd(), "data/university-knowledge.json"),
    path.resolve(process.cwd(), "artifacts/api-server/data/university-knowledge.json"),
    path.resolve(process.cwd(), "../api-server/data/university-knowledge.json"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error("university-knowledge.json not found");
}

export async function seedKnowledgeBase(options?: { force?: boolean }): Promise<void> {
  try {
    const force = options?.force ?? process.env.FORCE_KB_REFRESH === "1";
    const existing = await db.select().from(knowledgeSections).limit(1);

    if (existing.length > 0 && !force) {
      if (process.env.VERCEL === "1") {
        logger.info("Knowledge base already present — skipping seed on Vercel.");
        return;
      }
      logger.info("Knowledge base exists — upserting from official JSON snapshot.");
    }

    const kbPath = resolveKnowledgePath();
    const raw = fs.readFileSync(kbPath, "utf-8");
    const kb = JSON.parse(raw) as Record<string, unknown>;

    for (const [key, data] of Object.entries(kb)) {
      const title =
        SECTION_TITLES[key] ??
        key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

      const [row] = await db
        .select()
        .from(knowledgeSections)
        .where(eq(knowledgeSections.sectionKey, key))
        .limit(1);

      if (row) {
        await db
          .update(knowledgeSections)
          .set({ title, data: data as any, updatedAt: new Date() })
          .where(eq(knowledgeSections.sectionKey, key));
      } else {
        await db.insert(knowledgeSections).values({
          sectionKey: key,
          title,
          data: data as any,
        });
      }
    }

    logger.info({ count: Object.keys(kb).length, path: kbPath }, "Knowledge base seeded/updated from JSON.");
  } catch (err) {
    logger.warn({ err }, "Could not seed knowledge base — continuing with existing data if any.");
  }
}
