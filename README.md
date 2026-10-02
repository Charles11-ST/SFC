# Smart Farmer Connect

Production-oriented full-stack foundation for Zimbabwean farmers. Phase 1 establishes a Next.js + React + TypeScript + Tailwind frontend, a separate Express + TypeScript API, and PostgreSQL through Supabase. No demo accounts, fabricated social activity, weather, agricultural alerts, market prices, news, or expert credentials are seeded.

## Project layout

- `frontend/src/app/` contains the Next.js App Router home and explicit later-phase route placeholders.
- `frontend/src/components/` contains shared navigation and phase status components.
- `frontend/src/lib/` contains the server-side API client. Frontend code never receives service-role or provider secrets.
- `backend/src/` contains the Express server, security middleware, validated environment configuration, and server-only Supabase connection.
- `backend/supabase/` contains PostgreSQL migrations, RLS, storage policies, realtime setup, and Edge Functions.
- `frontend/legacy-vite/` preserves the previous React app without including it in the Next.js build.
- Root npm workspaces coordinate the separate apps.

## Phase 1 Foundation

- Next.js App Router with React, TypeScript, Tailwind CSS, responsive layout, and route files.
- Express 5 API with a live health endpoint, CORS allowlist, Helmet headers, JSON size limit, request rate limit, validation/auth middleware, and sanitized errors.
- PostgreSQL schema through Supabase with relational profiles, locations/interests, social entities, messaging, communities, experts, notifications, sourced news, verified alerts, weather cache, and RLS.
- Server-only Supabase service-role database connector; never expose it to the browser.
- Current dashboard checks Express health and shows an honest setup state when the API isn’t available.
- Later workflow routes are explicitly marked for their planned phase; they do not pretend to provide authentication, weather, posts, alerts, or other live domain data yet.

## Setup

1. Create a Supabase project.
2. Copy `backend/.env.example` to `backend/.env`; set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` there. Keep the service-role key server-only and never commit `.env` files. The API defaults to port 4100 to avoid conflict with an existing local service on 4000.
3. Copy `frontend/.env.example` to `frontend/.env.local`; set `BACKEND_API_URL=http://localhost:4100`.
4. Install from the root with `npm install`.
5. Link/apply schema with `npx supabase --workdir backend/supabase link --project-ref YOUR_PROJECT_REF`, then `npx supabase --workdir backend/supabase db push`.
6. Start both services with `npm run dev`, or individually with `npm run dev:frontend` and `npm run dev:backend`.
7. Frontend: `http://localhost:3000`. API health: `http://localhost:4100/api/health`.

No Supabase account keys or external provider secrets are checked in. External providers are connected in later phases after source coverage/licensing is selected.

## Data and safety

Phase 1 creates the secured foundation, not a complete production launch. Supabase Auth owns password hashing. RLS protects application tables. Precise coordinates are separate from public profiles. Alerts are visible only after trusted verification; expert verification cannot be self-assigned. Trending values must come from measured activity. External information is not shown until providers are integrated and source attribution is available.

## Commands

- `npm run dev`: start Next.js and Express together.
- `npm run build`: build both workspaces.
- `npm run lint`: type-check both workspaces.
- `npm run dev:frontend`: start Next.js only.
- `npm run dev:backend`: start Express only.
