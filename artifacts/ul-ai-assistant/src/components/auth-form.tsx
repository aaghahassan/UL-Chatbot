import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/password-input";
import { AuthError, useAuth } from "@/lib/auth";

export function AuthForm({
  onSuccess,
  onBusyChange,
}: {
  onSuccess: () => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const { login, signup, resetWithHint } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [hint, setHint] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [canResetWithHint, setCanResetWithHint] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const isSignup = mode === "signup";

  const switchMode = (next: "login" | "signup") => {
    setMode(next);
    setError("");
    setShowForgot(false);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setError("");
    setBusy(true);
    onBusyChange?.(true);
    try {
      if (isSignup) await signup(username, password, hint);
      else await login(username, password);
      onSuccess();
    } catch (err) {
      if (err instanceof AuthError) {
        setFailedAttempts(err.failedAttempts || 0);
        setCanResetWithHint(Boolean(err.canResetWithHint));
        if (err.canResetWithHint) setShowForgot(true);
      }
      setError(err instanceof Error ? err.message : "Could not continue.");
    } finally {
      setBusy(false);
      onBusyChange?.(false);
    }
  };

  const onReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    onBusyChange?.(true);
    try {
      await resetWithHint(username, hint, newPassword);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset password.");
    } finally {
      setBusy(false);
      onBusyChange?.(false);
    }
  };

  if (showForgot && !isSignup) {
    return (
      <form onSubmit={onReset} className="space-y-4">
        <div className="text-center space-y-1">
          <h2 className="text-xl font-bold">Forgot password</h2>
          <p className="text-sm text-muted-foreground">
            You missed your password 5 times. Enter the recovery hint you saved, then choose a new password.
          </p>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="auth-username" className="text-sm font-medium">
            Username
          </label>
          <Input id="auth-username" value={username} onChange={(e) => setUsername(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="auth-hint" className="text-sm font-medium">
            Recovery hint
          </label>
          <Input
            id="auth-hint"
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            required
            placeholder="The hint you saved in Account"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="auth-new-password" className="text-sm font-medium">
            New password
          </label>
          <PasswordInput
            id="auth-new-password"
            value={newPassword}
            onChange={setNewPassword}
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="At least 8 characters"
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" className="w-full rounded-xl" disabled={busy}>
          {busy ? "Please wait…" : "Set new password and log in"}
        </Button>
        <button
          type="button"
          className="w-full text-sm text-muted-foreground"
          onClick={() => {
            setShowForgot(false);
            setError("");
          }}
        >
          Back to log in
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="text-center space-y-1">
        <h2 className="text-xl font-bold">{isSignup ? "Create an account" : "Log in"}</h2>
        <p className="text-sm text-muted-foreground">
          {isSignup
            ? "Choose a unique username. That name can only belong to one account, and you cannot change it later."
            : "Log in or sign up to chat with the University of Layyah AI assistant."}
        </p>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="auth-username" className="text-sm font-medium">
          Username
        </label>
        <Input
          id="auth-username"
          name="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          required
          minLength={3}
          maxLength={32}
          placeholder="e.g. ali_khan"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="auth-password" className="text-sm font-medium">
          Password
        </label>
        <PasswordInput
          id="auth-password"
          name="password"
          value={password}
          onChange={setPassword}
          autoComplete={isSignup ? "new-password" : "current-password"}
          required
          minLength={8}
          placeholder={isSignup ? "At least 8 characters" : "Your password"}
        />
      </div>
      {isSignup ? (
        <div className="space-y-1.5">
          <label htmlFor="auth-hint" className="text-sm font-medium">
            Recovery hint (optional)
          </label>
          <Input
            id="auth-hint"
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            maxLength={80}
            placeholder="A reminder only you would know"
          />
          <p className="text-xs text-muted-foreground">
            If you fail login 5 times, you can reset your password with this hint.
          </p>
        </div>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {!isSignup && failedAttempts > 0 && failedAttempts < 5 ? (
        <p className="text-xs text-muted-foreground">
          Failed attempts: {failedAttempts}/5. After 5, you can reset using your hint.
        </p>
      ) : null}
      {!isSignup && canResetWithHint ? (
        <button type="button" className="text-sm text-primary font-medium" onClick={() => setShowForgot(true)}>
          Forgot password?
        </button>
      ) : null}
      <Button type="submit" className="w-full rounded-xl" disabled={busy}>
        {busy ? "Please wait…" : isSignup ? "Sign up" : "Log in"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        {isSignup ? (
          <>
            Already have an account?{" "}
            <button type="button" className="text-primary font-medium" onClick={() => switchMode("login")}>
              Log in
            </button>
          </>
        ) : (
          <>
            New here?{" "}
            <button type="button" className="text-primary font-medium" onClick={() => switchMode("signup")}>
              Sign up
            </button>
          </>
        )}
      </p>
    </form>
  );
}
