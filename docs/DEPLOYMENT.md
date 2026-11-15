# Deployment guide

## Status and safety boundary

No cloud account, repository integration, domain, or deployment credentials have been supplied. Nothing has been deployed. No paid plan has been selected or purchased. Do not publish this app with real data until the store-backed application is migrated from its current in-memory demo store to Prisma/PostgreSQL and the checks below pass.

## Suggested cloud topology

- Frontend: static site (Render Static Site, Vercel, or Netlify) built from `apps/web`.
- API: always-on web service (Render or Railway) running the existing Node/Express app.
- Database: managed PostgreSQL reachable privately from the API; never expose 5432 publicly.
- TLS: use provider HTTPS/custom domain and configure the frontend/API origins explicitly.

Render was evaluated from current official pricing docs. Its free web services spin down after 15 minutes idle and restart on request; its free PostgreSQL is 1 GB, expires after 30 days, and has no backups. Those are not suitable for the requested continuous backend or durable records. Render lists a 0.5 CPU/512 MB service at $7/month and PostgreSQL 0.1 CPU/256 MB at $6/month; these are indicative before usage, workspace, bandwidth, or taxes and may change. Do not create paid services without owner approval. A paid service avoids the free idle-spin-down limitation but is not an uptime guarantee; service restarts/maintenance remain possible.

## Hosting setup after application persistence is implemented

1. Push the reviewed project to a GitHub repository and connect it to the hosting provider. This has not been done from this workspace.
2. Provision PostgreSQL and enable the provider's supported backups/retention. Keep database connectivity private to the API where possible.
3. Deploy the API from the monorepo root so npm workspaces and `packages/shared` are available. Build: `npm ci && npm run build`; start: `npm run --workspace=@team-b/api start`; health check path: `/api/health` (also `/health`). The API listens on the provider-provided `PORT` and `HOST=0.0.0.0`.
4. Configure API secrets in the provider UI: `NODE_ENV=production`, generated strong `JWT_SECRET`, `COOKIE_SECRET`, `DATABASE_URL`, `CORS_ORIGINS=<exact-frontend-origin>`, and needed automation secrets. Do not commit secrets or put them in a frontend build variable.
5. Configure a pre-deploy migration command `npm run --workspace=@team-b/api db:migrate` only after reviewed migrations and Prisma generation/build have succeeded. Run seed only for initial setup and only after verifying that seed operations are safe for the target database.
6. Configure the static frontend with root `apps/web`, build command `npm ci && npm run --workspace=@team-b/shared build && npm run --workspace=@team-b/web build`, and publish directory `apps/web/dist` (adapt to the provider's monorepo root directory). Set build-time `VITE_API_URL` to the public API origin, without a trailing slash. Add SPA fallback/rewrite to `/index.html`.
7. Set `CORS_ORIGINS` to the exact HTTPS frontend origin. Production CORS does not allow arbitrary origins. Verify cookie/auth behavior over HTTPS and test login from a real browser.
8. Turn on GitHub auto-deploy, deploy logs/alerts, provider health checks, and database backup/restore checks. Verify the public site and API from an unrelated Wi-Fi and mobile data.

## Current readiness blockers

- API records use the in-memory demo store, not Prisma; restart loses all changes.
- Local PostgreSQL is not running in the checked environment.
- No GitHub remote/repository integration or provider credentials have been supplied.
- Therefore no public frontend/API URL, persistent cloud database, or external-network verification exists yet.

## Local checks

```powershell
npm run build
npm test
docker compose config --quiet
```

For local/same-Wi-Fi steps see `LOCAL_DEVELOPMENT.md` and `NETWORK_ACCESS.md`. For the database limitation and migration order see `DATABASE_CONFIGURATION.md`.
