import path from "path";
import fs from "fs";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

type AppDb =
  | ReturnType<typeof drizzlePglite<typeof schema>>
  | ReturnType<typeof drizzlePg<typeof schema>>;

function resolveDatabaseUrl(): string {
  return process.env.DATABASE_URL?.trim() || "pglite:./.data/ul-pglite";
}

function isPglite(url: string): boolean {
  return url === "pglite" || url.startsWith("pglite:") || url.startsWith("file:");
}

function needsSsl(url: string): boolean {
  return /neon\.tech|sslmode=require|ssl=true/i.test(url);
}

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      password_vault TEXT,
      hint TEXT,
      avatar TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS password_vault TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS hint TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT`,
  `CREATE TABLE IF NOT EXISTS sessions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
  `CREATE TABLE IF NOT EXISTS conversations (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      pinned BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
  `ALTER TABLE conversations ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE`,
  `CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
  `CREATE TABLE IF NOT EXISTS knowledge_sections (
      id SERIAL PRIMARY KEY,
      section_key TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
];

let pgliteClient: PGlite | null = null;
let pgPool: pg.Pool | null = null;

function createDb(): AppDb {
  const databaseUrl = resolveDatabaseUrl();

  if (isPglite(databaseUrl)) {
    const dataDir =
      databaseUrl === "pglite"
        ? path.resolve(process.cwd(), ".data/ul-pglite")
        : path.resolve(databaseUrl.replace(/^pglite:/, "").replace(/^file:/, ""));
    fs.mkdirSync(dataDir, { recursive: true });
    pgliteClient = new PGlite(dataDir);
    return drizzlePglite({ client: pgliteClient, schema });
  }

  pgPool = new Pool({
    connectionString: databaseUrl,
    max: 5,
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 20_000,
    allowExitOnIdle: true,
    ssl: needsSsl(databaseUrl) ? { rejectUnauthorized: true } : undefined,
  });
  return drizzlePg(pgPool, { schema });
}

let _db: AppDb | null = null;

function getDb(): AppDb {
  if (!_db) _db = createDb();
  return _db;
}

/** Lazy proxy so dotenv can load before first DB access */
export const db = new Proxy({} as AppDb, {
  get(_target, prop, receiver) {
    const real = getDb() as object;
    const value = Reflect.get(real, prop, receiver);
    return typeof value === "function" ? (value as Function).bind(real) : value;
  },
});

export function databaseKind(): "neon" | "postgres" | "pglite" {
  const url = resolveDatabaseUrl();
  if (isPglite(url)) return "pglite";
  if (/neon\.tech/i.test(url)) return "neon";
  return "postgres";
}

export async function ensureSchema(): Promise<void> {
  getDb();
  if (pgliteClient) {
    await pgliteClient.exec(SCHEMA_STATEMENTS.join(";\n") + ";");
    return;
  }
  if (!pgPool) return;
  for (const sql of SCHEMA_STATEMENTS) {
    await pgPool.query(sql);
  }
}

export * from "./schema";
