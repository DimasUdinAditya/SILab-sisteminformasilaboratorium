-- SiLab · Fase 4 (SQL 2 dari 3): Patch PRD v4.2 — role Dekan & registrasi mandiri
-- Aman dijalankan di atas database fase 1–3 (paket lama).

-- 1) Role Dekan
insert into public.roles (code, name) values ('dekan', 'Dekan') on conflict (code) do nothing;

-- 2) Kolom baru di profiles
alter table public.profiles add column if not exists semester int check (semester between 1 and 14);
create unique index if not exists profiles_nim_nip_unique on public.profiles (nim_nip) where nim_nip is not null;

-- 3) Role aktif hanya untuk akun aktif
create or replace function public.current_app_role()
returns public.app_role language sql stable security definer set search_path = public as $$
  select r.code from public.profiles p join public.roles r on r.id = p.role_id
  where p.id = auth.uid() and p.is_active
$$;

-- 4) Tabel registrasi
do $$ begin
  create type public.registration_status as enum ('Menunggu','Disetujui','Ditolak');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.registration_decision as enum ('Disetujui','Ditolak');
exception when duplicate_object then null; end $$;

create table if not exists public.user_registrations (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  requested_role_id uuid not null references public.roles(id),
  program_study_id uuid references public.program_studies(id),
  profile_id uuid unique references public.profiles(id),
  full_name text not null,
  nim_nip text not null,
  semester int check (semester between 1 and 14),
  email text not null,
  status public.registration_status not null default 'Menunggu',
  submitted_at timestamptz not null default now()
);
create unique index if not exists user_registrations_nim_nip_active
  on public.user_registrations (nim_nip) where status <> 'Ditolak';

create table if not exists public.registration_approvals (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.user_registrations(id) on delete cascade,
  approved_role_id uuid references public.roles(id),
  decided_by uuid not null references public.profiles(id),
  decision public.registration_decision not null,
  rejection_reason text,
  decided_at timestamptz not null default now(),
  check (decision <> 'Ditolak' or rejection_reason is not null)
);

-- 5) Sign Up (metadata signup_source = 'self') -> antrean registrasi
create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_role_code text := m->>'requested_role';
  v_role_id uuid;
begin
  if coalesce(m->>'signup_source', '') <> 'self' then
    return new;  -- akun dibuat Super Admin: tidak lewat antrean
  end if;
  if v_role_code is null or v_role_code = 'super_admin' then
    raise exception 'Role tidak valid untuk registrasi mandiri';
  end if;
  select id into v_role_id from public.roles where code::text = v_role_code;
  if v_role_id is null then raise exception 'Role tidak dikenal'; end if;
  if coalesce(m->>'full_name', '') = '' or coalesce(m->>'nim_nip', '') = '' then
    raise exception 'Nama lengkap dan NIM/NIP wajib diisi';
  end if;
  if v_role_code = 'mahasiswa' and coalesce(m->>'semester', '') = '' then
    raise exception 'Semester wajib diisi untuk mahasiswa';
  end if;
  if exists (select 1 from public.profiles where nim_nip = m->>'nim_nip') then
    raise exception 'NIM/NIP sudah terdaftar';
  end if;
  insert into public.user_registrations (auth_user_id, requested_role_id, program_study_id, full_name, nim_nip, semester, email)
  values (new.id, v_role_id, nullif(m->>'program_study_id', '')::uuid, m->>'full_name', m->>'nim_nip',
          nullif(m->>'semester', '')::int, new.email);
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_auth_user();

-- 6) Setujui / tolak (hanya Super Admin)
create or replace function public.approve_registration(
  p_registration_id uuid, p_role public.app_role default null, p_program_study_id uuid default null)
returns void language plpgsql security definer set search_path = public as $$
declare reg public.user_registrations; v_role_id uuid;
begin
  if public.current_app_role() is distinct from 'super_admin' then raise exception 'Akses ditolak'; end if;
  select * into reg from public.user_registrations where id = p_registration_id for update;
  if reg.id is null then raise exception 'Registrasi tidak ditemukan'; end if;
  if reg.status <> 'Menunggu' then raise exception 'Registrasi sudah diproses'; end if;
  if p_role = 'super_admin' then raise exception 'Role Super Admin tidak dapat diberikan lewat registrasi'; end if;
  v_role_id := coalesce((select id from public.roles where code = p_role), reg.requested_role_id);
  insert into public.profiles (id, role_id, program_study_id, name, email, nim_nip, semester)
  values (reg.auth_user_id, v_role_id, coalesce(p_program_study_id, reg.program_study_id),
          reg.full_name, reg.email, reg.nim_nip, reg.semester);
  update public.user_registrations set status = 'Disetujui', profile_id = reg.auth_user_id where id = reg.id;
  insert into public.registration_approvals (registration_id, approved_role_id, decided_by, decision)
  values (reg.id, v_role_id, auth.uid(), 'Disetujui');
end $$;

create or replace function public.reject_registration(p_registration_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.current_app_role() is distinct from 'super_admin' then raise exception 'Akses ditolak'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'Alasan penolakan wajib diisi'; end if;
  update public.user_registrations set status = 'Ditolak' where id = p_registration_id and status = 'Menunggu';
  if not found then raise exception 'Registrasi tidak ditemukan atau sudah diproses'; end if;
  insert into public.registration_approvals (registration_id, decided_by, decision, rejection_reason)
  values (p_registration_id, auth.uid(), 'Ditolak', p_reason);
end $$;

-- 7) RLS registrasi (final)
alter table public.user_registrations enable row level security;
alter table public.registration_approvals enable row level security;
drop policy if exists reg_select_own on public.user_registrations;
drop policy if exists reg_select_admin on public.user_registrations;
drop policy if exists appr_select_own on public.registration_approvals;
drop policy if exists appr_select_admin on public.registration_approvals;
create policy reg_select_own on public.user_registrations for select using (auth_user_id = auth.uid());
create policy reg_select_admin on public.user_registrations for select using (public.current_app_role() = 'super_admin');
create policy appr_select_own on public.registration_approvals for select
  using (exists (select 1 from public.user_registrations r where r.id = registration_id and r.auth_user_id = auth.uid()));
create policy appr_select_admin on public.registration_approvals for select using (public.current_app_role() = 'super_admin');

-- 8) Form Sign Up perlu membaca daftar role & prodi tanpa login
drop policy if exists anon_read_roles on public.roles;
drop policy if exists anon_read_prodi on public.program_studies;
create policy anon_read_roles on public.roles for select to anon using (code <> 'super_admin');
create policy anon_read_prodi on public.program_studies for select to anon using (true);
