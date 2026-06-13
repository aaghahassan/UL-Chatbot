---
name: Zod v4 esbuild compatibility
description: Why zod/v4 subpath imports break the api-server esbuild bundle and what to do instead.
---

## Problem
`import { z } from "zod/v4"` causes esbuild to fail with "Could not resolve 'zod/v4'" when bundling the api-server.

## Root cause
esbuild does not resolve package subpath exports like `zod/v4` unless the package explicitly marks them compatible. The `lib/*` packages use tsc which handles this correctly, but the api-server uses esbuild for bundling.

## Fix
In api-server route files: use plain JS validation, or import from `@workspace/api-zod` (which is pre-compiled by tsc and exports Zod schemas directly).

**Why:** The api-server's `build.mjs` bundles everything with esbuild into a single ESM file. Subpath exports that depend on package.json `exports` resolution may not resolve correctly.
