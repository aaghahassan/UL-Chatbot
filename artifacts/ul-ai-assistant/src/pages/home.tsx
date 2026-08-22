import { useLocation } from "wouter";
import { GraduationCap, MessageCircle, Sparkles, ArrowRight, Eye, Target, MapPin, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountMenu } from "@/components/account-menu";
import { useGoToChat } from "@/components/auth-dialog";

export default function HomePage() {
  const [, setLocation] = useLocation();
  const goToChat = useGoToChat();

  const features = [
    {
      icon: GraduationCap,
      title: "Admissions & Programs",
      description: "56 programs across 5 faculties - eligibility, scholarships, and fees from ul.edu.pk.",
    },
    {
      icon: MapPin,
      title: "Campus Maps",
      description: "Accurate locations and maps for City Campus and Main Campus.",
    },
    {
      icon: Users,
      title: "Visitors & Students",
      description: "Guidance for visitors, parents, and current students - contacts, rules, and facilities.",
    },
    {
      icon: Sparkles,
      title: "Live Updates",
      description: "Announcements auto-sync from the official University of Layyah website.",
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center">
          <div className="flex items-center gap-3 shrink-0">
            <img src="/ul-logo.jpg" alt="University of Layyah" className="h-10 w-10 rounded-xl object-cover shadow-sm" />
            <div className="hidden lg:block">
              <span className="font-bold text-foreground text-sm leading-none block">University of Layyah</span>
              <span className="text-[10px] text-muted-foreground">AI Assistant</span>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center min-w-0 px-1 lg:hidden">
            <button
              onClick={() => setLocation("/campuses")}
              className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium text-foreground rounded-lg hover:bg-accent transition-colors"
            >
              Campuses
            </button>
          </div>
          <div className="hidden lg:flex items-center gap-1 ml-auto">
            <button
              onClick={() => setLocation("/campuses")}
              className="px-4 py-2 text-sm font-medium text-foreground rounded-lg hover:bg-accent transition-colors"
            >
              Campuses
            </button>
          </div>
          <div className="ml-2 shrink-0">
            <Button
              onClick={() => goToChat("/chat")}
              className="bg-primary hover:bg-primary/90 text-white rounded-xl px-5 h-9 text-sm font-semibold shadow-sm"
              data-testid="button-chat-nav"
            >
              Chat with AI
            </Button>
          </div>
          <div className="ml-2 shrink-0">
            <AccountMenu />
          </div>
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
          <div className="inline-flex items-center bg-secondary/10 text-secondary rounded-full px-4 py-1.5 text-sm font-semibold mb-6 border border-secondary/20">
            University of Layyah
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-foreground mb-6 tracking-tight leading-[1.1]">
            Your Smart{" "}
            <span className="text-primary">Campus</span>{" "}
            Companion
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Built for visitors, parents, and students of the University of Layyah. Ask about admissions, programs, fees, announcements, and both campus locations - with suggestions as you type.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              onClick={() => goToChat("/chat")}
              size="lg"
              className="bg-primary hover:bg-primary/90 text-white rounded-2xl px-8 h-14 text-base font-bold shadow-lg hover:shadow-primary/20 transition-all gap-2"
              data-testid="button-chat-hero"
            >
              Chat with AI
              <ArrowRight className="h-5 w-5" />
            </Button>
            <Button
              onClick={() => setLocation("/campuses")}
              size="lg"
              variant="outline"
              className="rounded-2xl px-8 h-14 text-base font-bold gap-2"
            >
              <MapPin className="h-5 w-5" />
              View Campus Maps
            </Button>
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
                onClick={() => goToChat("/chat")}
                className="bg-card rounded-2xl p-6 border border-border shadow-sm hover:shadow-md hover:border-primary/20 transition-all cursor-pointer group"
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
      <section className="py-16 px-4 bg-card">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">Our Vision & Mission</h2>
            <p className="text-muted-foreground">Guiding principles of the University of Layyah</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
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
                  To exponentially grow with each passing day, ensuring quality education in market-oriented degree programs - strengthening graduates through distinctive learning in education, social norms, economics, and technology through national and international collaboration.
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
                  To support University of Layyah into becoming a center of innovation, high impact applied research, and entrepreneurship - serving the students of southern Punjab with accessible, world-class higher education.
                </p>
              </div>
            </div>
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
            onClick={() => goToChat("/chat")}
            size="lg"
            className="bg-card text-secondary hover:bg-card/90 rounded-2xl px-8 h-12 text-sm font-bold shadow-lg gap-2"
            data-testid="button-chat-cta"
          >
            <MessageCircle className="h-5 w-5" />
            Start a Conversation
          </Button>
        </div>
      </section>
      {/* Footer */}
      <footer className="py-6 px-4 border-t bg-card">
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
