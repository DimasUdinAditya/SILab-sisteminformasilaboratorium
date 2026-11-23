"use client";

import { SimulationCatalogView } from "@/components/simulasi/catalog-view";
import { RoleGate } from "@/components/simulasi/simulation-player";

/** Katalog Simulasi untuk dosen: hanya melihat dan pratinjau. Tambah, ubah, dan hapus dilakukan admin. */
export default function KatalogSimulasiPage() {
  return (
    <RoleGate allowed="dosen" label="dosen">
      <SimulationCatalogView
        viewer="dosen"
        title="Katalog Simulasi"
        description="Daftar simulasi virtual yang tersedia di sistem. Anda dapat melihat pratinjau setiap simulasi."
        banner={
          <div role="note" className="rounded-lg border border-info/30 bg-info-soft px-4 py-3 text-sm text-info">
            Simulasi ditambahkan dan diaktifkan oleh admin. Simulasi yang aktif otomatis tampil di sini dan di menu Simulasi Virtual mahasiswa,
            yang dapat langsung memainkannya untuk latihan mandiri.
          </div>
        }
        emptyHint="Simulasi akan muncul otomatis setelah diaktifkan oleh admin."
      />
    </RoleGate>
  );
}
