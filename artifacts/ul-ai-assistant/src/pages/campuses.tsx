import { useLocation } from "wouter";
import { MapPin, Navigation, ArrowLeft, ExternalLink, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountMenu } from "@/components/account-menu";
import { useGoToChat } from "@/components/auth-dialog";

const campuses = [
  {
    name: "City Campus",
    role: "Administrative & primary teaching campus",
    address: "Katchehry Road, Layyah, Punjab, Pakistan - 31200",
    area: "13 acres",
    lat: 30.987317,
    lng: 70.969524,
    embed: "https://www.google.com/maps?q=30.987317,70.969524&z=16&output=embed",
    mapsUrl: "https://www.google.com/maps?q=30.987317,70.969524",
    note: "Main contact point for visitors, admissions, and offices. About 5 km from Main Campus.",
  },
  {
    name: "Main Campus",
    role: "125-acre main campus (Karor Road / Hafiz Abad)",
    address: "Karor Road (Hafiz Abad / Karor Lal-Bhakkar Road), Layyah, Punjab, Pakistan",
    area: "125 acres",
    lat: 31.020032,
    lng: 70.958295,
    embed: "https://www.google.com/maps?q=31.020032,70.958295&z=15&output=embed",
    mapsUrl: "https://www.google.com/maps?q=31.020032,70.958295",
    note: "Expanded academic campus roughly 5 km from City Campus.",
  },
];

export default function CampusesPage() {
  const [, setLocation] = useLocation();
  const goToChat = useGoToChat();

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/80 via-white to-amber-50/40">
      <nav className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/ul-logo.jpg" alt="University of Layyah" className="h-10 w-10 rounded-xl object-cover shadow-sm" />
            <div>
              <span className="font-bold text-foreground text-sm leading-none block">University of Layyah</span>
              <span className="text-[10px] text-muted-foreground">Campus Maps</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => setLocation("/")} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Home
            </Button>
            <Button onClick={() => goToChat("/chat")} className="bg-primary text-white rounded-xl">
              Ask AI
            </Button>
            <AccountMenu />
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-10 space-y-10">
        <header className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-secondary/10 text-secondary rounded-full px-4 py-1.5 text-sm font-semibold mb-4 border border-secondary/20">
            <MapPin className="h-3.5 w-3.5" />
            Accurate campus locations
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground text-on-pale mb-3">Both Campuses</h1>
          <p className="text-muted-foreground text-on-pale">
            City Campus on Katchehry Road and Main Campus on Karor Road (Hafiz Abad), about 5 km apart.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground text-on-pale">
            <span className="inline-flex items-center gap-1.5"><Phone className="h-4 w-4" /> +92-0606-920247</span>
            <span className="inline-flex items-center gap-1.5"><Mail className="h-4 w-4" /> info@ul.edu.pk</span>
          </div>
        </header>

        {campuses.map((c) => (
          <section key={c.name} className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
            <div className="p-6 sm:p-8 border-b border-gray-100">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">{c.name}</h2>
                  <p className="text-sm text-secondary font-medium mt-1">{c.role}</p>
                  <p className="text-sm text-muted-foreground mt-3 flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                    {c.address}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">{c.note}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Area: {c.area} · Coordinates: {c.lat}, {c.lng}
                  </p>
                </div>
                <a
                  href={c.mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90"
                >
                  <Navigation className="h-4 w-4" />
                  Open in Google Maps
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
            <div className="h-[360px] sm:h-[420px] bg-gray-100">
              <iframe
                title={`${c.name} map`}
                src={c.embed}
                className="w-full h-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
