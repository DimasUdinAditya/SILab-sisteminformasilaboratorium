-- The checkout page sends each item as { item_type, id, quantity }. The original function only read
-- equipment_id / consumable_id, so items were stored without a reference and showed no name.
-- Accept both shapes and refuse an item that has no id.
create or replace function public.submit_borrowing(
  _borrow_date date, _items jsonb, _lab_id uuid, _purpose text, _return_due_date date
) returns uuid language plpgsql security definer set search_path = public as $$
declare _id uuid; it jsonb; _type public.item_type; _qty integer; _ref uuid;
begin
  if not public.is_active_member() then raise exception 'Akun tidak aktif'; end if;
  if btrim(coalesce(_purpose, '')) = '' then raise exception 'Tujuan peminjaman wajib diisi'; end if;
  if jsonb_typeof(_items) <> 'array' or jsonb_array_length(_items) = 0 then
    raise exception 'Pilih minimal satu alat atau bahan';
  end if;
  insert into public.equipment_borrowings (borrower_id, laboratory_id, borrow_date, return_due_date, purpose, status, is_overdue)
  values (auth.uid(), _lab_id, _borrow_date, _return_due_date, _purpose, 'Diajukan', false)
  returning id into _id;
  for it in select value from jsonb_array_elements(_items) loop
    _type := (it->>'item_type')::public.item_type;
    _qty := (it->>'quantity')::integer;
    _ref := coalesce(it->>'equipment_id', it->>'consumable_id', it->>'id')::uuid;
    if _ref is null then raise exception 'Item tidak valid'; end if;
    if _qty is null or _qty <= 0 then raise exception 'Jumlah harus lebih dari nol'; end if;
    if _type = 'Alat' then
      insert into public.borrowing_items (borrowing_id, item_type, equipment_id, quantity, must_return)
      values (_id, _type, _ref, _qty, true);
    else
      insert into public.borrowing_items (borrowing_id, item_type, consumable_id, quantity, must_return)
      values (_id, _type, _ref, _qty, false);
    end if;
  end loop;
  perform public.log_status(_id, null, 'Diajukan', null, 'Diajukan');
  return _id;
end $$;
