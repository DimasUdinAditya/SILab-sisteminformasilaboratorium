"use client";

import { RoleGate, SimulationPlayer } from "@/components/simulasi/simulation-player";

/** Pratinjau simulasi untuk dosen: read-only, tanpa menyimpan hasil atau progres. */
export default function PreviewSimulasiPage() {
  return (
    <RoleGate allowed="dosen" label="dosen">
      <SimulationPlayer viewer="dosen" />
    </RoleGate>
  );
}
