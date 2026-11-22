-- Consumables get an ID/code like equipment does.
alter table public.consumables add column if not exists code text;

-- Deleting a laboratory also requires that it has no schedule entries.
create or replace function public.delete_laboratory(_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.current_app_role() is distinct from 'super_admin' and not public.is_lab_kalab(_id) then
    raise exception 'Akses ditolak' using errcode = '42501';
  end if;
  if exists (select 1 from public.laboratory_schedule_entries where laboratory_id = _id) then
    raise exception 'Laboratorium tidak dapat dihapus karena masih memiliki jadwal.';
  end if;
  if exists (select 1 from public.lab_usage_requests where laboratory_id = _id)
     or exists (select 1 from public.equipment_borrowings where laboratory_id = _id) then
    raise exception 'Laboratorium tidak dapat dihapus karena sudah memiliki riwayat pemakaian atau peminjaman.';
  end if;
  if exists (select 1 from public.equipment where laboratory_id = _id)
     or exists (select 1 from public.consumables where laboratory_id = _id) then
    raise exception 'Kosongkan inventaris laboratorium (alat dan bahan) sebelum menghapus.';
  end if;
  delete from public.laboratories where id = _id;
end $$;
