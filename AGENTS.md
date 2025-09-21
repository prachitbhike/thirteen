# Repository Guidelines

## Project Structure & Module Organization
- `apps/web` (React + Vite dashboard) drives the UI; colocate pages under `src/pages` and use `src/components` for shared widgets.
- `apps/api` exposes the Hono REST API; split routes under `src/routes` and keep request validators beside handlers.
- `apps/ingestion` schedules SEC ingestion scripts (`src/scripts/ingest-*`); long-running jobs belong here, not the API.
- `packages/database` holds the Drizzle schema/connectors, `packages/shared` centralizes types/utilities, and `packages/ui` houses reusable React primitives; Supabase credentials live in `.env` and are consumed across services.

## Build, Test, and Development Commands
- `npm run dev --workspace=@hedge-fund-tracker/web` starts the Vite dev server; mirror the pattern for `api` and `ingestion`.
- `npm run build --workspace=<name>` produces TypeScript builds; run before publishing changes touching that workspace.
- `npm run lint` and `npm run typecheck` fan out across all workspaces; use them pre-commit.
- `npm run db:setup`, `npm run db:migrate`, and `npm run db:seed` run Drizzle migrations against Supabase; keep `.env` aligned before executing.

## Coding Style & Naming Conventions
- TypeScript across the monorepo uses ESM imports, two-space indentation, single quotes, and strict null handling as seen in `apps/api/src/index.ts`.
- React components live in PascalCase files exporting default functions; hooks/utilities stay camelCase.
- Define Zod schemas alongside handlers and re-export shared types from `packages/shared/src/index.ts` to avoid circular imports.
- Run `npm run lint --workspace=<name>` for localized fixes; ESLint with TypeScript plugins handles formatting, negating the need for Prettier.

## Testing Guidelines
- `npm run test` currently delegates to workspace scripts; wire new tests as `.test.ts(x)` files in the same package and register a `test` script before opening a PR.
- Prefer Vitest for React/utility code and Supertest for API routes; mock external services (OpenAI, SEC) and seed the database with lightweight fixtures.
- Document coverage expectations in the PR if tests touch ingestion jobs, and include repro steps when skipping long-running suites.

## Commit & Pull Request Guidelines
- Existing history favors short imperative titles (e.g., "third commit"); keep summaries under 72 characters and expand detail in the body.
- Group related changes per workspace, note database migrations and `.env` adjustments explicitly, and update `README.md` or `DEVELOPMENT.md` if behavior shifts.
- PRs should link to tracking issues, describe verification (`npm run lint`, migrations, manual QA), and attach screenshots or curl excerpts for UI/API work.
