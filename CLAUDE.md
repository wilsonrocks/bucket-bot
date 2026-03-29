# Bucket Bot

A Discord bot + web dashboard for tracking Warhammer tournament rankings.

## Architecture

- **Backend**: Node.js + TypeScript, Hono framework, OpenAPI/Zod, runs on a VPS
- **Frontend**: React 19 + Vite, TanStack Router/Query, Mantine UI, Tailwind
- **Database**: PostgreSQL with PostGIS (Aiven in production, Docker locally)
- **Bot**: discord.js, posts ranking updates to Discord channels

## Database

The current schema is at [db/schema.sql](db/schema.sql) — read this instead of trawling migrations.

Migrations are managed by Flyway at [db/migrations/](db/migrations/).

Database types for the backend are generated from the schema:
```bash
cd backend && npm run generate-db-types
```
This generates Kysely types used throughout the backend. After schema changes, regenerate before editing queries.

## Development

Use `npm` (not pnpm or yarn).

```bash
# Start local PostgreSQL (PostGIS)
docker compose up -d

# Backend (port 9999, hot reload)
cd backend && npm run dev

# Frontend (port 3000)
cd frontend && npm run dev
```

## Code generation

The frontend API client is generated from the backend's OpenAPI spec:
```bash
cd frontend && npm run generate-client
```

Run this after adding/changing backend routes.

## Key directories

- [backend/routes/v1/v1-routes/](backend/routes/v1/v1-routes/) — API endpoint implementations
- [backend/logic/longshanks/](backend/logic/longshanks/) — HTML parsing for tournament imports from longshanks.com
- [backend/logic/bot/](backend/logic/bot/) — Logic for BOT (Bag o Tools) tournament imports
- [backend/logic/rankings/](backend/logic/rankings/) — Ranking and point calculation logic
- [backend/logic/discord/](backend/logic/discord/) — Discord message formatting and posting
- [terra/](terra/) — Terraform for AWS infrastructure (S3, CloudFront, Lambda, API Gateway)
