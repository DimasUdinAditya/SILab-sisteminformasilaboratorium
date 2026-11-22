-- Dekan uploads a signature that is placed on endorsed official letters.
create table if not exists public.dean_signatures (
  id uuid primary key default gen_random_uuid(),
  dean_id uuid not null references public.profiles (id),
  signature_file text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.dean_signatures enable row level security;
revoke all on public.dean_signatures from anon, authenticated;
grant select on public.dean_signatures to authenticated;

drop policy if exists dean_signatures_read on public.dean_signatures;
create policy dean_signatures_read on public.dean_signatures for select to authenticated
  using (dean_id = auth.uid() or public.current_app_role() = 'super_admin');

-- Which Dekan signature was placed on a letter.
alter table public.request_documents add column if not exists dean_signature_id uuid references public.dean_signatures (id);

-- Stores a new active Dekan signature. The file must be the caller's own upload in the signatures bucket.
create or replace function public.set_dean_signature(_path text)
returns uuid language plpgsql security definer set search_path = public as $$
declare _id uuid;
begin
  if public.current_app_role() is distinct from 'dekan' then raise exception 'Akses ditolak' using errcode = '42501'; end if;
  if _path is null or split_part(_path, '/', 1) <> auth.uid()::text
     or not exists (select 1 from storage.objects where bucket_id = 'signatures' and name = _path) then
    raise exception 'File tanda tangan belum diunggah';
  end if;
  update public.dean_signatures set is_active = false where dean_id = auth.uid() and is_active;
  insert into public.dean_signatures (dean_id, signature_file, is_active) values (auth.uid(), _path, true) returning id into _id;
  return _id;
end $$;

revoke execute on function public.set_dean_signature(text) from public, anon;
grant execute on function public.set_dean_signature(text) to authenticated;
