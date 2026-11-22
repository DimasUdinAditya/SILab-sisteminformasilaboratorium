"use client";

import {  } from "@/lib/router-compat";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Boxes, Pencil, Plus, Search, Trash2, Wrench } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { MasterTable } from "@/components/admin/master-table";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { CalibrationBadge, ItemTypeBadge } from "@/components/labman/badges";
import { ConsumableDialog, EquipmentDialog, StockDialog } from "@/components/labman/inventory-dialogs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { labError, latestNextCalibration } from "@/lib/labman";
import { catalogQuery, categoriesQuery, useMyLabs, type CatalogConsumable, type CatalogEquipment } from "@/lib/labman-queries";
import { meQueryOptions } from "@/lib/profile";


type Row =
  | { kind: "Alat"; id: string; name: string; lab: string; item: CatalogEquipment }
  | { kind: "Bahan"; id: string; name: string; lab: string; item: CatalogConsumable };

export default function InventoryPage() {
  const { data: me } = useSuspenseQuery(meQueryOptions);
  const { data: labs } = useMyLabs(me?.id);
  const { data: catalog, isLoading } = useQuery(catalogQuery);
  const qc = useQueryClient();
  const labIds = new Set((labs ?? []).map((l) => l.id));
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [eqDialog, setEqDialog] = useState<{ item: CatalogEquipment | null } | null>(null);
  const [coDialog, setCoDialog] = useState<{ item: CatalogConsumable | null } | null>(null);
  const [stockId, setStockId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);

  const rows: Row[] = [
    ...(catalog?.equipment ?? []).filter((e) => labIds.has(e.laboratory_id)).map((e) => ({ kind: "Alat" as const, id: e.id, name: e.name, lab: e.laboratories?.name ?? "", item: e })),
    ...(catalog?.consumables ?? []).filter((c) => labIds.has(c.laboratory_id)).map((c) => ({ kind: "Bahan" as const, id: c.id, name: c.name, lab: c.laboratories?.name ?? "", item: c })),
  ]
    .filter((r) => (type === "all" || r.kind === type) && (!q.trim() || `${r.name} ${r.kind === "Alat" ? r.item.code : ""}`.toLowerCase().includes(q.trim().toLowerCase())))
    .sort((a, b) => a.name.localeCompare(b.name));
  const stockItem = catalog?.consumables.find((c) => c.id === stockId) ?? null;
  const labOpts = (labs ?? []).map((l) => ({ id: l.id, name: l.name }));
  const noLab = labs && labs.length === 0;

  async function confirmDelete() {
    if (!deleting) return;
    const { error } = await supabase.from(deleting.kind === "Alat" ? "equipment" : "consumables").delete().eq("id", deleting.id);
    setDeleting(null);
    if (error) return void toast.error(labError(error));
    toast.success(`${deleting.name} dihapus.`);
    await qc.invalidateQueries({ queryKey: ["labman"] });
  }

  return (
    <div>
      <PageHeader
        title="Inventaris"
        description="Katalog alat dan bahan habis pakai di laboratorium Anda."
        actions={
          !noLab && (
            <>
              <Button variant="outline" onClick={() => setCoDialog({ item: null })}>
                <Plus /> Tambah Bahan
              </Button>
              <Button onClick={() => setEqDialog({ item: null })}>
                <Plus /> Tambah Alat
              </Button>
            </>
          )
        }
      />
      {noLab ? (
        <div className="rounded-xl border border-dashed bg-card p-10 text-center text-sm text-muted-foreground">
          Anda belum ditugaskan sebagai kepala laboratorium. Hubungi Super Admin.
        </div>
      ) : (
        <Tabs defaultValue="katalog">
          <TabsList>
            <TabsTrigger value="katalog">Katalog</TabsTrigger>
            <TabsTrigger value="kategori">Kategori Alat</TabsTrigger>
          </TabsList>
          <TabsContent value="katalog" className="mt-4">
            <div className="rounded-xl border bg-card shadow-card">
              <div className="flex flex-wrap items-center gap-3 border-b p-4">
                <div className="relative w-full max-w-xs">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama atau kode" className="pl-9" aria-label="Cari" />
                </div>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="w-40" aria-label="Jenis">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alat & Bahan</SelectItem>
                    <SelectItem value="Alat">Alat</SelectItem>
                    <SelectItem value="Bahan">Bahan</SelectItem>
                  </SelectContent>
                </Select>
                <span className="ml-auto text-sm text-muted-foreground">{rows.length} item</span>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jenis</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Kategori / Satuan</TableHead>
                    <TableHead>Jumlah</TableHead>
                    <TableHead>Kondisi / Stok</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                        Memuat…
                      </TableCell>
                    </TableRow>
                  )}
                  {catalog && rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                        Belum ada item.
                      </TableCell>
                    </TableRow>
                  )}
                  {rows.map((r) => (
                    <TableRow key={`${r.kind}-${r.id}`}>
                      <TableCell>
                        <ItemTypeBadge type={r.kind} />
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{r.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {r.kind === "Alat" ? `${r.item.code} · ` : ""}
                          {r.lab}
                        </p>
                      </TableCell>
                      <TableCell>{r.kind === "Alat" ? r.item.equipment_categories?.name : r.item.unit}</TableCell>
                      <TableCell className="tabular-nums">
                        {r.kind === "Alat" ? (
                          <>
                            {r.item.qty_available} / {r.item.qty_total} <span className="text-xs text-muted-foreground">tersedia</span>
                          </>
                        ) : (
                          <>
                            {r.item.stock} <span className="text-xs text-muted-foreground">{r.item.unit}</span>
                          </>
                        )}
                      </TableCell>
                      <TableCell>
                        {r.kind === "Alat" ? (
                          <div className="flex flex-wrap gap-1.5">
                            <StatusBadge label={r.item.condition ?? "-"} tone={r.item.condition === "Baik" ? "success" : "warning"} />
                            {r.item.requires_calibration && <CalibrationBadge requires next={latestNextCalibration(r.item.calibrations)} />}
                          </div>
                        ) : r.item.stock <= r.item.min_stock ? (
                          <StatusBadge label="Stok menipis" tone="warning" />
                        ) : (
                          <StatusBadge label="Cukup" tone="success" />
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right">
                        {r.kind === "Bahan" && (
                          <Button variant="outline" size="sm" onClick={() => setStockId(r.id)}>
                            <Boxes /> Kelola Stok
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Ubah ${r.name}`}
                          onClick={() => (r.kind === "Alat" ? setEqDialog({ item: r.item }) : setCoDialog({ item: r.item }))}
                        >
                          <Pencil />
                        </Button>
                        <Button variant="ghost" size="icon" aria-label={`Hapus ${r.name}`} onClick={() => setDeleting(r)}>
                          <Trash2 className="text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
          <TabsContent value="kategori" className="mt-4">
            <CategoriesTab />
          </TabsContent>
        </Tabs>
      )}

      <EquipmentDialog open={!!eqDialog} onOpenChange={(o) => !o && setEqDialog(null)} item={eqDialog?.item ?? null} labs={labOpts} />
      <ConsumableDialog open={!!coDialog} onOpenChange={(o) => !o && setCoDialog(null)} item={coDialog?.item ?? null} labs={labOpts} />
      <StockDialog item={stockItem} onClose={() => setStockId(null)} />
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>Item yang pernah dipinjam tidak dapat dihapus. Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CategoriesTab() {
  const { data } = useQuery(categoriesQuery);
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ["labman"] });
  return (
    <MasterTable
      entity="Kategori"
      rows={data}
      columns={[
        { header: "Nama kategori", cell: (r) => <span className="font-medium">{r.name}</span> },
        { header: "Jumlah alat", cell: (r) => <span className="flex items-center gap-1.5"><Wrench className="size-3.5 text-muted-foreground" />{r.equipment[0]?.count ?? 0}</span> },
      ]}
      fields={[{ key: "name", label: "Nama kategori", required: true }]}
      toForm={(r) => ({ name: r.name })}
      onSave={async (v, id) => {
        const { error } = id
          ? await supabase.from("equipment_categories").update({ name: v.name.trim() }).eq("id", id)
          : await supabase.from("equipment_categories").insert({ name: v.name.trim() });
        if (!error) await refresh();
        return error;
      }}
      onDelete={async (id) => {
        const { error } = await supabase.from("equipment_categories").delete().eq("id", id);
        if (!error) await refresh();
        return error;
      }}
    />
  );
}
