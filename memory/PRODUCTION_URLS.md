# WanderMark — Production URLs & Hosting

> Authoritative source-of-truth for every external URL, host, and account
> involved in shipping WanderMark to production. Future agents (forked
> sessions or otherwise): **read this first** before asking the user for
> URLs, dashboards, or service names.

## Backend (FastAPI)
- **Production**: `https://wandermark-api.onrender.com`
- **Host**: Render (EU region)
- **Deploy**: auto from GitHub `main` branch
- **Shell**: Render Dashboard → service → "Shell" tab
- **Working dir on Shell**: `~/project/src/backend/`
- **Python version**: pinned to `3.11.11` via `.python-version`
- **Health check**: `https://wandermark-api.onrender.com/api/health`

## Database (MongoDB)
- **Production**: MongoDB Atlas (EU region, managed by Render integration)
- **Mutations on prod**: ONLY via Render Shell (`python -m scripts.<name>`)
- **Local/preview DB**: `MONGO_URL` from `/app/backend/.env` — NEVER share preview URLs
- **Connection**: backend reads `MONGO_URL` + `DB_NAME` from env

## Frontend (Expo / React Native)
- **App config**: `/app/frontend/app.json` — current `version: 1.5.0`, `buildNumber: 86`
- **EAS profiles** (`/app/frontend/eas.json`): all 3 (development/preview/production) point to the **production Render URL** above so TestFlight builds always hit prod
- **Bundle identifier**: see `app.json` ios.bundleIdentifier
- **Distribution**: TestFlight → App Store Connect

## Trust Center (CDN — pending)
- **Target host**: Vercel or Cloudflare Pages
- **Target URL**: `https://wandermark.app` (root) — `/privacy` + `/terms` paths
- **Source files**: `/app/trust-center/privacy.md` + `terms.md`
- **Frontend env var to set after deploy**: `EXPO_PUBLIC_TRUST_CENTER_URL=https://wandermark.app` in `frontend/.env`
- **Status**: NOT YET DEPLOYED — bundled markdown is the current fallback

## Observability
- **Sentry project (frontend)**: `aarum/wandermark-frontend`
- **Sentry project (backend)**: `aarum/wandermark-api`
- **Sentry org**: `aarum`
- **Backend DSN env var**: `SENTRY_DSN` on Render
- **Frontend DSN env var**: `EXPO_PUBLIC_SENTRY_DSN` (already in preview .env)

## Source code
- **GitHub**: pushed via Emergent's "Save to Github" button — agent never runs raw git push
- **Default branch**: `main`
- **Render watches**: `main` (auto-deploy on push)

## Critical rules
- **NEVER** hardcode `.preview.emergentagent.com` URLs — they rotate per session
- **NEVER** put preview URLs in `eas.json`, `app.json`, or any committed file
- **ONLY** use the URLs in this file or env vars (`MONGO_URL`, `REACT_APP_BACKEND_URL`, `EXPO_PUBLIC_BACKEND_URL`) for committed config
- **ALWAYS** instruct the user to use Render Shell for prod DB mutations — never inline shell-pasteable Python (gets mangled by terminal escapes)

## When this file changes
Update this file the moment any of the following change:
- Render service URL or custom domain mapped on top of it
- DB region / Atlas cluster
- Sentry project slug or org
- Trust Center deployment goes live (set the URL + flip "NOT YET DEPLOYED")
- A new prod service is added (e.g. CDN, queue, cron host)
