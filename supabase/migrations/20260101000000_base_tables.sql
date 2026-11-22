-- Base tables for SiLab, generated from the Lovable-era types.ts.
-- Review before use: constraints beyond PK/FK and column defaults were inferred.
-- Migrations 0000-0005 in drizzle/migrations (copied to supabase/migrations) apply after this file.

do $$ begin create type public.app_role as enum ('mahasiswa', 'dosen', 'kalab', 'kaprodi', 'wadek1', 'super_admin', 'dekan'); exception when duplicate_object then null; end $$;
do $$ begin create type public.assessment_type as enum ('pre_test', 'post_test'); exception when duplicate_object then null; end $$;
do $$ begin create type public.attempt_status as enum ('in_progress', 'waiting_review', 'graded'); exception when duplicate_object then null; end $$;
do $$ begin create type public.borrowing_status as enum ('Diajukan', 'Disetujui', 'Dipinjam', 'Dikembalikan', 'Ditunggu', 'Dikonfirmasi', 'Ditolak'); exception when duplicate_object then null; end $$;
do $$ begin create type public.calibration_status as enum ('Valid', 'Mendekati', 'Kedaluwarsa'); exception when duplicate_object then null; end $$;
do $$ begin create type public.item_type as enum ('Alat', 'Bahan'); exception when duplicate_object then null; end $$;
do $$ begin create type public.lab_request_status as enum ('Diajukan', 'Disetujui', 'Ditolak'); exception when duplicate_object then null; end $$;
do $$ begin create type public.material_type as enum ('text', 'image', 'diagram', 'pdf', 'reference', 'hotspot'); exception when duplicate_object then null; end $$;
do $$ begin create type public.media_type as enum ('image', 'pdf', 'video', 'other'); exception when duplicate_object then null; end $$;
do $$ begin create type public.module_status as enum ('Draft', 'Published'); exception when duplicate_object then null; end $$;
do $$ begin create type public.question_type as enum ('pg', 'pg_kompleks', 'benar_salah', 'esai'); exception when duplicate_object then null; end $$;
do $$ begin create type public.simulation_type as enum ('video', 'interactive'); exception when duplicate_object then null; end $$;
do $$ begin create type public.stock_movement_type as enum ('in', 'out', 'adjustment'); exception when duplicate_object then null; end $$;
do $$ begin create type public.verification_result as enum ('Sesuai', 'Tidak_Sesuai'); exception when duplicate_object then null; end $$;

create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  answer_text text,
  attempt_id uuid not null,
  feedback text,
  graded_by uuid,
  question_id uuid not null,
  score numeric,
  selected_options jsonb
);

create table if not exists public.assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null,
  attempt_no integer not null,
  started_at timestamptz default now(),
  status public.attempt_status not null,
  student_id uuid not null,
  submitted_at timestamptz default now(),
  total_score numeric
);

create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  duration_min integer,
  max_attempt integer,
  module_id uuid not null,
  passing_grade numeric,
  title text not null,
  type public.assessment_type not null
);

create table if not exists public.borrowing_items (
  id uuid primary key default gen_random_uuid(),
  borrowing_id uuid not null,
  consumable_id uuid,
  equipment_id uuid,
  item_type public.item_type not null,
  must_return boolean not null,
  quantity integer not null
);

create table if not exists public.borrowing_readiness (
  id uuid primary key default gen_random_uuid(),
  borrowing_id uuid not null,
  note text,
  photo_url text not null,
  uploaded_at timestamptz default now(),
  uploaded_by uuid not null
);

create table if not exists public.borrowing_return_evidence (
  id uuid primary key default gen_random_uuid(),
  borrowing_id uuid not null,
  note text,
  photo_url text not null,
  uploaded_at timestamptz default now(),
  uploaded_by uuid not null
);

create table if not exists public.borrowing_verifications (
  id uuid primary key default gen_random_uuid(),
  borrowing_id uuid not null,
  discrepancy_note text,
  follow_up text,
  result public.verification_result not null,
  verified_at timestamptz default now(),
  verified_by uuid not null
);

create table if not exists public.calibrations (
  id uuid primary key default gen_random_uuid(),
  certificate_url text,
  equipment_id uuid not null,
  last_calibrated date,
  next_calibration date,
  status public.calibration_status not null,
  updated_by uuid
);

create table if not exists public.consumables (
  id uuid primary key default gen_random_uuid(),
  laboratory_id uuid not null,
  min_stock integer not null default 0,
  name text not null,
  stock integer not null default 0,
  unit text not null
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  program_study_id uuid not null,
  semester integer
);

create table if not exists public.equipment (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null,
  code text not null,
  condition text,
  laboratory_id uuid not null,
  name text not null,
  qty_available integer not null default 0,
  qty_total integer not null default 0,
  requires_calibration boolean not null default false
);

create table if not exists public.equipment_borrowings (
  id uuid primary key default gen_random_uuid(),
  approved_at timestamptz default now(),
  approved_by uuid,
  borrow_date date not null,
  borrower_id uuid not null,
  created_at timestamptz default now(),
  is_overdue boolean not null default false,
  laboratory_id uuid not null,
  purpose text not null,
  rejection_reason text,
  return_due_date date,
  status public.borrowing_status not null
);

create table if not exists public.equipment_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null
);

create table if not exists public.faculties (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null
);

create table if not exists public.hotspots (
  id uuid primary key default gen_random_uuid(),
  description text,
  material_id uuid not null,
  media_asset_id uuid,
  pos_x integer not null,
  pos_y integer not null,
  title text not null
);

create table if not exists public.lab_usage_requests (
  id uuid primary key default gen_random_uuid(),
  approved_at timestamptz default now(),
  approved_by uuid,
  created_at timestamptz default now(),
  end_time time not null,
  laboratory_id uuid not null,
  purpose text not null,
  rejection_reason text,
  requester_id uuid not null,
  start_time time not null,
  status public.lab_request_status not null,
  usage_date date not null
);

create table if not exists public.laboratories (
  id uuid primary key default gen_random_uuid(),
  capacity integer,
  description text,
  kalab_id uuid not null,
  location text,
  name text not null,
  program_study_id uuid not null
);

create table if not exists public.laboratory_schedule_entries (
  id uuid primary key default gen_random_uuid(),
  activity text,
  date date not null,
  end_time time not null,
  is_locked boolean not null default false,
  lab_usage_request_id uuid,
  laboratory_id uuid not null,
  start_time time not null
);

create table if not exists public.learning_progress (
  id uuid primary key default gen_random_uuid(),
  completed_at timestamptz default now(),
  completed_steps jsonb default '{}'::jsonb,
  current_step text,
  last_accessed_at timestamptz default now(),
  module_id uuid not null,
  percent numeric not null default 0,
  student_id uuid not null
);

create table if not exists public.lecturer_assignments (
  id uuid primary key default gen_random_uuid(),
  academic_year text not null,
  course_id uuid not null,
  lecturer_id uuid not null
);

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  content text,
  media_asset_id uuid,
  module_id uuid not null,
  sort_order integer not null default 0,
  title text not null,
  type public.material_type not null
);

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  file_url text not null,
  mime_type text,
  size_kb integer,
  type public.media_type not null,
  uploaded_by uuid
);

create table if not exists public.module_access (
  id uuid primary key default gen_random_uuid(),
  granted_at timestamptz default now(),
  module_id uuid not null,
  student_id uuid not null
);

create table if not exists public.modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null,
  description text,
  lecturer_id uuid not null,
  published_at timestamptz default now(),
  published_by uuid,
  status public.module_status not null,
  step_order jsonb default '{}'::jsonb,
  title text not null,
  updated_at timestamptz default now()
);

create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  description text
);

create table if not exists public.procedures (
  id uuid primary key default gen_random_uuid(),
  instruction text,
  media_asset_id uuid,
  module_id uuid not null,
  step_no integer not null,
  title text not null
);

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  email text not null,
  is_active boolean not null default true,
  name text not null,
  nim_nip text,
  program_study_id uuid,
  role_id uuid not null,
  semester integer
);

create table if not exists public.program_studies (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  faculty_id uuid not null,
  name text not null
);

create table if not exists public.question_options (
  id uuid primary key default gen_random_uuid(),
  is_correct boolean not null default false,
  option_text text not null,
  question_id uuid not null
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null,
  question_text text not null,
  score numeric not null default 0,
  sort_order integer not null default 0,
  topic_id uuid,
  type public.question_type not null
);

create table if not exists public.remedial_assignments (
  id uuid primary key default gen_random_uuid(),
  assigned_by uuid,
  attempt_id uuid not null,
  material_id uuid not null,
  note text,
  status text not null default ''
);

create table if not exists public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  permission_id uuid not null,
  role_id uuid not null
);

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  code public.app_role not null,
  description text,
  name text not null
);

create table if not exists public.self_evaluation_responses (
  id uuid primary key default gen_random_uuid(),
  answers jsonb not null,
  self_evaluation_id uuid not null,
  student_id uuid not null,
  submitted_at timestamptz default now()
);

create table if not exists public.self_evaluations (
  id uuid primary key default gen_random_uuid(),
  items jsonb default '{}'::jsonb,
  module_id uuid not null,
  title text not null
);

create table if not exists public.simulations (
  id uuid primary key default gen_random_uuid(),
  config jsonb,
  external_url text,
  media_asset_id uuid,
  module_id uuid not null,
  title text not null,
  type public.simulation_type not null
);

create table if not exists public.status_history (
  id uuid primary key default gen_random_uuid(),
  borrowing_id uuid,
  changed_at timestamptz default now(),
  changed_by uuid,
  from_status text,
  lab_usage_request_id uuid,
  note text,
  to_status text not null
);

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  borrowing_item_id uuid,
  consumable_id uuid not null,
  created_at timestamptz default now(),
  created_by uuid,
  quantity integer not null,
  type public.stock_movement_type not null
);

create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  name text not null
);

create table if not exists public.usage_instructions (
  id uuid primary key default gen_random_uuid(),
  content text,
  equipment_id uuid not null,
  media_asset_id uuid
);

-- Foreign keys
alter table public.answers add constraint answers_attempt_id_fkey foreign key (attempt_id) references public.assessment_attempts (id);
alter table public.answers add constraint answers_graded_by_fkey foreign key (graded_by) references public.profiles (id);
alter table public.answers add constraint answers_question_id_fkey foreign key (question_id) references public.questions (id);
alter table public.assessment_attempts add constraint assessment_attempts_assessment_id_fkey foreign key (assessment_id) references public.assessments (id);
alter table public.assessment_attempts add constraint assessment_attempts_student_id_fkey foreign key (student_id) references public.profiles (id);
alter table public.assessments add constraint assessments_module_id_fkey foreign key (module_id) references public.modules (id);
alter table public.borrowing_items add constraint borrowing_items_borrowing_id_fkey foreign key (borrowing_id) references public.equipment_borrowings (id);
alter table public.borrowing_items add constraint borrowing_items_consumable_id_fkey foreign key (consumable_id) references public.consumables (id);
alter table public.borrowing_items add constraint borrowing_items_equipment_id_fkey foreign key (equipment_id) references public.equipment (id);
alter table public.borrowing_readiness add constraint borrowing_readiness_borrowing_id_fkey foreign key (borrowing_id) references public.equipment_borrowings (id);
alter table public.borrowing_readiness add constraint borrowing_readiness_uploaded_by_fkey foreign key (uploaded_by) references public.profiles (id);
alter table public.borrowing_return_evidence add constraint borrowing_return_evidence_borrowing_id_fkey foreign key (borrowing_id) references public.equipment_borrowings (id);
alter table public.borrowing_return_evidence add constraint borrowing_return_evidence_uploaded_by_fkey foreign key (uploaded_by) references public.profiles (id);
alter table public.borrowing_verifications add constraint borrowing_verifications_borrowing_id_fkey foreign key (borrowing_id) references public.equipment_borrowings (id);
alter table public.borrowing_verifications add constraint borrowing_verifications_verified_by_fkey foreign key (verified_by) references public.profiles (id);
alter table public.calibrations add constraint calibrations_equipment_id_fkey foreign key (equipment_id) references public.equipment (id);
alter table public.calibrations add constraint calibrations_updated_by_fkey foreign key (updated_by) references public.profiles (id);
alter table public.consumables add constraint consumables_laboratory_id_fkey foreign key (laboratory_id) references public.laboratories (id);
alter table public.courses add constraint courses_program_study_id_fkey foreign key (program_study_id) references public.program_studies (id);
alter table public.equipment add constraint equipment_category_id_fkey foreign key (category_id) references public.equipment_categories (id);
alter table public.equipment add constraint equipment_laboratory_id_fkey foreign key (laboratory_id) references public.laboratories (id);
alter table public.equipment_borrowings add constraint equipment_borrowings_approved_by_fkey foreign key (approved_by) references public.profiles (id);
alter table public.equipment_borrowings add constraint equipment_borrowings_borrower_id_fkey foreign key (borrower_id) references public.profiles (id);
alter table public.equipment_borrowings add constraint equipment_borrowings_laboratory_id_fkey foreign key (laboratory_id) references public.laboratories (id);
alter table public.hotspots add constraint hotspots_material_id_fkey foreign key (material_id) references public.materials (id);
alter table public.hotspots add constraint hotspots_media_asset_id_fkey foreign key (media_asset_id) references public.media_assets (id);
alter table public.lab_usage_requests add constraint lab_usage_requests_approved_by_fkey foreign key (approved_by) references public.profiles (id);
alter table public.lab_usage_requests add constraint lab_usage_requests_laboratory_id_fkey foreign key (laboratory_id) references public.laboratories (id);
alter table public.lab_usage_requests add constraint lab_usage_requests_requester_id_fkey foreign key (requester_id) references public.profiles (id);
alter table public.laboratories add constraint laboratories_kalab_id_fkey foreign key (kalab_id) references public.profiles (id);
alter table public.laboratories add constraint laboratories_program_study_id_fkey foreign key (program_study_id) references public.program_studies (id);
alter table public.laboratory_schedule_entries add constraint laboratory_schedule_entries_lab_usage_request_id_fkey foreign key (lab_usage_request_id) references public.lab_usage_requests (id);
alter table public.laboratory_schedule_entries add constraint laboratory_schedule_entries_laboratory_id_fkey foreign key (laboratory_id) references public.laboratories (id);
alter table public.learning_progress add constraint learning_progress_module_id_fkey foreign key (module_id) references public.modules (id);
alter table public.learning_progress add constraint learning_progress_student_id_fkey foreign key (student_id) references public.profiles (id);
alter table public.lecturer_assignments add constraint lecturer_assignments_course_id_fkey foreign key (course_id) references public.courses (id);
alter table public.lecturer_assignments add constraint lecturer_assignments_lecturer_id_fkey foreign key (lecturer_id) references public.profiles (id);
alter table public.materials add constraint materials_media_asset_id_fkey foreign key (media_asset_id) references public.media_assets (id);
alter table public.materials add constraint materials_module_id_fkey foreign key (module_id) references public.modules (id);
alter table public.media_assets add constraint media_assets_uploaded_by_fkey foreign key (uploaded_by) references public.profiles (id);
alter table public.module_access add constraint module_access_module_id_fkey foreign key (module_id) references public.modules (id);
alter table public.module_access add constraint module_access_student_id_fkey foreign key (student_id) references public.profiles (id);
alter table public.modules add constraint modules_course_id_fkey foreign key (course_id) references public.courses (id);
alter table public.modules add constraint modules_lecturer_id_fkey foreign key (lecturer_id) references public.profiles (id);
alter table public.modules add constraint modules_published_by_fkey foreign key (published_by) references public.profiles (id);
alter table public.procedures add constraint procedures_media_asset_id_fkey foreign key (media_asset_id) references public.media_assets (id);
alter table public.procedures add constraint procedures_module_id_fkey foreign key (module_id) references public.modules (id);
alter table public.profiles add constraint profiles_program_study_id_fkey foreign key (program_study_id) references public.program_studies (id);
alter table public.profiles add constraint profiles_role_id_fkey foreign key (role_id) references public.roles (id);
alter table public.program_studies add constraint program_studies_faculty_id_fkey foreign key (faculty_id) references public.faculties (id);
alter table public.question_options add constraint question_options_question_id_fkey foreign key (question_id) references public.questions (id);
alter table public.questions add constraint questions_assessment_id_fkey foreign key (assessment_id) references public.assessments (id);
alter table public.questions add constraint questions_topic_id_fkey foreign key (topic_id) references public.topics (id);
alter table public.remedial_assignments add constraint remedial_assignments_assigned_by_fkey foreign key (assigned_by) references public.profiles (id);
alter table public.remedial_assignments add constraint remedial_assignments_attempt_id_fkey foreign key (attempt_id) references public.assessment_attempts (id);
alter table public.remedial_assignments add constraint remedial_assignments_material_id_fkey foreign key (material_id) references public.materials (id);
alter table public.role_permissions add constraint role_permissions_permission_id_fkey foreign key (permission_id) references public.permissions (id);
alter table public.role_permissions add constraint role_permissions_role_id_fkey foreign key (role_id) references public.roles (id);
alter table public.self_evaluation_responses add constraint self_evaluation_responses_self_evaluation_id_fkey foreign key (self_evaluation_id) references public.self_evaluations (id);
alter table public.self_evaluation_responses add constraint self_evaluation_responses_student_id_fkey foreign key (student_id) references public.profiles (id);
alter table public.self_evaluations add constraint self_evaluations_module_id_fkey foreign key (module_id) references public.modules (id);
alter table public.simulations add constraint simulations_media_asset_id_fkey foreign key (media_asset_id) references public.media_assets (id);
alter table public.simulations add constraint simulations_module_id_fkey foreign key (module_id) references public.modules (id);
alter table public.status_history add constraint status_history_borrowing_id_fkey foreign key (borrowing_id) references public.equipment_borrowings (id);
alter table public.status_history add constraint status_history_changed_by_fkey foreign key (changed_by) references public.profiles (id);
alter table public.status_history add constraint status_history_lab_usage_request_id_fkey foreign key (lab_usage_request_id) references public.lab_usage_requests (id);
alter table public.stock_movements add constraint stock_movements_borrowing_item_id_fkey foreign key (borrowing_item_id) references public.borrowing_items (id);
alter table public.stock_movements add constraint stock_movements_consumable_id_fkey foreign key (consumable_id) references public.consumables (id);
alter table public.stock_movements add constraint stock_movements_created_by_fkey foreign key (created_by) references public.profiles (id);
alter table public.usage_instructions add constraint usage_instructions_equipment_id_fkey foreign key (equipment_id) references public.equipment (id);
alter table public.usage_instructions add constraint usage_instructions_media_asset_id_fkey foreign key (media_asset_id) references public.media_assets (id);
