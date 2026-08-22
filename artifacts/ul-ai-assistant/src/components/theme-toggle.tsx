import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const current = (resolvedTheme || theme || "light") === "dark" ? "dark" : "light";

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={cn("h-9 w-9 rounded-xl shrink-0", className)}
      onClick={() => setTheme(current === "dark" ? "light" : "dark")}
      aria-label={current === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      title={current === "dark" ? "Light theme" : "Dark theme"}
    >
      {mounted && current === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}

export function ThemePreference() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const current = (resolvedTheme || theme || "light") === "dark" ? "dark" : "light";

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Appearance</p>
      <p className="text-xs text-muted-foreground">Choose how the assistant looks on this device.</p>
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Theme">
        <button
          type="button"
          onClick={() => setTheme("light")}
          className={cn(
            "flex items-center justify-center gap-2 h-10 rounded-xl border text-sm font-medium transition-colors",
            mounted && current === "light"
              ? "border-primary bg-primary/10 text-foreground"
              : "border-border bg-background text-muted-foreground hover:bg-accent",
          )}
        >
          <Sun className="h-4 w-4" />
          Light
        </button>
        <button
          type="button"
          onClick={() => setTheme("dark")}
          className={cn(
            "flex items-center justify-center gap-2 h-10 rounded-xl border text-sm font-medium transition-colors",
            mounted && current === "dark"
              ? "border-primary bg-primary/10 text-foreground"
              : "border-border bg-background text-muted-foreground hover:bg-accent",
          )}
        >
          <Moon className="h-4 w-4" />
          Dark
        </button>
      </div>
    </div>
  );
}
