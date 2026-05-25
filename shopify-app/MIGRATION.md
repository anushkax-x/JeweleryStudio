# Anoree — Shopify Embedded App

This folder contains the migrated **Anoree AI Jewellery Photoshoot Studio** as a Shopify embedded Remix app.

## Prerequisites

- **Node.js 22.12+** or **20.19+** LTS (not 22.4.x — Shopify CLI will fail with `enableCompileCache` errors)
- Verify: `node -v` in the same terminal you use for `npm run dev`
- [Shopify CLI](https://shopify.dev/docs/apps/tools/cli/getting-started): `npm install -g @shopify/cli@latest`
- Shopify Partner account and a development store

## Setup

1. Install dependencies:

   ```bash
   cd shopify-app
   npm install
   ```

2. Copy environment variables:

   ```bash
   cp .env.example .env
   ```

   Add your AI provider keys (`GEMINI_API_KEY`, etc.). Shopify vars are filled when you run `shopify app dev`.

3. Initialize the database:

   ```bash
   npm run setup
   ```

4. Start development (requires Shopify CLI):

   ```bash
   npm run dev
   ```

   Follow the CLI link to install the app on your dev store, then open it from **Shopify Admin**.

### Opening the app (not App Settings)

- **Use the app:** press **`p`** in the dev terminal, or open the **Preview URL** printed when dev is Ready.
- **Do not use:** Settings → Apps → Prompt store (that page is only install/uninstall info).

When dev is working, the terminal should show **`Using URL: https://localhost:3458`** (not `shopify.dev/apps/default-app-home`).

**Webhook error fix:** If you see `Invalid value: "https://localhost:3458/webhooks/..."`, webhook subscriptions were removed from `shopify.app.toml` on purpose — webhooks do not work with `--use-localhost`. Run `npm run dev` again after pulling the latest config.

## API routes (admin-authenticated)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/prompts` | List prompts |
| POST | `/api/prompts` | Create/update prompt |
| DELETE | `/api/prompts/:id` | Delete prompt |
| GET | `/api/available-models` | List configured AI providers |
| POST | `/api/generate-image` | Generate jewellery image |

## Legacy folders

The original `backend/` and `frontend/` directories can be removed after verifying this app in a dev store.
