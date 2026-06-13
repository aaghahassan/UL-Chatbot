import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Home, Sparkles, LayoutDashboard, Save, RefreshCw, CheckCircle,
  AlertCircle, ChevronDown, ChevronRight, Database, X, Plus,
  Trash2, Lock, Eye, EyeOff, LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  useListKnowledgeSections,
  useUpdateKnowledgeSection,
  getListKnowledgeSectionsQueryKey,
  type KnowledgeSection,
} from "@workspace/api-client-react";

const ADMIN_PASSCODE = import.meta.env.VITE_ADMIN_PASSCODE ?? "ul-admin-2026";
const SESSION_KEY = "ul_admin_auth";

function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const [value, setValue] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value === ADMIN_PASSCODE) {
      sessionStorage.setItem(SESSION_KEY, "1");
      onSuccess();
    } else {
      setError(true);
      setValue("");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-green-50">
      <div className="w-full max-w-sm mx-4">
        <div className="text-center mb-8">
          <div className="h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Lock className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Admin Access</h1>
          <p className="text-sm text-muted-foreground mt-1">University of Layyah — Knowledge Base</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border shadow-sm p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Admin Passcode</label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={value}
                onChange={(e) => { setValue(e.target.value); setError(false); }}
                placeholder="Enter passcode"
                className={`w-full border rounded-xl px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors ${error ? "border-destructive" : "border-border focus:border-primary"}`}
                autoFocus
                data-testid="admin-passcode-input"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {error && (
              <p className="mt-2 text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Incorrect passcode. Please try again.
              </p>
            )}
          </div>
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
            data-testid="admin-login-submit"
          >
            Sign In
          </button>
        </form>
        <p className="text-center text-xs text-muted-foreground mt-4">
          Staff only — University of Layyah Admin Portal
        </p>
      </div>
    </div>
  );
}

const SECTION_ICONS: Record<string, string> = {
  university: "🏛️",
  vision_mission: "🎯",
  administration: "👥",
  campuses: "🗺️",
  faculties: "📚",
  admissions: "🎓",
  fees: "💰",
  scholarships: "🏆",
  facilities: "🏗️",
  student_rules_and_regulations: "📋",
  events: "📅",
  contact_info: "📞",
};

function JsonEditor({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  error: string | null;
}) {
  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full font-mono text-xs rounded-lg border p-3 min-h-[300px] resize-y focus:outline-none focus:ring-2 focus:ring-primary/30 bg-muted/30 transition-colors ${
          error ? "border-destructive" : "border-border focus:border-primary"
        }`}
        spellCheck={false}
        data-testid="json-editor"
      />
      {error && (
        <p className="mt-1 text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
}

function EventsEditor({
  data,
  onSave,
  isSaving,
}: {
  data: any[];
  onSave: (events: any[]) => void;
  isSaving: boolean;
}) {
  const [events, setEvents] = useState<any[]>(data);

  useEffect(() => {
    setEvents(data);
  }, [data]);

  const addEvent = () => {
    setEvents((prev) => [
      ...prev,
      { name: "", date: "", description: "", venue: "" },
    ]);
  };

  const removeEvent = (idx: number) => {
    setEvents((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateField = (idx: number, field: string, value: string) => {
    setEvents((prev) =>
      prev.map((e, i) => (i === idx ? { ...e, [field]: value } : e))
    );
  };

  return (
    <div className="space-y-4">
      {events.map((ev, idx) => (
        <div key={idx} className="rounded-xl border bg-card p-4 space-y-3 relative group">
          <button
            onClick={() => removeEvent(idx)}
            className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Event Name</label>
              <input
                value={ev.name ?? ""}
                onChange={(e) => updateField(idx, "name", e.target.value)}
                className="w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
                placeholder="e.g. Annual Sports Gala"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Date</label>
              <input
                value={ev.date ?? ""}
                onChange={(e) => updateField(idx, "date", e.target.value)}
                className="w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
                placeholder="e.g. March 2026"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Venue</label>
              <input
                value={ev.venue ?? ""}
                onChange={(e) => updateField(idx, "venue", e.target.value)}
                className="w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
                placeholder="e.g. University Auditorium"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
              <input
                value={ev.description ?? ""}
                onChange={(e) => updateField(idx, "description", e.target.value)}
                className="w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
                placeholder="Brief description..."
              />
            </div>
          </div>
        </div>
      ))}

      <div className="flex gap-3">
        <Button variant="outline" size="sm" onClick={addEvent} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Event
        </Button>
        <Button
          size="sm"
          onClick={() => onSave(events)}
          disabled={isSaving}
          className="gap-2"
        >
          {isSaving ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Events
        </Button>
      </div>
    </div>
  );
}

function SectionCard({
  section,
  onSave,
  isSaving,
  savedKey,
}: {
  section: KnowledgeSection;
  onSave: (key: string, title: string, data: unknown) => void;
  isSaving: boolean;
  savedKey: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [jsonText, setJsonText] = useState(() => JSON.stringify(section.data, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [title, setTitle] = useState(section.title);

  const isEvents = section.sectionKey === "events";
  const eventsData = isEvents && Array.isArray(section.data) ? section.data : [];

  const handleSaveJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      setJsonError(null);
      onSave(section.sectionKey, title, parsed);
    } catch (e: any) {
      setJsonError(e.message);
    }
  };

  const justSaved = savedKey === section.sectionKey;

  return (
    <div className={`rounded-xl border bg-card transition-all ${open ? "shadow-md" : "shadow-sm"}`}>
      <button
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-accent/30 transition-colors rounded-xl"
        onClick={() => setOpen((v) => !v)}
        data-testid={`section-toggle-${section.sectionKey}`}
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{SECTION_ICONS[section.sectionKey] ?? "📄"}</span>
          <div className="text-left">
            <p className="font-semibold text-sm text-foreground">{section.title}</p>
            <p className="text-xs text-muted-foreground">
              Updated {format(new Date(section.updatedAt), "MMM d, yyyy 'at' h:mm a")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {justSaved && (
            <span className="text-xs text-green-600 font-medium flex items-center gap-1">
              <CheckCircle className="h-3.5 w-3.5" />
              Saved
            </span>
          )}
          {open ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 border-t pt-4 space-y-4 animate-in fade-in slide-in-from-top-1 duration-150">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Section Title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
              data-testid={`section-title-${section.sectionKey}`}
            />
          </div>

          {isEvents ? (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-3 block">
                Events (structured editor)
              </label>
              <EventsEditor
                data={eventsData}
                onSave={(events) => onSave(section.sectionKey, title, events)}
                isSaving={isSaving && savedKey === section.sectionKey}
              />
            </div>
          ) : (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                Content (JSON)
              </label>
              <JsonEditor value={jsonText} onChange={setJsonText} error={jsonError} />
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  onClick={handleSaveJson}
                  disabled={isSaving}
                  className="gap-2"
                  data-testid={`save-section-${section.sectionKey}`}
                >
                  {isSaving && savedKey === section.sectionKey ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Changes
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setJsonText(JSON.stringify(section.data, null, 2));
                    setJsonError(null);
                  }}
                >
                  <X className="h-4 w-4 mr-1" />
                  Reset
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isAuthed, setIsAuthed] = useState(() => sessionStorage.getItem(SESSION_KEY) === "1");

  const handleSignOut = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setIsAuthed(false);
  };

  const { data: sections, isLoading } = useListKnowledgeSections({
    query: { enabled: isAuthed, queryKey: getListKnowledgeSectionsQueryKey() },
  });
  const updateSection = useUpdateKnowledgeSection();
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  const handleSave = async (key: string, title: string, data: unknown) => {
    setSavingKey(key);
    try {
      await updateSection.mutateAsync({ key, data: { title, data } });
      setSavedKey(key);
      queryClient.invalidateQueries({ queryKey: getListKnowledgeSectionsQueryKey() });
      toast({
        title: "Section updated",
        description: `"${title}" has been saved and will be used in all new AI responses.`,
      });
      setTimeout(() => setSavedKey(null), 3000);
    } catch (err) {
      toast({
        title: "Save failed",
        description: "Could not update the section. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingKey(null);
    }
  };

  if (!isAuthed) {
    return <AdminLogin onSuccess={() => setIsAuthed(true)} />;
  }

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Top Nav */}
      <nav className="h-14 flex items-center justify-between px-4 border-b bg-white shrink-0 shadow-sm z-20">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-secondary flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-xs">UL</span>
          </div>
          <span className="font-semibold text-sm text-foreground hidden sm:block">University of Layyah</span>
        </div>
        <div className="hidden sm:flex items-center gap-1">
          <button
            onClick={() => setLocation("/")}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground rounded-lg hover:bg-accent hover:text-foreground transition-colors"
          >
            <Home className="h-4 w-4" />
            Home
          </button>
          <button
            onClick={() => setLocation("/chat")}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground rounded-lg hover:bg-accent hover:text-foreground transition-colors"
          >
            <Sparkles className="h-4 w-4" />
            AI Chat
          </button>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors"
          >
            <LayoutDashboard className="h-4 w-4" />
            Admin Dashboard
          </button>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors ml-2"
            title="Sign out of admin"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
        <div className="w-8 hidden sm:block" />
      </nav>

      <ScrollArea className="flex-1">
        <div className="max-w-3xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                <Database className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Knowledge Base</h1>
                <p className="text-sm text-muted-foreground">
                  Edit any section — changes apply to all new AI responses instantly.
                </p>
              </div>
            </div>
            <div className="mt-4 rounded-xl bg-primary/5 border border-primary/10 px-4 py-3 flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <p className="text-sm text-foreground/80">
                The AI chatbot reads this knowledge base on every message. Updates here are reflected
                in the chatbot <strong>immediately</strong> — no restart needed.
              </p>
            </div>
          </div>

          {/* Sections */}
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : !sections || sections.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="font-medium">No sections found</p>
              <p className="text-sm mt-1">The knowledge base may still be loading. Refresh the page.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sections.map((section) => (
                <SectionCard
                  key={section.sectionKey}
                  section={section}
                  onSave={handleSave}
                  isSaving={savingKey === section.sectionKey}
                  savedKey={savedKey}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
