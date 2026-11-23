"use client";

import { RoleGate, SimulationPlayer } from "@/components/simulasi/simulation-player";

/** Memainkan simulasi secara embedded untuk mahasiswa. */
export default function MulaiSimulasiPage() {
  return (
    <RoleGate allowed="mahasiswa" label="mahasiswa">
      <SimulationPlayer viewer="mahasiswa" />
    </RoleGate>
  );
}
