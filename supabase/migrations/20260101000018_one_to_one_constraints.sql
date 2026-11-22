-- The original schema had these one-to-one links as unique keys. The generated base tables dropped them,
-- so PostgREST returned arrays instead of single objects (e.g. self_evaluations for a module),
-- which broke the learning stepper. Restore the unique keys.
alter table public.self_evaluations add constraint self_evaluations_module_id_key unique (module_id);
alter table public.laboratory_schedule_entries add constraint laboratory_schedule_entries_lab_usage_request_id_key unique (lab_usage_request_id);
