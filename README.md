# Bucket Bot

A Discord bot and web dashboard for tracking UK Malifaux competitive tournament rankings.

Tournament results are imported from [Longshanks](https://malifaux.longshanks.org) and [Bag o Tools](https://bag-o-tools.web.app). Rankings are calculated and posted to Discord automatically.

## Stack

- **Backend**: Node.js + TypeScript, [Hono](https://hono.dev) + Zod OpenAPI, runs on a VPS
- **Frontend**: React 19 + Vite, TanStack Router/Query, Mantine UI
- **Database**: PostgreSQL with PostGIS (Aiven in prod, Docker locally)
- **Bot**: discord.js, posts ranking updates to Discord channels

## Prerequisites

- Node.js 20+
- Docker (for local PostgreSQL)
- [direnv](https://direnv.net/) (for env vars)
- [Flyway CLI](https://documentation.red-gate.com/fd/flyway-cli-and-api) (for running migrations)

## Getting started

```bash
# 1. Allow direnv to load environment variables
direnv allow

# 2. Install dependencies
cd backend && npm install
cd ../frontend && npm install

# 3. Start local PostgreSQL
docker compose up -d

# 4. Run database migrations
flyway migrate

# 5. Start backend (port 9999, hot reload)
cd backend && npm run dev

# 6. Start frontend (port 3000)
cd frontend && npm run dev
```

The frontend is at http://localhost:3000. The backend API is at http://localhost:9999, with Swagger UI at http://localhost:9999/v1/ui.

## Seed data

To populate a local database with real tournament data:

```bash
./db/seed
```

This imports several Longshanks events and generates rankings.

## Tests

```bash
cd backend && npx vitest run
```

Tests spin up a throwaway PostgreSQL container via Testcontainers and run Flyway migrations automatically — no local DB needed.

## Common workflows

### Adding or changing a backend route

After modifying a route, regenerate the frontend API client:

```bash
cd frontend && npm run generate-client
```

This calls `orval` against the running backend's OpenAPI spec (`http://localhost:9999/v1/doc`), so the backend must be running.

### Changing the database schema

1. Create a new migration file:
   ```bash
   ./db/create-migration my migration description
   ```
2. Edit the generated file in `db/migrations/`
3. Run `flyway migrate` to apply it
4. Regenerate Kysely types:
   ```bash
   cd backend && npm run generate-db-types
   ```

### Adding schema

The current schema is in [db/schema.sql](db/schema.sql). This is the source of truth — don't trawl migrations to understand the schema.

## Key directories

```
backend/
  routes/v1/v1-routes/   # API endpoint handlers
  logic/longshanks/      # Longshanks HTML parsing
  logic/bot/             # Bag o Tools API import
  logic/rankings/        # Points and ranking calculation
  logic/discord/         # Discord message formatting

frontend/
  src/routes/            # TanStack Router pages
  src/api/               # API hooks (generated + hand-written wrappers)
  src/components/        # Shared UI components

db/
  migrations/            # Flyway SQL migrations
  schema.sql             # Current full schema

terra/                   # Terraform for AWS infrastructure
```
