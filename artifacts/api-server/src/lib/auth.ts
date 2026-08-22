import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  scrypt,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import type { CookieOptions, NextFunction, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db, sessions, users } from "@workspace/db";

const scryptAsync = promisify(scrypt);
const COOKIE_NAME = "ul_session";
const SESSION_MS = 30 * 24 * 60 * 60 * 1000;

export type AuthUser = { id: number; username: string };

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validateUsername(username: string): string | null {
  if (username.length < 3 || username.length > 32) {
    return "Username must be 3–32 characters.";
  }
  if (!/^[a-z0-9_]+$/.test(username)) {
    return "Username can only use letters, numbers, and underscore.";
  }
  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < 8 || password.length > 128) {
    return "Password must be at least 8 characters.";
  }
  return null;
}

export function normalizeHint(raw: string): string {
  return raw.trim();
}

export function validateHint(hint: string): string | null {
  if (!hint) return null;
  if (hint.length < 3 || hint.length > 80) {
    return "Hint must be 3–80 characters, or leave it empty.";
  }
  return null;
}

const AVATAR_MAX = 400_000;

export function validateAvatar(avatar: string | null): string | null {
  if (!avatar) return null;
  if (avatar.length > AVATAR_MAX) {
    return "That photo is too large. Please choose a smaller image.";
  }
  if (!/^data:image\/(jpeg|jpg|png|webp|gif);base64,/i.test(avatar)) {
    return "Please upload a JPG, PNG, WEBP, or GIF photo.";
  }
  return null;
}

export function publicUser(row: { id: number; username: string; hint?: string | null; avatar?: string | null }) {
  return {
    id: row.id,
    username: row.username,
    hasHint: Boolean(row.hint),
    avatar: row.avatar || null,
  };
}

function vaultKey(): Buffer {
  return createHash("sha256")
    .update(process.env.PASSWORD_VAULT_KEY || "university-of-layyah-assistant-vault")
    .digest();
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", vaultKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`;
}

export function decryptSecret(stored: string | null | undefined): string | null {
  if (!stored) return null;
  const [ivHex, tagHex, encHex] = stored.split(":");
  if (!ivHex || !tagHex || !encHex) return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", vaultKey(), Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    const out = Buffer.concat([decipher.update(Buffer.from(encHex, "hex")), decipher.final()]);
    return out.toString("utf8");
  } catch {
    return null;
  }
}

export function safeEqualText(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  const len = Math.max(left.length, right.length, 1);
  const padLeft = Buffer.alloc(len);
  const padRight = Buffer.alloc(len);
  left.copy(padLeft);
  right.copy(padRight);
  return timingSafeEqual(padLeft, padRight) && left.length === right.length;
}

const loginFailures = new Map<string, number>();
export const RESET_AFTER_FAILURES = 5;

export function recordLoginFailure(username: string): number {
  const next = Math.min((loginFailures.get(username) || 0) + 1, 50);
  loginFailures.set(username, next);
  return next;
}

export function loginFailureCount(username: string): number {
  return loginFailures.get(username) || 0;
}

export function clearLoginFailures(username: string): void {
  loginFailures.delete(username);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const hash = (await scryptAsync(password, Buffer.from(saltHex, "hex"), 64)) as Buffer;
  const expected = Buffer.from(hashHex, "hex");
  if (hash.length !== expected.length) return false;
  return timingSafeEqual(hash, expected);
}

function cookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure:
      process.env.VERCEL === "1" ||
      process.env.COOKIE_SECURE === "1" ||
      process.env.COOKIE_SECURE === "true",
    path: "/",
    maxAge: SESSION_MS,
  };
}

export async function createSession(userId: number): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_MS);
  await db.insert(sessions).values({ userId, token, expiresAt });
  return token;
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAME, token, cookieOptions());
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, { ...cookieOptions(), maxAge: 0 });
}

export async function readSessionUser(req: Request): Promise<AuthUser | null> {
  const row = await readSessionRow(req);
  if (!row) return null;
  return { id: row.id, username: row.username };
}

export async function readSessionRow(req: Request) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token || typeof token !== "string") return null;
  const [session] = await db.select().from(sessions).where(eq(sessions.token, token)).limit(1);
  if (!session || session.expiresAt.getTime() < Date.now()) {
    if (session) await db.delete(sessions).where(eq(sessions.id, session.id));
    return null;
  }
  const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
  return user ?? null;
}

export async function destroySession(req: Request): Promise<void> {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return;
  await db.delete(sessions).where(eq(sessions.token, token));
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const user = await readSessionUser(req);
  if (!user) {
    res.status(401).json({ error: "Please log in to continue." });
    return;
  }
  req.user = user;
  next();
}
