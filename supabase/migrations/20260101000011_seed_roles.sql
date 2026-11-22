-- Role rows the app relies on. Migration 0003 adds only "dekan", so the others must exist here.
insert into public.roles (code, name) values
  ('mahasiswa', 'Mahasiswa'),
  ('dosen', 'Dosen'),
  ('kalab', 'Kepala Laboratorium'),
  ('kaprodi', 'Ketua Program Studi'),
  ('wadek1', 'Wakil Dekan 1'),
  ('super_admin', 'Super Admin')
on conflict (code) do nothing;
