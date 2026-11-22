"use client";

import { useParams, useSearch } from "@/lib/router-compat";
import { Link, useNavigate } from "@/lib/router-compat";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, CheckCircle2, Copy, Loader2, Rocket, Undo2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { AccessTab } from "@/components/vlab/editor/access-tab";
import { AssessmentsTab } from "@/components/vlab/editor/assessments-tab";
import { InfoTab } from "@/components/vlab/editor/info-tab";
import { MaterialsTab } from "@/components/vlab/editor/materials-tab";
import { ProceduresTab } from "@/components/vlab/editor/procedures-tab";
import { SelfEvalTab } from "@/components/vlab/editor/self-eval-tab";
import { SimulationsTab } from "@/components/vlab/editor/simulations-tab";
import { useDuplicateModule } from "@/components/vlab/module-row-actions";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import {
  errorMessage,
  formatDate,
  MODULE_STATUS_META,
  parseSelfEvalItems,
  parseSteps,
  publishIssues,
  questionHasKey,
} from "@/lib/vlab";
import { moduleEditorQuery, type ModuleEditorData } from "@/lib/vlab-queries";

const TABS = ["info", "materi", "prosedur", "simulasi", "assessment", "self-evaluation", "akses"] as const;
type Tab = (typeof TABS)[number];


function checklist(m: ModuleEditorData) {
  const a = (t: "pre_test" | "post_test") => {
    const x = m.assessments.find((y) => y.type === t);
    return x
      ? { questions: x.questions.length, withoutKey: x.questions.filter((q) => !questionHasKey(q.type, q.question_options)).length }
      : null;
  };
  return publishIssues({
    title: m.title,
    steps: parseSteps(m.step_order),
    materials: m.materials.length,
    procedures: m.procedures.length,
    simulations: m.simulations.length,
    preTest: a("pre_test"),
    postTest: a("post_test"),
    selfEvalItems: m.self_evaluations ? parseSelfEvalItems(m.self_evaluations.items).length : null,
  });
}

export default function ModuleEditorPage() {
  const { id } = useParams();
  const { tab = "info" } = useSearch();
  const navigate = useNavigate();
  const { data: module, isLoading } = useQuery(moduleEditorQuery(id));
  const qc = useQueryClient();
  const duplicate = useDuplicateModule();
  const [dialog, setDialog] = useState<"publish" | "unpublish" | null>(null);
  const [busy, setBusy] = useState(false);

  if (isLoading) return <p className="text-sm text-muted-foreground">Memuat…</p>;
  if (!module)
    return (
      <div>
        <PageHeader title="Modul tidak ditemukan" description="Modul ini tidak ada atau bukan milik mata kuliah Anda." />
        <Button asChild variant="outline">
          <Link to="/kelola-modul">
            <ArrowLeft /> Kembali
          </Link>
        </Button>
      </div>
    );

  const issues = checklist(module);

  async function publish() {
    setBusy(true);
    const { data, error } = await supabase.rpc("publish_module", { _module_id: id });
    setBusy(false);
    setDialog(null);
    if (error) return void toast.error(errorMessage(error));
    toast.success(`Modul Published. ${data} mahasiswa baru mendapat akses.`);
    await qc.invalidateQueries({ queryKey: ["vlab"] });
  }

  async function unpublish() {
    setBusy(true);
    const { error } = await supabase.from("modules").update({ status: "Draft", updated_at: new Date().toISOString() }).eq("id", id);
    setBusy(false);
    setDialog(null);
    if (error) return void toast.error(errorMessage(error));
    toast.success("Modul dikembalikan ke Draft.");
    await qc.invalidateQueries({ queryKey: ["vlab"] });
  }

  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
        <Link to="/kelola-modul">
          <ArrowLeft /> Kelola Modul
        </Link>
      </Button>
      <PageHeader
        title={module.title}
        description={`${module.courses?.code} · ${module.courses?.name} · Diperbarui ${formatDate(module.updated_at, true)}`}
        actions={
          <>
            <Button variant="outline" onClick={() => duplicate(id)}>
              <Copy /> Duplikat
            </Button>
            {module.status === "Draft" ? (
              <Button onClick={() => setDialog("publish")}>
                <Rocket /> Publish
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setDialog("unpublish")}>
                <Undo2 /> Kembalikan ke Draft
              </Button>
            )}
          </>
        }
      />
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <StatusBadge {...MODULE_STATUS_META[module.status]} />
        {module.status === "Published" && (
          <span className="text-sm text-muted-foreground">Dipublikasikan {formatDate(module.published_at, true)}</span>
        )}
        {module.status === "Draft" &&
          (issues.length ? (
            <span className="flex items-center gap-1.5 text-sm text-warning">
              <AlertTriangle className="size-4" /> {issues.length} hal perlu dilengkapi sebelum Publish
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-sm text-success">
              <CheckCircle2 className="size-4" /> Siap dipublikasikan
            </span>
          ))}
      </div>

      <Tabs value={tab} onValueChange={(v) => navigate({ search: { tab: v as Tab }, replace: true })}>
        <TabsList className="mb-5 h-auto flex-wrap">
          <TabsTrigger value="info">Informasi</TabsTrigger>
          <TabsTrigger value="materi">Materi ({module.materials.length})</TabsTrigger>
          <TabsTrigger value="prosedur">Prosedur ({module.procedures.length})</TabsTrigger>
          <TabsTrigger value="simulasi">Simulasi ({module.simulations.length})</TabsTrigger>
          <TabsTrigger value="assessment">Assessment</TabsTrigger>
          <TabsTrigger value="self-evaluation">Self-evaluation</TabsTrigger>
          <TabsTrigger value="akses">Akses Mahasiswa</TabsTrigger>
        </TabsList>
        <TabsContent value="info">
          <InfoTab key={module.updated_at} module={module} />
        </TabsContent>
        <TabsContent value="materi">
          <MaterialsTab module={module} />
        </TabsContent>
        <TabsContent value="prosedur">
          <ProceduresTab module={module} />
        </TabsContent>
        <TabsContent value="simulasi">
          <SimulationsTab module={module} />
        </TabsContent>
        <TabsContent value="assessment">
          <AssessmentsTab module={module} />
        </TabsContent>
        <TabsContent value="self-evaluation">
          <SelfEvalTab key={module.self_evaluations?.id ?? "new"} module={module} />
        </TabsContent>
        <TabsContent value="akses">
          <AccessTab module={module} />
        </TabsContent>
      </Tabs>

      <AlertDialog open={dialog === "publish"} onOpenChange={(o) => !o && setDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{issues.length ? "Modul belum lengkap" : "Publish modul?"}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              {issues.length ? (
                <div>
                  <p className="mb-2">Lengkapi dulu hal berikut:</p>
                  <ul className="list-disc space-y-1 pl-5 text-foreground">
                    {issues.map((i) => (
                      <li key={i}>{i}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p>
                  Modul langsung tampil untuk mahasiswa. Semua mahasiswa aktif di prodi {module.courses?.code} otomatis mendapat akses.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{issues.length ? "Tutup" : "Batal"}</AlertDialogCancel>
            {!issues.length && (
              <AlertDialogAction onClick={(e) => (e.preventDefault(), publish())} disabled={busy}>
                {busy && <Loader2 className="animate-spin" />} Publish
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={dialog === "unpublish"} onOpenChange={(o) => !o && setDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kembalikan ke Draft?</AlertDialogTitle>
            <AlertDialogDescription>
              Mahasiswa tidak bisa membuka modul ini sampai Anda mempublikasikannya lagi. Progres dan nilai mereka tetap tersimpan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => (e.preventDefault(), unpublish())} disabled={busy}>
              Kembalikan ke Draft
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
