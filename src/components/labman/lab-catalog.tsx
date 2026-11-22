"use client";

import { Link } from "@/lib/router-compat";
import { useQuery } from "@tanstack/react-query";
import { Check, ImageOff, Info, Plus, ShoppingBasket } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { CalibrationBadge, ItemTypeBadge } from "@/components/labman/badges";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  info: { label: string; value: string }[];
  certificate: string | null;
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
        info: [
          { label: "Kode", value: e.code },
          { label: "Kategori", value: e.equipment_categories?.name ?? "-" },
          { label: "Kondisi", value: e.condition ?? "-" },
          { label: "Stok tersedia", value: `${e.qty_available} dari ${e.qty_total} unit` },
          { label: "Wajib kalibrasi", value: e.requires_calibration ? "Ya" : "Tidak" },
          { label: "Kalibrasi berikutnya", value: next ?? "-" },
        ],
        certificate: e.calibrations?.[0]?.certificate_url ?? null,
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
      info: [
        { label: "Kode", value: x.code ?? "-" },
        { label: "Stok tersedia", value: `${x.stock} ${x.unit}` },
        { label: "Stok minimum", value: `${x.min_stock} ${x.unit}` },
      ],
      certificate: null,
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
          <CatalogCard
            key={r.key}
            row={r}
            added={inCart(r.type, r.id)}
            onAdd={() => add({ type: r.type, id: r.id, name: r.name, unit: r.unit, max: r.available })}
          />
        ))}
      </div>
    </div>
  );
}

function CatalogCard({ row: r, added, onAdd }: { row: Row; added: boolean; onAdd: () => void }) {
  const { data: photoUrl } = useLabFileUrl("equipment-photos", r.photo);
  const [detailOpen, setDetailOpen] = useState(false);
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
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <span className="text-sm">
            {r.available} {r.unit} tersedia
          </span>
          {r.badge}
        </div>
        {r.blocked && <p className="text-xs text-muted-foreground">{r.blocked}</p>}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <Button size="sm" variant="outline" aria-label={`Detail ${r.name}`} onClick={() => setDetailOpen(true)}>
            <Info /> Detail
          </Button>
          {r.blocked ? (
            <Button size="sm" variant="outline" disabled>
              Tidak tersedia
            </Button>
          ) : (
            <Button size="sm" variant="outline" aria-label={`Tambah ${r.name} ke keranjang`} onClick={onAdd}>
              {added ? <Check /> : <Plus />} {added ? "Tambah lagi" : "Keranjang"}
            </Button>
          )}
        </div>
      </div>
      <CatalogDetail row={r} photoUrl={photoUrl ?? null} open={detailOpen} onOpenChange={setDetailOpen} />
    </article>
  );
}

function CatalogDetail({ row: r, photoUrl, open, onOpenChange }: { row: Row; photoUrl: string | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data: certUrl } = useLabFileUrl("calibration-certificates", open ? r.certificate : null);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{r.name}</DialogTitle>
          <DialogDescription>
            <ItemTypeBadge type={r.type} />
          </DialogDescription>
        </DialogHeader>
        {photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt={r.name} className="max-h-60 w-full rounded-lg bg-muted object-contain" />
        )}
        {r.description && <p className="whitespace-pre-line text-sm">{r.description}</p>}
        <dl className="divide-y rounded-lg border text-sm">
          {r.info.map((i) => (
            <div key={i.label} className="grid grid-cols-2 gap-2 p-3">
              <dt className="text-muted-foreground">{i.label}</dt>
              <dd className="font-medium">{i.value}</dd>
            </div>
          ))}
        </dl>
        {r.certificate && (
          <p className="text-sm">
            {certUrl ? (
              <a href={certUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-secondary hover:underline">
                Lihat sertifikat kalibrasi
              </a>
            ) : (
              <span className="text-muted-foreground">Memuat sertifikat…</span>
            )}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
