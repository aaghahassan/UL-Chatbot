/**
 * English / Urdu / Roman Urdu for the university desk.
 * Facts are composed in English from the KB, then labels/sentences are translated.
 * Names, emails, URLs, and phone numbers are never rewritten.
 */

export function stripEmDashes(text: string): string {
  return text.replace(/&mdash;|&#8212;/gi, " - ").replace(/\s*\u2014\s*/g, " - ");
}

export function polishChatMarkdown(text: string): string {
  return stripEmDashes(text)
    .replace(/^(?!\s*[-*] |\s*\d+\. )(.+)\n(?=[-*] |\d+\. )/gm, "$1\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export type ChatLanguage = "en" | "ur" | "roman";

export function parseChatLanguage(value: unknown): ChatLanguage | undefined {
  const v = String(value || "")
    .toLowerCase()
    .trim();
  if (v === "ur" || v === "urdu" || v === "اردو") return "ur";
  if (v === "roman" || v === "roman-urdu" || v === "roman_urdu" || v === "ro") {
    return "roman";
  }
  if (v === "en" || v === "eng" || v === "english") return "en";
  return undefined;
}

export function detectLanguage(query: string): ChatLanguage {
  const q = query || "";
  if (/[\u0600-\u06FF]/.test(q)) return "ur";
  const romanHits =
    /\b(hai|hain|hy|kya|kia|kaun|kon|kahan|kidhar|kaise|kese|kyun|kyon|batao|bataen|btaye|apna|aap|mein|mujhe|mujh|hamara|wali|wale|kitni|kitna|dakhlah|asatiza|ustad|fees?)\b/i.test(
      q,
    );
  if (romanHits) return "roman";
  return "en";
}

export function resolveChatLanguage(preferred: unknown, query: string): ChatLanguage {
  return parseChatLanguage(preferred) || detectLanguage(query);
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Map Urdu + Roman Urdu into English keywords so intent matching stays accurate. */
export function expandQueryForMatching(query: string): string {
  let q = query || "";

  const pairs: Array<[RegExp, string]> = [
    [/السلام\s*علیکم|السلام علیکم/g, " hello "],
    [/وائس\s*چانسلر|وائس چانسلر|وی\s*سی/g, " vice chancellor "],
    [/چانسلر/g, " chancellor "],
    [/رجسٹرار/g, " registrar "],
    [/ڈین/g, " dean "],
    [/اساتذہ|اساتذہ|سٹاف|ٹیچرز|ٹیچر|لیکچررز|لیکچرر/g, " staff teachers lecturers "],
    [/کمپیوٹر\s*انجینئرنگ|کمپیوٹر انجینئرنگ/g, " computer engineering "],
    [/کمپیوٹر\s*سائنس|کمپیوٹر سائنس/g, " computer science "],
    [/انفارمیشن\s*ٹیکنالوجی|انفارمیشن ٹیکنالوجی/g, " information technology "],
    [/فیکلٹی/g, " faculty "],
    [/ڈیپارٹمنٹ|شعبہ/g, " department "],
    [/پروگرامز|پروگرام/g, " programs "],
    [/داخلہ|ایڈمیشن/g, " admission apply "],
    [/فیس|ٹیوشن/g, " fee fees "],
    [/سکالرشپ| وظیفہ/g, " scholarship "],
    [/کیمپس/g, " campus location "],
    [/کہاں\s*ہے|کہاں ہیں|واقع/g, " where is located "],
    [/کون\s*ہے|کون ہیں|کون سی|کونسا/g, " who is "],
    [/کیسے|کیسے کریں/g, " how to "],
    [/رابطہ|فون|ای میل/g, " contact phone email "],
    [/بس|ٹرانسپورٹ|گاڑی/g, " bus transport "],
    [/لائبریری/g, " library "],
    [/لیبارٹری|لیب/g, " lab laboratory "],
    [/خبریں|اعلانات/g, " news announcements "],
    [/ویژن|مشن|تعارف/g, " vision mission about "],
    [/حاضری|امتحان/g, " attendance exam "],
  ];

  for (const [re, en] of pairs) q = q.replace(re, en);

  const roman: Array<[RegExp, string]> = [
    [/\b(assalam[o\- ]?alaikum|assalamualaikum|salaam|salam|aoa)\b/gi, " hello "],
    [/\b(shukriya|thanks|thank\s*you)\b/gi, " thanks "],
    [/\b(kaun|kon|konse|konsa)\s+(hai|hain|hy|he)\b/gi, " who is "],
    [/\b(kaun|kon)\b/gi, " who "],
    [/\b(kahan|kidhar|kahaan)\s+(hai|hain|hy|located|per)\b/gi, " where is located "],
    [/\b(kahan|kidhar|kahaan)\b/gi, " where "],
    [/\b(kaise|kese|kis\s+tarah)\s+(apply|admission|dakhlah)?\b/gi, " how to "],
    [/\b(kitni|kitna|kia|kya)\s+(hai|hain|hy|he)?\b/gi, " what is "],
    [/\b(batao|bataen|batao|btaye|btaen|btao)\b/gi, " tell "],
    [/\b(asatiza|ustad|ustaaad|teachers?|lecturers?)\b/gi, " staff teachers lecturers "],
    [/\b(dakhlah|admission)\b/gi, " admission apply "],
    [/\bfees?\b/gi, " fee fees "],
    [/\b(scholarship|wazeefa)\b/gi, " scholarship "],
    [/\b(campus|kempis)\b/gi, " campus "],
    [/\b(bus|gaari|gari|transport)\b/gi, " bus transport "],
    [/\b(library|kitab khana)\b/gi, " library "],
    [/\b(lab|labs|laboratory)\b/gi, " lab laboratory "],
    [/\b(programs?|courses?|degrees?)\b/gi, " programs "],
    [/\bfaculty\b/gi, " faculty "],
    [/\b(contact|rabta|number|phone)\b/gi, " contact phone "],
    [/\b(v\.?c\.?|vice[\s-]*chancellor)\b/gi, " vice chancellor "],
    [/\bdean\b/gi, " dean "],
    [/\bregistrar\b/gi, " registrar "],
    [/\b(computer\s*engineering|comp\s*engg?)\b/gi, " computer engineering "],
    [/\bce\s+(ka|ke|ki|staff|teachers|department)\b/gi, " computer engineering $1 "],
    [/\b(computer\s*science|comp\s*sci)\b/gi, " computer science "],
    [/\bcs\s+(ka|ke|ki|staff|teachers|department)\b/gi, " computer science $1 "],
    [/\bit\s+(ka|ke|ki|staff|teachers|department)\b/gi, " information technology $1 "],
    [/\b(information\s*technology)\b/gi, " information technology "],
    [/\b(main\s*campus|city\s*campus)\b/gi, " $1 "],
  ];

  for (const [re, en] of roman) q = q.replace(re, en);

  const extra: string[] = [];
  const lower = `${query} ${q}`.toLowerCase();
  if (/(staff|teacher|lecturer|asatiza|ustad|اساتذہ|سٹاف)/i.test(lower)) {
    extra.push("staff teachers lecturers");
  }
  if (/(computer engineering|کمپیوٹر انجینئرنگ|\bce\b)/i.test(lower)) {
    extra.push("computer engineering");
  }
  if (/(computer science|کمپیوٹر سائنس|\bcs\b)/i.test(lower)) {
    extra.push("computer science");
  }
  if (
    /(information technology|انفارمیشن|it\s+(ka|ke|ki|staff|department))/i.test(
      lower,
    )
  ) {
    extra.push("information technology");
  }

  return `${query} ${q} ${extra.join(" ")}`.replace(/\s+/g, " ").trim();
}

type Pair = { ur: string; roman: string };

const PHRASES: Array<[string, Pair]> = [
  [
    "I am the University of Layyah assistant. I can help with:",
    {
      ur: "میں یونیورسٹی آف لیہ کا اسسٹنٹ ہوں۔ ان موضوعات میں مدد کر سکتا ہوں:",
      roman: "Main University of Layyah ka assistant hoon. In topics mein madad kar sakta hoon:",
    },
  ],
  [
    "Admissions and how to apply",
    { ur: "داخلہ اور درخواست کا طریقہ", roman: "Admission aur apply karne ka tariqa" },
  ],
  [
    "Programs and faculties",
    { ur: "پروگرامز اور فیکلٹیز", roman: "Programs aur faculties" },
  ],
  [
    "Campuses and maps",
    { ur: "کیمپسز اور نقشے", roman: "Campuses aur maps" },
  ],
  [
    "Fees and scholarships",
    { ur: "فیس اور سکالرشپس", roman: "Fees aur scholarships" },
  ],
  [
    "Staff, buses, and labs",
    { ur: "سٹاف، بسیں، اور لیبز", roman: "Staff, buses, aur labs" },
  ],
  [
    "Need more help?",
    { ur: "مزید مدد چاہیے؟", roman: "Mazeed madad chahiye?" },
  ],
  [
    "How I can help",
    { ur: "میں کس طرح مدد کر سکتا ہوں", roman: "Main kis tarah madad kar sakta hoon" },
  ],
  [
    "Assalam-o-Alaikum! I am the University of Layyah assistant. I can help with admissions, programs, campuses, fees, staff, buses, and labs — just ask in your own words.",
    {
      ur: "السلام علیکم! میں یونیورسٹی آف لیہ کا اسسٹنٹ ہوں۔ داخلہ، پروگرامز، کیمپس، فیس، سٹاف، بس اور لیبز کے بارے میں پوچھیں — اپنی زبان میں لکھیں۔",
      roman: "Assalam-o-Alaikum! Main University of Layyah ka assistant hoon. Admission, programs, campuses, fees, staff, buses aur labs ke baare mein poochiye — apni language mein likhein.",
    },
  ],
  [
    "Assalam-o-Alaikum! I am the University of Layyah assistant. Ask about programs, admissions, campuses, fees, staff, buses, or labs.",
    {
      ur: "السلام علیکم! میں یونیورسٹی آف لیہ کا اسسٹنٹ ہوں۔ پروگرامز، داخلہ، کیمپس، فیس، سٹاف، بس یا لیبز کے بارے میں پوچھیں۔",
      roman: "Assalam-o-Alaikum! Main University of Layyah ka assistant hoon. Programs, admission, campuses, fees, staff, buses ya labs ke baare mein poochiye.",
    },
  ],
  [
    "The Vice Chancellor of the University of Layyah is",
    {
      ur: "یونیورسٹی آف لیہ کے وائس چانسلر ہیں",
      roman: "University of Layyah ke Vice Chancellor hain",
    },
  ],
  [
    "He is the academic and executive head of the university.",
    {
      ur: "وہ یونیورسٹی کے علمی اور انتظامی سربراہ ہیں۔",
      roman: "Woh university ke academic aur executive head hain.",
    },
  ],
  [
    "Would you like the VC’s public message, contact details, or a list of faculties?",
    {
      ur: "کیا آپ وائس چانسلر کا پیغام، رابطہ، یا فیکلٹیز کی فہرست چاہتے ہیں؟",
      roman: "Kya aap VC ka message, contact, ya faculties ki list chahte hain?",
    },
  ],
  [
    "The **Chancellor** of the University of Layyah is the",
    {
      ur: "یونیورسٹی آف لیہ کے **چانسلر** ہیں",
      roman: "University of Layyah ke **Chancellor** hain",
    },
  ],
  [
    "Day-to-day academic leadership is with the Vice Chancellor,",
    {
      ur: "روزانہ علمی قیادت وائس چانسلر کے پاس ہے،",
      roman: "Rozana academic leadership Vice Chancellor ke paas hai,",
    },
  ],
  [
    "The **Registrar** of the University of Layyah is",
    {
      ur: "یونیورسٹی آف لیہ کے **رجسٹرار** ہیں",
      roman: "University of Layyah ke **Registrar** hain",
    },
  ],
  [
    "For official letters and records, contact",
    {
      ur: "سرکاری خطوط اور ریکارڈ کے لیے رابطہ کریں",
      roman: "Official letters aur records ke liye rabta karein",
    },
  ],
  [
    "is led by",
    { ur: "کی سربراہی میں ہیں", roman: "ki sarbarahi mein hain" },
  ],
  [
    "The Dean of ",
    { ur: "ڈین — ", roman: "Dean — " },
  ],
  [
    "I can also list departments or teaching staff in this faculty if you want.",
    {
      ur: "اگر چاہیں تو اس فیکلٹی کے شعبے یا تدریسی سٹاف بھی بتا سکتا ہوں۔",
      roman: "Agar chahen to is faculty ke departments ya teaching staff bhi bata sakta hoon.",
    },
  ],
  [
    "Listed on ul.edu.pk as Program Incharge for",
    {
      ur: "ul.edu.pk پر پروگرام انچارج کے طور پر درج:",
      roman: "ul.edu.pk par Program Incharge ke taur par listed:",
    },
  ],
  [
    "This is taken from the official University of Layyah website.",
    {
      ur: "یہ معلومات یونیورسٹی آف لیہ کی آفیشل ویب سائٹ سے لی گئی ہیں۔",
      roman: "Yeh maloomat University of Layyah ki official website se li gayi hain.",
    },
  ],
  [
    "I found these matching people at the University of Layyah:",
    {
      ur: "یونیورسٹی آف لیہ میں یہ نام ملتے ہیں:",
      roman: "University of Layyah mein yeh names milte hain:",
    },
  ],
  [
    "Tell me the full name if you want one person.",
    {
      ur: "اگر ایک شخص چاہیے تو پورا نام لکھیں۔",
      roman: "Agar ek person chahiye to poora name likhein.",
    },
  ],
  [
    "I could not match that name in the current University of Layyah directory from",
    {
      ur: "موجودہ یونیورسٹی آف لیہ ڈائریکٹری میں یہ نام نہیں ملا",
      roman: "Mojuda University of Layyah directory mein yeh name nahi mila",
    },
  ],
  [
    "You can ask for a department’s teaching staff (for example: “IT teaching staff”) or a role such as “Who is the VC?”",
    {
      ur: "آپ کسی شعبے کا تدریسی سٹاف پوچھ سکتے ہیں (مثلاً: IT teaching staff) یا عہدہ جیسے “VC کون ہیں؟”",
      roman: "Aap kisi department ka teaching staff poochh sakte hain (maslan: IT teaching staff) ya role jaise “VC kon hain?”",
    },
  ],
  [
    "Here are the academic programs currently listed for the **University of Layyah**, grouped by faculty:",
    {
      ur: "یونیورسٹی آف لیہ کے موجودہ تعلیمی پروگرام، فیکلٹی کے حساب سے:",
      roman: "University of Layyah ke mojuda academic programs, faculty ke hisaab se:",
    },
  ],
  [
    "Apply online via",
    { ur: "آن لائن درخواست دیں", roman: "Online apply karein" },
  ],
  [
    "Check fees at",
    { ur: "فیس دیکھیں", roman: "Fees dekhein" },
  ],
  [
    "**University of Layyah — Faculties & Departments**",
    {
      ur: "**یونیورسٹی آف لیہ — فیکلٹیز اور شعبے**",
      roman: "**University of Layyah — Faculties & Departments**",
    },
  ],
  [
    "**Teaching Staff — University of Layyah**",
    {
      ur: "**تدریسی سٹاف — یونیورسٹی آف لیہ**",
      roman: "**University of Layyah ka teaching staff**",
    },
  ],
  [
    "I can list teaching staff, but I need a department or faculty so I do not dump the wrong people.",
    {
      ur: "تدریسی سٹاف بتا سکتا ہوں، مگر شعبہ یا فیکلٹی بتائیں تاکہ غلط فہرست نہ جائے۔",
      roman: "Teaching staff bata sakta hoon, magar department ya faculty batayein taake ghalat list na jaye.",
    },
  ],
  [
    "Try one of these:",
    { ur: "ان میں سے پوچھیں:", roman: "In mein se poochiye:" },
  ],
  ["Who is the VC?", { ur: "VC کون ہیں؟", roman: "VC kon hain?" }],
  [
    "Who is the Dean of Computing?",
    { ur: "کمپیوٹنگ کے ڈین کون ہیں؟", roman: "Computing ke Dean kon hain?" },
  ],
  [
    "Computer Science teaching staff",
    {
      ur: "کمپیوٹر سائنس کا تدریسی سٹاف",
      roman: "Computer Science ka teaching staff",
    },
  ],
  [
    "Faculty of Veterinary Sciences staff",
    {
      ur: "ویٹرنری سائنسز فیکلٹی کا سٹاف",
      roman: "Faculty of Veterinary Sciences ka staff",
    },
  ],
  [
    "Staff details are listed on the department page at ul.edu.pk.",
    {
      ur: "سٹاف کی تفصیل شعبے کے صفحے پر ul.edu.pk پر موجود ہے۔",
      roman: "Staff ki tafseel department page par ul.edu.pk par maujood hai.",
    },
  ],
  [
    "University of Layyah has two campuses: **City Campus** (Katchehry Road) and **Main Campus** (Karor Road / Hafiz Abad). Computing departments are at Main Campus.",
    {
      ur: "یونیورسٹی آف لیہ کے دو کیمپس ہیں: **سٹی کیمپس** (کچہری روڈ) اور **مین کیمپس** (کروڑ روڈ / حافظ آباد)۔ کمپیوٹنگ کے شعبے مین کیمپس پر ہیں۔",
      roman: "University of Layyah ke do campuses hain: **City Campus** (Katchehry Road) aur **Main Campus** (Karor Road / Hafiz Abad). Computing departments Main Campus par hain.",
    },
  ],
  [
    "**University of Layyah — Campuses**",
    {
      ur: "**یونیورسٹی آف لیہ — کیمپسز**",
      roman: "**University of Layyah — Campuses**",
    },
  ],
  [
    "**University Transport — University of Layyah**",
    {
      ur: "**یونیورسٹی ٹرانسپورٹ — یونیورسٹی آف لیہ**",
      roman: "**University Transport — University of Layyah**",
    },
  ],
  [
    "Confirm current timings with the Transport Section.",
    {
      ur: "موجودہ ٹائمنگ ٹرانسپورٹ سیکشن سے تصدیق کریں۔",
      roman: "Mojuda timings Transport Section se confirm karein.",
    },
  ],
  [
    "Transport details are available from the Transport Section. Contact",
    {
      ur: "ٹرانسپورٹ کی تفصیل ٹرانسپورٹ سیکشن سے ملے گی۔ رابطہ",
      roman: "Transport ki tafseel Transport Section se milegi. Rabta",
    },
  ],
  [
    "**Computing Laboratories — Main Campus**",
    {
      ur: "**کمپیوٹنگ لیبارٹریز — مین کیمپس**",
      roman: "**Computing Laboratories — Main Campus**",
    },
  ],
  [
    "All computing labs are in the **Faculty of Computing and Engineering building, Main Campus**:",
    {
      ur: "تمام کمپیوٹنگ لیبز **فیکلٹی آف کمپیوٹنگ اینڈ انجینئرنگ بلڈنگ، مین کیمپس** میں ہیں:",
      roman: "Tamam computing labs **Faculty of Computing and Engineering building, Main Campus** mein hain:",
    },
  ],
  [
    "**Libraries — University of Layyah**",
    {
      ur: "**لائبریریز — یونیورسٹی آف لیہ**",
      roman: "**Libraries — University of Layyah**",
    },
  ],
  [
    "**Fee Structure — University of Layyah**",
    {
      ur: "**فیس سٹرکچر — یونیورسٹی آف لیہ**",
      roman: "**Fee Structure — University of Layyah**",
    },
  ],
  [
    "Official fee amounts depend on program, shift, and admission year.",
    {
      ur: "آفیشل فیس پروگرام، شفٹ اور داخلہ سال پر منحصر ہے۔",
      roman: "Official fee program, shift aur admission year par depend karti hai.",
    },
  ],
  [
    "Open [Fee Structure](https://ul.edu.pk/page/Fee-Structure)",
    {
      ur: "[فیس سٹرکچر](https://ul.edu.pk/page/Fee-Structure) کھولیں",
      roman: "[Fee Structure](https://ul.edu.pk/page/Fee-Structure) kholein",
    },
  ],
  [
    "Select Category, Shift, and Admission Year",
    {
      ur: "کیٹیگری، شفٹ اور داخلہ سال منتخب کریں",
      roman: "Category, Shift aur Admission Year select karein",
    },
  ],
  [
    "Click **Search** for the current fee",
    {
      ur: "موجودہ فیس کے لیے **Search** دبائیں",
      roman: "Mojuda fee ke liye **Search** dabayein",
    },
  ],
  [
    "Accounts Section — City Campus",
    {
      ur: "اکاؤنٹس سیکشن — سٹی کیمپس",
      roman: "Accounts Section — City Campus",
    },
  ],
  [
    "**Admissions — University of Layyah**",
    {
      ur: "**داخلہ — یونیورسٹی آف لیہ**",
      roman: "**Admissions — University of Layyah**",
    },
  ],
  [
    "Apply online through the official portal:",
    {
      ur: "آفیشل پورٹل سے آن لائن درخواست دیں:",
      roman: "Official portal se online apply karein:",
    },
  ],
  ["**Typical steps:**", { ur: "**عام مراحل:**", roman: "**Typical steps:**" }],
  [
    "**Contact — University of Layyah**",
    {
      ur: "**رابطہ — یونیورسٹی آف لیہ**",
      roman: "**Contact — University of Layyah**",
    },
  ],
  [
    "**About University of Layyah**",
    {
      ur: "**یونیورسٹی آف لیہ کا تعارف**",
      roman: "**About University of Layyah**",
    },
  ],
  [
    "**Latest from University of Layyah**",
    {
      ur: "**یونیورسٹی آف لیہ کی تازہ خبریں**",
      roman: "**Latest from University of Layyah**",
    },
  ],
  [
    "See https://ul.edu.pk for the latest news and notices.",
    {
      ur: "تازہ خبروں کے لیے https://ul.edu.pk دیکھیں۔",
      roman: "Taza khabron ke liye https://ul.edu.pk dekhein.",
    },
  ],
  [
    "**Academics & Examinations**",
    { ur: "**تعلیم اور امتحانات**", roman: "**Academics & Examinations**" },
  ],
  [
    "Carry your University ID to exams. Confirm current rules with the Examination Cell (City Campus).",
    {
      ur: "امتحان میں یونیورسٹی شناختی کارڈ ضرور رکھیں۔ موجودہ قوانین امتحان سیل (سٹی کیمپس) سے تصدیق کریں۔",
      roman: "Exam mein University ID zaroor rakhein. Mojuda rules Examination Cell (City Campus) se confirm karein.",
    },
  ],
  [
    "I can help with University of Layyah programs, admissions, campuses, fees, staff, buses, and labs. Try asking: *Who is the VC?* or *What programs are offered?*",
    {
      ur: "میں یونیورسٹی آف لیہ کے پروگرامز، داخلہ، کیمپس، فیس، سٹاف، بس اور لیبز میں مدد کر سکتا ہوں۔ پوچھیں: *VC کون ہیں؟* یا *کون سے پروگرام ہیں؟*",
      roman: "Main University of Layyah ke programs, admission, campuses, fees, staff, buses aur labs mein madad kar sakta hoon. Poochiye: *VC kon hain?* ya *Konsay programs hain?*",
    },
  ],
  [
    "I can help with University of Layyah programs, admissions, campuses, fees, staff, buses, and labs. Try asking: *What programs are offered?*",
    {
      ur: "میں یونیورسٹی آف لیہ کے پروگرامز، داخلہ، کیمپس، فیس، سٹاف، بس اور لیبز میں مدد کر سکتا ہوں۔ پوچھیں: *کون سے پروگرام ہیں؟*",
      roman: "Main University of Layyah ke programs, admission, campuses, fees, staff, buses aur labs mein madad kar sakta hoon. Poochiye: *Konsay programs hain?*",
    },
  ],
  [
    "**Matching programs — University of Layyah**",
    {
      ur: "**مطابق پروگرامز — یونیورسٹی آف لیہ**",
      roman: "**Matching programs — University of Layyah**",
    },
  ],
  [
    "**Scholarships — University of Layyah**",
    {
      ur: "**سکالرشپس — یونیورسٹی آف لیہ**",
      roman: "**Scholarships — University of Layyah**",
    },
  ],
  [
    "For more details:",
    { ur: "مزید تفصیلات:", roman: "Mazeed tafseel:" },
  ],
  ["Faculty Dean:", { ur: "فیکلٹی ڈین:", roman: "Faculty Dean:" }],
  ["Location:", { ur: "مقام:", roman: "Location:" }],
  ["Campus:", { ur: "کیمپس:", roman: "Campus:" }],
  ["Building:", { ur: "عمارت:", roman: "Building:" }],
  ["Program:", { ur: "پروگرام:", roman: "Program:" }],
  ["Programs:", { ur: "پروگرامز:", roman: "Programs:" }],
  ["Email:", { ur: "ای میل:", roman: "Email:" }],
  ["Phone:", { ur: "فون:", roman: "Phone:" }],
  ["Website:", { ur: "ویب سائٹ:", roman: "Website:" }],
  ["Address area:", { ur: "پتہ:", roman: "Address:" }],
  ["Area:", { ur: "رقبہ:", roman: "Area:" }],
  ["Map:", { ur: "نقشہ:", roman: "Map:" }],
  ["Portal:", { ur: "پورٹل:", roman: "Portal:" }],
  ["Dean:", { ur: "ڈین:", roman: "Dean:" }],
  ["Chancellor:", { ur: "چانسلر:", roman: "Chancellor:" }],
  ["Registrar:", { ur: "رجسٹرار:", roman: "Registrar:" }],
  ["Motto:", { ur: "نعرہ:", roman: "Motto:" }],
  ["Vision:", { ur: "ویژن:", roman: "Vision:" }],
  ["Mission:", { ur: "مشن:", roman: "Mission:" }],
  ["Vice Chancellor:", { ur: "وائس چانسلر:", roman: "Vice Chancellor:" }],
  ["Students:", { ur: "طلبہ:", roman: "Students:" }],
  ["Faculties:", { ur: "فیکلٹیز:", roman: "Faculties:" }],
  ["Departments:", { ur: "شعبے:", roman: "Departments:" }],
  ["Total:", { ur: "کل:", roman: "Total:" }],
  ["System:", { ur: "نظام:", roman: "System:" }],
  ["Attendance:", { ur: "حاضری:", roman: "Attendance:" }],
  ["Grading:", { ur: "گریڈنگ:", roman: "Grading:" }],
  ["City Campus:", { ur: "سٹی کیمپس:", roman: "City Campus:" }],
  ["Main Campus:", { ur: "مین کیمپس:", roman: "Main Campus:" }],
  ["Alt:", { ur: "متبادل:", roman: "Alt:" }],
  ["Guide:", { ur: "رہنما:", roman: "Guide:" }],
  ["Eligibility:", { ur: "اہلیت:", roman: "Eligibility:" }],
  ["Schedule:", { ur: "شیڈول:", roman: "Schedule:" }],
  ["not City Campus", { ur: "سٹی کیمپس نہیں", roman: "City Campus nahi" }],
  ["required to sit finals", { ur: "فائنل امتحان کے لیے ضروری", roman: "final exam ke liye zaroori" }],
  ["typically", { ur: "عام طور پر", roman: "aam taur par" }],
  ["required", { ur: "ضروری", roman: "zaroori" }],
  ["read more", { ur: "مزید پڑھیں", roman: "mazeed parhein" }],
];

const WORDS: Array<[RegExp, Pair]> = [
  [/\bLecturer\b/g, { ur: "لیکچرر", roman: "Lecturer" }],
  [/\bAssistant Professor\b/g, { ur: "اسسٹنٹ پروفیسر", roman: "Assistant Professor" }],
  [/\bAssociate Professor\b/g, { ur: "ایسوسی ایٹ پروفیسر", roman: "Associate Professor" }],
  [/\bProfessor\b/g, { ur: "پروفیسر", roman: "Professor" }],
  [/\bDean\b/g, { ur: "ڈین", roman: "Dean" }],
  [/\bFaculty member\b/g, { ur: "فیکلٹی ممبر", roman: "Faculty member" }],
  [/\bProgram Incharge\b/g, { ur: "پروگرام انچارج", roman: "Program Incharge" }],
];

export function renderAnswerInLanguage(english: string, lang: ChatLanguage): string {
  if (lang === "en" || !english) return polishChatMarkdown(english || "");

  const held: string[] = [];
  const hold = (raw: string) => {
    const token = `§§${held.length}§§`;
    held.push(raw);
    return token;
  };

  let text = english
    .replace(/\[[^\]]+\]\([^)]+\)/g, hold)
    .replace(/\bhttps?:\/\/[^\s)]+/gi, hold)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, hold)
    .replace(/\+92[\d\s-]+|\b0\d{2,4}[-\s]?\d{6,8}\b/g, hold);

  const sorted = [...PHRASES].sort((a, b) => b[0].length - a[0].length);
  for (const [en, tr] of sorted) {
    text = text.replace(new RegExp(escapeRe(en), "g"), lang === "ur" ? tr.ur : tr.roman);
  }
  text = text.replace(
    /\*\*([^*]+)\*\* is \*\*([^*]+)\*\*/g,
    lang === "ur" ? "**$1** **$2** ہیں" : "**$1** hain **$2**",
  );
  text = text.replace(
    / in the \*\*([^*]+)\*\*/g,
    lang === "ur" ? "، **$1** میں" : ", **$1** mein",
  );
  text = text.replace(
    / at the University of Layyah\./g,
    lang === "ur" ? "، یونیورسٹی آف لیہ۔" : ", University of Layyah mein.",
  );
  for (const [re, tr] of WORDS) {
    text = text.replace(re, lang === "ur" ? tr.ur : tr.roman);
  }

  text = text.replace(/§§(\d+)§§/g, (_, n) => held[Number(n)] ?? "");
  return polishChatMarkdown(text);
}

export function languageSystemHint(lang: ChatLanguage): string {
  if (lang === "ur") {
    return `

LANGUAGE LOCK:
- Reply in Urdu (Nastaliq/Arabic script).
- Keep person names, department names, program names, emails, URLs, and phone numbers exactly as in the knowledge.
- Do not invent facts.`;
  }
  if (lang === "roman") {
    return `

LANGUAGE LOCK:
- Reply in natural Pakistani Roman Urdu (Latin script), mixed with English official terms.
- Keep person names, department names, program names, emails, URLs, and phone numbers exactly as in the knowledge.
- Do not invent facts.`;
  }
  return `

LANGUAGE LOCK:
- Reply in clear professional English.
- Keep names, emails, URLs, and phone numbers exact.`;
}
