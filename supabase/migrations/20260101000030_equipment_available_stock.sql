-- Alat baru tercatat tersedia penuh. Jumlah tersedia ikut berubah saat jumlah total diubah,
-- dengan tetap menghitung alat yang sedang dipinjam.
-- Sebelumnya qty_available tidak pernah diisi saat alat ditambah, sehingga alat baru bernilai 0.

create or replace function public.equipment_sync_available()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    new.qty_available := new.qty_total;
  elsif new.qty_total <> old.qty_total then
    new.qty_available := greatest(0, old.qty_available + (new.qty_total - old.qty_total));
  end if;
  return new;
end $$;

drop trigger if exists equipment_sync_available on public.equipment;
create trigger equipment_sync_available
  before insert or update of qty_total on public.equipment
  for each row execute function public.equipment_sync_available();

-- Perbaikan data: alat yang tersedia 0 padahal tidak ada yang sedang dipinjam kembali ke jumlah totalnya.
-- Alat yang masih dipinjam (Dipinjam atau Dikembalikan, belum diverifikasi) tidak disentuh.
update public.equipment e
   set qty_available = e.qty_total
 where e.qty_available = 0
   and e.qty_total > 0
   and not exists (
     select 1
       from public.borrowing_items bi
       join public.equipment_borrowings b on b.id = bi.borrowing_id
      where bi.equipment_id = e.id
        and b.status in ('Dipinjam', 'Dikembalikan')
   );
