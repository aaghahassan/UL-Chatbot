# UL AI Assistant

An AI-powered university chatbot for the University of Layyah — students, parents, and visitors can ask any university question in natural language and receive accurate, conversational answers instantly.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/ul-ai-assistant run dev` — run the frontend (port 22683)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Required env: `GEMINI_API_KEY` — Google Gemini API key for AI responses

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + shadcn/ui + Framer Motion
- API: Express 5
- DB: PostgreSQL + Drizzle ORM (conversations + messages tables)
- AI: Google Gemini 2.5 Flash via `@workspace/integrations-gemini-ai`
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `lib/db/src/schema/` — Drizzle DB schema (conversations.ts, messages.ts)
- `lib/integrations-gemini-ai/` — Gemini AI client wrapper
- `artifacts/api-server/src/routes/gemini/` — chat + conversation routes with SSE streaming
- `artifacts/api-server/data/university-knowledge.json` — structured university knowledge base
- `artifacts/ul-ai-assistant/src/` — React frontend

## Architecture decisions

- Gemini AI client modified to accept `GEMINI_API_KEY` directly (falls back to AI Integrations env vars)
- SSE streaming for AI responses — client uses `fetch` + `ReadableStream`, not generated hooks
- System prompt injects full university knowledge base JSON at request time
- Conversations and messages persisted to PostgreSQL for history
- University branding: Golden Orange #E89B16 (primary), Academic Green #1F8A4D (secondary)

## Product

- Single conversational chat interface — no separate modules
- Understands questions about admissions, programs, fees, scholarships, faculty, campus info, events, and student rules
- Supports English and Urdu
- Conversation history sidebar with "New Chat" support
- 8 quick-action suggestion chips on welcome screen
- Real-time streaming AI responses with typing indicator

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- `lib/integrations-gemini-ai/src/client.ts` and `image/client.ts` were both patched to use `GEMINI_API_KEY` instead of requiring `AI_INTEGRATIONS_GEMINI_BASE_URL`
- The `sendGeminiMessage` SSE endpoint must be consumed via raw fetch on the frontend — Orval cannot generate a typed hook for SSE streams

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
