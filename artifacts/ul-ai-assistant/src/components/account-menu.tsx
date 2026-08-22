import { useLocation } from "wouter";
import { User } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export function UserAvatar({
  src,
  alt,
  size = "md",
  className = "",
}: {
  src?: string | null;
  alt?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dim = size === "lg" ? "h-24 w-24" : size === "sm" ? "h-8 w-8" : "h-9 w-9";
  const icon = size === "lg" ? "h-12 w-12" : size === "sm" ? "h-4 w-4" : "h-5 w-5";

  if (src) {
    return (
      <img
        src={src}
        alt={alt || "Account"}
        className={cn(dim, "rounded-full object-cover border border-border bg-muted shrink-0", className)}
      />
    );
  }

  return (
    <span
      aria-label={alt || "Account"}
      className={cn(
        dim,
        "rounded-full shrink-0 inline-flex items-center justify-center border-2 border-muted-foreground/25 bg-muted text-muted-foreground",
        className,
      )}
    >
      <User className={icon} strokeWidth={1.75} />
    </span>
  );
}

export function AccountMenu() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  if (!user) return null;

  return (
    <button
      type="button"
      onClick={() => setLocation("/account")}
      className="rounded-full shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      title="Account"
      aria-label="Account"
    >
      <UserAvatar src={user.avatar} alt={user.username} />
    </button>
  );
}
