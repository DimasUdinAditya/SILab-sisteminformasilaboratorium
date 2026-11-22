"use client";

import { useNavigate } from "@/lib/router-compat";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/labman";
import { markRead, myNotificationsQuery, notificationHref } from "@/lib/notifications";
import { cn } from "@/lib/utils";


export default function NotificationsPage() {
  const { data, isLoading } = useQuery(myNotificationsQuery(100));
  const qc = useQueryClient();
  const navigate = useNavigate();
  const unread = (data ?? []).filter((n) => !n.is_read);

  async function refresh() {
    await qc.invalidateQueries({ queryKey: ["notifications"] });
  }

  async function open(n: { id: string; is_read: boolean; link_url: string | null }) {
    if (!n.is_read) await markRead([n.id]);
    await refresh();
    const href = notificationHref(n.link_url);
    if (href) void navigate({ href });
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Notifikasi"
        description="Pemberitahuan tentang pengajuan, peminjaman, pengesahan, dan akun Anda."
        actions={
          unread.length > 0 ? (
            <Button variant="outline" onClick={async () => { await markRead(unread.map((n) => n.id)); await refresh(); }}>
              <CheckCheck /> Tandai semua dibaca
            </Button>
          ) : undefined
        }
      />
      {isLoading && <p className="text-sm text-muted-foreground">Memuat…</p>}
      {data && data.length === 0 && (
        <div className="rounded-xl border border-dashed bg-card p-10 text-center text-sm text-muted-foreground">
          <Bell className="mx-auto mb-2 size-6" />
          Belum ada notifikasi.
        </div>
      )}
      <ol className="space-y-3">
        {data?.map((n) => (
          <li key={n.id}>
            <button
              type="button"
              onClick={() => open(n)}
              className={cn("flex w-full items-start gap-3 rounded-xl border bg-card p-4 text-left shadow-card transition hover:border-primary", !n.is_read && "border-primary/40 bg-primary-soft/30")}
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <Bell className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-medium">
                  {n.title}
                  {!n.is_read && <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">Baru</span>}
                </p>
                {n.message && <p className="text-sm text-muted-foreground">{n.message}</p>}
                <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(n.created_at)}</p>
              </div>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
