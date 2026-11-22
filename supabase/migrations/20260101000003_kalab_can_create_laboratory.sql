CREATE OR REPLACE FUNCTION public.save_laboratory(_id uuid, _name text, _location text, _capacity integer, _description text, _program_study_id uuid DEFAULT NULL::uuid, _kalab_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare _role public.app_role := public.current_app_role(); _new uuid; _prodi uuid;
begin
  if nullif(btrim(coalesce(_name, '')), '') is null then raise exception 'Nama laboratorium wajib diisi'; end if;
  if _capacity is not null and _capacity < 0 then raise exception 'Kapasitas tidak boleh negatif'; end if;
  if _role = 'super_admin' then
    if _program_study_id is null or _kalab_id is null then raise exception 'Program studi dan kepala laboratorium wajib dipilih'; end if;
    if not exists (select 1 from public.profiles p join public.roles r on r.id = p.role_id where p.id = _kalab_id and r.code = 'kalab') then
      raise exception 'Kepala laboratorium harus akun dengan role Kepala Laboratorium';
    end if;
    if _id is null then
      insert into public.laboratories (program_study_id, kalab_id, name, location, capacity, description)
        values (_program_study_id, _kalab_id, btrim(_name), nullif(btrim(coalesce(_location, '')), ''), _capacity, nullif(btrim(coalesce(_description, '')), ''))
        returning id into _new;
      return _new;
    end if;
    update public.laboratories set program_study_id = _program_study_id, kalab_id = _kalab_id, name = btrim(_name),
      location = nullif(btrim(coalesce(_location, '')), ''), capacity = _capacity, description = nullif(btrim(coalesce(_description, '')), '')
      where id = _id;
    if not found then raise exception 'Laboratorium tidak ditemukan'; end if;
    return _id;
  elsif _role = 'kalab' then
    if _id is null then
      select p.program_study_id into _prodi from public.profiles p where p.id = auth.uid();
      if _prodi is null then raise exception 'Program studi Anda belum diatur. Hubungi Super Admin.'; end if;
      insert into public.laboratories (program_study_id, kalab_id, name, location, capacity, description)
        values (_prodi, auth.uid(), btrim(_name), nullif(btrim(coalesce(_location, '')), ''), _capacity, nullif(btrim(coalesce(_description, '')), ''))
        returning id into _new;
      return _new;
    end if;
    if public.is_lab_kalab(_id) then
      update public.laboratories set name = btrim(_name), location = nullif(btrim(coalesce(_location, '')), ''),
        capacity = _capacity, description = nullif(btrim(coalesce(_description, '')), '')
        where id = _id;
      return _id;
    end if;
  end if;
  raise exception 'Akses ditolak' using errcode = '42501';
end $function$;