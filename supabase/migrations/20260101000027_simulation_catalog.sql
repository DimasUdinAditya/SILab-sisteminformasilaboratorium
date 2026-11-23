-- Tahap 2: katalog simulasi pusat (dikelola Super Admin) dan sumber simulasi per modul.
-- Dosen hanya membaca katalog aktif, lalu menyalinnya ke modul. Salinan itu bisa diubah per modul
-- (judul, petunjuk, tautan, tampilan) tanpa mengubah katalog.

create table if not exists public.simulation_catalog (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) between 1 and 200),
  description text,
  type public.simulation_type not null,
  external_url text not null,
  display_mode text not null default 'embed' check (display_mode in ('embed', 'new_tab')),
  is_active boolean not null default true,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.simulations
  add column if not exists catalog_id uuid references public.simulation_catalog (id) on delete set null,
  add column if not exists display_mode text not null default 'embed' check (display_mode in ('embed', 'new_tab'));

alter table public.simulation_catalog enable row level security;

create policy simulation_catalog_read on public.simulation_catalog
  for select to authenticated
  using (is_active or public.current_app_role() = 'super_admin'::app_role);

create policy simulation_catalog_admin_write on public.simulation_catalog
  for all to authenticated
  using (public.current_app_role() = 'super_admin'::app_role)
  with check (public.current_app_role() = 'super_admin'::app_role);

grant select, insert, update, delete on public.simulation_catalog to authenticated;
grant all on public.simulation_catalog to service_role;
