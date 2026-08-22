import { defineConfig } from "drizzle-kit";
import { config as loadEnv } from "dotenv";
import fs from "fs";
import path from "path";

for (const envPath of [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "../../.env"),
]) {
  if (fs.existsSync(envPath)) {
    loadEnv({ path: envPath });
    break;
  }
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  schema: "./src/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
