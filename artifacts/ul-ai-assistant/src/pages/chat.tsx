import React, { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Menu, X, Send, Plus, Sparkles, User, Info,
  Map, GraduationCap, BookOpen, Clock, Phone, BookMarked,
  Home, LayoutDashboard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useListGeminiConversations,
  useCreateGeminiConversation,
  useDeleteGeminiConversation,
  useListGeminiMessages,
  getListGeminiMessagesQueryKey,
  getListGeminiConversationsQueryKey,
} from "@workspace/api-client-react";

export default function ChatPage() {
  const params = useParams();
  const [_, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const conversationId = params.id ? parseInt(params.id, 10) : undefined;

  const [input, setInput] = useState("");
  const [streamingText, setStreamingText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: conversations, isLoading: isConversationsLoading } = useListGeminiConversations();
  const { data: messages, isLoading: isMessagesLoading } = useListGeminiMessages(
    conversationId as number,
    { query: { enabled: !!conversationId, queryKey: getListGeminiMessagesQueryKey(conversationId as number) } }
  );

  const createConversation = useCreateGeminiConversation();
  const deleteConversation = useDeleteGeminiConversation();

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, streamingText, isStreaming]);

  const handleSendMessage = async (e?: React.FormEvent, presetMessage?: string) => {
    e?.preventDefault();
    const content = presetMessage || input.trim();
    if (!content || isStreaming) return;
    setInput("");

    let currentConversationId = conversationId;

    if (!currentConversationId) {
      const newConv = await createConversation.mutateAsync({
        data: { title: content.substring(0, 50) + (content.length > 50 ? "..." : "") },
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

    setIsStreaming(true);
    setStreamingText("");

    try {
      const response = await fetch(`/api/gemini/conversations/${currentConversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
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
              if (data.content) setStreamingText((prev) => prev + data.content);
            } catch (_) {}
          }
        }
      }
    } catch (error) {
      // silently fail — user can retry
    } finally {
      setIsStreaming(false);
      setStreamingText("");
      queryClient.invalidateQueries({ queryKey: getListGeminiMessagesQueryKey(currentConversationId) });
      queryClient.invalidateQueries({ queryKey: getListGeminiConversationsQueryKey() });
    }
  };

  const chips = [
    { title: "Admissions", icon: GraduationCap },
    { title: "Programs", icon: BookOpen },
    { title: "Fee Structure", icon: BookMarked },
    { title: "Faculty Directory", icon: User },
    { title: "Campus Map", icon: Map },
    { title: "Student Rules", icon: Info },
    { title: "Events", icon: Clock },
    { title: "Contact Info", icon: Phone },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white border-r">
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="font-semibold text-foreground flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          UL AI Assistant
        </h2>
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSidebarOpen(false)}>
          <X className="h-5 w-5" />
        </Button>
      </div>
      <div className="p-4">
        <Button
          className="w-full justify-start gap-2 bg-primary/10 text-primary hover:bg-primary/20 border-0"
          variant="outline"
          onClick={() => { setLocation("/chat"); setSidebarOpen(false); }}
          data-testid="button-new-chat"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Recent Conversations
          </p>
          {isConversationsLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-md" />
            ))
          ) : conversations?.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No recent chats</p>
          ) : (
            conversations?.map((conv) => (
              <button
                key={conv.id}
                onClick={() => { setLocation(`/c/${conv.id}`); setSidebarOpen(false); }}
                className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors truncate ${
                  conversationId === conv.id
                    ? "bg-primary text-primary-foreground font-medium"
                    : "hover:bg-accent text-foreground"
                }`}
                data-testid={`button-conversation-${conv.id}`}
              >
                {conv.title}
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );

  return (
    <div className="flex flex-col h-screen w-full bg-background overflow-hidden">
      {/* Top Navigation Bar */}
      <nav className="h-14 flex items-center justify-between px-4 border-b bg-white shrink-0 shadow-sm z-20">
        <div className="flex items-center gap-3">
          {/* Mobile sidebar trigger */}
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72 border-r">
              <SidebarContent />
            </SheetContent>
          </Sheet>
          <div className="h-8 w-8 rounded-xl bg-secondary flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-xs">UL</span>
          </div>
          <span className="font-semibold text-sm text-foreground hidden sm:block">University of Layyah</span>
        </div>

        <div className="hidden sm:flex items-center gap-1">
          <button
            onClick={() => setLocation("/")}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground rounded-lg hover:bg-accent hover:text-foreground transition-colors"
            data-testid="link-home"
          >
            <Home className="h-4 w-4" />
            Home
          </button>
          <button
            onClick={() => setLocation("/chat")}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors"
            data-testid="link-ai-chat"
          >
            <Sparkles className="h-4 w-4" />
            AI Chat
          </button>
          <button
            onClick={() => setLocation("/admin")}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground rounded-lg hover:bg-accent hover:text-foreground transition-colors"
            data-testid="link-admin"
          >
            <LayoutDashboard className="h-4 w-4" />
            Admin Dashboard
          </button>
        </div>

        <div className="w-8 hidden sm:block" />
      </nav>

      {/* Body: sidebar + chat area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden md:block w-72 h-full border-r shrink-0">
          <SidebarContent />
        </aside>

        {/* Main Chat Area */}
        <main className="flex-1 flex flex-col h-full min-w-0">
          {/* Chat sub-header */}
          <div className="flex h-12 items-center px-4 border-b bg-white/80 shrink-0">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center">
                <Sparkles className="h-3.5 w-3.5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-sm leading-tight text-foreground">Digital AI Advisor</p>
                <div className="flex items-center gap-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                  <p className="text-[10px] text-muted-foreground">Online</p>
                </div>
              </div>
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
                  <h2 className="text-3xl font-bold text-foreground mb-3">Welcome to University of Layyah</h2>
                  <p className="text-muted-foreground max-w-lg mb-10 text-lg">
                    I'm your digital advisor. Ask me anything about admissions, programs, campus facilities, or university rules.
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full max-w-2xl">
                    {chips.map((chip, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(undefined, `Tell me about ${chip.title}`)}
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
                          className={`px-4 py-3 rounded-2xl shadow-sm ${
                            msg.role === "user"
                              ? "bg-primary text-primary-foreground rounded-br-sm"
                              : "bg-white border border-l-4 border-l-secondary text-foreground rounded-tl-sm"
                          }`}
                        >
                          {msg.role === "user" ? (
                            <p className="text-sm leading-relaxed">{msg.content}</p>
                          ) : (
                            <div className="prose prose-sm max-w-none prose-headings:font-bold prose-headings:text-foreground prose-headings:mt-3 prose-headings:mb-1 prose-h2:text-base prose-h3:text-sm prose-p:leading-relaxed prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-strong:text-foreground prose-a:text-primary prose-table:text-sm">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {msg.content}
                              </ReactMarkdown>
                            </div>
                          )}
                        </div>
                        <div className={`text-[10px] mt-1.5 text-muted-foreground ${msg.role === "user" ? "text-right mr-1" : "ml-1"}`}>
                          {msg.createdAt ? format(new Date(msg.createdAt), "h:mm a") : "Just now"}
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
                        <div className="px-4 py-3 rounded-2xl shadow-sm bg-white border border-l-4 border-l-secondary text-foreground rounded-tl-sm">
                          {streamingText ? (
                            <div className="prose prose-sm max-w-none prose-headings:font-bold prose-headings:text-foreground prose-headings:mt-3 prose-headings:mb-1 prose-h2:text-base prose-h3:text-sm prose-p:leading-relaxed prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-strong:text-foreground">
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
          <div className="p-4 bg-white border-t shrink-0 z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
            <div className="max-w-3xl mx-auto">
              <form
                onSubmit={handleSendMessage}
                className="flex items-end gap-2 bg-background border rounded-2xl p-2 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all shadow-sm"
              >
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about admissions, fees, or programs..."
                  className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-3 py-3 min-h-12 shadow-none"
                  disabled={isStreaming}
                  data-testid="input-message"
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
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
                  UL AI Assistant can make mistakes. Verify important info.
                </span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
