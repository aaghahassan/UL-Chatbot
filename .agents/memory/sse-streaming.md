---
name: SSE streaming pattern
description: How AI chat streaming works and why Orval hooks cannot be used for it.
---

## Pattern
- The SSE endpoint is `POST /api/gemini/conversations/:id/messages`.
- Server sends `data: {"content": "..."}` chunks and a final `data: {"done": true}`.
- Frontend uses raw `fetch()` + `response.body.getReader()` to consume the stream.
- Orval-generated hooks (React Query mutations) do NOT support SSE — they expect a single JSON response.

## Frontend implementation (chat.tsx)
```ts
const response = await fetch(`/api/gemini/conversations/${id}/messages`, { method: "POST", ... });
const reader = response.body.getReader();
// parse SSE lines: buffer.split("\n"), lines starting with "data: "
```

**Why:** SSE is a long-lived connection; React Query's mutation model closes the response after the first resolved value. Raw fetch is the only reliable approach here.
