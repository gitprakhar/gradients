-- =============================================================================
-- gradient_generations – Supabase
-- =============================================================================
-- 1. Open: Supabase Dashboard → Database → SQL Editor
-- 2. Click: "+ New query"
-- 3. Paste this entire file and click "Run" (or Cmd/Ctrl+Enter)
-- =============================================================================

-- Create the table (matches logGradientGeneration in src/lib/supabase.ts)
CREATE TABLE IF NOT EXISTS public.gradient_generations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  user_query  text NOT NULL,
  gradient_json jsonb NOT NULL
);

-- Allow the app (anon key) to insert. Tables created via SQL have RLS off by
-- default, so inserts work without this. Run the block below only if you turn
-- on RLS and then get "new row violates row-level security":
--
-- ALTER TABLE public.gradient_generations ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow anon insert"
--   ON public.gradient_generations
--   FOR INSERT
--   TO anon
--   WITH CHECK (true);

-- =============================================================================
-- Alternative: create via Table Editor (no SQL)
-- =============================================================================
-- Database → Table Editor → "New table"
-- Name: gradient_generations
-- Columns:
--   - id:         uuid, primary key, default: gen_random_uuid()
--   - created_at: timestamptz, not null, default: now()
--   - user_query: text, not null
--   - gradient_json: jsonb, not null
-- Save. If RLS is on, add Policy: INSERT for anon, WITH CHECK (true).
-- =============================================================================
