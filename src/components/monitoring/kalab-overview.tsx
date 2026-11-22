"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CalendarCheck, ClipboardList, Microscope, Package, PackageOpen } from "lucide-react";

import { StatCard } from "@/components/app/stat-card";
import { ACTIVE_BORROWING, labOpsQuery, sum, type LabOps, type Period } from "@/lib/summary";

export function KalabCards({ period }: { period: Period }) {
  const { data, isLoading, error } = useQuery(labOpsQuery(period));
  if (error) return <p className="text-sm text-destructive">Gagal memuat ringkasan: {error.message}</p>;
  if (isLoading || !data) return <p className="text-sm text-muted-foreground">Memuat ringkasan…</p>;
  const tot = (f: (l: LabOps) => number) => data.reduce((a, l) => a + f(l), 0);
  const lowStock = data.flatMap((l) => l.low_stock);
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Pengajuan lab menunggu" value={tot((l) => l.lab_requests["Diajukan"] ?? 0)} icon={ClipboardList} hint={`${tot((l) => sum(l.lab_requests))} pengajuan pada periode ini`} />
        <StatCard label="Peminjaman menunggu" value={tot((l) => l.borrowings["Diajukan"] ?? 0)} icon={PackageOpen} hint={`${tot((l) => sum(l.borrowings, ACTIVE_BORROWING))} sedang berjalan`} />
        <StatCard label="Sesi lab terjadwal" value={tot((l) => l.sessions)} icon={CalendarCheck} />
        <StatCard label="Unit alat tersedia" value={`${tot((l) => l.equipment_available)}/${tot((l) => l.equipment_units)}`} icon={Package} hint={`${tot((l) => l.equipment_types)} jenis alat · ${tot((l) => l.consumables)} jenis bahan`} />
        <StatCard label="Kalibrasi kedaluwarsa" value={tot((l) => l.calibration["Kedaluwarsa"] ?? 0)} icon={Microscope} hint={`${tot((l) => l.calibration["Mendekati"] ?? 0)} akan kedaluwarsa`} />
        <StatCard label="Peminjaman terlambat" value={tot((l) => l.overdue)} icon={AlertTriangle} />
      </div>
      {lowStock.length > 0 && (
        <div className="rounded-xl border bg-card p-5 shadow-card">
          <h2 className="mb-3 text-base font-semibold">Stok bahan menipis</h2>
          <ul className="divide-y text-sm">
            {lowStock.map((s) => (
              <li key={s.name} className="flex justify-between py-2">
                <span>{s.name}</span>
                <span className="font-medium text-warning">{s.stock} {s.unit} (min. {s.min})</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
