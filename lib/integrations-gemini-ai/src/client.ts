import { GoogleGenAI } from "@google/genai";

let _ai: GoogleGenAI | null = null;

function createClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY || process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    throw new Error(
      "GEMINI_API_KEY is missing. Add your key to the root .env file (get one free at https://aistudio.google.com/apikey), then restart the API.",
    );
  }

  const baseUrl = process.env.AI_INTEGRATIONS_GEMINI_BASE_URL;
  return new GoogleGenAI({
    apiKey,
    ...(baseUrl
      ? {
          httpOptions: {
            apiVersion: "",
            baseUrl,
          },
        }
      : {}),
  });
}

export const ai = new Proxy({} as GoogleGenAI, {
  get(_target, prop, receiver) {
    if (!_ai) _ai = createClient();
    const value = Reflect.get(_ai as object, prop, receiver);
    return typeof value === "function" ? (value as Function).bind(_ai) : value;
  },
});
