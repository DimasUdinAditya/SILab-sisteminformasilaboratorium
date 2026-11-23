-- Katalog Simulasi Praktikum untuk mahasiswa: kategori dan thumbnail per simulasi katalog.
-- Thumbnail disimpan di module-media seperti media lain. Mahasiswa boleh membacanya
-- hanya bila simulasi katalognya aktif.

alter table public.simulation_catalog
  add column if not exists category text,
  add column if not exists thumbnail_asset_id uuid references public.media_assets (id) on delete set null;

create index if not exists simulation_catalog_category_idx on public.simulation_catalog (category);

create or replace function public.can_view_media(_asset_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.media_assets a where a.id = _asset_id and a.uploaded_by = auth.uid())
      or exists (select 1 from public.materials m where m.media_asset_id = _asset_id and public.can_view_module(m.module_id))
      or exists (select 1 from public.procedures p where p.media_asset_id = _asset_id and public.can_view_module(p.module_id))
      or exists (select 1 from public.simulations s where s.media_asset_id = _asset_id and public.can_view_module(s.module_id))
      or exists (select 1 from public.simulation_catalog c where c.thumbnail_asset_id = _asset_id and c.is_active)
$$;
