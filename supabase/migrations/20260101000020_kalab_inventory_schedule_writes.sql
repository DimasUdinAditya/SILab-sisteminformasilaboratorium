-- KaLab manages the schedule, equipment and consumables of the laboratories they head.
-- Super Admin and KaLab manage equipment categories. Calibration and stock changes stay on their RPCs.
grant insert, update, delete on public.laboratory_schedule_entries, public.equipment, public.consumables, public.equipment_categories to authenticated;

drop policy if exists schedule_kalab_write on public.laboratory_schedule_entries;
create policy schedule_kalab_write on public.laboratory_schedule_entries for all to authenticated
  using (public.is_lab_kalab(laboratory_id)) with check (public.is_lab_kalab(laboratory_id));

drop policy if exists equipment_kalab_write on public.equipment;
create policy equipment_kalab_write on public.equipment for all to authenticated
  using (public.is_lab_kalab(laboratory_id)) with check (public.is_lab_kalab(laboratory_id));

drop policy if exists consumables_kalab_write on public.consumables;
create policy consumables_kalab_write on public.consumables for all to authenticated
  using (public.is_lab_kalab(laboratory_id)) with check (public.is_lab_kalab(laboratory_id));

drop policy if exists categories_manage on public.equipment_categories;
create policy categories_manage on public.equipment_categories for all to authenticated
  using (public.current_app_role() in ('kalab', 'super_admin'))
  with check (public.current_app_role() in ('kalab', 'super_admin'));
