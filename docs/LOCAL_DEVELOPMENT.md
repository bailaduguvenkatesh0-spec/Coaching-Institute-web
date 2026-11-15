# Local development

## Start the app

From the repository root in PowerShell:

```powershell
npm install
npm run build
npm run dev
```

Keep that terminal open. `npm run dev` runs the API (`0.0.0.0:4000`) and Vite (`0.0.0.0:5173`); closing the process, shutting down the PC, or losing power stops both. The development processes are not a permanent hosting service.

Open `http://localhost:5173`. Check the API with `http://localhost:4000/api/health` or through Vite at `http://localhost:5173/api/health`.

If a port is already occupied, inspect it before stopping anything:

```powershell
Get-NetTCPConnection -State Listen | Where-Object { $_.LocalPort -in 4000,5173,5432 } | Select-Object LocalAddress,LocalPort,OwningProcess
```

Vite uses `strictPort`; it fails with a clear error rather than silently choosing a different URL. Stop only the process you identify and own, or change `PORT` / `FRONTEND_PORT` in the local environment files consistently.

## What the health check means

`GET /api/health` verifies that Express answers. The response also declares the active storage mode. The current application routes use an in-memory demo store, not Prisma/PostgreSQL. Data written to this store is lost when the API restarts. A healthy HTTP response does not prove database persistence.

## PostgreSQL and Prisma

The Prisma schema and an initial migration exist under `apps/api/prisma`, but the API routes currently use the in-memory `store`. Do not treat PostgreSQL migrations or a successful Prisma connection as proof that the application is reading/writing its records in PostgreSQL. Persisting the app requires replacing/refactoring the store-backed service layer and tests before production data is used.

If Docker is available, the PostgreSQL Compose service uses a named volume and binds port 5432 only to `127.0.0.1` on the host:

```powershell
docker compose up --pull always -d postgres
npm run db:generate
npm run db:migrate
npm run db:seed
```

Do not publish PostgreSQL directly to the public internet. `db:reset` is a destructive development operation; do not run it against important or production data.
