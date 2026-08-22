import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/password-input";
import { ThemePreference } from "@/components/theme-toggle";
import { UserAvatar } from "@/components/account-menu";
import { rememberPassword, recalledPassword, useAuth } from "@/lib/auth";

type AccountDetails = {
  id: number;
  username: string;
  password: string;
  hint: string;
  avatar: string | null;
};

function resizePhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that photo."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That file is not a valid image."));
      img.onload = () => {
        const size = 256;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not process that photo."));
          return;
        }
        const min = Math.min(img.width, img.height);
        const sx = (img.width - min) / 2;
        const sy = (img.height - min) / 2;
        ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", 0.86));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export default function AccountPage() {
  const [, setLocation] = useLocation();
  const { user, loading, logout, setAvatar } = useAuth();
  const [details, setDetails] = useState<AccountDetails | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [hint, setHint] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) setLocation("/login?next=/account");
  }, [loading, user, setLocation]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetch("/api/auth/account", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: AccountDetails | null) => {
        if (cancelled || !data) return;
        setDetails({
          ...data,
          password: data.password || recalledPassword(),
        });
        setHint(data.hint || "");
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not update password.");
      setDetails((prev) => (prev ? { ...prev, password: newPassword } : prev));
      rememberPassword(newPassword);
      setNewPassword("");
      setMessage("Password updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update password.");
    } finally {
      setBusy(false);
    }
  };

  const saveHint = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/hint", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hint }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not save hint.");
      setDetails((prev) => (prev ? { ...prev, hint: data.hint || "" } : prev));
      setMessage(hint.trim() ? "Recovery hint saved." : "Recovery hint removed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save hint.");
    } finally {
      setBusy(false);
    }
  };

  const revealPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/reveal-password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: confirmPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not show password.");
      setDetails((prev) => (prev ? { ...prev, password: data.password } : prev));
      rememberPassword(data.password);
      setConfirmPassword("");
      setMessage("Password is now visible with the eye icon.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not show password.");
    } finally {
      setBusy(false);
    }
  };

  const saveAvatar = async (file: File) => {
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const avatar = await resizePhoto(file);
      const res = await fetch("/api/auth/avatar", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not save photo.");
      setDetails((prev) => (prev ? { ...prev, avatar } : prev));
      setAvatar(avatar);
      setMessage("Profile photo updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save photo.");
    } finally {
      setBusy(false);
    }
  };

  const clearAvatar = async () => {
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/avatar", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not remove photo.");
      setDetails((prev) => (prev ? { ...prev, avatar: null } : prev));
      setAvatar(null);
      setMessage("Profile photo removed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove photo.");
    } finally {
      setBusy(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="h-14 flex items-center gap-1 sm:gap-2 px-3 sm:px-4 border-b bg-card">
        <Button
          type="button"
          variant="ghost"
          className="gap-2 shrink-0 px-2 sm:px-3"
          onClick={() => {
            if (window.history.length > 1) {
              window.history.back();
              return;
            }
            setLocation("/");
          }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <button type="button" onClick={() => setLocation("/")} className="flex items-center gap-2 min-w-0">
          <img src="/ul-logo.jpg" alt="University of Layyah" className="h-8 w-8 rounded-xl object-cover" />
          <span className="font-semibold text-sm truncate">University of Layyah</span>
        </button>
      </nav>
      <main className="flex-1 flex items-start justify-center p-4">
        <div className="w-full max-w-md bg-card border rounded-2xl shadow-sm p-6 space-y-6 mt-8">
          <div>
            <h1 className="text-xl font-bold">Account</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Your username is unique and cannot be changed. Nobody else can create another account with this name.
            </p>
          </div>

          <ThemePreference />

          <div className="space-y-3 border-t pt-4">
            <p className="text-sm font-medium">Profile photo</p>
            <div className="flex items-center gap-4">
              <UserAvatar src={details?.avatar || user.avatar} alt={user.username} size="lg" />
              <div className="space-y-2">
                <label className="inline-flex">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (file) void saveAvatar(file);
                    }}
                  />
                  <span className="inline-flex items-center justify-center h-9 px-3 text-sm rounded-xl border cursor-pointer hover:bg-accent">
                    {busy ? "Saving…" : "Upload photo"}
                  </span>
                </label>
                {(details?.avatar || user.avatar) ? (
                  <button
                    type="button"
                    className="block text-sm text-muted-foreground hover:text-foreground"
                    onClick={() => void clearAvatar()}
                  >
                    Remove photo
                  </button>
                ) : (
                  <p className="text-xs text-muted-foreground">A default profile icon is used until you add a photo.</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="account-username" className="text-sm font-medium">
              Username
            </label>
            <Input id="account-username" value={details?.username || user.username} readOnly className="bg-muted" />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="account-password" className="text-sm font-medium">
              Password
            </label>
            {details?.password ? (
              <>
                <PasswordInput
                  id="account-password"
                  value={details.password}
                  onChange={() => {}}
                  readOnly
                />
                <p className="text-xs text-muted-foreground">Use the eye icon to show or hide your password.</p>
              </>
            ) : (
              <form onSubmit={revealPassword} className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Your password is saved for login. Enter it once below to view it here.
                </p>
                <PasswordInput
                  id="confirm-password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  autoComplete="current-password"
                  required
                  minLength={8}
                  placeholder="Enter your current password"
                />
                <Button type="submit" variant="outline" className="w-full rounded-xl" disabled={busy}>
                  Show my password
                </Button>
              </form>
            )}
          </div>

          <form onSubmit={savePassword} className="space-y-3 border-t pt-4">
            <p className="text-sm font-medium">Set a new password</p>
            <PasswordInput
              id="new-password"
              value={newPassword}
              onChange={setNewPassword}
              autoComplete="new-password"
              minLength={8}
              required
              placeholder="At least 8 characters"
            />
            <Button type="submit" className="w-full rounded-xl" disabled={busy}>
              Update password
            </Button>
          </form>

          <form onSubmit={saveHint} className="space-y-3 border-t pt-4">
            <p className="text-sm font-medium">Recovery hint (optional)</p>
            <p className="text-xs text-muted-foreground">
              If you fail login 5 times, you can reset your password by entering this hint.
            </p>
            <Input
              id="account-hint"
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              maxLength={80}
              placeholder="e.g. my childhood nickname"
            />
            <Button type="submit" variant="outline" className="w-full rounded-xl" disabled={busy}>
              Save hint
            </Button>
          </form>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {message ? <p className="text-sm text-secondary">{message}</p> : null}

          <Button
            variant="outline"
            className="w-full rounded-xl"
            onClick={async () => {
              await logout();
              setLocation("/");
            }}
          >
            Log out
          </Button>
        </div>
      </main>
    </div>
  );
}
