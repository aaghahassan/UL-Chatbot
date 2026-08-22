/**
 * Retrieves only the knowledge sections relevant to a user question.
 */

import { expandQueryForMatching } from "./chat-language";

export type KnowledgeSectionRow = {
  sectionKey: string;
  title: string;
  data: unknown;
};

const TOPIC_KEYWORDS: Record<string, string[]> = {
  campuses: [
    "campus", "campuses", "map", "location", "address", "where", "reach", "direction",
    "katchehry", "kachehry", "katchery", "karor", "hafiz", "coordinates", "visit",
    "city campus", "main campus", "how to get", "near",
  ],
  department_locations: [
    "computer science", "cs department", "bs cs", "bscs", "information technology",
    "computer engineering", "where is", "located", "department location", "main campus",
    "computing building", "faculty of computing",
  ],
  admissions: [
    "admission", "apply", "application", "eligibility", "merit", "how to apply",
    "documents", "entry", "enroll", "registration", "portal", "eportal", "quota",
  ],
  fee_structure: ["fee", "fees", "tuition", "challan", "payment", "cost", "price", "expensive", "fee structure"],
  scholarships: ["scholarship", "peef", "hec", "need based", "financial aid", "stipend"],
  faculties: [
    "faculty", "faculties", "department", "program", "degree", "bs ", "bba", "b.sc",
    "msc", "course", "computer", "ai", "agriculture", "veterinary", "psychology",
    "english", "chemistry", "physics", "math", "erozgaar", "post-adp", "dairy",
    "all programs", "list programs", "what programs",
  ],
  programs: [
    "program", "programs", "bs", "bba", "offer", "study", "major", "discipline",
    "artificial intelligence", "data science", "engineering", "bsai", "bsds",
  ],
  teaching_staff: [
    "teacher", "professor", "assistant professor", "associate professor", "dean",
    "hod", "incharge", "program incharge", "lecturer", "staff", "faculty member",
    "dr.", "who is", "qayoom", "amjad", "nasrullah",
  ],
  laboratories: [
    "lab", "labs", "laboratory", "computing lab", "dld", "erozgaar lab", "computer lab",
  ],
  libraries: ["library", "libraries", "central library", "books"],
  transport: [
    "bus", "buses", "transport", "route", "timing", "schedule", "lari ada",
    "pick", "drop", "shuttle", "08:00", "city route",
  ],
  announcements: [
    "news", "announcement", "latest", "update", "story", "mou", "syndicate", "event",
    "notice", "tender",
  ],
  contact_information: [
    "contact", "phone", "email", "call", "office", "hours", "info@", "number", "helpline",
  ],
  campus_facilities: [
    "facility", "facilities", "medical", "hostel", "wifi", "cafeteria", "day care",
  ],
  academic_system: ["semester", "gpa", "grading", "cgpa", "credit", "assessment", "marks"],
  examination_guidelines: [
    "exam", "examination", "attendance", "mid", "final", "cheat", "id card", "rules",
  ],
  student_life: ["student", "society", "conduct", "ragging", "dress", "rules", "life"],
  visitor_guide: ["visitor", "parent", "tour", "guide", "new student", "help"],
  university: ["university", "about", "ul", "history", "overview", "hec", "layyah", "layyeh"],
  vision_mission: ["vision", "mission", "motto", "vc", "vice chancellor", "values"],
  administration: ["vc", "registrar", "administration", "officer", "chancellor", "oric"],
  website_stats: ["students", "departments", "statistics", "how many", "count"],
};

/** Factual queries answered by the professional composer (skip LLM dump risk). */
export function isFactualFastQuery(query: string): boolean {
  const q = normalize(expandQueryForMatching(query));
  const keys = [
    "bus", "transport", "route", "timing", "schedule",
    "lab", "library", "fee", "dean", "incharge", "hod", "professor", "teacher", "staff",
    "where is", "located", "computer science", "campus",
    "program", "programs", "facult", "department",
    "admission", "scholarship", "contact", "phone", "email",
    "vision", "mission", "about", "announcement", "news",
    "attendance", "exam", "list all", "what programs", "offer",
  ];
  return keys.some((k) => q.includes(k));
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function scoreSection(query: string, key: string, title: string, data: unknown): number {
  const q = normalize(expandQueryForMatching(query));
  let score = 0;

  const keywords = TOPIC_KEYWORDS[key] ?? [];
  for (const kw of keywords) {
    if (q.includes(kw)) score += kw.length > 6 ? 3 : 2;
  }

  const titleNorm = normalize(title);
  for (const word of titleNorm.split(" ")) {
    if (word.length > 3 && q.includes(word)) score += 2;
  }

  const blob = normalize(JSON.stringify(data ?? {})).slice(0, 6000);
  for (const token of q.split(/[^a-z0-9]+/).filter((t) => t.length > 3)) {
    if (blob.includes(token)) score += 1;
  }

  if (key === "university" || key === "contact_information") score += 0.25;
  if ((q.includes("computer science") || q.includes("bscs")) && key === "department_locations") {
    score += 8;
  }
  if (
    (q.includes("program") || q.includes("facult") || q.includes("department")) &&
    (key === "faculties" || key === "programs")
  ) {
    score += 6;
  }
  // Avoid dumping overview/visitor sections for program questions
  if (
    (q.includes("program") || q.includes("facult")) &&
    (key === "university" || key === "visitor_guide" || key === "vision_mission")
  ) {
    score -= 4;
  }
  return score;
}

export function retrieveRelevantKnowledge(
  query: string,
  sections: KnowledgeSectionRow[],
  options?: { maxSections?: number },
): { selected: KnowledgeSectionRow[]; kbJson: string } {
  const maxSections = options?.maxSections ?? 4;

  const ranked = sections
    .map((s) => ({
      section: s,
      score: scoreSection(query, s.sectionKey, s.title, s.data),
    }))
    .sort((a, b) => b.score - a.score);

  const selected: KnowledgeSectionRow[] = [];
  const seen = new Set<string>();

  for (const row of ranked) {
    if (row.score <= 0) continue;
    if (selected.length >= maxSections) break;
    selected.push(row.section);
    seen.add(row.section.sectionKey);
  }

  if (selected.length === 0) {
    for (const key of ["university", "faculties", "contact_information"]) {
      const hit = sections.find((s) => s.sectionKey === key);
      if (hit && !seen.has(key)) {
        selected.push(hit);
        seen.add(key);
      }
    }
  }

  const kb: Record<string, unknown> = {};
  for (const s of selected) {
    kb[s.sectionKey] = compactValue(s.data);
  }

  return {
    selected,
    // Compact JSON = fewer tokens = faster cloud replies, avoids Groq payload limits
    kbJson: JSON.stringify(kb),
  };
}

/** Keep prompts small so Groq/Cerebras never hit compression / TPM failures. */
function compactValue(value: unknown, depth = 0): unknown {
  if (Array.isArray(value)) {
    const max = depth === 0 ? 24 : 12;
    return value.slice(0, max).map((item) => compactValue(item, depth + 1));
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      out[key] = compactValue(nested, depth + 1);
    }
    return out;
  }
  if (typeof value === "string" && value.length > 600) {
    return `${value.slice(0, 597)}...`;
  }
  return value;
}

export function buildAssistantSystemPrompt(knowledgeJson: string): string {
  return `You are the official UL AI Assistant for **University of Layyah** (UL), Punjab, Pakistan.

SPELLING LOCK (mandatory):
- Always write "University of Layyah" and "Layyah".
- NEVER write "University of Lahore", "Lahore", "Layyeh", or "Layeh" when referring to this university.

Official website: https://ul.edu.pk

Style (match a professional university helpdesk):
- Warm, concise, and confident - never robotic or overly casual.
- Answer ONLY what was asked. Do not dump unrelated fields or raw database keys.
- FORMAT: start with a short bold heading, then a one-line intro if needed.
- If there are two or more facts, names, programs, campuses, steps, contacts, or options, use Markdown bullets (\`- \`) or numbered steps (\`1.\`). Put each item on its own line.
- Do not bury lists inside a paragraph. Simple one-fact answers may stay as one or two sentences.
- Use **bold** for names and labels. Use ### for sections when grouping (faculty, campus, route).
- For program lists: group by faculty → department → program names only (no staff emails unless asked).
- Do not invent fees; send users to https://ul.edu.pk/page/Fee-Structure (E-Rozgaar is Rs. 7,000).
- End with a short next-step when useful (portal, contact, or page link).

Critical facts:
- Computing (CS, IT, Computer Engineering, AI, Data Science, E-Rozgaar, labs) is at MAIN CAMPUS, not City Campus.
- Central Library is at City Campus.

Knowledge (use only this):
${knowledgeJson}

If information is missing, say so briefly and point to ul.edu.pk / info@ul.edu.pk / +92-0606-920247.`;
}
