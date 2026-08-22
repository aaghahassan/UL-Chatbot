/**
 * Rebuild university-knowledge.json from official ul.edu.pk extract + Academics menu.
 * Preserves campus maps, labs, libraries, and transport (not fully on public pages).
 */
import fs from "fs";
import path from "path";

const DATA = "artifacts/api-server/data";
const kbPath = path.join(DATA, "university-knowledge.json");
const extractPath = path.join(DATA, "ul-website-extract.json");
const hierarchyPath = path.join(DATA, "ul-academics-hierarchy.json");

const kb = JSON.parse(fs.readFileSync(kbPath, "utf-8"));
const extract = JSON.parse(fs.readFileSync(extractPath, "utf-8"));
const hierarchy = JSON.parse(fs.readFileSync(hierarchyPath, "utf-8"));

const CAMPUS_BY_FACULTY = {
  "Faculty of Computing & Engineering": {
    campus: "Main Campus",
    building:
      "Faculty of Computing and Engineering building, Main Campus, Karor Road (Hafiz Abad), Layyah",
  },
};

const DEPT_CAMPUS = {
  "Department of Computer Engineering": "Main Campus",
  "Department of Computer Science": "Main Campus",
  "Department of Information Technology": "Main Campus",
  "E-Rozgaar Program": "Main Campus",
};

function normalizeDeptKey(name) {
  return (name || "")
    .toLowerCase()
    .replace(/deparmtent/g, "department")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function findExtractDept(nameOrSlug) {
  const key = normalizeDeptKey(nameOrSlug);
  return extract.departments.find((d) => {
    const n = normalizeDeptKey(d.name);
    const s = normalizeDeptKey(d.slug);
    return n.includes(key) || key.includes(n) || s.includes(key.replace(/ /g, "-")) || key.replace(/ /g, "-").includes(s);
  });
}

function findExtractFaculty(name) {
  const key = normalizeDeptKey(name);
  return extract.faculties.find((f) => normalizeDeptKey(f.name).includes(key.slice(0, 20)) || key.includes(normalizeDeptKey(f.slug)));
}

function prettyProgramName(p) {
  if (p?.name && !/^university of layyah$/i.test(p.name.trim())) return p.name;
  return (p?.slug || "")
    .replace(/-/g, " ")
    .replace(/\bbscs\b/gi, "BSCS")
    .replace(/\bbsc\b/gi, "B.Sc")
    .replace(/\bbs\b/gi, "BS")
    .replace(/\bsc\b/gi, "Sc")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function titleStaff(name) {
  if (!name) return name;
  // Keep ALL CAPS names readable: ABDUL QAYOOM -> Abdul Qayoom
  if (name === name.toUpperCase() && /[A-Z]/.test(name) && name.length > 3) {
    return name
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .replace(/\bDr\b/gi, "Dr.")
      .replace(/\bEngr\b/gi, "Engr.");
  }
  return name;
}

function isJunkStaffName(name) {
  return /^(course outline|eligibility|fee structure|contact|semester|program incharge|our programs|description|no semester|apply now)$/i.test(
    (name || "").trim(),
  );
}

function cleanDesignation(d) {
  return (d || "")
    .replace(/\(\s*\)/g, "")
    .replace(/\s*\([^)]*(engineering|science|technology|computing|information)[^)]*\)/gi, "")
    .replace(/\s+/g, " ")
    .trim() || undefined;
}

function stripVisitingWord(d) {
  return (d || "")
    .replace(/\bvisiting\b/gi, "")
    .replace(/\s+/g, " ")
    .trim() || undefined;
}

function cleanQualification(q) {
  if (!q) return undefined;
  const cut = q.search(
    /·\s*(?:Dr\.?|Prof\.?|Engr\.?|[A-Z][a-z]+\s+[A-Z][a-z]+\s+[A-Z])/,
  );
  const trimmed = (cut > 0 ? q.slice(0, cut) : q).trim();
  return trimmed || undefined;
}

// --- Build faculties from official hierarchy ---
const faculties = hierarchy.faculties.map((fac) => {
  const meta = CAMPUS_BY_FACULTY[fac.name] || {};
  const facExtract = findExtractFaculty(fac.name);
  const dean =
    (facExtract?.staff || []).find((s) => /dean/i.test(s.designation || "")) ||
    null;

  // Merge departments from hierarchy; add Clinical Sciences if missing under Vet
  let deps = [...fac.departments];
  if (/veterinary/i.test(fac.name)) {
    const hasClinical = deps.some((d) => /clinical/i.test(d.name));
    if (!hasClinical) {
      const clinical = extract.departments.find((d) =>
        /clinical/i.test(d.slug || d.name),
      );
      if (clinical) {
        deps.splice(1, 0, {
          name: clinical.name.startsWith("Department")
            ? clinical.name
            : "Department of Clinical Sciences",
          url: clinical.url,
          slug: clinical.slug,
          programs: [],
        });
      }
    }
  }

  return {
    name: fac.name,
    url: fac.url,
    campus: meta.campus || "Confirm with department (Layyah campuses)",
    ...(meta.building ? { building: meta.building } : {}),
    ...(dean
      ? {
          dean: {
            name: titleStaff(dean.name),
            designation: dean.designation,
            email: dean.email || undefined,
            profile_url: dean.profile_url || undefined,
            role: "Dean",
          },
        }
      : {}),
    departments: deps.map((dep) => {
      const scraped = findExtractDept(dep.name) || findExtractDept(dep.slug);
      const campus = DEPT_CAMPUS[dep.name] || meta.campus || undefined;
      const fromDept = scraped?.staff || [];
      const depProgramUrls = new Set(
        (dep.programs || []).map((p) => p.url).filter(Boolean),
      );
      const depSlugs = new Set(
        (dep.programs || []).map((p) => p.slug).filter(Boolean),
      );
      const fromPrograms = (extract.programs || [])
        .filter(
          (p) =>
            depProgramUrls.has(p.url) ||
            (p.slug && depSlugs.has(p.slug)),
        )
        .flatMap((p) =>
          (p.staff || []).map((s) => ({
            ...s,
            role: s.role || "Program Incharge",
            program: prettyProgramName(p),
          })),
        );

      const staff = [];
      const seen = new Set();
      for (const s of [...fromDept, ...fromPrograms]) {
        if (isJunkStaffName(s.name)) continue;
        const key = (s.name || "")
          .toLowerCase()
          .replace(/\./g, "")
          .replace(/\s+/g, " ")
          .trim();
        if (!key || seen.has(key)) {
          if (key) {
            const existing = staff.find(
              (x) =>
                (x.name || "").toLowerCase().replace(/\./g, "").replace(/\s+/g, " ").trim() ===
                key,
            );
            if (existing) {
              if (!existing.designation && s.designation) existing.designation = s.designation;
              if (!existing.role && s.role) existing.role = s.role;
              if (!existing.qualification && s.qualification) {
                existing.qualification = s.qualification;
              }
              if (!existing.program && s.program) existing.program = s.program;
            }
          }
          continue;
        }
        seen.add(key);
        staff.push({
          name: titleStaff(s.name),
          designation: cleanDesignation(s.designation),
          role: s.role || undefined,
          discipline: s.discipline || undefined,
          email: s.email || undefined,
          profile_url: s.profile_url || undefined,
          qualification: cleanQualification(s.qualification),
          program: s.program || undefined,
        });
      }
      const location =
        campus === "Main Campus" && /computing|computer|information technology|e-rozgaar/i.test(dep.name)
          ? "Faculty of Computing and Engineering building, Main Campus" +
            (/computer science/i.test(dep.name) ? " (NOT City Campus)" : "")
          : campus
            ? campus
            : undefined;

      return {
        name: dep.name.replace(/^Deparmtent\b/i, "Department"), // fix site typo for readability while keeping URL
        official_name: dep.name,
        url: dep.url,
        ...(campus ? { campus } : {}),
        ...(location ? { location } : {}),
        staff,
        programs: (dep.programs || []).map((p) => ({
          name: p.name,
          url: p.url,
          slug: p.slug,
        })),
        ...(scraped?.description
          ? { description: scraped.description.slice(0, 1200) }
          : {}),
      };
    }),
    source: "https://ul.edu.pk Academics menu",
  };
});

function departmentFromDiscipline(text) {
  const t = (text || "").toLowerCase();
  if (/computer engineering/.test(t)) return "Department of Computer Engineering";
  if (/information technology/.test(t)) return "Department of Information Technology";
  if (/e-?rozgaar/.test(t)) return "E-Rozgaar Program";
  if (/computer science/.test(t) && !/engineering/.test(t)) {
    return "Department of Computer Science";
  }
  return null;
}

function deptKey(name) {
  return (name || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Profile titles like "Lecturer (Computer Engineering)" override the department card. */
function rehomeStaffByDiscipline(facList) {
  for (const fac of facList) {
    const moving = [];
    for (const dep of fac.departments || []) {
      const keep = [];
      for (const s of dep.staff || []) {
        const target =
          departmentFromDiscipline(s.discipline || s.designation) || dep.name;
        if (deptKey(target) === deptKey(dep.name)) {
          keep.push(s);
        } else {
          moving.push({ target, staff: s });
        }
      }
      dep.staff = keep;
    }
    for (const { target, staff } of moving) {
      const dest = (fac.departments || []).find(
        (d) =>
          deptKey(d.name) === deptKey(target) ||
          deptKey(d.name).includes(deptKey(target).replace("department of ", "")),
      );
      if (!dest) {
        const fallback = (fac.departments || []).find((d) =>
          deptKey(d.name).includes("computer science"),
        );
        (fallback?.staff || []).push(staff);
        continue;
      }
      const exists = (dest.staff || []).some(
        (x) =>
          (x.email && staff.email && x.email === staff.email) ||
          x.name === staff.name,
      );
      if (!exists) dest.staff.push(staff);
    }
  }
}

rehomeStaffByDiscipline(faculties);

for (const fac of faculties) {
  for (const dep of fac.departments || []) {
    if (!/computer engineering/i.test(dep.name)) continue;
    for (const s of dep.staff || []) {
      s.designation = stripVisitingWord(s.designation) || s.designation;
      if (s.role) s.role = stripVisitingWord(s.role) || s.role;
    }
  }
}

// --- Flat program list (official names) ---
const allPrograms = [];
for (const f of faculties) {
  for (const d of f.departments) {
    for (const p of d.programs) {
      allPrograms.push({
        name: p.name,
        url: p.url,
        department: d.name,
        faculty: f.name,
        campus: d.campus || f.campus,
      });
    }
  }
}

// --- Teaching staff from all scraped department + faculty pages ---
const byFacultyStaff = {};
for (const f of faculties) {
  const key = f.name;
  byFacultyStaff[key] = {
    campus: f.campus,
    dean: f.dean?.name || null,
    url: f.url,
    departments: f.departments.map((d) => ({
      department: d.name,
      url: d.url,
      campus: d.campus,
      staff: d.staff,
    })),
  };
}

const allStaffFlat = [];
for (const f of faculties) {
  if (f.dean) {
    allStaffFlat.push({
      name: f.dean.name,
      designation: f.dean.designation || "Dean",
      unit: f.name,
      email: f.dean.email,
      profile_url: f.dean.profile_url,
    });
  }
  for (const d of f.departments) {
    for (const s of d.staff || []) {
      allStaffFlat.push({
        name: s.name,
        designation: s.designation,
        role: s.role,
        qualification: s.qualification,
        program: s.program,
        unit: d.name,
        faculty: f.name,
        email: s.email,
        profile_url: s.profile_url,
        campus: d.campus,
      });
    }
  }
}

// --- Update KB sections ---
kb.university.student_count = extract.stats.students || kb.university.student_count;
kb.university.total_departments = extract.stats.departments || 21;
kb.university.total_faculties = extract.stats.faculties || 5;
kb.university.total_programs = extract.stats.programs || 56;
kb.university.source = `https://ul.edu.pk (scraped ${extract.scraped_at})`;
kb.university.spelling_note =
  "Always spell as Layyah (NOT Layyeh, NOT Lahore). Official website: https://ul.edu.pk";

kb.faculties = faculties;

kb.programs = {
  total_programs_on_website: allPrograms.length,
  spelling: "University of Layyah",
  note: "Program names and hierarchy match the Academics menu on https://ul.edu.pk",
  all_program_names: allPrograms.map((p) => p.name),
  by_department: allPrograms,
  department_locations_critical: {
    "Department of Computer Science":
      "Main Campus — Faculty of Computing and Engineering building (NOT City Campus)",
    "Department of Information Technology":
      "Main Campus — Faculty of Computing and Engineering building",
    "Department of Computer Engineering":
      "Main Campus — Faculty of Computing and Engineering building",
    "E-Rozgaar Program":
      "Main Campus — E-Rozgaar Lab, 1st Floor, Computing building",
  },
  aliases: {
    "BS IT": "BSCS - Information Technology",
    "BS Information Technology": "BSCS - Information Technology",
    BSCS: "BS Computer Science",
    BSAI: "BSCS - Artificial Intelligence",
    BSDS: "BSCS - Data Science",
    "BS International Relations": "BS Internatinal Relations",
  },
};

kb.teaching_staff = {
  note: "Staff extracted from official department, faculty, and program (Program Incharge) pages on https://ul.edu.pk.",
  source: extract.source,
  scraped_at: extract.scraped_at,
  by_faculty: byFacultyStaff,
  all_staff: allStaffFlat,
};

kb.announcements = {
  ...kb.announcements,
  source: "https://ul.edu.pk",
  last_synced_note: `Full academic scrape ${extract.scraped_at}; stories from homepage.`,
  latest_stories: (extract.stories || []).slice(0, 12).map((s) => ({
    title: s.title,
    url: s.url,
  })),
};

kb.live_website_data = {
  scraped_at: extract.scraped_at,
  source: "https://ul.edu.pk",
  stats: extract.stats,
  hierarchy_totals: hierarchy.totals,
  official_pages: Object.fromEntries(
    Object.entries(extract.pages || {}).map(([k, v]) => [
      k,
      { url: v.url, title: v.title, excerpt: (v.text || "").slice(0, 800) },
    ]),
  ),
  note: "Faculties/departments/programs/staff mirror the official website structure.",
};

// Keep fee guidance pointing to official interactive page
kb.fee_structure = {
  ...kb.fee_structure,
  fee_structure_url: "https://ul.edu.pk/page/Fee-Structure",
  note_for_assistant:
    "Do not invent exact semester fee numbers. Direct users to https://ul.edu.pk/page/Fee-Structure. Mention E-Rozgaar Rs. 7000 when asked about E-Rozgaar.",
};

fs.writeFileSync(kbPath, JSON.stringify(kb, null, 2));
console.log("Updated", kbPath);
console.log({
  faculties: faculties.length,
  departments: faculties.reduce((n, f) => n + f.departments.length, 0),
  programs: allPrograms.length,
  staff: allStaffFlat.length,
});
