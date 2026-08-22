/**
 * Fetch staff-profile pages and attach official designation / department.
 * The department cards sometimes list people under the wrong unit;
 * the profile title e.g. "Lecturer (Computer Engineering)" is authoritative.
 */
import fs from "fs";
import path from "path";

const extractPath = "artifacts/api-server/data/ul-website-extract.json";
const UA = "UL-AI-Assistant/1.0 (knowledge extraction)";

function decode(s) {
  return (s || "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "text/html" },
    signal: AbortSignal.timeout(40000),
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return await res.text();
}

function parseProfile(html) {
  const name = decode((html.match(/<h3[^>]*>([^<]+)<\/h3>/i) || [])[1] || "");
  const afterH3 = html.split(/<h3[^>]*>[\s\S]*?<\/h3>/i)[1] || "";
  const designation = decode(
    (afterH3.match(/<p class="mb-0">([^<]+)<\/p>/i) || [])[1] || "",
  );
  const department = decode(
    (html.match(/fa-building[^<]*<\/i>\s*([^<]+)/i) || [])[1] || "",
  );
  const email = (html.match(/mailto:([^"'\s>]+)/i) || [])[1] || null;
  const discipline =
    (designation.match(/\(([^)]+)\)/) || [])[1] || null;
  return { name, designation, department, email, discipline };
}

function walkStaff(extract, fn) {
  for (const fac of extract.faculties || []) {
    for (const s of fac.staff || []) fn(s);
  }
  for (const dep of extract.departments || []) {
    for (const s of dep.staff || []) fn(s);
  }
  for (const p of extract.programs || []) {
    for (const s of p.staff || []) fn(s);
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const extract = JSON.parse(fs.readFileSync(extractPath, "utf-8"));
  const urls = [];
  const seen = new Set();
  walkStaff(extract, (s) => {
    if (s.profile_url && !seen.has(s.profile_url)) {
      seen.add(s.profile_url);
      urls.push(s.profile_url);
    }
  });
  console.log("Fetching", urls.length, "staff profiles");

  const byUrl = {};
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    try {
      const html = await fetchHtml(url);
      byUrl[url] = parseProfile(html);
      const p = byUrl[url];
      console.log(
        `[${i + 1}/${urls.length}]`,
        p.name || url,
        "→",
        p.designation,
        "/",
        p.discipline || p.department,
      );
      await sleep(80);
    } catch (e) {
      console.warn("fail", url, e.message);
    }
  }

  walkStaff(extract, (s) => {
    const p = s.profile_url && byUrl[s.profile_url];
    if (!p) return;
    if (p.designation) s.designation = p.designation;
    if (p.department) s.department = p.department;
    if (p.discipline) s.discipline = p.discipline;
    if (p.email && !s.email) s.email = p.email;
  });

  extract.scraped_at = new Date().toISOString();
  fs.writeFileSync(extractPath, JSON.stringify(extract, null, 2));
  console.log("Updated", extractPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
