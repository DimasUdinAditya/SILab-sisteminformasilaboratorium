import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export const usersQuery = queryOptions({
  queryKey: ["admin", "users"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, name, email, nim_nip, is_active, created_at, program_study_id, semester, roles(code, name), program_studies(code, name)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export const facultiesQuery = queryOptions({
  queryKey: ["master", "faculties"],
  queryFn: async () => {
    const { data, error } = await supabase.from("faculties").select("*").order("code");
    if (error) throw error;
    return data;
  },
});

export const prodisQuery = queryOptions({
  queryKey: ["master", "program_studies"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("program_studies")
      .select("*, faculties(code, name)")
      .order("code");
    if (error) throw error;
    return data;
  },
});

export const coursesQuery = queryOptions({
  queryKey: ["master", "courses"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("courses")
      .select("*, program_studies(code, name)")
      .order("code");
    if (error) throw error;
    return data;
  },
});

export const assignmentsQuery = queryOptions({
  queryKey: ["master", "lecturer_assignments"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("lecturer_assignments")
      .select("*, courses(code, name), profiles(name, nim_nip)")
      .order("academic_year", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export const lecturersQuery = queryOptions({
  queryKey: ["master", "lecturers"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, name, nim_nip, is_active, roles!inner(code)")
      .eq("roles.code", "dosen")
      .order("name");
    if (error) throw error;
    return data;
  },
});

export const registrationsQuery = queryOptions({
  queryKey: ["admin", "registrations"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("user_registrations")
      .select("id, full_name, nim_nip, semester, email, status, submitted_at, roles(code, name), program_studies(code, name)")
      .order("submitted_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export const registrationQuery = (id: string) =>
  queryOptions({
    queryKey: ["admin", "registrations", id],
    queryFn: async () => {
      const [r, a] = await Promise.all([
        supabase
          .from("user_registrations")
          .select("*, roles(code, name), program_studies(id, code, name)")
          .eq("id", id)
          .maybeSingle(),
        supabase
          .from("registration_approvals")
          .select("id, decision, rejection_reason, decided_at, roles(name), profiles(name)")
          .eq("registration_id", id)
          .order("decided_at", { ascending: false }),
      ]);
      if (r.error) throw r.error;
      if (a.error) throw a.error;
      return { reg: r.data, approvals: a.data ?? [] };
    },
  });
