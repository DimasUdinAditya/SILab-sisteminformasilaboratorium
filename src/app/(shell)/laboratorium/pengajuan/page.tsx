"use client";

import { FlaskConical } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { LabRequestList } from "@/components/labman/lab-request-list";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/router-compat";

export default function Page() {
  return (
    <div>
      <PageHeader
        title="Pengajuan Saya"
        description="Status pengajuan penggunaan laboratorium Anda."
        actions={
          <Button asChild variant="outline">
            <Link to="/laboratorium">
              <FlaskConical /> Daftar Laboratorium
            </Link>
          </Button>
        }
      />
      <LabRequestList />
    </div>
  );
}
