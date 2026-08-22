# How to Run UL AI Assistant — Fast, Free, Professional

Gemini’s free quota ran out because old chats sent the **entire** knowledge base. Groq then failed when huge payloads were gzip-compressed. Ollama is free but **slow** and less professional than Gemini.

This project now uses **Cerebras** (free cloud, ~3000 tokens/sec, 120B model) with compact RAG — Gemini-like quality without the quota dump.

## Which AI to use

| Mode | Cost | Speed | Quality | Setup |
|------|------|-------|---------|-------|
| **Cerebras (recommended)** | Free | Instant (~3000 tok/s) | Professional (gpt-oss-120b) | Free API key |
| Groq (fallback) | Free | Very fast | Professional (Llama 3.3 70B) | Free API key |
| Offline knowledge | Free forever | Instant | Factual UL answers | None |
| Gemini | Free tier limits | Fast | Excellent | Avoid for daily use |
| Ollama | Free forever | Slow on laptops | Weaker small model | Local install |

Default: **Cerebras** → **Groq** → **offline knowledge**. Ollama is no longer the default.

---

## One-time setup

### 1) Open this folder in VS Code / Cursor

```text
C:\Users\muham\Downloads\UOL-Assistant (1)\UOL-Assistant
```

### 2) Install packages

```powershell
pnpm install
```

### 3) Add Neon Free (accounts on every device)

This is required if the same login should work on a laptop, a phone, and for many users.

1. Open [https://console.neon.tech](https://console.neon.tech)
2. Sign up with Google/GitHub. **Do not add a credit card.** Stay on the Free plan.
3. Create a project named `ul-assistant`
4. Open **Connect** / **Dashboard** and copy the **pooled** connection string (`…-pooler…neon.tech…`)
5. Paste it in the root `.env` as `DATABASE_URL`:

```env
DATABASE_URL=postgresql://USER:PASSWORD@ep-xxxx-pooler.region.aws.neon.tech/neondb?sslmode=require
```

Restart `pnpm dev:api`. On first start the app creates the tables on Neon. Then **Sign up** once. That same username works on any device that opens this app.

Without Neon, `DATABASE_URL=pglite:./.data/ul-pglite` keeps accounts only on this PC.

### 4) Get a free Cerebras key (2 minutes, optional)

1. Open [https://cloud.cerebras.ai](https://cloud.cerebras.ai)
2. Sign up (Google/GitHub is fine — no credit card)
3. Left sidebar → **API Keys** → create a key
4. Paste it into the root `.env`:

```env
DATABASE_URL=postgresql://USER:PASSWORD@ep-xxxx-pooler.region.aws.neon.tech/neondb?sslmode=require
AI_PROVIDER=auto
CEREBRAS_API_KEY=csk-your-key-here
CEREBRAS_MODEL=gpt-oss-120b
PORT=8080
```

Optional Groq fallback (if you already have a key from [console.groq.com/keys](https://console.groq.com/keys)):

```env
GROQ_API_KEY=gsk-your-key-here
GROQ_MODEL=llama-3.3-70b-versatile
```

You do **not** need Gemini or Ollama.

### 5) Start the app (2 terminals)

```powershell
pnpm dev:api
```

```powershell
pnpm dev:web
```

Open **http://localhost:5173**

---

## Without a cloud key

The bot still answers from the university knowledge base (programs, fees, buses, staff, campuses).  
Add a Cerebras key whenever you want natural Gemini-style conversation — still free.

To force offline-only:

```env
AI_PROVIDER=local
```

---

## What is still automatic

- Knowledge seeded from `university-knowledge.json` (complete UL faculties/programs/campuses/staff from [ul.edu.pk](https://ul.edu.pk))
- Website sync on startup + every **6 hours** (news, stats, Academics hierarchy, key pages)
- Compact RAG: only the relevant sections are sent to the model (this is what stopped Gemini quota burn and Groq payload failures)
- Manual sync:

```powershell
pnpm sync
```

### Refresh full academics from the official website

```powershell
node scripts/parse-academics-menu.mjs
node scripts/scrape-ul-website.mjs
node scripts/rebuild-kb-from-website.mjs
```

Then restart `pnpm dev:api` so the database reseeds from the updated JSON.

---

## Pages

| Page | URL |
|------|-----|
| Home | http://localhost:5173/ |
| Chat | http://localhost:5173/chat |
| Campus maps | http://localhost:5173/campuses |

Chat header shows the active provider (Cerebras / Groq / offline).

---

## Deploy on Vercel (login + AI Chat)

Vercel can host the website **and** the API together. Neon stays the database.

1. In Vercel, set **Root Directory** to the folder that contains `pnpm-workspace.yaml` (the inner `UOL-Assistant` folder). Do not set it to `artifacts/ul-ai-assistant`.
2. Framework: **Other**. Install command is already `pnpm install`.
3. **Settings → Environment Variables** (Production):

```text
DATABASE_URL=postgresql://...-pooler...neon.tech/neondb?sslmode=require
AI_PROVIDER=local
```

Use the same Neon **pooled** URI as on your laptop. Do not add a credit card.

4. Redeploy. Open the Vercel URL (not localhost). Sign up once, then Chat with AI.

First chat after a pause can take a few seconds while Neon wakes. Hobby plans cap each API request at 10 seconds, which is enough for the university knowledge answers.

---

## Common fixes

| Issue | Fix |
|-------|-----|
| Slow / weak answers | Stop using Ollama. Add `CEREBRAS_API_KEY` and set `AI_PROVIDER=auto` |
| Cerebras 401 | Paste the key into the **root** `.env`, then restart `pnpm dev:api` |
| Groq empty / garbled replies | Compact RAG + uncompressed SSE is already enabled; keep `GROQ_API_KEY` as fallback only |
| Gemini quota exhausted | Leave `GEMINI_API_KEY` empty; use Cerebras |
| API won’t start / PGlite Aborted | Delete `artifacts/api-server/.data/ul-pglite` then run `pnpm dev:api` again |

## Commands

```powershell
pnpm install
pnpm dev:api
pnpm dev:web
pnpm sync
```
