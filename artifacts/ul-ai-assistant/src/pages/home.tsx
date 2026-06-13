import { useLocation } from "wouter";
import { GraduationCap, MessageCircle, Building, BookOpen, Users, Sparkles, ArrowRight, Eye, Target } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const [_, setLocation] = useLocation();

  const features = [
    {
      icon: GraduationCap,
      title: "Admissions & Programs",
      description: "Get information about admissions, eligibility, scholarships, and fee structures.",
    },
    {
      icon: Building,
      title: "Campus Information",
      description: "Find faculty directories, departments, locations, and office contacts.",
    },
    {
      icon: BookOpen,
      title: "Student Life",
      description: "Learn about exam rules, attendance policies, and student activities.",
    },
    {
      icon: Sparkles,
      title: "AI Assistant",
      description: "Receive instant answers 24/7 through natural conversation.",
    },
  ];

  const sampleChat = [
    { role: "user", text: "What BS programs are available?" },
    {
      role: "ai",
      text: "The University of Layyah offers BS Computer Science, BS Information Technology, BS Mathematics, BS Chemistry, BSc (Hons) Agriculture, BBA, and many more — 23 undergraduate programs in total.",
    },
    { role: "user", text: "What is the admission fee?" },
    {
      role: "ai",
      text: "Here is the latest fee structure information. Programs are grouped into tiers (A–E). Visit ul.edu.pk/page/Fee-Structure for exact amounts, or I can guide you through the process.",
    },
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-sm">UL</span>
            </div>
            <div>
              <span className="font-bold text-foreground text-sm leading-none block">University of Layyah</span>
              <span className="text-[10px] text-muted-foreground">UL AI Assistant</span>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1">
            <button
              onClick={() => setLocation("/")}
              className="px-4 py-2 text-sm font-medium text-foreground rounded-lg hover:bg-accent transition-colors"
            >
              Home
            </button>
            <button
              onClick={() => setLocation("/chat")}
              className="px-4 py-2 text-sm font-medium text-foreground rounded-lg hover:bg-accent transition-colors"
            >
              AI Chat
            </button>
            <button
              onClick={() => setLocation("/admin")}
              className="px-4 py-2 text-sm font-medium text-muted-foreground rounded-lg hover:bg-accent transition-colors"
            >
              Admin Dashboard
            </button>
          </div>
          <Button
            onClick={() => setLocation("/chat")}
            className="bg-primary hover:bg-primary/90 text-white rounded-xl px-5 h-9 text-sm font-semibold shadow-sm"
            data-testid="button-chat-nav"
          >
            Chat with AI
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 sm:py-28 px-4">
        {/* Background gradient blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-secondary/10 text-secondary rounded-full px-4 py-1.5 text-sm font-semibold mb-6 border border-secondary/20">
            <Sparkles className="h-3.5 w-3.5" />
            Powered by Gemini AI
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-foreground mb-6 tracking-tight leading-[1.1]">
            Your Smart{" "}
            <span className="text-primary">Campus</span>{" "}
            Companion
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Ask anything about admissions, programs, faculty, campus information, student life, events, fees, and university policies through one intelligent AI assistant.
          </p>
          <Button
            onClick={() => setLocation("/chat")}
            size="lg"
            className="bg-primary hover:bg-primary/90 text-white rounded-2xl px-8 h-14 text-base font-bold shadow-lg hover:shadow-primary/20 transition-all gap-2"
            data-testid="button-chat-hero"
          >
            Chat with AI
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Chat Preview Section */}
      <section className="py-16 px-4 bg-gradient-to-b from-white to-gray-50/60">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">See It In Action</h2>
            <p className="text-muted-foreground">Real conversations, instant answers</p>
          </div>

          {/* Glassmorphism Chat Card */}
          <div className="relative mx-auto max-w-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-white to-secondary/5 rounded-3xl blur-xl" />
            <div className="relative bg-white/80 backdrop-blur-sm border border-gray-200 rounded-3xl shadow-2xl overflow-hidden">
              {/* Card Header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b bg-white/90">
                <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">UL AI Assistant</p>
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <p className="text-[11px] text-muted-foreground">Online — always ready to help</p>
                  </div>
                </div>
              </div>

              {/* Chat Bubbles */}
              <div className="p-5 space-y-4">
                {sampleChat.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2`}
                    style={{ animationDelay: `${i * 150}ms` }}
                  >
                    {msg.role === "ai" && (
                      <div className="h-7 w-7 rounded-full bg-secondary shrink-0 flex items-center justify-center mr-2 mt-1">
                        <Sparkles className="h-3.5 w-3.5 text-white" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                        msg.role === "user"
                          ? "bg-primary text-white rounded-br-sm"
                          : "bg-white border border-l-4 border-l-secondary text-foreground rounded-tl-sm"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}

                {/* Typing indicator */}
                <div className="flex justify-start">
                  <div className="h-7 w-7 rounded-full bg-secondary shrink-0 flex items-center justify-center mr-2 mt-1">
                    <Sparkles className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div className="bg-white border border-l-4 border-l-secondary px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm">
                    <div className="flex items-center gap-1">
                      <span className="h-2 w-2 bg-secondary/50 rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <span className="h-2 w-2 bg-secondary/50 rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <span className="h-2 w-2 bg-secondary/50 rounded-full animate-bounce" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Fake input */}
              <div className="px-5 pb-5">
                <div
                  onClick={() => setLocation("/chat")}
                  className="flex items-center gap-3 border rounded-xl px-4 py-3 bg-gray-50 cursor-pointer hover:border-primary/40 transition-colors group"
                  data-testid="button-fake-input"
                >
                  <span className="flex-1 text-sm text-muted-foreground">Ask your question...</span>
                  <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shadow-sm group-hover:bg-primary/90 transition-colors">
                    <ArrowRight className="h-4 w-4 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-gray-50/60">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">Everything You Need</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              One AI assistant that knows everything about University of Layyah
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((f, i) => (
              <div
                key={i}
                onClick={() => setLocation("/chat")}
                className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md hover:border-primary/20 transition-all cursor-pointer group"
                data-testid={`card-feature-${i}`}
              >
                <div className="h-11 w-11 rounded-xl bg-secondary/10 flex items-center justify-center mb-4 group-hover:bg-secondary/20 transition-colors">
                  <f.icon className="h-5 w-5 text-secondary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2 text-sm">{f.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Vision & Mission Section */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">Our Vision & Mission</h2>
            <p className="text-muted-foreground">Guiding principles of the University of Layyah</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Vision */}
            <div className="relative bg-gradient-to-br from-secondary/5 to-secondary/10 border border-secondary/20 rounded-2xl p-7 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center shadow-sm">
                    <Eye className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">Vision</h3>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  To exponentially grow with each passing day, ensuring quality education in market-oriented degree programs — strengthening graduates through distinctive learning in education, social norms, economics, and technology through national and international collaboration.
                </p>
              </div>
            </div>

            {/* Mission */}
            <div className="relative bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-2xl p-7 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-sm">
                    <Target className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">Mission</h3>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  To support University of Layyah into becoming a center of innovation, high impact applied research, and entrepreneurship — serving the students of southern Punjab with accessible, world-class higher education.
                </p>
              </div>
            </div>
          </div>

          {/* Values row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: "HEC Recognized", desc: "Nationally accredited university" },
              { label: "Distinctive Learning", desc: "Official university motto" },
              { label: "23 Departments", desc: "Across 5 faculties" },
              { label: "2 Campuses", desc: "125 acres + 13 acres" },
              { label: "Innovation Focus", desc: "Research & entrepreneurship" },
              { label: "Southern Punjab", desc: "Serving the local community" },
            ].map((v, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <p className="font-semibold text-sm text-foreground">{v.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 px-4 bg-gradient-to-br from-secondary to-secondary/80">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Ready to get started?</h2>
          <p className="text-white/80 mb-8 text-base">
            Ask any university question and get an instant, accurate answer.
          </p>
          <Button
            onClick={() => setLocation("/chat")}
            size="lg"
            className="bg-white text-secondary hover:bg-white/90 rounded-2xl px-8 h-12 text-sm font-bold shadow-lg gap-2"
            data-testid="button-chat-cta"
          >
            <MessageCircle className="h-5 w-5" />
            Start a Conversation
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 px-4 border-t bg-white">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-sm text-muted-foreground">
            &copy; 2026 University of Layyah. All Rights Reserved.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            <button className="hover:text-foreground transition-colors">Privacy Policy</button>
            {" | "}
            <button className="hover:text-foreground transition-colors">Terms of Service</button>
          </p>
        </div>
      </footer>
    </div>
  );
}
