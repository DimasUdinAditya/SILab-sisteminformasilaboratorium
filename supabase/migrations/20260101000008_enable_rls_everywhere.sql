-- Safety net: turn on row level security for every public table.
-- Tables without a policy then deny access to the browser (anon/authenticated) by default.
-- Add explicit policies per table before exposing the app.
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end $$;
