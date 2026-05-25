# Sidequests — Anoree Shopify App

The **Anoree AI Jewellery Photoshoot Studio** lives in [`shopify-app/`](shopify-app/) as a Shopify embedded Remix app.

## Requirements

- **Node.js 22.12+** (or **20.19+** LTS). The Shopify CLI needs `enableCompileCache` from `node:module`, which is not available in Node 22.4.x.
- Check your version in PowerShell: `node -v` (must not be `v22.4.x` or lower on the 22.x line).
- If `node -v` is too old, install the latest **22.x** from [nodejs.org](https://nodejs.org/) and restart the terminal.

## Quick start

```bash
cd shopify-app
npm install
npm run setup
npm run dev   # uses --use-localhost (reliable on Windows). Use npm run dev:tunnel for Cloudflare tunnel.
```

See [shopify-app/MIGRATION.md](shopify-app/MIGRATION.md) for environment variables, API routes, and verification steps.

## What changed

- **Before:** standalone `frontend/` (Next.js) + `backend/` (Fastify)
- **After:** `shopify-app/` (Remix + Shopify OAuth + authenticated `/api/*` routes)

Legacy `backend/` and `frontend/` folders have been removed after migration.
