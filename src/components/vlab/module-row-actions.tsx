import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@/lib/router-compat";
import { Copy, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { errorMessage } from "@/lib/vlab";

export function useDuplicateModule() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  return async (id: string) => {
    const { data, error } = await supabase.rpc("duplicate_module", { _module_id: id });
    if (error) return void toast.error(errorMessage(error));
    toast.success("Modul diduplikasi sebagai Draft.");
    await qc.invalidateQueries({ queryKey: ["vlab"] });
    navigate({ to: "/kelola-modul/$id", params: { id: data } });
  };
}

export function ModuleRowActions({ id, title }: { id: string; title: string }) {
  const duplicate = useDuplicateModule();
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState(false);

  async function remove() {
    const { error } = await supabase.from("modules").delete().eq("id", id);
    if (error) return void toast.error(errorMessage(error));
    toast.success("Modul dihapus.");
    await qc.invalidateQueries({ queryKey: ["vlab"] });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Aksi untuk ${title}`}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link to="/kelola-modul/$id" params={{ id }}>
              <Pencil /> Edit modul
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => duplicate(id)}>
            <Copy /> Duplikat
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setConfirm(true)}>
            <Trash2 /> Hapus
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus modul “{title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Semua materi, soal, nilai, dan progres mahasiswa pada modul ini ikut terhapus. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={remove}>
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
