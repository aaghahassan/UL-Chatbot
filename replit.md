# UL AI Assistant

An AI-powered university chatbot for the University of Layyah — visitors, students, and parents can ask university questions in natural language and get accurate answers. Knowledge is synced from https://ul.edu.pk (no admin dashboard).

## Run & Operate (VS Code / local)

See **HOW-TO-RUN.md** for the full Windows + VS Code guide.

Quick start:

```powershell
docker compose up -d
# edit .env — set GEMINI_API_KEY
pnpm install
pnpm db:push
pnpm dev:api    # terminal 1 → :8080
pnpm dev:web    # terminal 2 → :5173
```

- Required env: `DATABASE_URL`, `GEMINI_API_KEY`
- Frontend proxies `/api` → `http://127.0.0.1:8080`
- Website announcements auto-sync every 6 hours from ul.edu.pk

## Stack

- pnpm workspaces, Node.js 20+, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + shadcn/ui
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- AI: Google Gemini via `@workspace/integrations-gemini-ai`

## Product

- Chat for visitors + students (English/Urdu)
- Typing suggestions
- Campus maps page for City + Main campuses
- Live announcements from the official website
- No admin dashboard / no manual knowledge editing UI
