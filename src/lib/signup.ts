import { z } from "zod";

import { isAppRole, type AppRole } from "@/lib/roles";

export type SignupForm = {
  role: string;
  full_name: string;
  nim_nip: string;
  semester: string;
  email: string;
  program_study_id: string;
  password: string;
  confirm: string;
};

/** Faculty-level leaders have no program study; every other self-signup role needs one. */
export function signupRequiresProdi(role: AppRole | "" | string) {
  return role !== "" && role !== "wadek1" && role !== "dekan";
}

/** Public Sign Up rules. Super Admin can never be requested. */
export const signupSchema = z
  .object({
    role: z
      .string()
      .refine((r) => isAppRole(r) && r !== "super_admin", { message: "Pilih role" }),
    full_name: z.string().trim().min(1, "Nama lengkap wajib diisi").max(120, "Nama maksimal 120 karakter"),
    nim_nip: z.string().trim().min(1, "NIM/NIP wajib diisi").max(40, "NIM/NIP maksimal 40 karakter"),
    semester: z.string().trim(),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, "Email wajib diisi")
      .email("Format email tidak valid")
      .max(255, "Email maksimal 255 karakter"),
    program_study_id: z.string().trim(),
    password: z.string().min(8, "Password minimal 8 karakter").max(72, "Password maksimal 72 karakter"),
    confirm: z.string(),
  })
  .superRefine((v, ctx) => {
    if (v.role === "mahasiswa") {
      const n = Number(v.semester);
      if (!v.semester) ctx.addIssue({ code: "custom", path: ["semester"], message: "Semester wajib diisi" });
      else if (!Number.isInteger(n) || n < 1 || n > 14)
        ctx.addIssue({ code: "custom", path: ["semester"], message: "Semester 1–14" });
    }
    if (signupRequiresProdi(v.role) && !v.program_study_id)
      ctx.addIssue({ code: "custom", path: ["program_study_id"], message: "Program studi wajib dipilih" });
    if (v.confirm !== v.password)
      ctx.addIssue({ code: "custom", path: ["confirm"], message: "Konfirmasi password tidak cocok" });
  })
  .transform((v) => ({
    role: v.role as AppRole,
    full_name: v.full_name,
    nim_nip: v.nim_nip,
    // Only students send a semester; others send null so the DB stores nothing.
    semester: v.role === "mahasiswa" ? Number(v.semester) : null,
    email: v.email,
    program_study_id: v.program_study_id || null,
    password: v.password,
  }));

/**
 * Database messages (e.g. "NIM/NIP sudah terdaftar") are shown as-is; only the
 * auth service's English messages are translated.
 */
export function signupErrorMessage(message: string): string {
  if (/email address is not allowed|invalid.*email|email.*invalid/i.test(message))
    return "Alamat email ini tidak bisa dipakai. Gunakan email aktif Anda.";
  if (/already registered|already exists/i.test(message)) return "Email sudah terdaftar.";
  if (/pwned|weak|compromised|known to be/i.test(message))
    return "Password ini mudah ditebak atau pernah bocor. Gunakan password lain.";
  if (/rate limit|too many/i.test(message)) return "Terlalu banyak percobaan. Coba lagi beberapa saat lagi.";
  if (/signups? not allowed|signup.*disabled/i.test(message)) return "Pendaftaran sedang ditutup.";
  if (/database error saving new user/i.test(message))
    return "Registrasi gagal disimpan. Periksa kembali data Anda, misalnya NIM/NIP yang sudah terdaftar.";
  return message;
}
