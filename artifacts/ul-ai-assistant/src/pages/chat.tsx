import React, { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { 
  Menu, X, Send, Plus, Sparkles, User, Info, 
  Map, GraduationCap, Building, BookOpen, Clock, Phone, BookMarked
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
  getListGeminiConversationsQueryKey
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
  const { data: messages, isLoading: isMessagesLoading } = useListGeminiMessages(conversationId as number, {
    query: {
      enabled: !!conversationId,
      queryKey: getListGeminiMessagesQueryKey(conversationId as number)
    }
  });

  const createConversation = useCreateGeminiConversation();
  const deleteConversation = useDeleteGeminiConversation();

  // Scroll to bottom when messages or streaming text changes
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
      // Auto-create conversation
      const newConv = await createConversation.mutateAsync({
        data: { title: content.substring(0, 50) + (content.length > 50 ? "..." : "") }
      });
      currentConversationId = newConv.id;
      
      // Update URL without refreshing
      setLocation(`/c/${newConv.id}`, { replace: true });
      
      // Manually add the temporary user message to cache
      queryClient.setQueryData(getListGeminiMessagesQueryKey(currentConversationId), [
        { id: Date.now(), conversationId: currentConversationId, role: "user", content, createdAt: new Date().toISOString() }
      ]);
    } else {
      // Optimistically add user message
      const oldMessages = queryClient.getQueryData<any[]>(getListGeminiMessagesQueryKey(currentConversationId)) || [];
      queryClient.setQueryData(getListGeminiMessagesQueryKey(currentConversationId), [
        ...oldMessages,
        { id: Date.now(), conversationId: currentConversationId, role: "user", content, createdAt: new Date().toISOString() }
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
              if (data.content) {
                setStreamingText(prev => prev + data.content);
              }
            } catch (err) {
              // Ignore parse errors on partial chunks
            }
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
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
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden" 
          onClick={() => setSidebarOpen(false)}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
      <div className="p-4">
        <Button 
          className="w-full justify-start gap-2 bg-primary/10 text-primary hover:bg-primary/20 border-0" 
          variant="outline"
          onClick={() => {
            setLocation("/");
            setSidebarOpen(false);
          }}
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
            conversations?.map(conv => (
              <button
                key={conv.id}
                onClick={() => {
                  setLocation(`/c/${conv.id}`);
                  setSidebarOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors truncate ${
                  conversationId === conv.id 
                    ? "bg-primary text-primary-foreground font-medium" 
                    : "hover:bg-accent text-foreground"
                }`}
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
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-72 h-full border-r shrink-0 z-10">
        <SidebarContent />
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col h-full min-w-0">
        {/* Sticky Header */}
        <header className="h-16 flex items-center px-4 border-b bg-white shrink-0 shadow-sm z-10 sticky top-0">
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden mr-2">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72 border-r">
              <SidebarContent />
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-md bg-secondary flex items-center justify-center">
              <span className="text-white font-bold text-sm">UL</span>
            </div>
            <div>
              <h1 className="font-semibold text-lg leading-tight text-foreground">University of Layyah</h1>
              <p className="text-xs text-muted-foreground leading-tight">Digital AI Advisor</p>
            </div>
          </div>
        </header>

        {/* Chat Content */}
        <ScrollArea className="flex-1 p-4 md:p-6" ref={scrollRef}>
          <div className="max-w-3xl mx-auto flex flex-col gap-6 pb-6">
            {!conversationId && !messages?.length ? (
              // Welcome Screen
              <div className="flex flex-col items-center justify-center py-12 md:py-24 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
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
                    >
                      <chip.icon className="h-5 w-5 mb-1 text-secondary" />
                      {chip.title}
                    </button>
                  ))}
                </div>
              </div>
            ) : isMessagesLoading ? (
              // Loading State
              <div className="space-y-6">
                <div className="flex justify-end">
                  <Skeleton className="h-12 w-64 rounded-2xl rounded-tr-sm" />
                </div>
                <div className="flex">
                  <Skeleton className="h-32 w-80 rounded-2xl rounded-tl-sm" />
                </div>
              </div>
            ) : (
              // Messages List
              <div className="space-y-6 flex flex-col">
                {messages?.map((msg, i) => (
                  <div 
                    key={msg.id || i} 
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2`}
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
                        <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none whitespace-pre-wrap leading-relaxed">
                          {msg.content}
                        </div>
                      </div>
                      <div className={`text-[10px] mt-1.5 text-muted-foreground ${msg.role === "user" ? "text-right mr-1" : "ml-1"}`}>
                        {msg.createdAt ? format(new Date(msg.createdAt), "h:mm a") : "Just now"}
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Streaming Indicator / Active Stream */}
                {isStreaming && (
                  <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2">
                    <div className="h-8 w-8 rounded-full bg-secondary shrink-0 flex items-center justify-center mr-3 mt-1 shadow-sm">
                      <Sparkles className="h-4 w-4 text-white" />
                    </div>
                    <div className="max-w-[85%] md:max-w-[75%]">
                      <div className="px-4 py-3 rounded-2xl shadow-sm bg-white border border-l-4 border-l-secondary text-foreground rounded-tl-sm">
                        {streamingText ? (
                          <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none whitespace-pre-wrap leading-relaxed">
                            {streamingText}
                            <span className="inline-block w-2 h-4 ml-1 bg-primary animate-pulse align-middle" />
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 h-6">
                            <span className="h-2 w-2 bg-secondary/50 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="h-2 w-2 bg-secondary/50 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="h-2 w-2 bg-secondary/50 rounded-full animate-bounce"></span>
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
        <div className="p-4 bg-white border-t shrink-0 relative z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
          <div className="max-w-3xl mx-auto relative">
            <form 
              onSubmit={handleSendMessage}
              className="flex items-end gap-2 relative bg-background border rounded-2xl p-2 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all shadow-sm"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about admissions, fees, or programs..."
                className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-3 py-3 min-h-12 shadow-none"
                disabled={isStreaming}
              />
              <Button 
                type="submit" 
                size="icon" 
                className="h-10 w-10 shrink-0 rounded-xl" 
                disabled={!input.trim() || isStreaming}
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
  );
}
