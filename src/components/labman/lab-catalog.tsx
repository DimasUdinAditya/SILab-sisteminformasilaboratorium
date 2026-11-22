"use client";

import { Link } from "@/lib/router-compat";
import { useQuery } from "@tanstack/react-query";
import { Check, ImageOff, Plus, ShoppingBasket } from "lucide-react";
import { toast } from "sonner";

import { CalibrationBadge, ItemTypeBadge } from "@/components/labman/badges";
import { Button } from "@/components/ui/button";
import { cart, useCart } from "@/lib/cart";
import { calibrationState, latestNextCalibration } from "@/lib/labman";
import { catalogQuery } from "@/lib/labman-queries";
import { useLabFileUrl } from "@/lib/lab-files";

type Row = {
  key: string;
  type: "Alat" | "Bahan";
  id: string;
  name: string;
  description: string | null;
  photo: string | null;
  sub: string;
  available: number;
  unit: string;
  badge: React.ReactNode;
  blocked: string | null;
};

/** Alat & bahan of one laboratory as cards, for the borrowing cart. */
export function LabCatalog({ lab }: { lab: { id: string; name: string } }) {
  const { data, isLoading } = useQuery(catalogQuery);
  const c = useCart();
  const equipment = (data?.equipment ?? []).filter((e) => e.laboratory_id === lab.id);
  const consumables = (data?.consumables ?? []).filter((x) => x.laboratory_id === lab.id);
  const otherLab = c.labId && c.labId !== lab.id ? c.labName : null;
  const inCart = (type: "Alat" | "Bahan", id: string) => c.items.some((i) => i.type === type && i.id === id);

  function add(item: Parameters<typeof cart.add>[1]) {
    if (otherLab) toast.message(`Keranjang dari ${otherLab} diganti. Satu peminjaman hanya untuk satu laboratorium.`);
    cart.add(lab, item);
    toast.success(`${item.name} masuk keranjang.`);
  }

  const rows: Row[] = [
    ...equipment.map((e) => {
      const next = latestNextCalibration(e.calibrations);
      const cal = calibrationState(e.requires_calibration, next);
      return {
        key: `a-${e.id}`,
        type: "Alat" as const,
        id: e.id,
        name: e.name,
        description: e.description,
        photo: e.photo_url,
        sub: `${e.code}${e.equipment_categories?.name ? ` · ${e.equipment_categories.name}` : ""}`,
        available: e.qty_available,
        unit: "unit",
        badge: e.requires_calibration ? <CalibrationBadge requires next={next} /> : null,
        blocked: !cal.borrowable ? "Kalibrasi kedaluwarsa" : e.qty_available <= 0 ? "Sedang dipinjam semua" : null,
      };
    }),
    ...consumables.map((x) => ({
      key: `b-${x.id}`,
      type: "Bahan" as const,
      id: x.id,
      name: x.name,
      description: x.description,
      photo: x.photo_url,
      sub: "Habis pakai",
      available: x.stock,
      unit: x.unit,
      badge: null,
      blocked: x.stock <= 0 ? "Stok habis" : null,
    })),
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Alat & bahan</h2>
          <p className="text-xs text-muted-foreground">Tambahkan ke keranjang, lalu ajukan peminjaman paling lambat H-1.</p>
        </div>
        <Button asChild variant={c.items.length ? "default" : "outline"}>
          <Link to="/peminjaman/ajukan">
            <ShoppingBasket /> Keranjang{c.items.length ? ` (${c.items.length})` : ""}
          </Link>
        </Button>
      </div>

      {isLoading && <p className="py-8 text-center text-sm text-muted-foreground">Memuat…</p>}
      {data && rows.length === 0 && (
        <p className="rounded-xl border bg-card py-8 text-center text-sm text-muted-foreground shadow-card">
          Belum ada alat atau bahan di laboratorium ini.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((r) => (
          <CatalogCard key={r.key} row={r} added={inCart(r.type, r.id)} onAdd={() => add({ type: r.type, id: r.id, name: r.name, unit: r.unit, max: r.available })} />
        ))}
      </div>
    </div>
  );
}

function CatalogCard({ row: r, added, onAdd }: { row: Row; added: boolean; onAdd: () => void }) {
  const { data: photoUrl } = useLabFileUrl("equipment-photos", r.photo);
  return (
    <article className="flex flex-col overflow-hidden rounded-xl border bg-card shadow-card">
      <div className="flex aspect-[4/3] items-center justify-center bg-muted">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt={r.name} className="size-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
            <ImageOff className="size-6" /> Tanpa foto
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium leading-snug">{r.name}</p>
          <ItemTypeBadge type={r.type} />
        </div>
        <p className="text-xs text-muted-foreground">{r.sub}</p>
        {r.description && <p className="line-clamp-2 text-sm text-muted-foreground">{r.description}</p>}
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <span className="text-sm">
            {r.available} {r.unit} tersedia
          </span>
          {r.badge}
        </div>
        <div className="pt-1">
          {r.blocked ? (
            <span className="text-xs text-muted-foreground">{r.blocked}</span>
          ) : (
            <Button size="sm" variant="outline" className="w-full" aria-label={`Tambah ${r.name} ke keranjang`} onClick={onAdd}>
              {added ? <Check /> : <Plus />} {added ? "Tambah lagi" : "Keranjang"}
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
