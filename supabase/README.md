# Skema database SiLab

Folder `migrations/` berisi urutan migrasi untuk project Supabase baru.

| File | Isi |
|---|---|
| `20260101000000_base_tables.sql` | 40 tabel dan enum, dibuat dari `types.ts` lama. Tipe kolom dan default disimpulkan, bukan disalin dari database asli. |
| `20260101000001_base_functions.sql` | Helper yang hilang dari repo (`current_app_role`, `is_lab_kalab`, `can_view_lab_request`, `can_view_borrowing`) dan unique key `roles.code`. |
| `20260101000002`–`000007` | Salinan migrasi 0000–0005 dari `drizzle/migrations`. |
| `20260101000008_enable_rls_everywhere.sql` | Mengaktifkan RLS di semua tabel publik. |
| `20260101000009_rpc_functions.sql` | 68 fungsi RPC yang dipanggil aplikasi. Logika ditulis ulang; bagian bertanda INFERRED adalah tebakan dan perlu diperiksa. |
| `20260101000010_rls_policies.sql` | Policy RLS untuk tabel dasar, mengikuti aturan di `AGENTS.md`. |

## Yang bisa dipercaya dan yang belum

- **Terverifikasi di PGlite**: semua 11 file lolos berurutan, dan `test-flow` lulus 12 skenario (pengajuan lab, bentrok jadwal, peminjaman sampai pengembalian, stok tidak boleh negatif, kunci jawaban tidak bocor ke mahasiswa, penilaian esai, progres belajar, akses orang lain ditolak).
- **Belum diverifikasi**: perilaku ini belum dibandingkan dengan database asli. Aturan nilai, stok, dan alur status di `rpc_functions.sql` adalah rekonstruksi. Bagian yang paling berisiko: penilaian pg_kompleks, pengurangan stok saat `confirm_readiness`, dan ambang kalibrasi 30 hari.
- **Stub pengujian**: PGlite memakai stub untuk `auth.users`, `auth.uid()`, dan helper `storage`. Stub ini tidak ikut di folder migrasi.

## Menerapkan ke project Supabase baru

```powershell
npx supabase link --project-ref <ref-project-baru>
npx supabase db push
```

Jika CLI meminta `supabase/config.toml`, jalankan `npx supabase init` dulu. Setelah skema final, regenerate tipe:

```powershell
npx supabase gen types typescript --project-id <ref-project-baru> > src/integrations/supabase/types.ts
```
