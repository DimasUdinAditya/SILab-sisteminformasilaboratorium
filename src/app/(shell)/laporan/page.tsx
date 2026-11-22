"use client";

import {  } from "@/lib/router-compat";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/page-header";
import { KalabCards } from "@/components/monitoring/kalab-overview";
import { LeadershipCards, ProdiTable } from "@/components/monitoring/leadership-view";
import { PeriodFilter } from "@/components/monitoring/period-filter";
import { Button } from "@/components/ui/button";
import { htmlToPdf } from "@/lib/html-pdf";
import { meQueryOptions } from "@/lib/profile";
import { labReportHtml, leadershipReportHtml } from "@/lib/reports";
import { labOpsQuery, leadershipSummaryQuery, thisMonth } from "@/lib/summary";


export default function ReportPage() {
  const { data: me } = useSuspenseQuery(meQueryOptions);
  const [period, setPeriod] = useState(thisMonth);
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  if (!me) return null;
  const isKalab = me.role === "kalab";
  const scope = me.role === "kaprodi" ? (me.prodi?.name ?? "Program studi") : "Fakultas Ilmu Kesehatan";

  async function download() {
    setBusy(true);
    try {
      const by = `${me!.name} (${me!.roleName})`;
      const html = isKalab
        ? labReportHtml(await qc.fetchQuery(labOpsQuery(period)), period, by)
        : leadershipReportHtml(await qc.fetchQuery(leadershipSummaryQuery(period)), period, by, scope);
      const bytes = await htmlToPdf(html, { footer: "Laporan SiLab" });
      const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `Laporan-SiLab-${period.from ?? "awal"}-${period.to ?? "sekarang"}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal membuat laporan.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Laporan"
        description={isKalab ? "Laporan operasional laboratorium yang Anda kelola." : `Laporan agregat untuk ${scope}. Tanpa nama mahasiswa dan nilai individual.`}
        actions={
          <Button onClick={download} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <Download />} Unduh PDF
          </Button>
        }
      />
      <PeriodFilter value={period} onChange={setPeriod} />
      {isKalab ? (
        <KalabCards period={period} />
      ) : (
        <>
          <LeadershipCards period={period} />
          <ProdiTable period={period} />
        </>
      )}
    </div>
  );
}
