# Gia Bao Portfolio

A monorepo personal portfolio web application built with **React + TypeScript + Vite + Tailwind CSS + React Router** on the frontend, **Hono** for the backend API, and deployed as a single unified **Cloudflare Worker** using **Workers Static Assets**, **Cloudflare D1**, and **Cloudflare R2**.

## Features

- **Bilingual & Themed Frontend**: English / Vietnamese (`en` / `vi`) localization and light/dark theme support with legacy browser fallback.
- **Portfolio CMS (`/admin`)**: Password-protected (Bearer token) admin dashboard for managing profile content, projects, experience, and media, including GitHub repository sync and LinkedIn CSV import.
- **Media Storage**: Image/media upload and serving via **Cloudflare R2** (`MEDIA_BUCKET`).
- **Contact Form & Security**: Persists submissions in **Cloudflare D1**, protected by **Cloudflare Turnstile** verification, **Workers Rate Limiting**, and **Resend** email notifications.

## Monorepo Structure

```text
giabao-portfolio/
├── apps/
│   ├── web/            # React SPA (Vite, Tailwind CSS, React Router, @cloudflare/vite-plugin)
│   └── api/            # Hono API Worker (wrangler.jsonc, /api/* routes, Vitest Workers)
├── packages/
│   └── shared/         # Shared Zod schemas & TypeScript types
├── db/
│   └── migrations/     # Cloudflare D1 SQL migrations (contact_messages, portfolio_cms)
├── docs/               # Requirements, content inventory, architecture, roadmap & ADRs
├── eslint.config.js
├── tsconfig.base.json
├── pnpm-workspace.yaml
└── package.json
```

## Prerequisites

- **Node.js**: `>= 22 LTS` (see `.nvmrc`)
- **pnpm**: `>= 10`

## Installation & Local Development

```bash
# Install all workspace dependencies
pnpm install

# Run Frontend (React SPA) and Backend API (/api/*) together on the Cloudflare Workers runtime
pnpm dev
```

Once `pnpm dev` is running:

- SPA Frontend: `http://localhost:5173/`
- API Health Check: `http://localhost:5173/api/health`

For local API secrets (such as `ADMIN_PASSWORD`, `TURNSTILE_SECRET_KEY`, `IP_HASH_SALT`, `RESEND_API_KEY`, and `GITHUB_TOKEN`), configure `apps/api/.dev.vars` (gitignored). See [`docs/06-contact-security-setup.md`](./docs/06-contact-security-setup.md) for details.

## Root Scripts

| Command             | Description                                                                                  |
| ------------------- | -------------------------------------------------------------------------------------------- |
| `pnpm dev`          | Start the local dev server with Cloudflare Vite Plugin (SPA + Worker API)                    |
| `pnpm build`        | Build `packages/shared`, the React SPA, and the Worker bundle                                |
| `pnpm preview`      | Preview the production build locally in the Workers runtime                                  |
| `pnpm lint`         | Run ESLint across the repository                                                             |
| `pnpm typecheck`    | Run TypeScript type checking across all workspace packages                                   |
| `pnpm test`         | Run unit, component, and integration tests (`shared`, `web`, `api` on Workers) with Vitest   |
| `pnpm format`       | Format source files with Prettier                                                            |
| `pnpm format:check` | Check source formatting with Prettier                                                        |

## Documentation

See the [`docs/`](./docs/) directory for full project documentation, including requirements, content inventory, architecture proposals, development roadmap, security setup, and ADRs.
