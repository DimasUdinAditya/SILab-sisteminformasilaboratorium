"use client";

import { PageHeader } from "@/components/app/page-header";
import { LabRequestList } from "@/components/labman/lab-request-list";

export default function Page() {
  return (
    <div>
      <PageHeader title="Pengajuan Penggunaan Lab" description="Pengajuan dari mahasiswa dan dosen untuk laboratorium yang Anda pimpin." />
      <LabRequestList manage defaultStatus="Diajukan" />
    </div>
  );
}
