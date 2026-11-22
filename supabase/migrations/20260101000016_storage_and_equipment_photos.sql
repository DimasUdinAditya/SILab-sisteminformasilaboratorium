-- Buckets the app uploads to. Their creation was missing from the repo, so uploads failed on a fresh project.
insert into storage.buckets (id, name, public) values
  ('readiness-photos', 'readiness-photos', false),
  ('return-photos', 'return-photos', false),
  ('calibration-certificates', 'calibration-certificates', false),
  ('signatures', 'signatures', false),
  ('letters', 'letters', false),
  ('module-media', 'module-media', false),
  ('equipment-photos', 'equipment-photos', false)
on conflict (id) do nothing;

-- Borrowing photos: path starts with the borrowing id.
drop policy if exists readiness_photos_insert on storage.objects;
create policy readiness_photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'readiness-photos' and public.can_upload_readiness(name));
drop policy if exists readiness_photos_select on storage.objects;
create policy readiness_photos_select on storage.objects for select to authenticated
  using (bucket_id = 'readiness-photos' and public.can_view_borrowing(public.try_uuid(split_part(name, '/', 1))));

drop policy if exists return_photos_insert on storage.objects;
create policy return_photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'return-photos' and public.can_upload_return(name));
drop policy if exists return_photos_select on storage.objects;
create policy return_photos_select on storage.objects for select to authenticated
  using (bucket_id = 'return-photos' and public.can_view_borrowing(public.try_uuid(split_part(name, '/', 1))));

-- Calibration certificates: KaLab and Super Admin only.
drop policy if exists certificates_all on storage.objects;
create policy certificates_all on storage.objects for all to authenticated
  using (bucket_id = 'calibration-certificates' and public.can_manage_certificate(name))
  with check (bucket_id = 'calibration-certificates' and public.can_manage_certificate(name));

-- Equipment photos: path starts with the laboratory id. Active members read; the lab's KaLab uploads.
drop policy if exists equipment_photos_select on storage.objects;
create policy equipment_photos_select on storage.objects for select to authenticated
  using (bucket_id = 'equipment-photos' and public.is_active_member());
drop policy if exists equipment_photos_insert on storage.objects;
create policy equipment_photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'equipment-photos' and public.is_lab_kalab(public.try_uuid(split_part(name, '/', 1))));

-- Module media: visible when the caller can view the file's media record.
drop policy if exists module_media_select on storage.objects;
create policy module_media_select on storage.objects for select to authenticated
  using (bucket_id = 'module-media' and public.can_view_media_path(name));
drop policy if exists module_media_insert on storage.objects;
create policy module_media_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'module-media' and public.current_app_role() in ('dosen', 'super_admin'));

-- Descriptive fields and photos for inventory items (required by the KaLab form in the app).
alter table public.equipment add column if not exists photo_url text;
alter table public.equipment add column if not exists description text;
alter table public.consumables add column if not exists photo_url text;
alter table public.consumables add column if not exists description text;
