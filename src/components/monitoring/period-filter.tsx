"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { thisMonth, type Period } from "@/lib/summary";

export function PeriodFilter({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <div className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4 shadow-card">
      <div className="space-y-1">
        <Label htmlFor="from" className="block">Dari tanggal</Label>
        <Input id="from" type="date" className="w-auto" value={value.from ?? ""} onChange={(e) => onChange({ ...value, from: e.target.value || null })} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="to" className="block">Sampai tanggal</Label>
        <Input id="to" type="date" className="w-auto" value={value.to ?? ""} min={value.from ?? undefined} onChange={(e) => onChange({ ...value, to: e.target.value || null })} />
      </div>
      <Button variant="outline" onClick={() => onChange(thisMonth())}>Bulan ini</Button>
      <Button variant="ghost" onClick={() => onChange({ from: null, to: null })}>Semua waktu</Button>
    </div>
  );
}
