import fs from "fs";
import path from "path";

const OUT = "artifacts/api-server/data";
const UA = "UL-AI-Assistant/1.0 (knowledge extraction)";

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "text/html" },
    signal: AbortSignal.timeout(40000),
  });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return await res.text();
}

function strip(html) {
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

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function extractTitle(html) {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m ? decodeEntities(m[1]).replace(/\s*\|.*$/, "").trim() : "";
}

function extractStaffFromHtml(html) {
  const staff = [];
  // Official site uses .team-item cards (department-assigns-wrapper)
  const parts = html.split(/<div class="team-item\b/i);
  const chunks = parts.slice(1).map((p) => p.slice(0, 1800));

  for (const chunk of chunks) {
    const email = (chunk.match(/mailto:([^"'\s>]+)/i) || [])[1] || null;
    const profile =
      (chunk.match(/href="(https:\/\/ul\.edu\.pk\/staff-profile\/[^"]+)"/i) ||
        [])[1] || null;
    let name =
      (chunk.match(/<h5[^>]*>\s*<a[^>]*>([^<]+)<\/a>/i) || [])[1] ||
      (chunk.match(/<h5[^>]*>([^<]+)<\/h5>/i) || [])[1] ||
      null;
    name = name ? decodeEntities(name) : null;

    let designation =
      (chunk.match(/<\/h5>\s*<span[^>]*>([^<]+)<\/span>/i) || [])[1] || null;
    designation = designation ? decodeEntities(designation) : null;

    let department =
      (chunk.match(
        /staff-card-meta[^>]*>[\s\S]*?fa-building[^<]*<\/i>\s*([^<]+)/i,
      ) || [])[1] || null;
    department = department ? decodeEntities(department).trim() : null;

    if (name || email) {
      staff.push({
        name: name || "Unknown",
        designation,
        department,
        email,
        profile_url: profile,
      });
    }
  }

  const seen = new Set();
  return staff.filter((s) => {
    const k = `${s.name}|${s.email || ""}`.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return s.name !== "Unknown" || s.email;
  });
}

/** Program pages list incharges in Word/HTML paragraphs, not .team-item cards. */
function extractInchargeStaff(html) {
  const idx = html.search(/program\s+incharge/i);
  if (idx < 0) return [];

  let chunk = html.slice(idx, idx + 5000);
  const end = chunk.search(/id="semesterAccordion"|No semester data|<\/section>/i);
  if (end > 200) chunk = chunk.slice(0, end);

  const paras = [...chunk.matchAll(/<(?:p|h3|h4|li|div)[^>]*>([\s\S]*?)<\/(?:p|h3|h4|li|div)>/gi)]
    .map((m) => strip(m[1]))
    .map((t) => t.replace(/\s+/g, " ").trim())
    .filter((t) => t.length >= 3 && t.length < 180);

  const staff = [];
  const skipLine =
    /^(program incharge|phd|ms\b|mphil|msc|bs\b|bsc|university|chongqing|pakistan|punjab university|computer science|software engineering|taxila|muzaffarabad|lahore)$/i;

  for (let i = 0; i < paras.length; i++) {
    const p = paras[i];
    if (/^program incharge$/i.test(p) || skipLine.test(p)) continue;

    const withRole = p.match(
      /^((?:Dr\.?|Prof\.?|Engr\.?)?[\sA-Za-z.'-]{3,70}?)\s*\(([^)]{3,40})\)\s*$/,
    );
    if (withRole && /professor|lecturer|incharge|dean|hod|assistant|associate/i.test(withRole[2])) {
      const extra = [];
      for (let j = i + 1; j < Math.min(i + 4, paras.length); j++) {
        if (/^(Dr\.?|Prof\.?|Engr\.?)\b/i.test(paras[j])) break;
        if (/\([^)]*(professor|lecturer)[^)]*\)/i.test(paras[j])) break;
        extra.push(paras[j]);
      }
      staff.push({
        name: withRole[1].replace(/\s+/g, " ").trim(),
        designation: withRole[2].trim(),
        role: "Program Incharge",
        qualification: extra.join(" · ") || null,
      });
      continue;
    }

    const looksLikeName =
      /^(?:Dr\.?|Prof\.?|Engr\.?)\s+[A-Z]/.test(p) ||
      /^[A-Z][a-z]+(?:\s+[A-Z][a-z.]+){1,4}$/.test(p);
    if (looksLikeName && !/university|engineering|pakistan|science$/i.test(p)) {
      const extra = [];
      for (let j = i + 1; j < Math.min(i + 4, paras.length); j++) {
        if (/^(Dr\.?|Prof\.?|Engr\.?)\b/i.test(paras[j])) break;
        if (/\([^)]*(professor|lecturer)[^)]*\)/i.test(paras[j])) break;
        extra.push(paras[j]);
      }
      staff.push({
        name: p.replace(/\s+/g, " ").trim(),
        designation: extra.find((x) => /professor|lecturer/i.test(x)) || null,
        role: "Program Incharge",
        qualification: extra.join(" · ") || null,
      });
    }
  }

  const seen = new Set();
  return staff.filter((s) => {
    const k = s.name.toLowerCase().replace(/\./g, "").replace(/\s+/g, " ");
    if (seen.has(k) || k.length < 4) return false;
    seen.add(k);
    return true;
  });
}

function extractDescription(html) {
  const m = html.match(
    /class="[^"]*faculty_description[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
  );
  if (!m) {
    const m2 = html.match(/class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    if (!m2) return null;
    return strip(m2[1]).slice(0, 2500);
  }
  return strip(m[1]).slice(0, 2500);
}

function extractLinkedPrograms(html) {
  const programs = [];
  const re =
    /href="(https:\/\/ul\.edu\.pk\/program-detail\/[^"]+)"[^>]*>([^<]{2,100})</gi;
  let m;
  const seen = new Set();
  while ((m = re.exec(html)) !== null) {
    const url = m[1];
    const name = decodeEntities(m[2]).trim();
    if (seen.has(url) || name.length < 2) continue;
    seen.add(url);
    programs.push({ name, url, slug: url.split("/").pop() });
  }
  return programs;
}

function extractLinkedDepartments(html) {
  const deps = [];
  const re =
    /href="(https:\/\/ul\.edu\.pk\/department-detail\/[^"]+)"[^>]*>([^<]{2,120})</gi;
  let m;
  const seen = new Set();
  while ((m = re.exec(html)) !== null) {
    const url = m[1];
    const name = decodeEntities(m[2]).trim();
    if (seen.has(url) || name.length < 2) continue;
    // skip generic
    if (/^department$/i.test(name)) continue;
    seen.add(url);
    deps.push({ name, url, slug: url.split("/").pop() });
  }
  return deps;
}

function extractFeeHints(html) {
  const plain = strip(html);
  const fees = [];
  const re = /(?:Rs\.?|PKR)\s*[\d,]+(?:\s*\/\s*(?:semester|year|course))?/gi;
  let m;
  while ((m = re.exec(plain)) !== null) {
    fees.push(m[0]);
    if (fees.length >= 10) break;
  }
  return fees;
}

function extractEligibility(html) {
  const plain = strip(html);
  const idx = plain.toLowerCase().indexOf("eligibility");
  if (idx < 0) return null;
  return plain.slice(idx, idx + 500);
}

function titleCaseSlug(slug) {
  return decodeEntities(
    slug
      .replace(/-/g, " ")
      .replace(/\bpost adp\b/gi, "POST-ADP")
      .replace(/\bbs\b/gi, "BS")
      .replace(/\bbba\b/gi, "BBA")
      .replace(/\bsc\b/gi, "Sc"),
  );
}

async function scrapeProgram(url) {
  const html = await fetchHtml(url);
  const slug = url.split("/").pop() || "program";
  const h1 = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  const h2 = html.match(
    /id="[^"]*program[^"]*"[^>]*>([^<]+)</i,
  ) || html.match(/class="[^"]*facuty_title[^"]*"[\s\S]{0,200}<h2[^>]*>([^<]+)/i);
  const name = h1
    ? decodeEntities(h1[1])
    : h2
      ? decodeEntities(h2[1])
      : extractTitle(html) || titleCaseSlug(slug);
  const cardStaff = extractStaffFromHtml(html);
  const inchargeStaff = extractInchargeStaff(html);
  const staff = [...cardStaff];
  const seen = new Set(staff.map((s) => (s.name || "").toLowerCase()));
  for (const s of inchargeStaff) {
    const k = (s.name || "").toLowerCase();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    staff.push(s);
  }
  return {
    url,
    title: extractTitle(html),
    name,
    slug,
    description: extractDescription(html),
    staff,
    fee_mentions: extractFeeHints(html),
    eligibility_snippet: extractEligibility(html),
    plain_excerpt: strip(html).slice(0, 1800),
  };
}

async function scrapeDepartment(url) {
  const html = await fetchHtml(url);
  const slug = url.split("/").pop() || "department";
  const h1 = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  const name = h1
    ? decodeEntities(h1[1])
    : slug.replace(/-/g, " ");
  return {
    url,
    title: extractTitle(html),
    name,
    slug,
    description: extractDescription(html),
    staff: extractStaffFromHtml(html),
    programs: extractLinkedPrograms(html),
    plain_excerpt: strip(html).slice(0, 2000),
  };
}

async function scrapeFaculty(url) {
  const html = await fetchHtml(url);
  const slug = url.split("/").pop() || "faculty";
  const h1 = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  const name = h1 ? decodeEntities(h1[1]) : slug.replace(/-/g, " ");
  return {
    url,
    title: extractTitle(html),
    name,
    slug,
    description: extractDescription(html),
    staff: extractStaffFromHtml(html),
    departments: extractLinkedDepartments(html),
    programs: extractLinkedPrograms(html),
    plain_excerpt: strip(html).slice(0, 2000),
  };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const home = await fetchHtml("https://ul.edu.pk/");
  const allLinks = [
    ...home.matchAll(/href="(https:\/\/(?:www\.)?ul\.edu\.pk\/[^"#]+)"/gi),
  ].map((m) => m[1].replace("www.", ""));

  let facultyUrls = [...new Set(allLinks.filter((u) => u.includes("/faculty-detail/")))];
  let deptUrls = [...new Set(allLinks.filter((u) => u.includes("/department-detail/")))];
  let programUrls = [...new Set(allLinks.filter((u) => u.includes("/program-detail/")))];

  console.log("From homepage:", {
    faculties: facultyUrls.length,
    departments: deptUrls.length,
    programs: programUrls.length,
  });

  const faculties = [];
  for (const url of facultyUrls) {
    try {
      console.log("FAC", url);
      const fac = await scrapeFaculty(url);
      faculties.push(fac);
      for (const d of fac.departments || []) {
        if (d.url && !deptUrls.includes(d.url)) deptUrls.push(d.url);
      }
      for (const p of fac.programs || []) {
        if (p.url && !programUrls.includes(p.url)) programUrls.push(p.url);
      }
      await sleep(250);
    } catch (e) {
      console.warn("fail faculty", url, e.message);
    }
  }

  const departments = [];
  for (const url of [...deptUrls]) {
    try {
      console.log("DEP", url);
      const dep = await scrapeDepartment(url);
      departments.push(dep);
      for (const p of dep.programs || []) {
        if (p.url && !programUrls.includes(p.url)) programUrls.push(p.url);
      }
      await sleep(200);
    } catch (e) {
      console.warn("fail dept", url, e.message);
    }
  }

  console.log("After faculty/dept crawl:", {
    departments: departments.length,
    programs: programUrls.length,
  });

  const programs = [];
  for (const url of programUrls) {
    try {
      console.log("PRG", url);
      programs.push(await scrapeProgram(url));
      await sleep(150);
    } catch (e) {
      console.warn("fail program", url, e.message);
    }
  }

  // Extra pages
  const pages = {};
  for (const [key, url] of Object.entries({
    vision: "https://ul.edu.pk/page/vision",
    contact: "https://ul.edu.pk/contact",
    admissions: "https://ul.edu.pk/admissions",
    fee_structure: "https://ul.edu.pk/page/Fee-Structure",
    how_to_apply: "https://ul.edu.pk/page/How-to-Apply",
    eligibility: "https://ul.edu.pk/page/Eligibility-Criteria",
    admission_schedule: "https://ul.edu.pk/page/Admission-Schedule",
    scholarships: "https://ul.edu.pk/page/Scholarships",
    facilities: "https://ul.edu.pk/page/Facilities",
    transport: "https://ul.edu.pk/page/Transport",
    medical: "https://ul.edu.pk/page/Medical",
    academic_calendar: "https://ul.edu.pk/academic-calendar",
    public_notices: "https://ul.edu.pk/page/public-notices",
  })) {
    try {
      const html = await fetchHtml(url);
      pages[key] = {
        url,
        title: extractTitle(html),
        text: strip(html).slice(0, 4000),
      };
      await sleep(150);
    } catch (e) {
      pages[key] = { url, error: e.message };
    }
  }

  // Stories
  const stories = [];
  const storyRe =
    /href="(https:\/\/ul\.edu\.pk\/story\/[^"]+)"[^>]*>([^<]+)</gi;
  let sm;
  const seenStory = new Set();
  while ((sm = storyRe.exec(home)) !== null) {
    if (seenStory.has(sm[1])) continue;
    seenStory.add(sm[1]);
    stories.push({ title: decodeEntities(sm[2]).trim(), url: sm[1] });
  }

  const stats = {
    faculties: Number((home.match(/data-to="(\d+)"[\s\S]{0,120}Our Faculties/i) || [])[1] || 5),
    departments: Number((home.match(/data-to="(\d+)"[\s\S]{0,120}Our Departments/i) || [])[1] || 21),
    programs: Number((home.match(/data-to="(\d+)"[\s\S]{0,120}Our Programs/i) || [])[1] || 56),
    students: Number((home.match(/data-to="(\d+)"[\s\S]{0,120}Our Students/i) || [])[1] || 5462),
  };

  const extracted = {
    source: "https://ul.edu.pk",
    scraped_at: new Date().toISOString(),
    spelling: "University of Layyah",
    stats,
    stories,
    faculties,
    departments,
    programs,
    pages,
  };

  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(
    path.join(OUT, "ul-website-extract.json"),
    JSON.stringify(extracted, null, 2),
  );
  console.log("Wrote ul-website-extract.json");
  console.log({
    faculties: faculties.length,
    departments: departments.length,
    programs: programs.length,
    staffSamples: departments.map((d) => ({
      name: d.slug,
      staff: d.staff.length,
      programs: d.programs.length,
    })),
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
