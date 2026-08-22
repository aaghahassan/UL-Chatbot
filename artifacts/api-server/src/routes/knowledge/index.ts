import { Router, type IRouter } from "express";
import { syncFromOfficialWebsite } from "../../lib/sync-website";
import { seedKnowledgeBase } from "../../lib/seed-knowledge";
import { expandQueryForMatching, parseChatLanguage } from "../../lib/chat-language";

const router: IRouter = Router();

const SUGGESTIONS = [
  "Where is the City Campus and how do I get there?",
  "Show me the Main Campus location and map",
  "What programs does University of Layyah offer?",
  "List BS Computer Science and AI programs",
  "How do I apply for admission?",
  "What is the eligibility criteria?",
  "What is the fee structure?",
  "What scholarships are available?",
  "What are the latest announcements?",
  "Tell me about E-Rozgaar courses and fees",
  "What faculties and departments are there?",
  "Computer Science staff and location",
  "What is the attendance policy for students?",
  "How can visitors contact the university?",
  "Office hours and contact email/phone",
  "Transport and medical facilities",
  "Tell me about BBA and BBA-IT",
  "What is POST-ADP and who can apply?",
  "Distance between City Campus and Main Campus",
  "Vice Chancellor message and university vision",
  "Hostel and campus facilities information",
];

const SUGGESTIONS_UR = [
  "سٹی کیمپس کہاں ہے؟",
  "مین کیمپس کا نقشہ دکھائیں",
  "یونیورسٹی آف لیہ میں کون سے پروگرام ہیں؟",
  "داخلہ کیسے لیں؟",
  "فیس سٹرکچر کیا ہے؟",
  "کمپیوٹر انجینئرنگ کا سٹاف کون ہے؟",
  "وائس چانسلر کون ہیں؟",
  "رابطہ نمبر کیا ہے؟",
];

const SUGGESTIONS_ROMAN = [
  "City Campus kahan hai?",
  "Main Campus ka map dikhao",
  "University of Layyah mein konsay programs hain?",
  "Admission kaise lein?",
  "Fee structure kya hai?",
  "Computer Engineering ka staff kon hai?",
  "VC kon hain?",
  "Contact number kya hai?",
];

router.get("/suggestions", async (req, res): Promise<void> => {
  const q = String(req.query.q ?? "").trim();
  const lang = parseChatLanguage(req.query.lang) || "en";
  const pool =
    lang === "ur" ? SUGGESTIONS_UR : lang === "roman" ? SUGGESTIONS_ROMAN : SUGGESTIONS;
  if (!q) {
    res.json({ suggestions: pool.slice(0, 8) });
    return;
  }
  const expanded = expandQueryForMatching(q).toLowerCase();
  const matched = pool
    .filter(
      (s) =>
        s.toLowerCase().includes(q.toLowerCase()) ||
        expandQueryForMatching(s).toLowerCase().split(" ").some((w) => w.length > 3 && expanded.includes(w)),
    )
    .slice(0, 8);
  res.json({ suggestions: matched.length ? matched : pool.slice(0, 5) });
});

router.get("/sync/status", async (_req, res): Promise<void> => {
  res.json({
    source: "https://ul.edu.pk",
    autoSync: true,
    intervalHours: 6,
    note: "Announcements and live stats refresh automatically from the official website.",
  });
});

router.post("/sync/now", async (_req, res): Promise<void> => {
  await seedKnowledgeBase({ force: true });
  const result = await syncFromOfficialWebsite();
  res.json({ ...result, reseeding: true });
});

router.post("/reseed", async (_req, res): Promise<void> => {
  await seedKnowledgeBase({ force: true });
  res.json({ ok: true, message: "Knowledge base reloaded from university-knowledge.json" });
});

export default router;
