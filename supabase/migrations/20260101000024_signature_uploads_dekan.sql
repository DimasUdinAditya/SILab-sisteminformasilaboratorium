-- KaLab and Dekan both upload their own signature file (folder = their user id).
drop policy if exists signatures_insert_own on storage.objects;
create policy signatures_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'signatures' and public.current_app_role() in ('kalab', 'dekan')
    and (storage.foldername(name))[1] = auth.uid()::text
    and lower(storage.extension(name)) = any (array['png','jpg','jpeg']));
