import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { meQueryOptions } from "@/lib/profile";
import { errorMessage, formatDate, LIKERT_LABELS, parseSelfEvalItems } from "@/lib/vlab";
import { mySelfEvalQuery, type StudentModuleData } from "@/lib/vlab-queries";

export function SelfEvalStep({ selfEval }: { selfEval: StudentModuleData["self_evaluations"] }) {
  if (!selfEval)
    return <p className="rounded-xl border bg-card p-6 text-sm text-muted-foreground shadow-card">Modul ini tidak memiliki self-evaluation. Silakan lanjut.</p>;
  return <SelfEvalForm selfEval={selfEval} />;
}

function SelfEvalForm({ selfEval }: { selfEval: NonNullable<StudentModuleData["self_evaluations"]> }) {
  const { data: me } = useSuspenseQuery(meQueryOptions);
  const qc = useQueryClient();
  const { data: response, isLoading } = useQuery(mySelfEvalQuery(selfEval.id));
  const items = parseSelfEvalItems(selfEval.items);
  const [values, setValues] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const saved = (response?.answers ?? null) as Record<string, number> | null;
  const shown = saved ?? values;

  async function submit() {
    if (items.some((i) => !values[i.id])) return void toast.error("Isi semua pernyataan.");
    setBusy(true);
    const { error } = await supabase
      .from("self_evaluation_responses")
      .insert({ self_evaluation_id: selfEval.id, student_id: me!.id, answers: values });
    setBusy(false);
    if (error) return void toast.error(errorMessage(error));
    toast.success("Self-evaluation terkirim.");
    await qc.invalidateQueries({ queryKey: ["vlab"] });
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Memuat…</p>;
  return (
    <div className="rounded-xl border bg-card p-6 shadow-card">
      <h3 className="text-lg font-semibold">{selfEval.title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {saved ? `Terkirim ${formatDate(response?.submitted_at, true)}.` : "Nilai diri Anda dengan jujur. Tidak ada jawaban benar atau salah."}
      </p>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-xs text-muted-foreground">
              <th className="py-2 text-left font-medium">Pernyataan</th>
              {LIKERT_LABELS.map((l, i) => (
                <th key={l} className="w-24 px-1 py-2 text-center font-medium">
                  {i + 1}
                  <span className="block font-normal">{l}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((it, n) => (
              <tr key={it.id} className="border-b last:border-0">
                <td className="py-3 pr-4">
                  {n + 1}. {it.text}
                </td>
                <td colSpan={5}>
                  <RadioGroup
                    value={shown[it.id] ? String(shown[it.id]) : ""}
                    onValueChange={(v) => setValues((s) => ({ ...s, [it.id]: Number(v) }))}
                    disabled={!!saved}
                    className="grid grid-cols-5"
                    aria-label={it.text}
                  >
                    {LIKERT_LABELS.map((l, i) => (
                      <div key={l} className="flex justify-center">
                        <RadioGroupItem value={String(i + 1)} aria-label={`${i + 1} – ${l}`} />
                      </div>
                    ))}
                  </RadioGroup>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!saved && (
        <div className="mt-5 flex justify-end">
          <Button onClick={submit} disabled={busy}>
            {busy && <Loader2 className="animate-spin" />} Kirim self-evaluation
          </Button>
        </div>
      )}
    </div>
  );
}
