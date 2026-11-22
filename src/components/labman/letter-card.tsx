"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@/lib/server-fn-compat";
import { Download, Eye, FileCheck2, FileText, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { htmlToPdf } from "@/lib/html-pdf";
import { formatDateTime } from "@/lib/labman";
import { fillTemplate, toLetterData, type LetterKind, type LetterSource } from "@/lib/letter-template";
import { getLetterLink, issueOfficialLetter } from "@/lib/letters.actions";
import { documentQuery, templateQuery } from "@/lib/letters-queries";

const APPROVED_BORROWING = ["Disetujui", "Dipinjam", "Dikembalikan", "Ditunggu", "Dikonfirmasi"];

type Props = {
  kind: LetterKind;
  id: string;
  status: string;
  source: LetterSource;
  /** KaLab of this lab may (re)issue a missing letter. */
  canIssue?: boolean;
};

const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Terjadi kesalahan.");

/** Letter section on a request detail: unsigned preview while pending, official PDF once approved. */
export function LetterCard({ kind, id, status, source, canIssue }: Props) {
  const approved = kind === "lab" ? status === "Disetujui" : APPROVED_BORROWING.includes(status);
  const pending = status === "Diajukan";
  const { data: doc, isLoading } = useQuery({ ...documentQuery(kind, id), enabled: approved });
  const [previewOpen, setPreviewOpen] = useState(false);
  const [officialOpen, setOfficialOpen] = useState(false);
  const [busy, setBusy] = useState<null | "download" | "issue">(null);
  const link = useServerFn(getLetterLink);
  const issue = useServerFn(issueOfficialLetter);
  const qc = useQueryClient();

  async function download() {
    setBusy("download");
    try {
      const res = await link({ data: { kind, id, download: true } });
      if (!res.ok) return void toast.error(res.error);
      const a = document.createElement("a");
      a.href = res.url;
      a.download = res.fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(null);
    }
  }

  async function reissue() {
    setBusy("issue");
    try {
      const res = await issue({ data: { kind, id } });
      toast.success(`Surat resmi ${res.letterNumber ?? ""} diterbitkan.`);
      await qc.invalidateQueries({ queryKey: ["labman", "document", kind, id] });
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-xl border bg-card p-6 shadow-card">
      <h3 className="mb-2 text-base font-semibold">Surat</h3>
      {status === "Ditolak" && <p className="text-sm text-muted-foreground">Pengajuan ditolak, sehingga tidak ada surat yang diterbitkan.</p>}

      {pending && (
        <>
          <p className="mb-3 text-sm text-muted-foreground">
            Pratinjau surat dari data pengajuan. Surat resmi bertanda tangan terbit setelah KaLab menyetujui.
          </p>
          <Button variant="outline" onClick={() => setPreviewOpen(true)}>
            <Eye /> Preview Surat
          </Button>
          <DraftPreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} kind={kind} source={source} />
        </>
      )}

      {approved && (
        <>
          {isLoading && <p className="text-sm text-muted-foreground">Memuat…</p>}
          {doc && (
            <>
              <div className="mb-3 flex items-start gap-3 rounded-lg bg-success-soft p-3 text-sm">
                <FileCheck2 className="mt-0.5 size-4 shrink-0 text-success" />
                <div>
                  <p className="font-medium">Surat resmi {doc.letter_number}</p>
                  <p className="text-xs text-muted-foreground">Diterbitkan {formatDateTime(doc.issued_at)}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => setOfficialOpen(true)}>
                  <Eye /> Preview
                </Button>
                <Button onClick={download} disabled={busy !== null}>
                  {busy === "download" ? <Loader2 className="animate-spin" /> : <Download />} Download
                </Button>
              </div>
              <OfficialPreviewDialog open={officialOpen} onOpenChange={setOfficialOpen} kind={kind} id={id} title={doc.letter_number ?? "Surat resmi"} />
            </>
          )}
          {!isLoading && !doc && (
            <>
              <p className="mb-3 text-sm text-muted-foreground">
                {canIssue ? "Surat resmi belum terbit untuk pengajuan ini." : "Surat resmi sedang disiapkan oleh KaLab."}
              </p>
              {canIssue && (
                <Button onClick={reissue} disabled={busy !== null}>
                  {busy === "issue" ? <Loader2 className="animate-spin" /> : <RefreshCw />} Terbitkan Surat Resmi
                </Button>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

function DraftPreviewDialog({ open, onOpenChange, kind, source }: { open: boolean; onOpenChange: (o: boolean) => void; kind: LetterKind; source: LetterSource }) {
  const { data: template, isLoading } = useQuery({ ...templateQuery(kind), enabled: open });
  const [url, setUrl] = useState<string | null>(null);
  // The draft is the same PDF layout as the official letter, without signatures and with a watermark.
  useEffect(() => {
    if (!open || !template) return;
    let objectUrl: string | null = null;
    let cancelled = false;
    const html = fillTemplate(template.template_html, toLetterData(source), "");
    htmlToPdf(html, { watermark: "BELUM DISETUJUI", footer: "Pratinjau surat" }).then((bytes) => {
      if (cancelled) return;
      objectUrl = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: "application/pdf" }));
      setUrl(objectUrl);
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setUrl(null);
    };
  }, [open, template, source]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Preview Surat</DialogTitle>
          <DialogDescription>Belum disetujui: tanpa tanda tangan dan tidak dapat diunduh.</DialogDescription>
        </DialogHeader>
        {isLoading && <p className="text-sm text-muted-foreground">Memuat…</p>}
        {!isLoading && !template && <p className="text-sm text-muted-foreground">Template surat belum tersedia.</p>}
        {template && !url && <p className="text-sm text-muted-foreground">Menyiapkan pratinjau…</p>}
        {template && url && (
          <iframe title="Pratinjau surat" src={url} className="h-[70vh] w-full rounded-lg border bg-white" />
        )}
      </DialogContent>
    </Dialog>
  );
}

function OfficialPreviewDialog({ open, onOpenChange, kind, id, title }: { open: boolean; onOpenChange: (o: boolean) => void; kind: LetterKind; id: string; title: string }) {
  const link = useServerFn(getLetterLink);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let objectUrl: string | null = null;
    let cancelled = false;
    setError(null);
    setUrl(null);
    (async () => {
      try {
        const res = await link({ data: { kind, id } });
        if (!res.ok) throw new Error(res.error);
        const blob = await (await fetch(res.url)).blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
        setUrl(objectUrl);
      } catch (e) {
        if (!cancelled) setError(errMsg(e));
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, kind, id, link]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="size-4" /> {title}
          </DialogTitle>
          <DialogDescription>Surat resmi bertanda tangan Kepala Laboratorium.</DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!error && !url && <p className="text-sm text-muted-foreground">Memuat surat…</p>}
        {url && <iframe title={title} src={url} className="h-[70vh] w-full rounded-lg border" />}
      </DialogContent>
    </Dialog>
  );
}
