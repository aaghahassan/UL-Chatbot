import React, { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Menu, Send, Sparkles, User, Info,
  Map, GraduationCap, BookOpen, Clock, Phone, BookMarked,
  Home, MapPin, Mic, MicOff, Volume2, VolumeX,
} from "lucide-react";
import {
  CHIPS,
  UI,
  loadChatLanguage,
  saveChatLanguage,
  type ChatLanguage,
} from "@/lib/chat-i18n";
import { useVoiceAssistant } from "@/hooks/use-voice-assistant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { ConversationSidebar } from "@/components/conversation-sidebar";
import { AccountMenu } from "@/components/account-menu";
import { AuthForm } from "@/components/auth-form";
import { useAuth } from "@/lib/auth";
import { downloadAllConversations, downloadConversation } from "@/lib/download-history";
import { toast } from "@/hooks/use-toast";
import {
  useListGeminiConversations,
  useCreateGeminiConversation,
  useDeleteGeminiConversation,
  useUpdateGeminiConversation,
  useListGeminiMessages,
  getListGeminiMessagesQueryKey,
  getListGeminiConversationsQueryKey,
} from "@workspace/api-client-react";

export default function ChatPage() {
  const params = useParams();
  const [_, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const conversationId = params.id ? parseInt(params.id, 10) : undefined;

  const { user, loading: authLoading } = useAuth();
  const [input, setInput] = useState("");
  const [streamingText, setStreamingText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [lang, setLang] = useState<ChatLanguage>(() => loadChatLanguage());
  const voice = useVoiceAssistant(lang);
  const speakAfterRef = useRef(false);
  const t = UI[lang];
  const isRtl = lang === "ur";
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [aiStatus, setAiStatus] = useState<{
    model?: string;
    note?: string;
    cerebrasConfigured?: boolean;
    groqConfigured?: boolean;
  } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: conversations, isLoading: isConversationsLoading } = useListGeminiConversations({
    query: { enabled: !!user },
  });
  const { data: messages, isLoading: isMessagesLoading } = useListGeminiMessages(
    conversationId as number,
    {
      query: {
        enabled: !!conversationId && !!user,
        queryKey: getListGeminiMessagesQueryKey(conversationId as number),
      },
    },
  );

  const createConversation = useCreateGeminiConversation();
  const deleteConversation = useDeleteGeminiConversation();
  const updateConversation = useUpdateGeminiConversation();

  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);

  const handleRename = async (id: number) => {
    const trimmed = renameValue.trim();
    if (!trimmed) {
      setRenamingId(null);
      return;
    }
    try {
      await updateConversation.mutateAsync({ id, data: { title: trimmed } });
      await queryClient.invalidateQueries({ queryKey: getListGeminiConversationsQueryKey() });
    } catch (err) {
      console.error("Rename failed", err);
      window.alert("Could not rename this chat. Is the API running?");
    } finally {
      setRenamingId(null);
    }
  };

  const handlePin = async (id: number, currentlyPinned: boolean) => {
    try {
      await updateConversation.mutateAsync({
        id,
        data: { pinned: !currentlyPinned },
      });
      await queryClient.invalidateQueries({ queryKey: getListGeminiConversationsQueryKey() });
    } catch (err) {
      console.error("Pin failed", err);
      window.alert("Could not pin/unpin this chat. Is the API running?");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteConversation.mutateAsync({ id });
      await queryClient.invalidateQueries({ queryKey: getListGeminiConversationsQueryKey() });
      if (conversationId === id) setLocation("/chat");
    } catch (err) {
      console.error("Delete failed", err);
      window.alert("Could not delete this chat. Is the API running?");
    }
  };

  const handleDownload = async (id: number, title: string) => {
    setDownloadingId(id);
    try {
      await downloadConversation(id, title);
      toast({
        title: "Chat saved",
        description: "Open the HTML file from your Downloads folder anytime, even offline.",
      });
    } catch (err) {
      console.error("Download failed", err);
      window.alert("Could not save this chat. Is the API running?");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadAll = async () => {
    if (!conversations?.length) return;
    setDownloadingAll(true);
    try {
      await downloadAllConversations(
        conversations.map((c) => ({ id: c.id, title: c.title || "Untitled chat" })),
      );
      toast({
        title: "History saved",
        description: "All of your chats are in one HTML file in Downloads. You can open it without internet.",
      });
    } catch (err) {
      console.error("Download all failed", err);
      window.alert("Could not save your chat history. Is the API running?");
    } finally {
      setDownloadingAll(false);
    }
  };

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, streamingText, isStreaming]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/ai/status", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setAiStatus(data);
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const q = input.trim();
    if (!q || isStreaming) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/suggestions?q=${encodeURIComponent(q)}&lang=${encodeURIComponent(lang)}`,
          { credentials: "include" },
        );
        if (!res.ok) return;
        const data = await res.json();
        setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
        setShowSuggestions(true);
      } catch {
        // ignore suggestion errors
      }
    }, 180);
    return () => clearTimeout(timer);
  }, [input, isStreaming, lang]);

  const handleSendMessage = async (e?: React.FormEvent, presetMessage?: string) => {
    e?.preventDefault();
    const content = presetMessage || input.trim();
    if (!content || isStreaming) return;
    setShowSuggestions(false);
    setSuggestions([]);

    let currentConversationId = conversationId;

    try {
      if (!currentConversationId) {
        const newConv = await createConversation.mutateAsync({
          data: {
            title:
              content.length > 90
                ? content.substring(0, 87).trimEnd() + "..."
                : content,
          },
        });
        currentConversationId = newConv.id;
        setLocation(`/c/${newConv.id}`, { replace: true });
        queryClient.setQueryData(getListGeminiMessagesQueryKey(currentConversationId), [
          { id: Date.now(), conversationId: currentConversationId, role: "user", content, createdAt: new Date().toISOString() },
        ]);
      } else {
        const oldMessages = queryClient.getQueryData<any[]>(getListGeminiMessagesQueryKey(currentConversationId)) || [];
        queryClient.setQueryData(getListGeminiMessagesQueryKey(currentConversationId), [
          ...oldMessages,
          { id: Date.now(), conversationId: currentConversationId, role: "user", content, createdAt: new Date().toISOString() },
        ]);
      }
    } catch (err) {
      window.alert("Could not start that chat. Is the API running, and is Neon awake?");
      console.error("Create conversation failed", err);
      return;
    }

    setInput("");
    setIsStreaming(true);
    setStreamingText("");
    let assembled = "";

    try {
      const response = await fetch(`/api/gemini/conversations/${currentConversationId}/messages`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, language: lang }),
      });

      if (!response.ok || !response.body) throw new Error("Stream failed");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.done) break;
              if (data.error) throw new Error(data.error);
              if (data.content) {
                assembled += data.content;
                setStreamingText((prev) => prev + data.content);
              }
            } catch (parseErr) {
              if (parseErr instanceof Error && parseErr.message && !parseErr.message.includes("JSON")) {
                throw parseErr;
              }
            }
          }
        }
      }
      if (!assembled.trim()) {
        throw new Error("The assistant returned an empty reply. Please try again.");
      }
    } catch (error) {
      console.error("Chat send failed", error);
      window.alert(error instanceof Error ? error.message : "The assistant could not reply. Please try again.");
    } finally {
      setIsStreaming(false);
      setStreamingText("");
      if (speakAfterRef.current && assembled) {
        speakAfterRef.current = false;
        voice.speak(assembled);
      }
      queryClient.invalidateQueries({ queryKey: getListGeminiMessagesQueryKey(currentConversationId) });
      queryClient.invalidateQueries({ queryKey: getListGeminiConversationsQueryKey() });
    }
  };

  const changeLang = (next: ChatLanguage) => {
    setLang(next);
    saveChatLanguage(next);
    voice.stopListening();
    voice.stopSpeaking();
  };

  const toggleMic = async () => {
    if (isStreaming) return;
    if (voice.listening) {
      const heard = (await voice.stopListening()).trim();
      const text = heard || input.trim();
      if (text) {
        speakAfterRef.current = true;
        await handleSendMessage(undefined, text);
      }
      return;
    }
    const ok = await voice.startListening((text) => setInput(text));
    if (!ok) return;
  };

  const chipIcons = [
    GraduationCap, BookOpen, BookMarked, User, Map, Clock, Info, Phone,
  ];
  const chips = CHIPS[lang].map((chip, i) => ({
    ...chip,
    icon: chipIcons[i] || Sparkles,
  }));

  const sidebarProps = {
    conversations,
    isLoading: isConversationsLoading,
    activeId: conversationId,
    renamingId,
    renameValue,
    onRenameValueChange: setRenameValue,
    onStartRename: (id: number, title: string) => {
      setRenamingId(id);
      setRenameValue(title);
    },
    onSubmitRename: (id: number) => {
      void handleRename(id);
    },
    onCancelRename: () => setRenamingId(null),
    onSelect: (id: number) => {
      setLocation(`/c/${id}`);
      setSidebarOpen(false);
    },
    onNewChat: () => {
      setLocation("/chat");
      setSidebarOpen(false);
    },
    onPin: (id: number, pinned: boolean) => {
      void handlePin(id, pinned);
    },
    onDelete: (id: number) => {
      void handleDelete(id);
    },
    onDownload: (id: number, title: string) => {
      void handleDownload(id, title);
    },
    onDownloadAll: () => {
      void handleDownloadAll();
    },
    downloadingId,
    downloadingAll,
    onCloseMobile: () => setSidebarOpen(false),
  };

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <nav className="h-14 flex items-center px-4 border-b bg-card">
          <button type="button" onClick={() => setLocation("/")} className="flex items-center gap-2">
            <img src="/ul-logo.jpg" alt="University of Layyah" className="h-8 w-8 rounded-xl object-cover" />
            <span className="font-semibold text-sm">University of Layyah</span>
          </button>
        </nav>
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-card border rounded-2xl shadow-sm p-6">
            <AuthForm onSuccess={() => undefined} />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-background overflow-hidden">
      {/* Top Navigation Bar */}
      <nav className="h-14 flex items-center px-3 sm:px-4 border-b bg-card shrink-0 shadow-sm z-20">
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[22rem] max-w-[92vw] border-r">
              <ConversationSidebar {...sidebarProps} showClose />
            </SheetContent>
          </Sheet>
          <img src="/ul-logo.jpg" alt="University of Layyah" className="h-8 w-8 rounded-xl object-cover shadow-sm" />
          <span className="font-semibold text-sm text-foreground hidden lg:inline">University of Layyah</span>
        </div>

        <div className="flex-1 flex items-center justify-center min-w-0 px-1 lg:hidden">
          <div className="flex items-center gap-0.5 sm:gap-1">
            <button
              onClick={() => setLocation("/")}
              className="flex items-center gap-1 px-2 sm:px-3 py-1.5 text-xs sm:text-sm text-muted-foreground rounded-lg hover:bg-accent hover:text-foreground transition-colors"
              data-testid="link-home-mobile"
            >
              <Home className="h-4 w-4 shrink-0" />
              <span>{t.home}</span>
            </button>
            <button
              onClick={() => setLocation("/campuses")}
              className="flex items-center gap-1 px-2 sm:px-3 py-1.5 text-xs sm:text-sm text-muted-foreground rounded-lg hover:bg-accent hover:text-foreground transition-colors"
              data-testid="link-campuses-mobile"
            >
              <MapPin className="h-4 w-4 shrink-0" />
              <span>{t.campuses}</span>
            </button>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-1 ml-auto">
          <button
            onClick={() => setLocation("/")}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground rounded-lg hover:bg-accent hover:text-foreground transition-colors"
            data-testid="link-home"
          >
            <Home className="h-4 w-4" />
            {t.home}
          </button>
          <button
            onClick={() => setLocation("/campuses")}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground rounded-lg hover:bg-accent hover:text-foreground transition-colors"
            data-testid="link-campuses"
          >
            <MapPin className="h-4 w-4" />
            {t.campuses}
          </button>
        </div>
        <div className="ml-2 shrink-0">
          <AccountMenu />
        </div>
      </nav>
      {/* Body: sidebar + chat area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden md:block w-[22rem] h-full border-r shrink-0 min-w-0">
          <ConversationSidebar {...sidebarProps} />
        </aside>

        {/* Main Chat Area */}
        <main className="flex-1 flex flex-col h-full min-w-0">
          {/* Chat sub-header */}
          <div className="flex h-12 items-center justify-between gap-2 px-4 border-b bg-card/80 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center">
                <Sparkles className="h-3.5 w-3.5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm leading-tight text-foreground">{t.title}</p>
                <div className="flex items-center gap-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                  <p className="text-[10px] text-muted-foreground truncate">
                    {t.desk}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex shrink-0 rounded-lg border bg-background p-0.5" role="tablist" aria-label="Language">
              {([
                { id: "en" as const, label: "EN" },
                { id: "ur" as const, label: "اردو" },
                { id: "roman" as const, label: "Roman" },
              ]).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  role="tab"
                  aria-selected={lang === opt.id}
                  onClick={() => changeLang(opt.id)}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                    lang === opt.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4 md:p-6" ref={scrollRef}>
            <div className="max-w-3xl mx-auto flex flex-col gap-6 pb-6">
              {!conversationId && !messages?.length ? (
                <div className="flex flex-col items-center justify-center py-12 md:py-20 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="h-20 w-20 rounded-2xl bg-secondary flex items-center justify-center mb-6 shadow-lg">
                    <GraduationCap className="h-10 w-10 text-white" />
                  </div>
                  <h2 className={`text-3xl font-bold text-foreground mb-3 ${isRtl ? "font-urdu" : ""}`}>{t.welcome}</h2>
                  <p className={`text-muted-foreground max-w-lg mb-10 text-lg ${isRtl ? "font-urdu" : ""}`}>
                    {t.subtitle}
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full max-w-2xl">
                    {chips.map((chip, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(undefined, chip.prompt)}
                        className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border bg-card hover:bg-accent hover:border-primary/30 transition-all text-sm font-medium text-foreground hover:text-primary shadow-sm hover:shadow active:scale-95"
                        data-testid={`chip-${chip.title.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        <chip.icon className="h-5 w-5 mb-1 text-secondary" />
                        {chip.title}
                      </button>
                    ))}
                  </div>
                </div>
              ) : isMessagesLoading ? (
                <div className="space-y-6">
                  <div className="flex justify-end">
                    <Skeleton className="h-12 w-64 rounded-2xl rounded-tr-sm" />
                  </div>
                  <div className="flex">
                    <Skeleton className="h-32 w-80 rounded-2xl rounded-tl-sm" />
                  </div>
                </div>
              ) : (
                <div className="space-y-6 flex flex-col">
                  {messages?.map((msg, i) => (
                    <div
                      key={msg.id || i}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2`}
                      data-testid={`message-${msg.role}-${i}`}
                    >
                      {msg.role !== "user" && (
                        <div className="h-8 w-8 rounded-full bg-secondary shrink-0 flex items-center justify-center mr-3 mt-1 shadow-sm">
                          <Sparkles className="h-4 w-4 text-white" />
                        </div>
                      )}
                      <div className="max-w-[85%] md:max-w-[75%]">
                        <div
                          dir={isRtl ? "rtl" : "ltr"}
                          className={`px-4 py-3 rounded-2xl shadow-sm ${isRtl ? "font-urdu" : ""} ${
                            msg.role === "user"
                              ? "bg-primary text-primary-foreground rounded-br-sm"
                              : "bg-card border border-l-4 border-l-secondary text-foreground rounded-tl-sm"
                          }`}
                        >
                          {msg.role === "user" ? (
                            <p className="text-sm leading-relaxed">{msg.content}</p>
                          ) : (
                            <div className="prose prose-sm max-w-none prose-headings:font-bold prose-headings:text-foreground prose-headings:mt-3 prose-headings:mb-1 prose-h2:text-base prose-h3:text-sm prose-p:leading-relaxed prose-p:my-1.5 prose-ul:my-1.5 prose-ul:list-disc prose-ul:pl-5 prose-ol:my-1.5 prose-ol:list-decimal prose-ol:pl-5 prose-li:my-0.5 prose-li:marker:text-secondary prose-strong:text-foreground prose-a:text-primary prose-table:text-sm">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {msg.content}
                              </ReactMarkdown>
                            </div>
                          )}
                        </div>
                        <div className={`text-[10px] mt-1.5 text-muted-foreground flex items-center gap-2 ${msg.role === "user" ? "justify-end mr-1" : "ml-1"}`}>
                          {msg.role !== "user" && (
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 hover:text-foreground"
                              title={voice.speaking ? t.stopSpeak : t.speak}
                              onClick={() => {
                                if (voice.speaking) voice.stopSpeaking();
                                else voice.speak(msg.content);
                              }}
                            >
                              {voice.speaking ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                            </button>
                          )}
                          <span>{msg.createdAt ? format(new Date(msg.createdAt), "h:mm a") : "Just now"}</span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {isStreaming && (
                    <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2">
                      <div className="h-8 w-8 rounded-full bg-secondary shrink-0 flex items-center justify-center mr-3 mt-1 shadow-sm">
                        <Sparkles className="h-4 w-4 text-white" />
                      </div>
                      <div className="max-w-[85%] md:max-w-[75%]">
                        <div className={`px-4 py-3 rounded-2xl shadow-sm bg-card border border-l-4 border-l-secondary text-foreground rounded-tl-sm ${isRtl ? "font-urdu" : ""}`} dir={isRtl ? "rtl" : "ltr"}>
                          {streamingText ? (
                            <div className="prose prose-sm max-w-none prose-headings:font-bold prose-headings:text-foreground prose-headings:mt-3 prose-headings:mb-1 prose-h2:text-base prose-h3:text-sm prose-p:leading-relaxed prose-p:my-1.5 prose-ul:my-1.5 prose-ul:list-disc prose-ul:pl-5 prose-ol:my-1.5 prose-ol:list-decimal prose-ol:pl-5 prose-li:my-0.5 prose-li:marker:text-secondary prose-strong:text-foreground">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {streamingText}
                              </ReactMarkdown>
                              <span className="inline-block w-2 h-4 ml-1 bg-primary animate-pulse align-middle" />
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 h-6">
                              <span className="h-2 w-2 bg-secondary/50 rounded-full animate-bounce [animation-delay:-0.3s]" />
                              <span className="h-2 w-2 bg-secondary/50 rounded-full animate-bounce [animation-delay:-0.15s]" />
                              <span className="h-2 w-2 bg-secondary/50 rounded-full animate-bounce" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={bottomRef} className="h-1" />
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 bg-card border-t shrink-0 z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
            <div className="max-w-3xl mx-auto relative">
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-card border rounded-2xl shadow-lg overflow-hidden z-20">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-accent transition-colors border-b last:border-b-0"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSendMessage(undefined, s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
              <form
                onSubmit={handleSendMessage}
                className="flex items-end gap-2 bg-background border rounded-2xl p-2 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all shadow-sm"
              >
                <Button
                  type="button"
                  size="icon"
                  variant={voice.listening ? "default" : "ghost"}
                  className={`h-10 w-10 shrink-0 rounded-xl ${voice.listening ? "animate-pulse" : ""}`}
                  onClick={toggleMic}
                  disabled={isStreaming && !voice.listening}
                  title={voice.listening ? t.micOff : t.mic}
                  data-testid="button-mic"
                >
                  {voice.listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </Button>
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onFocus={() => { if (suggestions.length) setShowSuggestions(true); }}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  placeholder={voice.listening ? t.listening : t.placeholder}
                  className={`flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-3 py-3 min-h-12 shadow-none ${isRtl ? "font-urdu text-right" : ""}`}
                  dir={isRtl ? "rtl" : "ltr"}
                  disabled={isStreaming}
                  data-testid="input-message"
                  autoComplete="off"
                />
                <Button
                  type="submit"
                  size="icon"
                  className="h-10 w-10 shrink-0 rounded-xl"
                  disabled={!input.trim() || isStreaming}
                  data-testid="button-send"
                >
                  <Send className="h-5 w-5" />
                </Button>
              </form>
              <div className="text-center mt-2">
                {voice.error ? (
                  <p className="text-[11px] text-destructive">{voice.error}</p>
                ) : (
                  <span className={`text-[10px] text-muted-foreground font-semibold ${isRtl ? "font-urdu" : "uppercase tracking-widest"}`}>
                    {voice.listening ? t.listening : t.micHint}
                  </span>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
