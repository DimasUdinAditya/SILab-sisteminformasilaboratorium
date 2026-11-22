"use client";

import { useState } from "react";

import { PageHeader } from "@/components/app/page-header";
import { LeadershipCards, ProdiTable } from "@/components/monitoring/leadership-view";
import { PeriodFilter } from "@/components/monitoring/period-filter";
import { thisMonth } from "@/lib/summary";

export function MonitoringPage({ title, description }: { title: string; description: string }) {
  const [period, setPeriod] = useState(thisMonth);
  return (
    <div>
      <PageHeader title={title} description={description} />
      <PeriodFilter value={period} onChange={setPeriod} />
      <LeadershipCards period={period} />
      <ProdiTable period={period} />
    </div>
  );
}
