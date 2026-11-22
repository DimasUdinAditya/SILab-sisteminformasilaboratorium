-- A lecturer who creates a module inserts and reads it back in one statement (insert ... select).
-- The access helper is STABLE and cannot see a row inserted in the same statement, so the owner
-- is allowed directly by column.
drop policy if exists modules_read on public.modules;
create policy modules_read on public.modules for select to authenticated
  using (lecturer_id = auth.uid() or public.can_view_module(id));

-- New modules start as Draft; the app inserts without a status.
alter table public.modules alter column status set default 'Draft';
