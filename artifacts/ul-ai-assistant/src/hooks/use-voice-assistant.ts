import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatLanguage } from "@/lib/chat-i18n";

type RecError = { error?: string };

type SpeechRec = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((ev: {
    resultIndex: number;
    results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
  }) => void) | null;
  onerror: ((ev: RecError) => void) | null;
  onend: (() => void) | null;
};

function getSpeechRecognition(): (new () => SpeechRec) | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRec;
    webkitSpeechRecognition?: new () => SpeechRec;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

function listenLocales(lang: ChatLanguage): string[] {
  if (lang === "en") return ["en-US", "en-GB", "en-IN"];
  return ["ur-PK", "ur-IN", "ur", "hi-IN", "en-IN", "en-US"];
}

function speakLocale(lang: ChatLanguage): string {
  if (lang === "en") return "en-US";
  if (lang === "roman") return "en-IN";
  return "ur-PK";
}

function pickVoice(lang: ChatLanguage): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis?.getVoices?.() || [];
  if (lang === "en") {
    return voices.find((v) => /^en(-|_)US/i.test(v.lang)) || voices.find((v) => /^en/i.test(v.lang));
  }
  if (lang === "ur") {
    return (
      voices.find((v) => /^ur/i.test(v.lang)) ||
      voices.find((v) => /urdu/i.test(v.name)) ||
      voices.find((v) => /^hi/i.test(v.lang)) ||
      voices.find((v) => /^en(-|_)IN/i.test(v.lang))
    );
  }
  return (
    voices.find((v) => /^en(-|_)IN/i.test(v.lang)) ||
    voices.find((v) => /^en/i.test(v.lang))
  );
}

export function stripForSpeech(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[#>*_`]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function unlockSpeech(): void {
  if (!("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const warm = new SpeechSynthesisUtterance(" ");
    warm.volume = 0;
    warm.rate = 1;
    window.speechSynthesis.speak(warm);
    window.speechSynthesis.cancel();
  } catch {
    /* ignore */
  }
}

export function useVoiceAssistant(lang: ChatLanguage) {
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SpeechRec | null>(null);
  const wantListenRef = useRef(false);
  const langRef = useRef(lang);
  const localeIndexRef = useRef(0);
  const finalTextRef = useRef("");
  const interimRef = useRef("");
  const stopWaitRef = useRef<((text: string) => void) | null>(null);
  const keepAliveRef = useRef<number | null>(null);
  const onLiveRef = useRef<(text: string) => void>(() => {});
  langRef.current = lang;

  useEffect(() => {
    setSupported(!!getSpeechRecognition());
    if ("speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
      const load = () => window.speechSynthesis.getVoices();
      window.speechSynthesis.addEventListener("voiceschanged", load);
      return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
    }
  }, []);

  const liveText = () => `${finalTextRef.current} ${interimRef.current}`.replace(/\s+/g, " ").trim();

  const stopKeepAlive = () => {
    if (keepAliveRef.current) {
      window.clearInterval(keepAliveRef.current);
      keepAliveRef.current = null;
    }
  };

  const stopSpeaking = useCallback(() => {
    stopKeepAlive();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback((markdown: string) => {
    if (!("speechSynthesis" in window)) return;
    const text = stripForSpeech(markdown);
    if (!text) return;
    unlockSpeech();
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    const currentLang = langRef.current;
    utter.lang = speakLocale(currentLang);
    utter.rate = currentLang === "ur" ? 0.92 : 1;
    utter.pitch = 1;
    const voice = pickVoice(currentLang);
    if (voice) {
      utter.voice = voice;
      utter.lang = voice.lang || utter.lang;
    }
    utter.onend = () => {
      stopKeepAlive();
      setSpeaking(false);
    };
    utter.onerror = () => {
      stopKeepAlive();
      setSpeaking(false);
    };
    setSpeaking(true);
    window.speechSynthesis.speak(utter);
    stopKeepAlive();
    keepAliveRef.current = window.setInterval(() => {
      if (!window.speechSynthesis.speaking) {
        stopKeepAlive();
        setSpeaking(false);
        return;
      }
      window.speechSynthesis.pause();
      window.speechSynthesis.resume();
    }, 8000);
  }, []);

  const attachHandlers = useCallback((rec: SpeechRec) => {
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.onresult = (ev) => {
      let interim = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const piece = ev.results[i][0]?.transcript || "";
        if (ev.results[i].isFinal) {
          finalTextRef.current = `${finalTextRef.current} ${piece}`.replace(/\s+/g, " ").trim();
        } else {
          interim += piece;
        }
      }
      interimRef.current = interim;
      onLiveRef.current(liveText());
    };
    rec.onerror = (ev) => {
      const code = ev.error || "";
      if (code === "no-speech" || code === "aborted") return;
      if (code === "language-not-supported") {
        localeIndexRef.current += 1;
        const next = listenLocales(langRef.current)[localeIndexRef.current];
        if (next) {
          rec.lang = next;
          return;
        }
        wantListenRef.current = false;
        setListening(false);
        setError("This browser could not start speech recognition. Try Chrome, and use English or Roman Urdu.");
        return;
      }
      if (code === "not-allowed" || code === "service-not-allowed") {
        wantListenRef.current = false;
        setListening(false);
        setError("Microphone permission denied. Allow the mic in the browser address bar, then try again.");
        return;
      }
      if (code === "network") {
        setError("Voice needs an internet connection for speech recognition.");
      }
    };
    rec.onend = () => {
      if (wantListenRef.current) {
        try {
          rec.start();
        } catch {
          window.setTimeout(() => {
            if (!wantListenRef.current) return;
            try {
              rec.start();
            } catch {
              wantListenRef.current = false;
              setListening(false);
            }
          }, 250);
        }
        return;
      }
      const text = liveText();
      interimRef.current = "";
      recRef.current = null;
      setListening(false);
      stopWaitRef.current?.(text);
      stopWaitRef.current = null;
    };
  }, []);

  const startListening = useCallback(
    async (onLive: (text: string) => void) => {
      const Ctor = getSpeechRecognition();
      if (!Ctor) {
        setError("Voice is not supported in this browser. Use Chrome or Edge.");
        return false;
      }
      if (!window.isSecureContext) {
        setError("Voice needs http://127.0.0.1 or https. Open the chat from 127.0.0.1:5173.");
        return false;
      }
      setError(null);
      stopSpeaking();
      unlockSpeech();
      onLiveRef.current = onLive;
      finalTextRef.current = "";
      interimRef.current = "";
      localeIndexRef.current = 0;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      } catch {
        setError("Microphone permission denied. Allow the mic, then tap it again.");
        return false;
      }
      try {
        recRef.current?.abort();
      } catch {
        /* ignore */
      }
      const rec = new Ctor();
      rec.lang = listenLocales(langRef.current)[0];
      attachHandlers(rec);
      recRef.current = rec;
      wantListenRef.current = true;
      rec.start();
      setListening(true);
      return true;
    },
    [attachHandlers, stopSpeaking],
  );

  const stopListening = useCallback((): Promise<string> => {
    const current = liveText();
    wantListenRef.current = false;
    return new Promise((resolve) => {
      if (!recRef.current) {
        setListening(false);
        resolve(current);
        return;
      }
      stopWaitRef.current = resolve;
      try {
        recRef.current.stop();
      } catch {
        setListening(false);
        recRef.current = null;
        resolve(current);
      }
      window.setTimeout(() => {
        if (!stopWaitRef.current) return;
        stopWaitRef.current = null;
        setListening(false);
        resolve(liveText() || current);
      }, 1200);
    });
  }, []);

  useEffect(
    () => () => {
      wantListenRef.current = false;
      try {
        recRef.current?.abort();
      } catch {
        /* ignore */
      }
      stopSpeaking();
    },
    [stopSpeaking],
  );

  return {
    listening,
    speaking,
    supported,
    error,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    clearError: () => setError(null),
  };
}
