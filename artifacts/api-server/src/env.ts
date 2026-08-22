import { config as loadEnv } from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const candidates = [
  process.env.DOTENV_CONFIG_PATH,
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "../../.env"),
  path.resolve(__dirname, "../../../.env"),
  path.resolve(__dirname, "../../.env"),
].filter(Boolean) as string[];

for (const envPath of candidates) {
  if (fs.existsSync(envPath)) {
    loadEnv({ path: envPath, override: false });
    break;
  }
}

// Sensible local defaults for VS Code / Windows
if (!process.env.PORT) process.env.PORT = "8080";
if (!process.env.NODE_ENV) process.env.NODE_ENV = "development";
