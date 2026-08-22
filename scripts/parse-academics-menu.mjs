import fs from "fs";
import path from "path";

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

const html = await fetch("https://ul.edu.pk/").then((r) => r.text());

// Capture faculty blocks: faculty-detail link then nested departments
const facultyBlocks = [];
const facRe =
  /href="(https:\/\/ul\.edu\.pk\/faculty-detail\/[^"]+)"[^>]*>[\s\S]*?<span>([^<]+)<\/span>/gi;
let m;
while ((m = facRe.exec(html)) !== null) {
  facultyBlocks.push({ url: m[1], name: decodeEntities(m[2]), index: m.index });
}

// Unique faculties by url (menu may repeat)
const seenFac = new Set();
const faculties = [];
for (const f of facultyBlocks) {
  if (seenFac.has(f.url)) continue;
  seenFac.add(f.url);
  faculties.push(f);
}

const hierarchy = [];
for (let i = 0; i < faculties.length; i++) {
  const start = faculties[i].index;
  const end = i + 1 < faculties.length ? faculties[i + 1].index : html.length;
  const block = html.slice(start, Math.min(end, start + 50000));

  const departments = [];
  const depRe =
    /data-department-id="(\d+)"[\s\S]*?href="(https:\/\/ul\.edu\.pk\/department-detail\/[^"]+)"[\s\S]*?<span>([^<]+)<\/span>[\s\S]*?<ul class="dropdown-menu[^"]*menu-program"[^>]*>([\s\S]*?)<\/ul>/gi;
  let dm;
  const seenDep = new Set();
  while ((dm = depRe.exec(block)) !== null) {
    const url = dm[2];
    if (seenDep.has(url)) continue;
    seenDep.add(url);
    const programs = [];
    const pRe =
      /href="(https:\/\/ul\.edu\.pk\/program-detail\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let pm;
    const seenP = new Set();
    while ((pm = pRe.exec(dm[4])) !== null) {
      if (seenP.has(pm[1])) continue;
      seenP.add(pm[1]);
      programs.push({
        name: decodeEntities(pm[2]),
        url: pm[1],
        slug: pm[1].split("/").pop(),
      });
    }
    departments.push({
      id: dm[1],
      name: decodeEntities(dm[3]),
      url,
      slug: url.split("/").pop(),
      programs,
    });
  }

  hierarchy.push({
    name: faculties[i].name,
    url: faculties[i].url,
    slug: faculties[i].url.split("/").pop(),
    departments,
  });
}

const out = {
  source: "https://ul.edu.pk homepage Academics menu",
  scraped_at: new Date().toISOString(),
  faculties: hierarchy,
  totals: {
    faculties: hierarchy.length,
    departments: hierarchy.reduce((n, f) => n + f.departments.length, 0),
    programs: hierarchy.reduce(
      (n, f) => n + f.departments.reduce((m, d) => m + d.programs.length, 0),
      0,
    ),
  },
};

fs.mkdirSync("artifacts/api-server/data", { recursive: true });
fs.writeFileSync(
  "artifacts/api-server/data/ul-academics-hierarchy.json",
  JSON.stringify(out, null, 2),
);
console.log(JSON.stringify(out.totals, null, 2));
for (const f of hierarchy) {
  console.log("\n" + f.name);
  for (const d of f.departments) {
    console.log("  -", d.name, `(${d.programs.length})`);
    for (const p of d.programs) console.log("      *", p.name);
  }
}
