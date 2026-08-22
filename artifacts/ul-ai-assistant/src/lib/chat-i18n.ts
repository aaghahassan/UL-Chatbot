export type ChatLanguage = "en" | "ur" | "roman";

export const LANG_STORAGE_KEY = "ul-chat-lang";

export function loadChatLanguage(): ChatLanguage {
  try {
    const v = localStorage.getItem(LANG_STORAGE_KEY);
    if (v === "ur" || v === "roman" || v === "en") return v;
  } catch {
    /* ignore */
  }
  return "en";
}

export function saveChatLanguage(lang: ChatLanguage): void {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    /* ignore */
  }
}

type Copy = {
  home: string;
  campuses: string;
  chat: string;
  title: string;
  welcome: string;
  subtitle: string;
  placeholder: string;
  footer: string;
  desk: string;
  listening: string;
  speak: string;
  stopSpeak: string;
  mic: string;
  micOff: string;
  voiceUnsupported: string;
  micHint: string;
};

export const UI: Record<ChatLanguage, Copy> = {
  en: {
    home: "Home",
    campuses: "Campuses",
    chat: "AI Chat",
    title: "AI Assistant",
    welcome: "Welcome to University of Layyah",
    subtitle:
      "Ask in English, Urdu, or Roman Urdu. I use official UL knowledge for admissions, programs, staff, campuses, and fees.",
    placeholder: "Type in English, Urdu, or Roman Urdu…",
    footer: "UL AI Assistant syncs from ul.edu.pk. Verify important info.",
    desk: "Online",
    listening: "Listening… tap the mic when you finish",
    speak: "Listen",
    stopSpeak: "Stop",
    mic: "Voice input",
    micOff: "Stop and send",
    voiceUnsupported: "Voice is not supported in this browser. Try Chrome or Edge.",
    micHint: "Tap mic, speak, tap again to send.",
  },
  ur: {
    home: "ہوم",
    campuses: "کیمپس",
    chat: "اے آئی چیٹ",
    title: "اے آئی اسسٹنٹ",
    welcome: "یونیورسٹی آف لیہ میں خوش آمدید",
    subtitle:
      "اردو، انگلش یا رومن اردو میں پوچھیں۔ جواب سرکاری معلومات سے درست رکھے جاتے ہیں۔",
    placeholder: "اردو، انگلش یا رومن اردو میں لکھیں…",
    footer: "UL AI Assistant ul.edu.pk سے معلومات لیتا ہے۔ اہم بات تصدیق کریں۔",
    desk: "آن لائن",
    listening: "سن رہا ہے… ختم ہونے پر مائیک دبائیں",
    speak: "سنیں",
    stopSpeak: "روکیں",
    mic: "آواز سے پوچھیں",
    micOff: "روک کر بھیجیں",
    voiceUnsupported: "اس براؤزر میں آواز دستیاب نہیں۔ Chrome یا Edge استعمال کریں۔",
    micHint: "مائیک دبائیں، بولیں، پھر بھیجنے کے لیے دوبارہ دبائیں۔",
  },
  roman: {
    home: "Home",
    campuses: "Campuses",
    chat: "AI Chat",
    title: "AI Assistant",
    welcome: "University of Layyah mein khush amdeed",
    subtitle:
      "English, Urdu ya Roman Urdu mein poochiye. Jawab official UL knowledge se accurate rehte hain.",
    placeholder: "English, Urdu ya Roman Urdu mein likhein…",
    footer: "UL AI Assistant ul.edu.pk se sync karta hai. Zaroori baat confirm karein.",
    desk: "Online",
    listening: "Sun raha hai… khatam hone par mic dabayein",
    speak: "Sunein",
    stopSpeak: "Rokein",
    mic: "Awaz se poochiye",
    micOff: "Rok kar bhejein",
    voiceUnsupported: "Is browser mein voice available nahi. Chrome ya Edge use karein.",
    micHint: "Mic dabayein, bolein, phir bhejne ke liye dobara dabayein.",
  },
};

export const CHIPS: Record<
  ChatLanguage,
  Array<{ title: string; prompt: string }>
> = {
  en: [
    { title: "Admissions", prompt: "How do I apply for admission at University of Layyah?" },
    { title: "All Programs", prompt: "List all faculties and programs at University of Layyah" },
    { title: "Fee Structure", prompt: "How do I check the updated fee structure for each program?" },
    { title: "CS Department", prompt: "Where is the Computer Science department located and who are the program incharges?" },
    { title: "Campus Maps", prompt: "Show me accurate locations and maps for both City Campus and Main Campus." },
    { title: "Bus Timings", prompt: "Show University of Layyah bus timings and city routes." },
    { title: "Labs & Library", prompt: "Where are Computing Lab 1, E-Rozgaar Lab, DLD Lab and the libraries?" },
    { title: "Contact Info", prompt: "How can I contact University of Layyah?" },
  ],
  ur: [
    { title: "داخلہ", prompt: "یونیورسٹی آف لیہ میں داخلہ کیسے لیں؟" },
    { title: "پروگرامز", prompt: "یونیورسٹی آف لیہ کے تمام پروگرام بتائیں" },
    { title: "فیس", prompt: "فیس سٹرکچر کیا ہے؟" },
    { title: "کمپیوٹر سائنس", prompt: "کمپیوٹر سائنس ڈیپارٹمنٹ کہاں ہے اور سٹاف کون ہے؟" },
    { title: "کیمپس", prompt: "سٹی کیمپس اور مین کیمپس کہاں ہیں؟" },
    { title: "بس", prompt: "یونیورسٹی کی بس ٹائمنگ کیا ہے؟" },
    { title: "لیبز", prompt: "کمپیوٹنگ لیب اور لائبریری کہاں ہیں؟" },
    { title: "رابطہ", prompt: "یونیورسٹی آف لیہ سے کیسے رابطہ کریں؟" },
  ],
  roman: [
    { title: "Admission", prompt: "University of Layyah mein admission kaise lein?" },
    { title: "Programs", prompt: "University of Layyah ke tamam programs batao" },
    { title: "Fees", prompt: "Fee structure kya hai?" },
    { title: "CS staff", prompt: "Computer Science ka staff kon hai aur department kahan hai?" },
    { title: "Campuses", prompt: "City Campus aur Main Campus kahan hain?" },
    { title: "Bus", prompt: "University ki bus timings kya hain?" },
    { title: "Labs", prompt: "Computing labs aur library kahan hain?" },
    { title: "Contact", prompt: "University of Layyah se kaise rabta karein?" },
  ],
};
