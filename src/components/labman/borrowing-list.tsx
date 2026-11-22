"use client";

import { Link } from "@/lib/router-compat";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { BorrowingBadge, OverdueBadge } from "@/components/labman/badges";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BORROWING_STATUSES, FINISHED_BORROWING, formatDate, isOverdue } from "@/lib/labman";
import { borrowingsQuery, type BorrowingRow } from "@/lib/labman-queries";

export function itemSummary(b: Pick<BorrowingRow, "borrowing_items">) {
  return b.borrowing_items
    .map((i) => `${i.equipment?.name ?? i.consumables?.name ?? "Item"} ×${i.quantity}`)
    .join(", ");
}

/** manage = KaLab view of their labs; mine = active borrowings; history = finished ones. */
export function BorrowingList({ mode }: { mode: "manage" | "mine" | "history" }) {
  const { data, isLoading } = useQuery(borrowingsQuery);
  const [status, setStatus] = useState("active");
  const rows = (data ?? []).filter((b) => {
    if (mode === "mine") return !FINISHED_BORROWING.includes(b.status);
    if (mode === "history") return FINISHED_BORROWING.includes(b.status);
    if (status === "active") return !FINISHED_BORROWING.includes(b.status);
    if (status === "overdue") return isOverdue(b) && !FINISHED_BORROWING.includes(b.status);
    return status === "all" || b.status === status;
  });

  return (
    <div className="rounded-xl border bg-card shadow-card">
      {mode === "manage" && (
        <div className="flex flex-wrap items-center gap-3 border-b p-4">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-52" aria-label="Filter status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Perlu tindakan / berjalan</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="all">Semua status</SelectItem>
              {BORROWING_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="ml-auto text-sm text-muted-foreground">{rows.length} peminjaman</span>
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Diajukan</TableHead>
            {mode === "manage" && <TableHead>Peminjam</TableHead>}
            <TableHead>Item</TableHead>
            <TableHead>Pinjam – Kembali</TableHead>
            <TableHead>Status</TableHead>
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
          {data && rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                {mode === "history" ? "Belum ada riwayat peminjaman." : "Belum ada peminjaman."}
              </TableCell>
            </TableRow>
          )}
          {rows.map((b) => (
            <TableRow key={b.id}>
              <TableCell className="whitespace-nowrap">
                <p className="font-medium">{formatDate(b.created_at.slice(0, 10), { day: "numeric", month: "short", year: "numeric" })}</p>
                <p className="text-xs text-muted-foreground">{b.laboratories?.name}</p>
              </TableCell>
              {mode === "manage" && (
                <TableCell>
                  <p className="font-medium">{b.borrower?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {b.borrower?.roles?.name}
                    {b.borrower?.nim_nip ? ` · ${b.borrower.nim_nip}` : ""}
                  </p>
                </TableCell>
              )}
              <TableCell className="max-w-xs">
                <p className="truncate">{itemSummary(b)}</p>
                <p className="truncate text-xs text-muted-foreground">{b.purpose}</p>
              </TableCell>
              <TableCell className="whitespace-nowrap text-sm">
                {formatDate(b.borrow_date, { day: "numeric", month: "short" })} – {b.return_due_date ? formatDate(b.return_due_date, { day: "numeric", month: "short", year: "numeric" }) : "tidak dikembalikan"}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1.5">
                  <BorrowingBadge status={b.status} />
                  {isOverdue(b) && <OverdueBadge />}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <Link to="/peminjaman/$id" params={{ id: b.id }} className="text-sm font-medium text-secondary hover:underline">
                  Detail
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
