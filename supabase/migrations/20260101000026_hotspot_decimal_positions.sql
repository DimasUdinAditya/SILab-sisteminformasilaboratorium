-- Hotspot positions are percentages (for example 37.42). Integer columns rejected them, so pinpoint failed.
alter table public.hotspots alter column pos_x type numeric(6,2) using pos_x::numeric;
alter table public.hotspots alter column pos_y type numeric(6,2) using pos_y::numeric;
