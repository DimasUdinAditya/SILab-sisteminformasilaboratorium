-- get_attempt_review returns the shape the grading and review screens use:
-- { attempt, assessment, questions[] } where each question carries its options and its answer (or null).
-- Access rules are unchanged: the assessment's lecturer always; the student only after grading.
create or replace function public.get_attempt_review(_attempt_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare t public.assessment_attempts%rowtype; a public.assessments%rowtype; is_owner boolean; is_lecturer boolean;
begin
  select * into t from public.assessment_attempts where id = _attempt_id;
  if not found then raise exception 'Percobaan tidak ditemukan'; end if;
  select * into a from public.assessments where id = t.assessment_id;
  is_owner := t.student_id = auth.uid();
  is_lecturer := public.can_manage_module(a.module_id);
  if not (is_lecturer or (is_owner and t.status = 'graded')) then raise exception 'Akses ditolak'; end if;
  return jsonb_build_object(
    'attempt', jsonb_build_object(
      'id', t.id, 'attempt_no', t.attempt_no, 'status', t.status, 'total_score', t.total_score,
      'started_at', t.started_at, 'submitted_at', t.submitted_at, 'student_id', t.student_id),
    'assessment', jsonb_build_object(
      'id', a.id, 'title', a.title, 'type', a.type, 'passing_grade', a.passing_grade, 'module_id', a.module_id),
    'questions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', q.id, 'type', q.type, 'question_text', q.question_text, 'score', q.score, 'topic', tp.name,
        'options', coalesce((select jsonb_agg(jsonb_build_object('id', o.id, 'option_text', o.option_text, 'is_correct', o.is_correct) order by o.id)
                             from public.question_options o where o.question_id = q.id), '[]'::jsonb),
        'answer', (select jsonb_build_object(
                     'id', an.id, 'selected_options', an.selected_options, 'answer_text', an.answer_text,
                     'score', an.score, 'feedback', an.feedback)
                   from public.answers an where an.attempt_id = _attempt_id and an.question_id = q.id limit 1)
      ) order by q.sort_order)
      from public.questions q
      left join public.topics tp on tp.id = q.topic_id
      where q.assessment_id = a.id
    ), '[]'::jsonb));
end $$;
