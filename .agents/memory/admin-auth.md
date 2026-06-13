---
name: Admin auth pattern
description: How the admin dashboard password gate works and how to change the passcode.
---

## Pattern
- The admin page (`/admin`) shows a passcode login screen before rendering any content.
- The passcode is read from `import.meta.env.VITE_ADMIN_PASSCODE` with fallback `"ul-admin-2026"`.
- On success, `sessionStorage.setItem("ul_admin_auth", "1")` is set; the dashboard renders.
- "Sign Out" clears sessionStorage and returns to the login screen.

## Changing the passcode
- Set `VITE_ADMIN_PASSCODE=<new_value>` in `artifacts/ul-ai-assistant/.env` (dev) or in Replit Secrets for production.
- The value is embedded in the client bundle at build time — do not put anything truly secret here; it is frontend-only protection.

**Why:** Simple staff-only gate without requiring a full auth system. Acceptable for an internal university tool.
