/**
 * Offline verify: format answers from rebuilt university-knowledge.json
 */
import fs from "fs";
import path from "path";

const kb = JSON.parse(
  fs.readFileSync(
    "artifacts/api-server/data/university-knowledge.json",
    "utf-8",
  ),
);

function formatPerson(p) {
  const bits = [p.name, p.designation, p.role, p.email].filter(Boolean);
  return `- ${bits.join(" — ")}`;
}

const queries = [
  "list all faculties and programs",
  "where is computer science department",
  "teaching staff computer science",
  "who is dean of computing",
];

console.log("=== Stats ===");
console.log({
  faculties: kb.faculties.length,
  departments: kb.faculties.reduce((n, f) => n + f.departments.length, 0),
  programs: kb.programs.all_program_names.length,
  staff: kb.teaching_staff.all_staff.length,
  scraped: kb.live_website_data?.scraped_at,
});

console.log("\n=== Computing faculty (official) ===");
const comp = kb.faculties.find((f) => /computing/i.test(f.name));
console.log("Dean:", comp.dean);
for (const d of comp.departments) {
  console.log(
    `\n${d.name} @ ${d.campus || "?"} | staff=${(d.staff || []).length}`,
  );
  for (const p of d.programs) console.log("  -", p.name);
  for (const s of d.staff || []) console.log(" ", formatPerson(s));
}

console.log("\n=== Sample program names (first 15) ===");
console.log(kb.programs.all_program_names.slice(0, 15));

// CS location check
const cs = comp.departments.find((d) => /computer science/i.test(d.name));
console.log("\n=== CS location ===", cs.location || cs.campus);
