import type { IncomingMessage, ServerResponse } from "node:http";
import "./env";
import app from "./app";
import { ensureSchema } from "@workspace/db";
import { seedKnowledgeBase } from "./lib/seed-knowledge";

let boot: Promise<void> | null = null;

function bootOnce(): Promise<void> {
  if (!boot) {
    boot = (async () => {
      await ensureSchema();
      await seedKnowledgeBase({ force: false });
    })();
  }
  return boot;
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  await bootOnce();
  if (typeof req.url === "string" && !req.url.startsWith("/api")) {
    req.url = `/api${req.url.startsWith("/") ? req.url : `/${req.url}`}`;
  }
  const run = app as unknown as (request: IncomingMessage, response: ServerResponse) => void;
  run(req, res);
}
