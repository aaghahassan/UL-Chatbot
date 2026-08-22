import type { IncomingMessage, ServerResponse } from "node:http";
import "../artifacts/api-server/src/env";
import app from "../artifacts/api-server/src/app";
import { ensureSchema } from "@workspace/db";
import { seedKnowledgeBase } from "../artifacts/api-server/src/lib/seed-knowledge";

export const config = {
  api: {
    bodyParser: false,
  },
};

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
  app(req, res);
}
