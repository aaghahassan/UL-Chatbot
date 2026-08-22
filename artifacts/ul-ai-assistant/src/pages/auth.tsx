import React, { useEffect } from "react";
import { useLocation } from "wouter";
import { AuthForm } from "@/components/auth-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { safeNextPath, useAuth } from "@/lib/auth";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { user, loading } = useAuth();
  const next = safeNextPath(new URLSearchParams(window.location.search).get("next"));

  useEffect(() => {
    if (!loading && user) setLocation(next);
  }, [loading, user, next, setLocation]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="h-14 flex items-center justify-between px-4 border-b bg-card">
        <button type="button" onClick={() => setLocation("/")} className="flex items-center gap-2">
          <img src="/ul-logo.jpg" alt="University of Layyah" className="h-8 w-8 rounded-xl object-cover" />
          <span className="font-semibold text-sm">University of Layyah</span>
        </button>
        <ThemeToggle />
      </nav>
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-card border rounded-2xl shadow-sm p-6">
          <AuthForm onSuccess={() => setLocation(next)} />
        </div>
      </main>
    </div>
  );
}

export function LoginPage() {
  return <AuthPage />;
}

export function SignupPage() {
  return <AuthPage />;
}
