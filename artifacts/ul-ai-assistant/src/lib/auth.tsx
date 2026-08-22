import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

export type AuthUser = { id: number; username: string; hasHint?: boolean; avatar?: string | null };

export class AuthError extends Error {
  failedAttempts?: number;
  canResetWithHint?: boolean;

  constructor(message: string, extra?: { failedAttempts?: number; canResetWithHint?: boolean }) {
    super(message);
    this.name = "AuthError";
    this.failedAttempts = extra?.failedAttempts;
    this.canResetWithHint = extra?.canResetWithHint;
  }
}

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<AuthUser | null>;
  signup: (username: string, password: string, hint?: string) => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  resetWithHint: (username: string, hint: string, newPassword: string) => Promise<void>;
  setAvatar: (avatar: string | null) => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function readError(res: Response): Promise<AuthError> {
  const fallback =
    res.status >= 500
      ? "The server is not running or restarted. Start it with pnpm dev:api, then try again."
      : "Something went wrong. Please try again.";
  try {
    const text = await res.text();
    if (!text) return new AuthError(fallback);
    try {
      const data = JSON.parse(text) as {
        error?: string;
        message?: string;
        failedAttempts?: number;
        canResetWithHint?: boolean;
      };
      return new AuthError(data?.error || data?.message || fallback, {
        failedAttempts: data?.failedAttempts,
        canResetWithHint: data?.canResetWithHint,
      });
    } catch {
      return new AuthError(fallback);
    }
  } catch {
    return new AuthError(fallback);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (): Promise<AuthUser | null> => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (!res.ok) {
        setUser(null);
        return null;
      }
      const next = (await res.json()) as AuthUser;
      setUser(next);
      return next;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signup = useCallback(async (username: string, password: string, hint?: string) => {
    let res: Response;
    try {
      res = await fetch("/api/auth/signup", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, hint }),
      });
    } catch {
      throw new AuthError("Could not reach the server. Make sure the API is running.");
    }
    if (!res.ok) throw await readError(res);
    queryClient.clear();
    rememberPassword(password);
    setUser((await res.json()) as AuthUser);
  }, [queryClient]);

  const login = useCallback(async (username: string, password: string) => {
    let res: Response;
    try {
      res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
    } catch {
      throw new AuthError("Could not reach the server. Make sure the API is running.");
    }
    if (!res.ok) throw await readError(res);
    queryClient.clear();
    rememberPassword(password);
    setUser((await res.json()) as AuthUser);
  }, [queryClient]);

  const resetWithHint = useCallback(async (username: string, hint: string, newPassword: string) => {
    const res = await fetch("/api/auth/reset-with-hint", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, hint, newPassword }),
    });
    if (!res.ok) throw await readError(res);
    queryClient.clear();
    rememberPassword(newPassword);
    setUser((await res.json()) as AuthUser);
  }, [queryClient]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    queryClient.clear();
    forgetPassword();
    setUser(null);
  }, [queryClient]);

  const setAvatar = useCallback((avatar: string | null) => {
    setUser((prev) => (prev ? { ...prev, avatar } : prev));
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refresh, signup, login, resetWithHint, setAvatar, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export function safeNextPath(raw: string | null | undefined): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/chat";
}

const PW_KEY = "ul_account_pw";

export function rememberPassword(password: string): void {
  try {
    sessionStorage.setItem(PW_KEY, password);
  } catch {
    /* ignore */
  }
}

export function recalledPassword(): string {
  try {
    return sessionStorage.getItem(PW_KEY) || "";
  } catch {
    return "";
  }
}

export function forgetPassword(): void {
  try {
    sessionStorage.removeItem(PW_KEY);
  } catch {
    /* ignore */
  }
}
