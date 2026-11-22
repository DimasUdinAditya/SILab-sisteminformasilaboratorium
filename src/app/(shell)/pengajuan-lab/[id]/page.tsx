"use client";

import { PageHeader } from "@/components/app/page-header";
import { LabRequestDetail } from "@/components/labman/lab-request-detail";
import { useParams } from "@/lib/router-compat";

export default function Page() {
  const { id } = useParams();
  return (
    <div>
      <PageHeader title="Detail Pengajuan" />
      <LabRequestDetail id={id} manage />
    </div>
  );
}
