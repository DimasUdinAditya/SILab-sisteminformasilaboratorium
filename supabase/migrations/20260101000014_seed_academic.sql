-- Master data akademik FIKES UPN Veteran Jakarta. Idempotent: running it again adds nothing.
insert into public.faculties (code, name)
select 'FIKES', 'Fakultas Ilmu Kesehatan (FIKES) UPN Veteran Jakarta'
where not exists (select 1 from public.faculties where code = 'FIKES');

insert into public.program_studies (code, name, faculty_id)
select v.code, v.name, f.id
from (values
  ('D3KEP',    'D3 Keperawatan'),
  ('D3FISIO',  'D3 Fisioterapi'),
  ('S1KEP',    'S1 Keperawatan'),
  ('S1KESMAS', 'S1 Kesehatan Masyarakat'),
  ('S1GIZI',   'S1 Gizi'),
  ('S1FISIO',  'S1 Fisioterapi'),
  ('PROFNERS', 'Pendidikan Profesi Ners'),
  ('S2KESMAS', 'S2 Kesehatan Masyarakat'),
  ('S2KEP',    'S2 Keperawatan')
) as v(code, name)
cross join public.faculties f
where f.code = 'FIKES'
  and not exists (select 1 from public.program_studies p where p.code = v.code);
