# Backend

Express + TypeScript API lives in `src/`. `src/database/schema.sql` points to the canonical Supabase migration to avoid maintaining duplicate schema definitions. Supabase PostgreSQL migrations, row-level security, storage policies, realtime setup, and Edge Functions live in `supabase/`.

Run with `npm run dev:backend` from the repository root. The `/api/health` endpoint is available at port 4100 by default. Copy `.env.example` to `.env`; Supabase service-role credentials must remain server-side. Use the Supabase CLI with `--workdir backend/supabase` from the repository root. Phase 1 provides API/database foundations; domain endpoints will be implemented in later phases.
