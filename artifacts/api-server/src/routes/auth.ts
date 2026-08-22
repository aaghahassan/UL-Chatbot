import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, users } from "@workspace/db";
import {
  RESET_AFTER_FAILURES,
  clearLoginFailures,
  clearSessionCookie,
  createSession,
  decryptSecret,
  destroySession,
  encryptSecret,
  hashPassword,
  loginFailureCount,
  normalizeHint,
  normalizeUsername,
  publicUser,
  readSessionRow,
  recordLoginFailure,
  safeEqualText,
  setSessionCookie,
  validateAvatar,
  validateHint,
  validatePassword,
  validateUsername,
  verifyPassword,
} from "../lib/auth";

const router: IRouter = Router();

router.get("/auth/me", async (req, res): Promise<void> => {
  const row = await readSessionRow(req);
  if (!row) {
    res.status(401).json({ error: "Not logged in" });
    return;
  }
  res.json(publicUser(row));
});

router.get("/auth/account", async (req, res): Promise<void> => {
  const row = await readSessionRow(req);
  if (!row) {
    res.status(401).json({ error: "Not logged in" });
    return;
  }
  res.json({
    id: row.id,
    username: row.username,
    password: decryptSecret(row.passwordVault) || "",
    hint: row.hint || "",
    avatar: row.avatar || null,
  });
});

router.post("/auth/signup", async (req, res): Promise<void> => {
  const username = normalizeUsername(String(req.body?.username ?? ""));
  const password = String(req.body?.password ?? "");
  const hint = normalizeHint(String(req.body?.hint ?? ""));
  const usernameError = validateUsername(username);
  if (usernameError) {
    res.status(400).json({ error: usernameError });
    return;
  }
  const passwordError = validatePassword(password);
  if (passwordError) {
    res.status(400).json({ error: passwordError });
    return;
  }
  const hintError = validateHint(hint);
  if (hintError) {
    res.status(400).json({ error: hintError });
    return;
  }

  const [existing] = await db.select().from(users).where(eq(users.username, username)).limit(1);
  if (existing) {
    res.status(409).json({ error: "That username is already taken. Each username can only have one account." });
    return;
  }

  const passwordHash = await hashPassword(password);
  const [user] = await db
    .insert(users)
    .values({
      username,
      passwordHash,
      passwordVault: encryptSecret(password),
      hint: hint || null,
    })
    .returning({ id: users.id, username: users.username });
  if (!user) {
    res.status(500).json({ error: "Could not create account." });
    return;
  }
  const token = await createSession(user.id);
  setSessionCookie(res, token);
  res.status(201).json(publicUser({ ...user, hint: hint || null, avatar: null }));
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const username = normalizeUsername(String(req.body?.username ?? ""));
  const password = String(req.body?.password ?? "");
  if (!username || !password) {
    res.status(400).json({ error: "Enter your username and password." });
    return;
  }
  try {
    const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
    let passwordOk = false;
    try {
      passwordOk = Boolean(user && (await verifyPassword(password, user.passwordHash)));
    } catch {
      passwordOk = false;
    }
    if (!user || !passwordOk) {
      const failedAttempts = recordLoginFailure(username);
      res.status(401).json({
        error: "Username or password is incorrect.",
        failedAttempts,
        canResetWithHint: failedAttempts >= RESET_AFTER_FAILURES && Boolean(user?.hint),
      });
      return;
    }
    try {
      if (!user.passwordVault || !decryptSecret(user.passwordVault)) {
        await db.update(users).set({ passwordVault: encryptSecret(password) }).where(eq(users.id, user.id));
      }
    } catch {
      /* Old accounts can still log in if the password vault cannot be updated. */
    }
    clearLoginFailures(username);
    const token = await createSession(user.id);
    setSessionCookie(res, token);
    res.json(publicUser(user));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not log in.";
    res.status(500).json({ error: "Could not log in. Please try again." });
    console.error("Login failed", message);
  }
});

router.post("/auth/reset-with-hint", async (req, res): Promise<void> => {
  const username = normalizeUsername(String(req.body?.username ?? ""));
  const hint = normalizeHint(String(req.body?.hint ?? ""));
  const newPassword = String(req.body?.newPassword ?? "");
  if (!username || !hint) {
    res.status(400).json({ error: "Enter your username and hint." });
    return;
  }
  if (loginFailureCount(username) < RESET_AFTER_FAILURES) {
    res.status(403).json({
      error: "Forgot password is available after 5 failed login attempts.",
    });
    return;
  }
  const passwordError = validatePassword(newPassword);
  if (passwordError) {
    res.status(400).json({ error: passwordError });
    return;
  }
  const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
  if (!user?.hint || !safeEqualText(user.hint, hint)) {
    res.status(401).json({ error: "The hint does not match this account." });
    return;
  }
  const passwordHash = await hashPassword(newPassword);
  await db
    .update(users)
    .set({ passwordHash, passwordVault: encryptSecret(newPassword) })
    .where(eq(users.id, user.id));
  clearLoginFailures(username);
  const token = await createSession(user.id);
  setSessionCookie(res, token);
  res.json(publicUser(user));
});

router.post("/auth/reveal-password", async (req, res): Promise<void> => {
  const row = await readSessionRow(req);
  if (!row) {
    res.status(401).json({ error: "Please log in to continue." });
    return;
  }
  const password = String(req.body?.password ?? "");
  if (!password) {
    res.status(400).json({ error: "Enter your current password to view it." });
    return;
  }
  if (!(await verifyPassword(password, row.passwordHash))) {
    res.status(401).json({ error: "That password is incorrect." });
    return;
  }
  await db.update(users).set({ passwordVault: encryptSecret(password) }).where(eq(users.id, row.id));
  res.json({ password });
});

router.patch("/auth/avatar", async (req, res): Promise<void> => {
  const row = await readSessionRow(req);
  if (!row) {
    res.status(401).json({ error: "Please log in to continue." });
    return;
  }
  const raw = req.body?.avatar;
  const avatar = raw == null || raw === "" ? null : String(raw);
  const avatarError = validateAvatar(avatar);
  if (avatarError) {
    res.status(400).json({ error: avatarError });
    return;
  }
  await db.update(users).set({ avatar }).where(eq(users.id, row.id));
  res.json({ ok: true, avatar });
});

router.patch("/auth/password", async (req, res): Promise<void> => {
  const row = await readSessionRow(req);
  if (!row) {
    res.status(401).json({ error: "Please log in to continue." });
    return;
  }
  const newPassword = String(req.body?.newPassword ?? "");
  const passwordError = validatePassword(newPassword);
  if (passwordError) {
    res.status(400).json({ error: passwordError });
    return;
  }
  const passwordHash = await hashPassword(newPassword);
  await db
    .update(users)
    .set({ passwordHash, passwordVault: encryptSecret(newPassword) })
    .where(eq(users.id, row.id));
  res.json({ ok: true });
});

router.patch("/auth/hint", async (req, res): Promise<void> => {
  const row = await readSessionRow(req);
  if (!row) {
    res.status(401).json({ error: "Please log in to continue." });
    return;
  }
  const hint = normalizeHint(String(req.body?.hint ?? ""));
  const hintError = validateHint(hint);
  if (hintError) {
    res.status(400).json({ error: hintError });
    return;
  }
  await db.update(users).set({ hint: hint || null }).where(eq(users.id, row.id));
  res.json({ ok: true, hasHint: Boolean(hint), hint });
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  await destroySession(req);
  clearSessionCookie(res);
  res.json({ ok: true });
});

export default router;
