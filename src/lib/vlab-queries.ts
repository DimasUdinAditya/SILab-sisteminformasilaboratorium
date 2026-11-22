import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

const MEDIA = "media_assets(id, file_url, type, mime_type)";

// ------------------------------------------------------------------ dosen

export const lecturerCoursesQuery = (lecturerId: string) =>
  queryOptions({
    queryKey: ["vlab", "lecturer-courses", lecturerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lecturer_assignments")
        .select("id, academic_year, courses(id, code, name, semester, program_study_id, program_studies(code, name))")
        .eq("lecturer_id", lecturerId)
        .order("academic_year", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

export const dosenModulesQuery = queryOptions({
  queryKey: ["vlab", "dosen-modules"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("modules")
      .select(
        "id, title, description, status, updated_at, published_at, course_id, step_order, lecturer_id, courses(code, name), module_access(count)",
      )
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

async function fetchModuleEditor(id: string) {
      const { data, error } = await supabase
        .from("modules")
        .select(
          `*, courses(id, code, name, program_study_id),
          materials(*, ${MEDIA}, hotspots(*)),
          procedures(*, ${MEDIA}),
          simulations(*, ${MEDIA}),
          assessments(*, questions(*, question_options(*), topics(id, name))),
          self_evaluations(*)`,
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      data.materials.sort((a, b) => a.sort_order - b.sort_order);
      data.procedures.sort((a, b) => a.step_no - b.step_no);
      data.simulations.sort((a, b) => a.id.localeCompare(b.id));
      for (const a of data.assessments) {
        a.questions.sort((x, y) => x.sort_order - y.sort_order || x.id.localeCompare(y.id));
        for (const q of a.questions) q.question_options.sort((x, y) => x.id.localeCompare(y.id));
      }
      return data;
}

export const moduleEditorQuery = (id: string) =>
  queryOptions({ queryKey: ["vlab", "module-editor", id], queryFn: () => fetchModuleEditor(id) });

export type ModuleEditorData = NonNullable<Awaited<ReturnType<typeof fetchModuleEditor>>>;

export const topicsQuery = queryOptions({
  queryKey: ["vlab", "topics"],
  queryFn: async () => {
    const { data, error } = await supabase.from("topics").select("id, name").order("name");
    if (error) throw error;
    return data;
  },
});

export const moduleAccessQuery = (moduleId: string) =>
  queryOptions({
    queryKey: ["vlab", "module-access", moduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("module_access")
        .select("id, granted_at, student_id, profiles(id, name, nim_nip, email, is_active)")
        .eq("module_id", moduleId)
        .order("granted_at");
      if (error) throw error;
      return data;
    },
  });

export const prodiStudentsQuery = (prodiId: string) =>
  queryOptions({
    queryKey: ["vlab", "prodi-students", prodiId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, nim_nip, email, is_active, roles!inner(code)")
        .eq("roles.code", "mahasiswa")
        .eq("program_study_id", prodiId)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

export const dosenAttemptsQuery = queryOptions({
  queryKey: ["vlab", "dosen-attempts"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("assessment_attempts")
      .select(
        "id, attempt_no, status, total_score, started_at, submitted_at, student_id, profiles(name, nim_nip), assessments(id, type, title, passing_grade, module_id, modules(id, title, courses(code)))",
      )
      .neq("status", "in_progress")
      .order("submitted_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export const monitoringQuery = (moduleId: string) =>
  queryOptions({
    queryKey: ["vlab", "monitoring", moduleId],
    queryFn: async () => {
      const [access, progress, attempts, selfEval] = await Promise.all([
        supabase
          .from("module_access")
          .select("student_id, profiles(id, name, nim_nip, is_active)")
          .eq("module_id", moduleId),
        supabase.from("learning_progress").select("*").eq("module_id", moduleId),
        supabase
          .from("assessment_attempts")
          .select("student_id, status, total_score, attempt_no, assessments!inner(type, module_id, passing_grade)")
          .eq("assessments.module_id", moduleId)
          .neq("status", "in_progress"),
        supabase
          .from("self_evaluation_responses")
          .select("student_id, answers, self_evaluations!inner(module_id)")
          .eq("self_evaluations.module_id", moduleId),
      ]);
      for (const r of [access, progress, attempts, selfEval]) if (r.error) throw r.error;
      return {
        access: access.data ?? [],
        progress: progress.data ?? [],
        attempts: attempts.data ?? [],
        selfEval: selfEval.data ?? [],
      };
    },
  });

// ------------------------------------------------------------------ mahasiswa

export const studentModulesQuery = queryOptions({
  queryKey: ["vlab", "student-modules"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("modules")
      .select(
        "id, title, description, step_order, published_at, courses(code, name), learning_progress(percent, current_step, completed_steps, last_accessed_at, completed_at), assessments(id, type, assessment_attempts(status, total_score))",
      )
      .eq("status", "Published")
      .order("published_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

async function fetchStudentModule(id: string) {
      const { data, error } = await supabase
        .from("modules")
        .select(
          `id, title, description, step_order, published_at, courses(code, name),
          materials(*, ${MEDIA}, hotspots(*)),
          procedures(*, ${MEDIA}),
          simulations(*, ${MEDIA}),
          assessments(id, type, title, duration_min, max_attempt, passing_grade, questions(count)),
          self_evaluations(id, title, items),
          learning_progress(*)`,
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      data.materials.sort((a, b) => a.sort_order - b.sort_order);
      data.procedures.sort((a, b) => a.step_no - b.step_no);
      data.simulations.sort((a, b) => a.id.localeCompare(b.id));
      return data;
}

export const studentModuleQuery = (id: string) =>
  queryOptions({ queryKey: ["vlab", "student-module", id], queryFn: () => fetchStudentModule(id) });

export type StudentModuleData = NonNullable<Awaited<ReturnType<typeof fetchStudentModule>>>;

export const myAttemptsQuery = (assessmentId: string) =>
  queryOptions({
    queryKey: ["vlab", "my-attempts", assessmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessment_attempts")
        .select("*")
        .eq("assessment_id", assessmentId)
        .order("attempt_no");
      if (error) throw error;
      return data;
    },
  });

export const mySelfEvalQuery = (selfEvaluationId: string) =>
  queryOptions({
    queryKey: ["vlab", "my-self-eval", selfEvaluationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("self_evaluation_responses")
        .select("*")
        .eq("self_evaluation_id", selfEvaluationId)
        .order("submitted_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      return data[0] ?? null;
    },
  });

export const attemptReviewQuery = (attemptId: string) =>
  queryOptions({
    queryKey: ["vlab", "attempt-review", attemptId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_attempt_review", { _attempt_id: attemptId });
      if (error) throw error;
      return data as unknown as AttemptReview;
    },
  });

export type ReviewOption = { id: string; option_text: string; is_correct: boolean };
export type ReviewQuestion = {
  id: string;
  type: "pg" | "pg_kompleks" | "benar_salah" | "esai";
  question_text: string;
  score: number;
  topic: string | null;
  options: ReviewOption[];
  answer: {
    id: string;
    selected_options: string[] | null;
    answer_text: string | null;
    score: number | null;
    feedback: string | null;
  } | null;
};
export type AttemptReview = {
  attempt: {
    id: string;
    attempt_no: number;
    status: "in_progress" | "waiting_review" | "graded";
    total_score: number | null;
    started_at: string;
    submitted_at: string | null;
    student_id: string;
  };
  assessment: { id: string; title: string; type: "pre_test" | "post_test"; passing_grade: number | null; module_id: string };
  questions: ReviewQuestion[];
};

export type StudentAssessment = {
  id: string;
  module_id: string;
  type: "pre_test" | "post_test";
  title: string;
  duration_min: number | null;
  max_attempt: number | null;
  passing_grade: number | null;
  questions: {
    id: string;
    type: "pg" | "pg_kompleks" | "benar_salah" | "esai";
    question_text: string;
    score: number;
    options: { id: string; option_text: string }[];
  }[];
};

export const myProgressQuery = (moduleId: string) =>
  queryOptions({
    queryKey: ["vlab", "my-progress", moduleId],
    queryFn: async () => {
      const { data, error } = await supabase.from("learning_progress").select("*").eq("module_id", moduleId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const studentAssessmentQuery = (assessmentId: string) =>
  queryOptions({
    queryKey: ["vlab", "student-assessment", assessmentId],
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_assessment_for_student", { _assessment_id: assessmentId });
      if (error) throw error;
      return data as unknown as StudentAssessment;
    },
  });

export const mySelfEvalResponsesQuery = queryOptions({
  queryKey: ["vlab", "my-self-eval-all"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("self_evaluation_responses")
      .select("answers, submitted_at, self_evaluations(module_id)");
    if (error) throw error;
    return data;
  },
});
