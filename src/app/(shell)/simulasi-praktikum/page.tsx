"use client";

import { SimulationCatalogView } from "@/components/simulasi/catalog-view";
import { RoleGate } from "@/components/simulasi/simulation-player";

/** Simulasi Virtual untuk mahasiswa: latihan mandiri di luar penugasan modul. */
export default function SimulasiVirtualPage() {
  return (
    <RoleGate allowed="mahasiswa" label="mahasiswa">
      <SimulationCatalogView
        viewer="mahasiswa"
        title="Simulasi Virtual"
        description="Latihan mandiri dengan simulasi virtual, di luar penugasan modul."
        emptyHint="Simulasi akan muncul di sini setelah diaktifkan oleh admin."
      />
    </RoleGate>
  );
}
