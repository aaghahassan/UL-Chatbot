---
name: Knowledge base in DB
description: How the university knowledge base flows from JSON → PostgreSQL → Gemini system prompt.
---

## Flow
1. `artifacts/api-server/data/university-knowledge.json` — source of truth for initial data.
2. On server startup, `seedKnowledgeBase()` checks if `knowledge_sections` table is empty; if so, splits JSON top-level keys into rows.
3. The Gemini SSE route calls `buildSystemPrompt()` on every `/messages` POST — reads all rows from `knowledge_sections` and assembles the system prompt dynamically.
4. Admin UI at `/admin` calls `PUT /api/admin/knowledge-sections/:key` to update any section; next AI response picks up the change automatically.

## DB table: `knowledge_sections`
- `id` (serial PK), `section_key` (text unique), `title` (text), `data` (jsonb), `updated_at` (timestamp)

**Why:** Allows non-technical staff to update knowledge without touching code or restarting the server. Changes are instant.

## Seeding
- Runs once on first boot. Subsequent restarts skip seeding ("Knowledge base already seeded — skipping.").
- To re-seed, truncate the `knowledge_sections` table manually and restart the server.
