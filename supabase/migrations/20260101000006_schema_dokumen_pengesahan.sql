-- SiLab · Fase 4 (SQL 3 dari 3): Surat, Pengesahan Dekan, Notifikasi, Audit
create type public.request_type as enum ('lab_usage','borrowing');
create type public.endorsement_status as enum ('Menunggu_Pengesahan','Disahkan');

create table public.document_templates (
  id uuid primary key default gen_random_uuid(),
  request_type public.request_type not null,
  name text not null,
  template_html text not null,     -- placeholder {{nama_pemohon}} dst.
  version int not null default 1,
  is_active boolean not null default true
);

create table public.kalab_signatures (
  id uuid primary key default gen_random_uuid(),
  kalab_id uuid not null references public.profiles(id),
  signature_file text not null,    -- path di bucket privat 'signatures'
  method text not null default 'image',
  is_active boolean not null default true
);

-- Surat RESMI saja (preview tidak disimpan)
create table public.request_documents (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.document_templates(id),
  signature_id uuid not null references public.kalab_signatures(id),
  lab_usage_request_id uuid unique references public.lab_usage_requests(id),
  borrowing_id uuid unique references public.equipment_borrowings(id),
  letter_number text,
  file_url text not null,          -- path di bucket privat 'letters'
  is_signed boolean not null default true,
  issued_by uuid not null references public.profiles(id),
  issued_at timestamptz not null default now(),
  check ((lab_usage_request_id is null) <> (borrowing_id is null))
);

-- Pengesahan administratif Dekan (TERPISAH dari status peminjaman)
create table public.borrowing_endorsements (
  id uuid primary key default gen_random_uuid(),
  request_type public.request_type not null,
  lab_usage_request_id uuid unique references public.lab_usage_requests(id) on delete cascade,
  borrowing_id uuid unique references public.equipment_borrowings(id) on delete cascade,
  dean_id uuid references public.profiles(id),
  status public.endorsement_status not null default 'Menunggu_Pengesahan',
  note text,
  created_at timestamptz not null default now(),
  endorsed_at timestamptz,
  check ((lab_usage_request_id is null) <> (borrowing_id is null))
);

create table public.endorsement_history (
  id uuid primary key default gen_random_uuid(),
  endorsement_id uuid not null references public.borrowing_endorsements(id) on delete cascade,
  from_status text,
  to_status text not null,
  actor_id uuid references public.profiles(id),
  note text,
  changed_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  message text,
  link_url text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

-- ===== Fungsi bantu notifikasi =====
create or replace function public.notify_role(p_role public.app_role, p_type text, p_title text, p_message text, p_link text)
returns void language sql security definer set search_path = public as $$
  insert into public.notifications (user_id, type, title, message, link_url)
  select p.id, p_type, p_title, p_message, p_link
  from public.profiles p join public.roles r on r.id = p.role_id
  where r.code = p_role and p.is_active
$$;

-- ===== Pengesahan Dekan =====
-- Otomatis masuk antrean saat KaLab menyetujui (status -> Disetujui)
create or replace function public.queue_endorsement()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if new.status::text = 'Disetujui' and old.status::text is distinct from 'Disetujui' then
    if tg_table_name = 'lab_usage_requests' then
      insert into public.borrowing_endorsements (request_type, lab_usage_request_id) values ('lab_usage', new.id)
      on conflict do nothing returning id into v_id;
    else
      insert into public.borrowing_endorsements (request_type, borrowing_id) values ('borrowing', new.id)
      on conflict do nothing returning id into v_id;
    end if;
    if v_id is not null then
      insert into public.endorsement_history (endorsement_id, from_status, to_status, actor_id)
      values (v_id, null, 'Menunggu_Pengesahan', auth.uid());
      perform public.notify_role('dekan', 'endorsement', 'Pengajuan menunggu pengesahan',
        'Ada pengajuan yang telah disetujui KaLab dan menunggu pengesahan.', '/pengesahan/' || v_id);
    end if;
  end if;
  return new;
end $$;

create trigger trg_queue_endorsement_lab after update of status on public.lab_usage_requests
for each row execute function public.queue_endorsement();
create trigger trg_queue_endorsement_borrow after update of status on public.equipment_borrowings
for each row execute function public.queue_endorsement();

-- Aksi Dekan: Sahkan (tidak mengubah status peminjaman)
create or replace function public.endorse_request(p_endorsement_id uuid, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.current_app_role() is distinct from 'dekan' then raise exception 'Akses ditolak'; end if;
  update public.borrowing_endorsements
     set status = 'Disahkan', dean_id = auth.uid(), endorsed_at = now(), note = p_note
   where id = p_endorsement_id and status = 'Menunggu_Pengesahan';
  if not found then raise exception 'Pengajuan tidak ditemukan atau sudah disahkan'; end if;
  insert into public.endorsement_history (endorsement_id, from_status, to_status, actor_id, note)
  values (p_endorsement_id, 'Menunggu_Pengesahan', 'Disahkan', auth.uid(), p_note);
end $$;

-- ===== Notifikasi registrasi =====
create or replace function public.notify_new_registration()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.notify_role('super_admin', 'registration', 'Registrasi baru',
    new.full_name || ' mendaftar dan menunggu persetujuan.', '/admin/registrasi/' || new.id);
  return new;
end $$;
create trigger trg_notify_new_registration after insert on public.user_registrations
for each row execute function public.notify_new_registration();

create or replace function public.notify_registration_approved()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_profile uuid;
begin
  if new.decision = 'Disetujui' then
    select profile_id into v_profile from public.user_registrations where id = new.registration_id;
    if v_profile is not null then
      insert into public.notifications (user_id, type, title, message, link_url)
      values (v_profile, 'registration', 'Akun disetujui', 'Selamat datang di LabVir.', '/dashboard');
    end if;
  end if;
  return new;
end $$;
create trigger trg_notify_registration_approved after insert on public.registration_approvals
for each row execute function public.notify_registration_approved();

-- ===== RLS tabel pengesahan (final) =====
alter table public.borrowing_endorsements enable row level security;
alter table public.endorsement_history enable row level security;

create or replace function public.kalab_owns_endorsement(e public.borrowing_endorsements)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.laboratories l
    left join public.lab_usage_requests r on r.laboratory_id = l.id and r.id = e.lab_usage_request_id
    left join public.equipment_borrowings b on b.laboratory_id = l.id and b.id = e.borrowing_id
    where l.kalab_id = auth.uid() and (r.id is not null or b.id is not null))
$$;

create policy end_select_dekan_admin on public.borrowing_endorsements for select
  using (public.current_app_role() in ('dekan','super_admin'));
create policy end_select_kalab on public.borrowing_endorsements for select
  using (public.current_app_role() = 'kalab' and public.kalab_owns_endorsement(borrowing_endorsements));
create policy endh_select on public.endorsement_history for select
  using (exists (select 1 from public.borrowing_endorsements e where e.id = endorsement_id));
-- Perubahan hanya lewat trigger & endorse_request().

-- ===== Akses baca Dekan ke detail pengajuan yang masuk antrean pengesahan =====
-- (policy tambahan, digabung OR dengan policy yang sudah dibuat di tahap 1–3)
create or replace function public.dekan_can_view_request(p_lab uuid, p_borrow uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_app_role() = 'dekan' and exists (
    select 1 from public.borrowing_endorsements e
    where (p_lab is not null and e.lab_usage_request_id = p_lab) or (p_borrow is not null and e.borrowing_id = p_borrow))
$$;

create or replace function public.dekan_can_view_profile(p_profile uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_app_role() = 'dekan' and exists (
    select 1 from public.borrowing_endorsements e
    left join public.lab_usage_requests r on r.id = e.lab_usage_request_id
    left join public.equipment_borrowings b on b.id = e.borrowing_id
    where r.requester_id = p_profile or b.borrower_id = p_profile)
$$;

create policy dekan_read_lab_requests on public.lab_usage_requests for select using (public.dekan_can_view_request(id, null));
create policy dekan_read_borrowings on public.equipment_borrowings for select using (public.dekan_can_view_request(null, id));
create policy dekan_read_borrowing_items on public.borrowing_items for select using (public.dekan_can_view_request(null, borrowing_id));
create policy dekan_read_documents on public.request_documents for select
  using (public.dekan_can_view_request(lab_usage_request_id, borrowing_id));
create policy dekan_read_requester on public.profiles for select using (public.dekan_can_view_profile(id));
create policy dekan_read_labs on public.laboratories for select using (public.current_app_role() = 'dekan');
create policy dekan_read_equipment on public.equipment for select using (public.current_app_role() = 'dekan');
create policy dekan_read_consumables on public.consumables for select using (public.current_app_role() = 'dekan');
