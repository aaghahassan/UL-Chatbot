import { eq } from "drizzle-orm";
import { db, knowledgeSections } from "@workspace/db";
import { logger } from "./logger";

const SITE_URL = "https://ul.edu.pk/";
const SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function extractStories(html: string): Array<{ title: string; url: string; summary?: string }> {
  const stories: Array<{ title: string; url: string; summary?: string }> = [];
  const seen = new Set<string>();
  const re = /href="(https:\/\/ul\.edu\.pk\/story\/[^"]+)"[^>]*>([^<]+)</gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const url = match[1];
    const title = match[2].trim();
    if (!title || seen.has(url)) continue;
    seen.add(url);
    stories.push({ title, url });
  }
  return stories.slice(0, 12);
}

function extractCounter(html: string, label: string): number | null {
  const re = new RegExp(
    `data-to="(\\d+)"[\\s\\S]{0,120}${label.replace(/\s+/g, "\\s+")}`,
    "i",
  );
  const m = html.match(re);
  if (m) return Number(m[1]);
  return null;
}

function extractContact(plain: string): { email?: string; phone?: string; address?: string } {
  const email = plain.match(/[\w.+-]+@ul\.edu\.pk/i)?.[0];
  const phone = plain.match(/\+?92?\s*0?606[\s-]?920\d{3}/)?.[0];
  const address = plain.includes("Katchehry")
    ? "Katchehry Road, Layyah"
    : plain.includes("Kachehry")
      ? "Kachehry Road, Layyah"
      : undefined;
  return { email, phone, address };
}

function extractAcademicsMenu(html: string): {
  raw_menu_text: string;
  program_names: string[];
  hierarchy: Array<{
    name: string;
    url: string;
    departments: Array<{
      name: string;
      url: string;
      programs: Array<{ name: string; url: string }>;
    }>;
  }>;
} {
  const decode = (s: string) =>
    s
      .replace(/&amp;/g, "&")
      .replace(/&nbsp;/g, " ")
      .replace(/&#039;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, " ")
      .trim();

  const facBlocks: Array<{ url: string; name: string; index: number }> = [];
  const facRe =
    /href="(https:\/\/ul\.edu\.pk\/faculty-detail\/[^"]+)"[^>]*>[\s\S]*?<span>([^<]+)<\/span>/gi;
  let fm: RegExpExecArray | null;
  const seenFac = new Set<string>();
  while ((fm = facRe.exec(html)) !== null) {
    if (seenFac.has(fm[1])) continue;
    seenFac.add(fm[1]);
    facBlocks.push({ url: fm[1], name: decode(fm[2]), index: fm.index });
  }

  const hierarchy: Array<{
    name: string;
    url: string;
    departments: Array<{
      name: string;
      url: string;
      programs: Array<{ name: string; url: string }>;
    }>;
  }> = [];

  for (let i = 0; i < facBlocks.length; i++) {
    const start = facBlocks[i].index;
    const end = i + 1 < facBlocks.length ? facBlocks[i + 1].index : html.length;
    const block = html.slice(start, Math.min(end, start + 50000));
    const departments: Array<{
      name: string;
      url: string;
      programs: Array<{ name: string; url: string }>;
    }> = [];
    const depRe =
      /data-department-id="(\d+)"[\s\S]*?href="(https:\/\/ul\.edu\.pk\/department-detail\/[^"]+)"[\s\S]*?<span>([^<]+)<\/span>[\s\S]*?<ul class="dropdown-menu[^"]*menu-program"[^>]*>([\s\S]*?)<\/ul>/gi;
    let dm: RegExpExecArray | null;
    const seenDep = new Set<string>();
    while ((dm = depRe.exec(block)) !== null) {
      if (seenDep.has(dm[2])) continue;
      seenDep.add(dm[2]);
      const programs: Array<{ name: string; url: string }> = [];
      const pRe =
        /href="(https:\/\/ul\.edu\.pk\/program-detail\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
      let pm: RegExpExecArray | null;
      const seenP = new Set<string>();
      while ((pm = pRe.exec(dm[4])) !== null) {
        if (seenP.has(pm[1])) continue;
        seenP.add(pm[1]);
        programs.push({ name: decode(pm[2]), url: pm[1] });
      }
      departments.push({
        name: decode(dm[3]),
        url: dm[2],
        programs,
      });
    }
    hierarchy.push({
      name: facBlocks[i].name,
      url: facBlocks[i].url,
      departments,
    });
  }

  const program_names = hierarchy.flatMap((f) =>
    f.departments.flatMap((d) => d.programs.map((p) => p.name)),
  );

  const plain = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, "|")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\|{2,}/g, "|")
    .replace(/\s+/g, " ");

  const start = plain.indexOf("Faculty of Computing");
  let raw = "";
  if (start >= 0) {
    raw = plain.slice(start, start + 6000);
  }

  return {
    raw_menu_text: raw.trim(),
    program_names: [...new Set(program_names)],
    hierarchy,
  };
}

async function fetchPageText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "UL-AI-Assistant/1.0 (+local; knowledge sync)" },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;
    return stripHtml(await res.text());
  } catch {
    return null;
  }
}

async function upsertSection(sectionKey: string, title: string, data: unknown): Promise<void> {
  const [existing] = await db
    .select()
    .from(knowledgeSections)
    .where(eq(knowledgeSections.sectionKey, sectionKey))
    .limit(1);

  if (existing) {
    await db
      .update(knowledgeSections)
      .set({ title, data: data as any, updatedAt: new Date() })
      .where(eq(knowledgeSections.sectionKey, sectionKey));
  } else {
    await db.insert(knowledgeSections).values({
      sectionKey,
      title,
      data: data as any,
    });
  }
}

export async function syncFromOfficialWebsite(): Promise<{ ok: boolean; stories: number }> {
  try {
    const response = await fetch(SITE_URL, {
      headers: {
        "User-Agent": "UL-AI-Assistant/1.0 (+local; knowledge sync)",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(25000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const plain = stripHtml(html);
    const stories = extractStories(html);
    const contact = extractContact(plain);
    const academics = extractAcademicsMenu(html);

    const stats = {
      faculties: extractCounter(html, "Our Faculties") ?? 5,
      departments: extractCounter(html, "Our Departments") ?? 21,
      programs: extractCounter(html, "Our Programs") ?? 56,
      students: extractCounter(html, "Our Students") ?? 5462,
      source: SITE_URL,
      synced_at: new Date().toISOString(),
    };

    const [howToApply, eligibility, feePage, scholarshipsPage, facilitiesPage] = await Promise.all([
      fetchPageText("https://ul.edu.pk/page/How-to-Apply"),
      fetchPageText("https://ul.edu.pk/page/Eligibility-Criteria"),
      fetchPageText("https://ul.edu.pk/page/Fee-Structure"),
      fetchPageText("https://ul.edu.pk/page/Scholarships"),
      fetchPageText("https://ul.edu.pk/page/Facilities"),
    ]);

    const announcements = {
      source: SITE_URL,
      synced_at: new Date().toISOString(),
      public_notices_url: "https://ul.edu.pk/page/public-notices",
      tender_notice_url: "https://ul.edu.pk/page/Tender-Notice",
      latest_stories: stories.map((s) => ({
        title: s.title,
        url: s.url,
        summary: s.summary ?? `See full story on the official website: ${s.url}`,
      })),
      note: "These announcements are automatically refreshed from https://ul.edu.pk. Always verify critical dates on the official site.",
    };

    const livePrograms = {
      source: SITE_URL,
      synced_at: stats.synced_at,
      total_programs_counter: stats.programs,
      program_names_from_menu: academics.program_names,
      academics_hierarchy: academics.hierarchy,
      academics_menu_snapshot: academics.raw_menu_text.slice(0, 5000),
      official_pages: {
        how_to_apply: "https://ul.edu.pk/page/How-to-Apply",
        eligibility: "https://ul.edu.pk/page/Eligibility-Criteria",
        fee_structure: "https://ul.edu.pk/page/Fee-Structure",
        scholarships: "https://ul.edu.pk/page/Scholarships",
        facilities: "https://ul.edu.pk/page/Facilities",
        admission_schedule: "https://ul.edu.pk/page/Admission-Schedule",
      },
      page_snippets: {
        how_to_apply: howToApply?.slice(0, 1200) ?? null,
        eligibility: eligibility?.slice(0, 1200) ?? null,
        fee_structure: feePage?.slice(0, 1200) ?? null,
        scholarships: scholarshipsPage?.slice(0, 1200) ?? null,
        facilities: facilitiesPage?.slice(0, 1200) ?? null,
      },
    };

    // Merge live stats into university overview if present
    const [uni] = await db
      .select()
      .from(knowledgeSections)
      .where(eq(knowledgeSections.sectionKey, "university"))
      .limit(1);

    if (uni && uni.data && typeof uni.data === "object") {
      const updated = {
        ...(uni.data as Record<string, unknown>),
        student_count: stats.students,
        total_departments: stats.departments,
        total_faculties: stats.faculties,
        total_programs: stats.programs,
        email: contact.email ?? (uni.data as any).email,
        phone: contact.phone ?? (uni.data as any).phone,
        last_website_sync: stats.synced_at,
      };
      await upsertSection("university", uni.title, updated);
    }

    await upsertSection("announcements", "Latest Announcements & News", announcements);
    await upsertSection("website_stats", "Live Website Statistics", stats);
    await upsertSection("live_website_data", "Live Website Academics & Pages", livePrograms);

    // Merge live program names into programs overview without wiping static structure
    const [programsSection] = await db
      .select()
      .from(knowledgeSections)
      .where(eq(knowledgeSections.sectionKey, "programs"))
      .limit(1);
    if (programsSection && programsSection.data && typeof programsSection.data === "object") {
      await upsertSection("programs", programsSection.title, {
        ...(programsSection.data as Record<string, unknown>),
        total_programs_on_website: stats.programs,
        all_program_names:
          academics.program_names.length > 0
            ? academics.program_names
            : (programsSection.data as any).all_program_names,
        live_program_names: academics.program_names,
        live_hierarchy: academics.hierarchy,
        last_website_sync: stats.synced_at,
      });
    }

    // Keep a lightweight contact refresh
    const [contactSection] = await db
      .select()
      .from(knowledgeSections)
      .where(eq(knowledgeSections.sectionKey, "contact_information"))
      .limit(1);

    if (contactSection && contactSection.data && typeof contactSection.data === "object") {
      const refreshed = {
        ...(contactSection.data as Record<string, unknown>),
        email: contact.email ?? (contactSection.data as any).email,
        main_phone: contact.phone ?? (contactSection.data as any).main_phone,
        city_campus_address:
          contact.address ?? (contactSection.data as any).city_campus_address,
        last_website_sync: stats.synced_at,
      };
      await upsertSection("contact_information", contactSection.title, refreshed);
    }

    logger.info(
      {
        stories: stories.length,
        students: stats.students,
        programs: stats.programs,
        menuPrograms: academics.program_names.length,
      },
      "Synced knowledge from ul.edu.pk",
    );
    return { ok: true, stories: stories.length };
  } catch (err) {
    logger.warn({ err }, "Website sync failed — using existing knowledge base");
    return { ok: false, stories: 0 };
  }
}

let syncTimer: ReturnType<typeof setInterval> | null = null;

export function startWebsiteSyncScheduler(): void {
  // Run once shortly after boot (seed may still be writing)
  setTimeout(() => {
    void syncFromOfficialWebsite();
  }, 3000);

  if (syncTimer) clearInterval(syncTimer);
  syncTimer = setInterval(() => {
    void syncFromOfficialWebsite();
  }, SYNC_INTERVAL_MS);

  logger.info({ everyHours: 6 }, "Website auto-sync scheduler started");
}
