import "./env";
import app from "./app";
import { logger } from "./lib/logger";
import { seedKnowledgeBase } from "./lib/seed-knowledge";
import { startWebsiteSyncScheduler } from "./lib/sync-website";
import { ensureSchema, databaseKind } from "@workspace/db";
import { warmOllama } from "./lib/chat-provider";

const rawPort = process.env["PORT"] ?? "8080";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function main() {
  await ensureSchema();
  logger.info({ database: databaseKind() }, "Database ready");
  await seedKnowledgeBase({ force: true });
  startWebsiteSyncScheduler();
  void warmOllama();

  app.listen(port, () => {
    logger.info({ port }, "Server listening");
  });
}

main().catch((err) => {
  logger.error({ err }, "Failed to start API server");
  process.exit(1);
});
