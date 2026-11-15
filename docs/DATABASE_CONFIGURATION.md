# Database configuration and persistence status

The repository contains a PostgreSQL Prisma schema at `apps/api/prisma/schema.prisma`, an initial migration, generation/migration/seed scripts, and a Compose PostgreSQL service with a named data volume.

**Important current limitation:** application HTTP routes currently use `apps/api/src/store/index.ts` and its in-memory seed state. They do not use Prisma for the application domain. PostgreSQL can be started and migrated, but that alone does not persist records created through the web app. The API health response reports `storage.persistent: false`. Do not deploy this version for real data or claim data survives restart.

The implementation work required before production persistence:

1. Refactor each store-backed service to Prisma repository operations while retaining equivalent validation, authorization and transactional behavior.
2. Add integration tests against a disposable PostgreSQL instance and cover CRUD, auth, imports, idempotency, analytics and reset safeguards.
3. Review migration compatibility and seed behavior; back up any existing database before applying migrations.
4. Configure the hosted database with private service connectivity, TLS as provided by the host, strong credentials, backups and least privilege. Keep the database URL in the API service secret environment only.
5. Use `prisma migrate deploy` as the deployment pre-start/migration step after reviewed migrations; never use `db:reset` against production.

For local PostgreSQL via Docker Compose:

```powershell
docker compose up -d postgres
npm run db:generate
npm run db:migrate
npm run db:seed
```

Compose stores database files in the named `postgres_data` volume and binds host port 5432 only to localhost. Do not expose 5432 publicly. Render's current documentation describes free Postgres as limited to 1 GB, without backups, and expiring 30 days after creation; do not use it for important persistent data. Check provider's current backup, retention, access, and pricing details before provisioning.
