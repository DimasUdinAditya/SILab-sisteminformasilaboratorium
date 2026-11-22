-- Helper functions and constraints that the original base SQL (01/02) defined but that
-- are not in this repo. Written from how the migrations and app code use them.
-- Review the bodies: they are inferred, not copied from the original database.

-- Role code of the signed-in, active user. Migration 0003 replaces this with the same body.
create or replace function public.current_app_role()
returns public.app_role language sql stable security definer set search_path = public as $$
  select r.code from public.profiles p join public.roles r on r.id = p.role_id
  where p.id = auth.uid() and p.is_active
$$;

-- Kalab (head of lab) of a given laboratory.
create or replace function public.is_lab_kalab(_lab_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.laboratories l where l.id = _lab_id and l.kalab_id = auth.uid())
$$;

-- A lab request is visible to its requester and to the kalab of that lab.
create or replace function public.can_view_lab_request(_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.lab_usage_requests r
    where r.id = _id and (r.requester_id = auth.uid() or public.is_lab_kalab(r.laboratory_id))
  )
$$;

-- A borrowing is visible to its borrower and to the kalab of that lab.
create or replace function public.can_view_borrowing(_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.equipment_borrowings b
    where b.id = _id and (b.borrower_id = auth.uid() or public.is_lab_kalab(b.laboratory_id))
  )
$$;

-- 0003 inserts roles with ON CONFLICT (code), which needs a unique constraint.
alter table public.roles add constraint roles_code_key unique (code);
