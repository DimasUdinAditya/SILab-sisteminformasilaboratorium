"use client";

import { useParams } from "@/lib/router-compat";
import { Link } from "@/lib/router-compat";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

import { PageHeader } from "@/components/app/page-header";
import { BorrowingActions } from "@/components/labman/borrowing-actions";
import { BorrowingBadge, OverdueBadge } from "@/components/labman/badges";
import { EvidencePhoto } from "@/components/labman/evidence-photo";
import { EndorsementCard } from "@/components/labman/endorsement-card";
import { LetterCard } from "@/components/labman/letter-card";
import { StatusTimeline } from "@/components/labman/status-timeline";
import { Button } from "@/components/ui/button";
import { formatDate, formatDateTime, isOverdue } from "@/lib/labman";
import { borrowingQuery } from "@/lib/labman-queries";
import { meQueryOptions } from "@/lib/profile";


export default function BorrowingDetailPage() {
  const { id } = useParams();
  const { data: me } = useSuspenseQuery(meQueryOptions);
  const { data: b, isLoading } = useQuery(borrowingQuery(id));
  const actorRole = me?.role === "kalab" ? "kalab" : b && b.borrower?.id === me?.id ? "borrower" : null;

  return (
    <div>
      <PageHeader
        title="Detail Peminjaman"
        actions={
          <Button asChild variant="outline">
            <Link to="/peminjaman">
              <ArrowLeft /> Kembali
            </Link>
          </Button>
        }
      />
      {isLoading && <p className="text-sm text-muted-foreground">Memuat…</p>}
      {!isLoading && !b && <p className="text-sm text-muted-foreground">Peminjaman tidak ditemukan.</p>}
      {b && (
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            <div className="rounded-xl border bg-card p-6 shadow-card">
              <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Peminjaman alat & bahan</p>
                  <h2 className="text-lg font-semibold">{b.laboratories?.name}</h2>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <BorrowingBadge status={b.status} />
                  {isOverdue(b) && <OverdueBadge />}
                </div>
              </div>
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <Field label="Peminjam">
                  {b.borrower?.name}{" "}
                  <span className="text-muted-foreground">
                    · {b.borrower?.roles?.name}
                    {b.borrower?.nim_nip ? ` · ${b.borrower.nim_nip}` : ""}
                  </span>
                </Field>
                <Field label="Diajukan">{formatDateTime(b.created_at)}</Field>
                <Field label="Tanggal pinjam">{formatDate(b.borrow_date, { day: "numeric", month: "long", year: "numeric" })}</Field>
                <Field label="Batas kembali">
                  {b.return_due_date ? formatDate(b.return_due_date, { day: "numeric", month: "long", year: "numeric" }) : "Tidak perlu dikembalikan"}
                </Field>
                {b.approver && <Field label="Disetujui oleh">{b.approver.name}{b.approved_at ? ` · ${formatDateTime(b.approved_at)}` : ""}</Field>}
                <div className="sm:col-span-2">
                  <Field label="Tujuan">{b.purpose}</Field>
                </div>
                {b.status === "Ditolak" && b.rejection_reason && (
                  <div className="sm:col-span-2">
                    <Field label="Alasan penolakan">{b.rejection_reason}</Field>
                  </div>
                )}
              </dl>
            </div>

            <div className="rounded-xl border bg-card p-6 shadow-card">
              <h3 className="mb-3 text-base font-semibold">Item dipinjam</h3>
              <ul className="divide-y text-sm">
                {b.borrowing_items.map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-3 py-2">
                    <span>
                      <span className="font-medium">{i.equipment?.name ?? i.consumables?.name ?? "Item"}</span>
                      <span className="text-muted-foreground"> · {i.item_type}{i.equipment?.code ? ` · ${i.equipment.code}` : ""}</span>
                    </span>
                    <span className="whitespace-nowrap font-medium">
                      {i.quantity} {i.consumables?.unit ?? "unit"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {(b.borrowing_readiness.length > 0 || b.borrowing_return_evidence.length > 0) && (
              <div className="rounded-xl border bg-card p-6 shadow-card">
                <h3 className="mb-3 text-base font-semibold">Bukti foto</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {b.borrowing_readiness.map((p) => (
                    <EvidencePhoto key={p.id} bucket="readiness-photos" path={p.photo_url} title="Kesiapan alat" uploader={p.profiles?.name} uploadedAt={p.uploaded_at} note={p.note} />
                  ))}
                  {b.borrowing_return_evidence.map((p) => (
                    <EvidencePhoto key={p.id} bucket="return-photos" path={p.photo_url} title="Pengembalian" uploader={p.profiles?.name} uploadedAt={p.uploaded_at} note={p.note} />
                  ))}
                </div>
              </div>
            )}

            {b.borrowing_verifications.length > 0 && (
              <div className="rounded-xl border bg-card p-6 shadow-card">
                <h3 className="mb-3 text-base font-semibold">Verifikasi pengembalian</h3>
                <ul className="space-y-3 text-sm">
                  {b.borrowing_verifications.map((v) => (
                    <li key={v.id}>
                      <p className="font-medium">{v.result === "Sesuai" ? "Sesuai" : "Tidak sesuai"}</p>
                      {v.discrepancy_note && <p className="text-muted-foreground">{v.discrepancy_note}</p>}
                      {v.follow_up && <p className="text-muted-foreground">Tindak lanjut: {v.follow_up}</p>}
                      <p className="text-xs text-muted-foreground">
                        {v.profiles?.name} · {formatDateTime(v.verified_at)}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="space-y-6">
            {actorRole && (
              <BorrowingActions id={b.id} status={b.status} hasAlat={b.borrowing_items.some((i) => i.item_type === "Alat")} role={actorRole} />
            )}
            <div className="rounded-xl border bg-card p-6 shadow-card">
              <h3 className="mb-4 text-base font-semibold">Riwayat status</h3>
              <StatusTimeline entries={b.status_history} />
            </div>
            <LetterCard
              kind="borrowing"
              id={b.id}
              status={b.status}
              canIssue={me?.role === "kalab"}
              source={{
                kind: "borrowing",
                requesterName: b.borrower?.name ?? "-",
                nimNip: b.borrower?.nim_nip ?? null,
                labName: b.laboratories?.name ?? "-",
                purpose: b.purpose,
                date: b.borrow_date,
                returnDue: b.return_due_date,
                approvedAt: b.approved_at,
                kalabName: b.approver?.name ?? null,
                items: b.borrowing_items.map((i) => ({
                  name: i.equipment?.name ?? i.consumables?.name ?? "Item",
                  type: i.item_type === "Alat" ? "Alat" : "Bahan",
                  quantity: i.quantity,
                  unit: i.consumables?.unit ?? "unit",
                })),
              }}
            />
            {!["Diajukan", "Ditolak"].includes(b.status) && <EndorsementCard kind="borrowing" id={b.id} />}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}
