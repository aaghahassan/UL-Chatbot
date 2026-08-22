/**
 * Builds short, professional chatbot answers from knowledge sections.
 * Never dumps raw KB fields — answers match the user's intent.
 */

import type { KnowledgeSectionRow } from "./retrieve-knowledge";
import { expandQueryForMatching, stripEmDashes } from "./chat-language";

type Fac = {
  name: string;
  campus?: string;
  building?: string;
  dean?: { name?: string; designation?: string; email?: string };
  departments?: Array<{
    name: string;
    campus?: string;
    location?: string;
    staff?: Array<{
      name?: string;
      designation?: string;
      email?: string;
      role?: string;
      qualification?: string;
      program?: string;
      profile_url?: string;
    }>;
    programs?: Array<{ name: string; url?: string } | string>;
  }>;
};

function norm(q: string): string {
  return q.toLowerCase().replace(/\s+/g, " ").trim();
}

function sectionData<T = any>(
  sections: KnowledgeSectionRow[],
  key: string,
): T | null {
  const hit = sections.find((s) => s.sectionKey === key);
  return (hit?.data as T) ?? null;
}

function progName(p: { name: string } | string): string {
  return typeof p === "string" ? p : p.name;
}

/** Always correct common misspellings in model/local output. */
export function enforceLayyahSpelling(text: string): string {
  return stripEmDashes(
    text
      .replace(/\bUniversity of Lahore\b/gi, "University of Layyah")
      .replace(/\bUniv\. of Lahore\b/gi, "University of Layyah")
      .replace(/\bUOL Lahore\b/gi, "University of Layyah")
      .replace(/\bLayyeh\b/gi, "Layyah")
      .replace(/\bLayeh\b/gi, "Layyah")
      .replace(/\bLahore University\b/gi, "University of Layyah"),
  );
}

function displayTitle(role?: string): string {
  return (role || "")
    .replace(/\s*\([^)]*(engineering|science|technology|computing|information)[^)]*\)/gi, "")
    .replace(/\(\s*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function footer(): string {
  return `\n\n---\n**Need more help?**\n- Website: [ul.edu.pk](https://ul.edu.pk)\n- Email: info@ul.edu.pk\n- Phone: +92-0606-920247`;
}

function isVcQuery(q: string): boolean {
  return /\b(v\.?c\.?|vice[\s-]*chancellor)\b/i.test(q);
}

function detectIntent(query: string): string {
  const q = norm(query);
  const staffAsk =
    /(staff|teachers?|professors?|lecturers?|asatiza|ustad|اساتذہ|سٹاف|hod|incharge|faculty\s+members)/i.test(
      q,
    );

  if (
    /^(hi|hello|hey|salam|salaam|assalam|aoa|السلام|good\s+(morning|evening|afternoon)|how are you)\b/.test(
      q,
    )
  ) {
    return "greet";
  }
  if (staffAsk && !isVcQuery(q) && !/\b(chancellor|registrar|oric|dean)\b/.test(q)) {
    return "staff";
  }
  if (
    isVcQuery(q) ||
    /\b(chancellor|registrar|oric)\b/.test(q) ||
    /who\s+is|who'?s|tell me about/.test(q)
  ) {
    return "who";
  }
  if (
    /(all\s+programs?|list\s+(all\s+)?programs?|what\s+programs?|programs?\s+offered|offer(s|ed)?\s+programs?|degree\s+programs?)/i.test(
      q,
    )
  ) {
    return "programs";
  }
  if (
    /(facult(y|ies)|departments?\s+list|list\s+(all\s+)?facult)/i.test(q) &&
    !/staff|teacher|dean|professor/.test(q)
  ) {
    return "faculties";
  }
  if (/(bus|transport|shuttle|route\s*0?[12]|timings?|schedule)/i.test(q)) {
    return "transport";
  }
  if (/(lab|labs|laboratory|dld|erozgaar\s+lab|computing\s+lab)/i.test(q)) {
    return "labs";
  }
  if (/(library|libraries|central\s+library)/i.test(q)) {
    return "libraries";
  }
  if (/(fee|fees|tuition|challan|fee\s+structure)/i.test(q)) {
    return "fees";
  }
  if (/(admission|how\s+to\s+apply|eligibility|merit|documents?\s+required)/i.test(q)) {
    return "admissions";
  }
  if (/(scholarship|peef|financial\s+aid)/i.test(q)) {
    return "scholarships";
  }
  if (/(contact|phone|email|helpline|office\s+hours)/i.test(q)) {
    return "contact";
  }
  if (
    /(where\s+is|located|location|computer\s+science|cs\s+department|main\s+campus|city\s+campus|map)/i.test(
      q,
    )
  ) {
    return "location";
  }
  if (
    /(staff|teachers?|professors?|dean|hod|incharge|lecturers?|faculty\s+members)/i.test(
      q,
    )
  ) {
    return "staff";
  }
  if (/(news|announcement|latest|story|mou)/i.test(q)) {
    return "news";
  }
  if (/(vision|mission|about\s+(the\s+)?university|motto)/i.test(q)) {
    return "about";
  }
  if (/(attendance|exam|gpa|semester|grading)/i.test(q)) {
    return "academic";
  }
  if (/program|bs |bba|b\.?sc|post-adp|erozgaar|ai|data\s+science/.test(q)) {
    return "program_lookup";
  }
  return "general";
}

type Person = {
  name: string;
  role: string;
  unit?: string;
  faculty?: string;
  email?: string;
  qualification?: string;
  program?: string;
};

function nameTokens(name: string): string[] {
  return norm(name)
    .replace(/\./g, " ")
    .split(/[^a-z0-9]+/)
    .filter(
      (t) =>
        t.length > 2 &&
        !["dr", "prof", "engr", "sir", "the", "and"].includes(t),
    );
}

function collectPeople(
  faculties: Fac[],
  admin: any,
  vision: any,
  teaching: any,
): Person[] {
  const people: Person[] = [];
  const vc = admin?.vice_chancellor?.name || vision?.vice_chancellor;
  if (typeof vc === "string" && vc) {
    people.push({
      name: vc,
      role: "Vice Chancellor",
      unit: "University of Layyah (academic and executive head)",
    });
  }
  if (admin?.chancellor) {
    people.push({ name: String(admin.chancellor), role: "Chancellor" });
  }
  if (admin?.registrar?.name) {
    people.push({ name: admin.registrar.name, role: "Registrar" });
  }
  if (admin?.director_oric?.name) {
    people.push({
      name: admin.director_oric.name,
      role: "Director ORIC",
      unit: admin.director_oric.note,
    });
  }
  for (const fac of faculties) {
    if (fac.dean?.name) {
      people.push({
        name: fac.dean.name,
        role: fac.dean.designation || "Dean",
        unit: fac.name,
        faculty: fac.name,
        email: fac.dean.email,
      });
    }
    for (const dep of fac.departments || []) {
      for (const s of dep.staff || []) {
        if (!s.name) continue;
        people.push({
          name: s.name,
          role: s.designation || s.role || "Faculty member",
          unit: dep.name,
          faculty: fac.name,
          email: s.email,
          qualification: s.qualification,
          program: s.program,
        });
      }
    }
  }
  for (const s of teaching?.all_staff || []) {
    if (!s?.name) continue;
    people.push({
      name: s.name,
      role: s.designation || s.role || "Staff",
      unit: s.unit,
      faculty: s.faculty,
      email: s.email,
      qualification: s.qualification,
      program: s.program,
    });
  }
  return people;
}

function findPeopleByQuery(query: string, people: Person[]): Person[] {
  const q = norm(query);
  const tokens = q
    .replace(
      /who\s+is|who'?s|tell me about|the|of|university|layyah|please|kaun|kon|hai|hain|hy|ke|ki|ka|ko|se|mein|mujhe|batao|bataen|kya|kia|\?/g,
      " ",
    )
    .replace(/\./g, " ")
    .split(/[^a-z0-9]+/)
    .filter(
      (t) =>
        t.length > 2 &&
        !["dr", "prof", "engr", "sir", "madam", "assistant", "professor", "lecturer"].includes(
          t,
        ),
    );

  if (!tokens.length) return [];

  const scored = people.map((p) => {
    const keys = nameTokens(p.name);
    let score = 0;
    for (const t of tokens) {
      if (keys.includes(t)) score += t.length >= 5 ? 5 : 3;
      else if (keys.some((k) => k.startsWith(t) || t.startsWith(k))) score += 2;
    }
    return { p, score };
  });

  const best = Math.max(0, ...scored.map((s) => s.score));
  if (best < 3) return [];
  return scored
    .filter((s) => s.score === best)
    .map((s) => s.p)
    .filter((p, i, arr) => arr.findIndex((x) => x.name === p.name && x.role === p.role) === i)
    .slice(0, 6);
}

function answerWho(
  query: string,
  faculties: Fac[],
  admin: any,
  vision: any,
  teaching: any,
): string {
  const q = norm(query);
  const vcName =
    (typeof admin?.vice_chancellor?.name === "string" && admin.vice_chancellor.name) ||
    (typeof vision?.vice_chancellor === "string" && vision.vice_chancellor) ||
    "Prof. Dr. Muhammad Zubair Abu Bakar";

  if (isVcQuery(q)) {
    return (
      [
        `The Vice Chancellor of the University of Layyah is **${vcName}**.`,
        "",
        "He is the academic and executive head of the university.",
        vision?.vc_message_summary ? `_${vision.vc_message_summary}_` : "",
        "",
        `- **Chancellor:** ${admin?.chancellor || "Governor of Punjab"}`,
        `- **Registrar:** ${admin?.registrar?.name || "Dr. Azhar Baloch"}`,
        "",
        "Would you like the VC’s public message, contact details, or a list of faculties?",
      ]
        .filter((line, i, arr) => !(line === "" && arr[i - 1] === ""))
        .join("\n") + footer()
    );
  }

  if (/\bchancellor\b/.test(q) && !/vice/.test(q) && !/\bvc\b/.test(q)) {
    return (
      `The **Chancellor** of the University of Layyah is the **${admin?.chancellor || "Governor of Punjab"}**. Day-to-day academic leadership is with the Vice Chancellor, **${vcName}**.` +
      footer()
    );
  }

  if (/registrar/.test(q)) {
    return (
      `The **Registrar** of the University of Layyah is **${admin?.registrar?.name || "Dr. Azhar Baloch"}**. For official letters and records, contact [ul.edu.pk](https://ul.edu.pk) or info@ul.edu.pk.` +
      footer()
    );
  }

  if (/oric/.test(q)) {
    return (
      `**ORIC** (Office of Research, Innovation & Commercialization) is led by **${admin?.director_oric?.name || "Dr. Zeshan Hassan"}**.` +
      footer()
    );
  }

  if (/dean/.test(q)) {
    const computing = faculties.find((f) => /comput/i.test(f.name));
    const focus =
      faculties.find((f) => {
        const n = norm(f.name);
        return (
          (q.includes("comput") && n.includes("comput")) ||
          (q.includes("vet") && n.includes("vet")) ||
          (q.includes("agricultur") && n.includes("agricultur")) ||
          (q.includes("management") && n.includes("management")) ||
          (q.includes("natural") && n.includes("natural"))
        );
      }) || (/comput|engineering|cs/.test(q) ? computing : undefined);

    if (focus?.dean?.name) {
      return (
        [
          `The Dean of **${focus.name}** is **${focus.dean.name}**${focus.dean.designation ? ` (${focus.dean.designation})` : ""}.`,
          focus.dean.email ? `Email: ${focus.dean.email}` : "",
          "",
          "I can also list departments or teaching staff in this faculty if you want.",
        ]
          .filter(Boolean)
          .join("\n") + footer()
      );
    }
  }

  const people = collectPeople(faculties, admin, vision, teaching);
  const unique = findPeopleByQuery(query, people);
  const byName = [...new Map(unique.map((p) => [p.name, p])).values()];

  if (byName.length === 1) {
    const p = byName[0];
    const same = unique.filter((x) => x.name === p.name);
    const role = same.map((x) => x.role).filter(Boolean)[0];
    const unit = same.map((x) => x.unit).find(Boolean);
    const faculty = same.map((x) => x.faculty).find(Boolean);
    const program = same.map((x) => x.program).find(Boolean);
    const qualification = same.map((x) => x.qualification).find(Boolean);
    const email = same.map((x) => x.email).find(Boolean);
    const shownRole = /computer engineering/i.test(unit || "")
      ? (role || "").replace(/\bvisiting\b/gi, " ").replace(/\s+/g, " ").trim()
      : role;
    return (
      [
        `**${p.name}** is **${displayTitle(shownRole) || shownRole}**${unit ? ` in the **${unit}**` : ""}${faculty ? `, ${faculty}` : ""} at the University of Layyah.`,
        program ? `Listed on ul.edu.pk as Program Incharge for **${program}**.` : "",
        qualification ? qualification : "",
        email ? `Email: ${email}` : "",
        "",
        "This is taken from the official University of Layyah website.",
      ]
        .filter(Boolean)
        .join("\n") + footer()
    );
  }

  if (byName.length > 1) {
    return (
      [
        "I found these matching people at the University of Layyah:",
        "",
        ...byName.map(
          (p) =>
            `- **${p.name}** — ${p.role}${p.unit ? ` (${p.unit})` : ""}`,
        ),
        "",
        "Tell me the full name if you want one person.",
      ].join("\n") + footer()
    );
  }

  return (
    `I could not match that name in the current University of Layyah directory from [ul.edu.pk](https://ul.edu.pk). You can ask for a department’s teaching staff (for example: “IT teaching staff”) or a role such as “Who is the VC?”` +
    footer()
  );
}

function answerGreet(): string {
  return (
    [
      "**Assalam-o-Alaikum**",
      "",
      "I am the University of Layyah assistant. I can help with:",
      "",
      "- Admissions and how to apply",
      "- Programs and faculties",
      "- Campuses and maps",
      "- Fees and scholarships",
      "- Staff, buses, and labs",
    ].join("\n") + footer()
  );
}

function answerPrograms(faculties: Fac[]): string {
  const lines = [
    "Here are the academic programs currently listed for the **University of Layyah**, grouped by faculty:",
    "",
  ];

  let total = 0;
  for (const fac of faculties) {
    lines.push(`### ${fac.name}`);
    if (fac.campus && !/confirm/i.test(fac.campus)) {
      lines.push(`_${fac.campus}_`);
    }
    for (const dep of fac.departments || []) {
      const programs = (dep.programs || []).map(progName).filter(Boolean);
      if (!programs.length) continue;
      lines.push(`**${dep.name}**`);
      for (const name of programs) {
        lines.push(`- ${name}`);
        total += 1;
      }
      lines.push("");
    }
  }

  lines.push(`**Total:** ${total} programs`);
  lines.push(
    "Apply online via [eportal.ul.edu.pk](https://eportal.ul.edu.pk). Check fees at [Fee Structure](https://ul.edu.pk/page/Fee-Structure).",
  );
  return lines.join("\n") + footer();
}

function answerFaculties(faculties: Fac[]): string {
  const lines = [
    "**University of Layyah — Faculties & Departments**",
    "",
  ];
  for (const fac of faculties) {
    lines.push(`### ${fac.name}`);
    if (fac.dean?.name) lines.push(`- Dean: ${fac.dean.name}`);
    if (fac.campus && !/confirm/i.test(fac.campus)) {
      lines.push(`- Campus: ${fac.campus}`);
    }
    for (const dep of fac.departments || []) {
      const n = (dep.programs || []).length;
      lines.push(
        `- **${dep.name}**${n ? ` (${n} program${n === 1 ? "" : "s"})` : ""}`,
      );
    }
    lines.push("");
  }
  return lines.join("\n") + footer();
}

function answerStaff(query: string, faculties: Fac[], _teaching: any): string {
  const q = norm(query);
  const lines: string[] = ["**Teaching Staff — University of Layyah**", ""];

  const focusFaculty = faculties.find((f) => {
    const n = norm(f.name);
    return (
      (q.includes("comput") && n.includes("comput")) ||
      (q.includes("vet") && n.includes("vet")) ||
      (q.includes("agricultur") && n.includes("agricultur")) ||
      (q.includes("management") && n.includes("management")) ||
      (q.includes("natural") && n.includes("natural"))
    );
  });

  const focusDept = (() => {
    for (const f of faculties) {
      for (const d of f.departments || []) {
        const n = norm(d.name);
        if (
          ((q.includes("computer science") || /\bcs\b/.test(q)) &&
            n.includes("computer science")) ||
          ((q.includes("information technology") || /\bit\b/.test(q)) &&
            n.includes("information technology")) ||
          ((q.includes("computer engineering") || /\bce\b/.test(q)) &&
            n.includes("computer engineering")) ||
          (q.includes("chemistry") && n.includes("chemistry")) ||
          (q.includes("physics") && n.includes("physics")) ||
          (q.includes("math") && n.includes("math")) ||
          (q.includes("botany") && n.includes("botany")) ||
          (q.includes("zoology") && n.includes("zoology")) ||
          (q.includes("erozgaar") && n.includes("rozgaar"))
        ) {
          return { fac: f, dep: d };
        }
      }
    }
    return null;
  })();

  if (/dean/.test(q) && (focusFaculty || /comput/.test(q))) {
    const fac =
      focusFaculty ||
      faculties.find((f) => /comput/i.test(f.name)) ||
      faculties[0];
    if (fac?.dean?.name) {
      return (
        [
          `**Dean — ${fac.name}**`,
          "",
          `- **${fac.dean.name}**${fac.dean.designation ? ` (${fac.dean.designation})` : ""}`,
          fac.dean.email ? `- Email: ${fac.dean.email}` : "",
          fac.campus && !/confirm/i.test(fac.campus)
            ? `- Campus: ${fac.campus}`
            : "",
        ]
          .filter(Boolean)
          .join("\n") + footer()
      );
    }
  }

  if (focusDept) {
    const { fac, dep } = focusDept;
    lines.push(`### ${dep.name}`);
    if (dep.campus || dep.location) {
      lines.push(`- Location: ${dep.location || dep.campus}`);
    }
    if (fac.dean?.name) lines.push(`- Faculty Dean: ${fac.dean.name}`);
    lines.push("");
    const listed = dep.staff || [];
    for (const s of listed) {
      const raw = s.designation || s.role || "";
      const title = displayTitle(
        /computer engineering/i.test(dep.name)
          ? raw.replace(/\bvisiting\b/gi, " ").replace(/\s+/g, " ").trim()
          : raw,
      );
      lines.push(
        `- **${s.name}**${title ? ` — ${title}` : ""}${s.email ? ` (${s.email})` : ""}`,
      );
    }
    if (!listed.length) {
      lines.push("_Staff details are listed on the department page at ul.edu.pk._");
    }
    return lines.join("\n") + footer();
  }

  return (
    [
      "I can list teaching staff, but I need a department or faculty so I do not dump the wrong people.",
      "",
      "Try one of these:",
      "- Who is the VC?",
      "- Who is the Dean of Computing?",
      "- Computer Science teaching staff",
      "- Faculty of Veterinary Sciences staff",
    ].join("\n") + footer()
  );
}

function answerLocation(query: string, faculties: Fac[], campuses: any, locs: any): string {
  const q = norm(query);
  const lines: string[] = [];

  if (/computer science|bscs|\bcs\b/.test(q)) {
    lines.push(
      "**Department of Computer Science**",
      "",
      "- **Campus:** Main Campus (not City Campus)",
      "- **Building:** Faculty of Computing and Engineering building",
      "- **Address area:** Karor Road (Hafiz Abad), Layyah",
      "",
      "**Programs:** BS Computer Science · BSCS – Artificial Intelligence",
    );
    return lines.join("\n") + footer();
  }
  if (/information technology|\bit\b|bsds|data science/.test(q)) {
    lines.push(
      "**Department of Information Technology**",
      "",
      "- **Campus:** Main Campus",
      "- **Building:** Faculty of Computing and Engineering building",
      "- **Programs:** BSCS – Information Technology · BSCS – Data Science",
    );
    return lines.join("\n") + footer();
  }
  if (/computer engineering/.test(q)) {
    lines.push(
      "**Department of Computer Engineering**",
      "",
      "- **Campus:** Main Campus",
      "- **Building:** Faculty of Computing and Engineering building",
      "- **Program:** B.Sc Computer Engineering",
    );
    return lines.join("\n") + footer();
  }
  if (/erozgaar|e-rozgaar/.test(q)) {
    lines.push(
      "**E-Rozgaar Program**",
      "",
      "- **Campus:** Main Campus",
      "- **Location:** E-Rozgaar Lab, 1st Floor, Faculty of Computing and Engineering building",
      "- **Portal:** https://erozgaar.ul.edu.pk",
    );
    return lines.join("\n") + footer();
  }

  if (Array.isArray(campuses)) {
    lines.push("**University of Layyah — Campuses**", "");
    for (const c of campuses) {
      lines.push(`### ${c.name}`);
      lines.push(`- ${c.location}`);
      if (c.area) lines.push(`- Area: ${c.area}`);
      if (c.google_maps_url) lines.push(`- Map: ${c.google_maps_url}`);
      lines.push("");
    }
    if (locs?.important) lines.push(`_${locs.important}_`);
    return lines.join("\n") + footer();
  }

  return (
    "University of Layyah has two campuses: **City Campus** (Katchehry Road) and **Main Campus** (Karor Road / Hafiz Abad). Computing departments are at Main Campus." +
    footer()
  );
}

function answerTransport(transport: any): string {
  if (!transport) {
    return "Transport details are available from the Transport Section. Contact info@ul.edu.pk · +92-0606-920247.";
  }
  const lines = [
    "**University Transport — University of Layyah**",
    "",
    transport.fleet ? `- ${transport.fleet}` : "",
    "",
    "**City Route 01** (08:00 AM from City Campus)",
    "",
  ];
  const r1 = transport.city_routes?.route_01?.stops;
  if (Array.isArray(r1)) {
    for (const stop of r1) lines.push(`- ${stop}`);
  }
  lines.push("", "**City Route 02** (08:00 AM from City Campus)", "");
  const r2 = transport.city_routes?.route_02?.stops;
  if (Array.isArray(r2)) {
    for (const stop of r2) lines.push(`- ${stop}`);
  }

  lines.push("", "**City to Main Campus schedule (selected)**");
  for (const row of (transport.inter_campus_and_city_schedule || []).slice(0, 12)) {
    lines.push(`- **${row.time}** from ${row.from}: ${row.route}`);
  }
  lines.push("", "_Confirm current timings with the Transport Section._");
  return lines.filter((l, i, a) => !(l === "" && a[i - 1] === "")).join("\n") + footer();
}

function answerLabs(labs: any): string {
  const block = labs?.faculty_of_computing_and_engineering_building;
  const lines = [
    "**Computing Laboratories — Main Campus**",
    "",
    "All computing labs are in the **Faculty of Computing and Engineering building, Main Campus**:",
    "",
  ];
  for (const lab of block?.labs || []) {
    lines.push(`- **${lab.name}** — ${lab.location}`);
  }
  return lines.join("\n") + footer();
}

function answerLibraries(libraries: any): string {
  const lines = ["**Libraries — University of Layyah**", ""];
  if (libraries?.university_central_library) {
    const L = libraries.university_central_library;
    lines.push(`- **${L.name}** — ${L.campus} (${L.location})`);
  }
  if (libraries?.computing_faculty_library) {
    const L = libraries.computing_faculty_library;
    lines.push(`- **${L.name}** — ${L.campus} (${L.location})`);
  }
  return lines.join("\n") + footer();
}

function answerFees(fees: any): string {
  return (
    [
      "**Fee Structure — University of Layyah**",
      "",
      "Official fee amounts depend on program, shift, and admission year. Check the current figure like this:",
      "",
      "1. Open [Fee Structure](https://ul.edu.pk/page/Fee-Structure)",
      "2. Select Category, Shift, and Admission Year",
      "3. Click **Search** for the current fee",
      "",
      fees?.known_fees?.erozgaar_each_course
        ? `- **E-Rozgaar:** ${fees.known_fees.erozgaar_each_course}`
        : "- **E-Rozgaar:** Rs. 7,000 per course",
      "",
      "- **Accounts:** City Campus",
      "- **Email:** info@ul.edu.pk",
      "- **Phone:** +92-0606-920247",
    ].join("\n") + footer()
  );
}

function answerAdmissions(adm: any): string {
  const steps = adm?.how_to_apply || [];
  const lines = [
    "**Admissions — University of Layyah**",
    "",
    "Apply online through the official portal:",
    "- Portal: [eportal.ul.edu.pk](https://eportal.ul.edu.pk)",
    "- Guide: [How to Apply](https://ul.edu.pk/page/How-to-Apply)",
    "- Eligibility: [Eligibility Criteria](https://ul.edu.pk/page/Eligibility-Criteria)",
    "- Schedule: [Admission Schedule](https://ul.edu.pk/page/Admission-Schedule)",
    "",
    "**Typical steps:**",
  ];
  for (const s of steps.slice(0, 7)) lines.push(`- ${s}`);
  return lines.join("\n") + footer();
}

function answerContact(contact: any): string {
  return (
    [
      "**Contact — University of Layyah**",
      "",
      `- **Email:** ${contact?.email || "info@ul.edu.pk"}`,
      `- **Phone:** ${contact?.main_phone || "+92-0606-920247"}`,
      contact?.phone_alt ? `- **Alt:** ${contact.phone_alt}` : "",
      `- **City Campus:** ${contact?.city_campus_address || "Katchehry Road, Layyah"}`,
      `- **Main Campus:** ${contact?.main_campus_address || "Karor Road (Hafiz Abad), Layyah"}`,
      `- **Website:** https://ul.edu.pk`,
      `- **ePortal:** https://eportal.ul.edu.pk`,
    ]
      .filter(Boolean)
      .join("\n") + footer()
  );
}

function answerAbout(uni: any, vision: any): string {
  return (
    [
      "**About University of Layyah**",
      "",
      uni?.history || vision?.history || "",
      "",
      vision?.motto ? `- **Motto:** ${vision.motto}` : "",
      vision?.vision ? `- **Vision:** ${vision.vision}` : "",
      vision?.mission ? `- **Mission:** ${vision.mission}` : "",
      vision?.vice_chancellor
        ? `- **Vice Chancellor:** ${vision.vice_chancellor}`
        : "",
      "",
      `- Students: ${uni?.student_count ?? 5462}`,
      `- Faculties: ${uni?.total_faculties ?? 5} · Departments: ${uni?.total_departments ?? 21} · Programs: ${uni?.total_programs ?? 56}`,
      `- HEC-recognized public university · https://ul.edu.pk`,
    ]
      .filter(Boolean)
      .join("\n") + footer()
  );
}

function answerNews(ann: any): string {
  const lines = ["**Latest from University of Layyah**", ""];
  for (const s of (ann?.latest_stories || []).slice(0, 6)) {
    lines.push(`- **${s.title}**${s.url ? ` — [read more](${s.url})` : ""}`);
  }
  if (lines.length === 2) {
    lines.push("See https://ul.edu.pk for the latest news and notices.");
  }
  return lines.join("\n") + footer();
}

function answerAcademic(acad: any, exam: any): string {
  return (
    [
      "**Academics & Examinations**",
      "",
      acad?.system ? `- System: **${acad.system}**` : "",
      exam?.attendance_policy?.minimum_attendance
        ? `- Attendance: **${exam.attendance_policy.minimum_attendance}** required`
        : "- Attendance: typically **75%** required to sit finals",
      acad?.grading_system?.scale
        ? `- Grading: ${acad.grading_system.scale}`
        : "",
      "",
      "Carry your University ID to exams. Confirm current rules with the Examination Cell (City Campus).",
    ]
      .filter(Boolean)
      .join("\n") + footer()
  );
}

function answerProgramLookup(query: string, faculties: Fac[]): string {
  const q = norm(query);
  const hits: string[] = [];
  for (const fac of faculties) {
    for (const dep of fac.departments || []) {
      for (const p of dep.programs || []) {
        const name = progName(p);
        if (norm(name).split(/[^a-z0-9]+/).some((t) => t.length > 2 && q.includes(t))) {
          hits.push(
            `- **${name}** — ${dep.name}${dep.campus && !/confirm/i.test(dep.campus) ? ` (${dep.campus})` : ""} · ${fac.name}`,
          );
        }
      }
    }
  }
  // Also match common aliases
  const aliases: Record<string, string> = {
    bsai: "artificial intelligence",
    bsds: "data science",
    bscs: "computer science",
    "bs it": "information technology",
  };
  for (const [alias, needle] of Object.entries(aliases)) {
    if (q.includes(alias) || q.includes(needle)) {
      for (const fac of faculties) {
        for (const dep of fac.departments || []) {
          for (const p of dep.programs || []) {
            const name = progName(p);
            if (norm(name).includes(needle) || norm(name).includes(alias.replace("bs ", ""))) {
              const line = `- **${name}** — ${dep.name}${dep.campus && !/confirm/i.test(String(dep.campus)) ? ` (${dep.campus})` : ""}`;
              if (!hits.includes(line)) hits.push(line);
            }
          }
        }
      }
    }
  }

  if (!hits.length) {
    return answerGreet();
  }

  return (
    ["**Matching programs — University of Layyah**", "", ...[...new Set(hits)].slice(0, 12)].join(
      "\n",
    ) + footer()
  );
}

function answerScholarships(data: any): string {
  const list = Array.isArray(data) ? data : [];
  const lines = ["**Scholarships — University of Layyah**", ""];
  for (const s of list) {
    lines.push(`- **${s.name}**${s.apply_at ? ` — ${s.apply_at}` : ""}`);
    if (s.eligibility) lines.push(`  _${s.eligibility}_`);
  }
  if (!list.length) {
    lines.push("See https://ul.edu.pk/page/Scholarships");
  }
  return lines.join("\n") + footer();
}

/**
 * Compose a professional answer. `sections` should include all KB rows when possible.
 */
export function composeProfessionalAnswer(
  query: string,
  sections: KnowledgeSectionRow[],
): string {
  if (!query.trim()) {
    return answerGreet();
  }

  const faculties = (sectionData<Fac[]>(sections, "faculties") || []) as Fac[];
  const matchQuery = expandQueryForMatching(query);
  const intent = detectIntent(matchQuery);

  let answer = "";
  switch (intent) {
    case "greet":
      answer = answerGreet();
      break;
    case "who":
      answer = answerWho(
        matchQuery,
        faculties,
        sectionData(sections, "administration"),
        sectionData(sections, "vision_mission"),
        sectionData(sections, "teaching_staff"),
      );
      break;
    case "programs":
      answer = answerPrograms(faculties);
      break;
    case "faculties":
      answer = answerFaculties(faculties);
      break;
    case "staff":
      answer = answerStaff(
        matchQuery,
        faculties,
        sectionData(sections, "teaching_staff"),
      );
      break;
    case "location":
      answer = answerLocation(
        matchQuery,
        faculties,
        sectionData(sections, "campuses"),
        sectionData(sections, "department_locations"),
      );
      break;
    case "transport":
      answer = answerTransport(sectionData(sections, "transport"));
      break;
    case "labs":
      answer = answerLabs(sectionData(sections, "laboratories"));
      break;
    case "libraries":
      answer = answerLibraries(sectionData(sections, "libraries"));
      break;
    case "fees":
      answer = answerFees(sectionData(sections, "fee_structure"));
      break;
    case "admissions":
      answer = answerAdmissions(sectionData(sections, "admissions"));
      break;
    case "scholarships":
      answer = answerScholarships(sectionData(sections, "scholarships"));
      break;
    case "contact":
      answer = answerContact(sectionData(sections, "contact_information"));
      break;
    case "about":
      answer = answerAbout(
        sectionData(sections, "university"),
        sectionData(sections, "vision_mission"),
      );
      break;
    case "news":
      answer = answerNews(sectionData(sections, "announcements"));
      break;
    case "academic":
      answer = answerAcademic(
        sectionData(sections, "academic_system"),
        sectionData(sections, "examination_guidelines"),
      );
      break;
    case "program_lookup":
      answer = answerProgramLookup(matchQuery, faculties);
      break;
    default:
      answer = answerWho(
        matchQuery,
        faculties,
        sectionData(sections, "administration"),
        sectionData(sections, "vision_mission"),
        sectionData(sections, "teaching_staff"),
      );
      if (/could not match that name/i.test(answer)) {
        answer =
          [
            "**How I can help**",
            "",
            "Ask about:",
            "",
            "- Programs and faculties",
            "- Admissions and how to apply",
            "- Campuses and maps",
            "- Fees and scholarships",
            "- Staff, buses, and labs",
            "",
            "Try: *Who is the VC?* or *What programs are offered?*",
          ].join("\n") + footer();
      }
      break;
  }

  return enforceLayyahSpelling(answer);
}
