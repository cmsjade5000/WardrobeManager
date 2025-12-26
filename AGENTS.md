# Repository Guidelines

## Project Structure & Module Organization
- `client/` holds the React + TypeScript frontend. Primary entry points live in `client/src/App.tsx` and `client/src/main.tsx`, with pages under `client/src/pages/` and shared UI in `client/src/components/`.
- `server/` contains the Express API and server setup (`server/index.ts`, `server/routes.ts`).
- `shared/` is for shared types and validation helpers (for example, `shared/schema.ts` Zod schemas).
- `prisma/` stores the database schema (`prisma/schema.prisma`) for the SQLite database.
- `uploads/` stores user-uploaded images served by the backend. Treat it as local data unless you intend to version assets.
- `script/` includes build utilities such as `script/build.ts`.

## Build, Test, and Development Commands
- `npm run dev`: start the development server (Express + Vite) on `http://0.0.0.0:5000`.
- `npm run build`: run the production build via `script/build.ts`.
- `npm run start`: run the production server from `dist/`.
- `npm run check`: run TypeScript type checking.
- `npm run lint`: run Biome lints across the repo.
- `npm run format`: auto-format files with Biome.
- `npx prisma migrate dev --name <change>`: apply Prisma schema updates to the local SQLite database.

## Coding Style & Naming Conventions
- TypeScript is used throughout; follow existing formatting: 2-space indentation, double quotes, and no semicolons (see `client/src/components/ui/button.tsx`). Use Biome to enforce formatting and linting.
- React components use `.tsx` with PascalCase filenames in `client/src/components/` (for example, `Layout.tsx`). UI primitives in `client/src/components/ui/` use kebab-case filenames (for example, `context-menu.tsx`).
- Tailwind CSS is the primary styling approach; keep class lists readable and avoid inline styles unless necessary.

## Testing Guidelines
- API tests use Vitest + Supertest. Run `npm test` (or `npm run test:watch`) to execute them.
- `npm run check` remains the baseline TypeScript gate for UI and API changes.

## Configuration & Secrets
- Set `OPENAI_API_KEY` in your environment (see `.env.example`) to enable `/api/ai`.
- `BG_REMOVAL_ENABLED` controls background removal for uploaded images (`true` by default).
- `BG_REMOVAL_MODEL` can be `small`, `medium`, or `large` to trade speed vs. quality.
- The first background removal run downloads model assets unless you host them locally.
- Never commit real API keys; use `.env` files locally or host-provided secrets.

## Commit & Pull Request Guidelines
- Recent commits use short, sentence-case summaries (for example, “Published your App”, “Add more clothing and accessory items…”). Keep messages concise and descriptive.
- PRs should include a clear summary, testing notes (commands or manual checks), and screenshots for UI changes. Call out any schema changes in `prisma/schema.prisma` and whether local data files (like `prisma/dev.db` or `uploads/`) are impacted.
