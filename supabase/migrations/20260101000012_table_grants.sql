-- Table privileges for the API roles. RLS decides which rows each user sees; these grants only let the request reach the table.
-- Without them PostgREST answers 403 before RLS runs.
grant usage on schema public to anon, authenticated, service_role;

-- Signed-in users may read tables. Row visibility is controlled by the RLS policies.
grant select on all tables in schema public to authenticated;

-- Public pages (sign-up) read only these two reference tables, as the anon policies allow.
grant select on public.roles, public.program_studies to anon;

-- Writes from the browser exist only where an RLS write policy exists (see 0010). Everything else goes through RPC or server actions.
grant insert, update, delete on
  public.modules, public.materials, public.procedures, public.simulations, public.self_evaluations,
  public.assessments, public.questions, public.question_options, public.hotspots,
  public.module_access, public.remedial_assignments, public.media_assets
to authenticated;
grant insert on public.self_evaluation_responses to authenticated;

-- Server-side admin work (server actions with the service-role key) needs full table access.
-- service_role bypasses RLS by design, so it has to be granted table privileges explicitly.
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
