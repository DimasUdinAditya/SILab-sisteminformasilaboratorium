"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { LogOut, UserCircle } from "lucide-react";
import { Fragment } from "react";

import { AppSidebar } from "@/components/app/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { NotificationBell } from "@/components/app/notification-bell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useSignOut } from "@/hooks/use-sign-out";
import { canAccess, findNav } from "@/lib/nav";
import { fetchAccountStatus, meQueryOptions } from "@/lib/profile";


function initials(name: string) {
  return name
    .split(/\s+/)
    .filter((p) => p && !p.endsWith("."))
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export default function ShellLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { data: me, isLoading } = useQuery(meQueryOptions);

  // Route guard (client side). A login without an active profile is sent to
  // the registration status page, or signed out. Role menu decides page access.
  useEffect(() => {
    if (isLoading) return;
    if (!me || !me.is_active) {
      void (async () => {
        const status = await fetchAccountStatus();
        if (status === "pending") {
          router.replace("/status-registrasi");
          return;
        }
        queryClient.clear();
        await supabase.auth.signOut();
        router.replace("/auth");
      })();
      return;
    }
    if (!canAccess(me.role, pathname)) router.replace("/dashboard");
  }, [me, isLoading, pathname, router, queryClient]);

  const signOut = useSignOut();
  if (isLoading || !me || !me.is_active || !canAccess(me.role, pathname)) return null;
  const nav = findNav(me.role, pathname);

  const crumbs: { label: string; to?: string | undefined }[] = [{ label: "SiLab", to: "/dashboard" }];
  if (nav && nav.item.to !== "/dashboard") crumbs.push({ label: nav.group.label });
  if (nav) crumbs.push({ label: nav.item.title, to: nav.isSubPage ? nav.item.to : undefined });
  if (nav?.isSubPage) crumbs.push({ label: "Detail" });

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar role={me.role} />
        <SidebarInset className="bg-background">
          <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-surface/90 px-4 backdrop-blur md:px-6">
            <SidebarTrigger />
            <Breadcrumb className="hidden sm:block">
              <BreadcrumbList>
                {crumbs.map((c, i) => (
                  <Fragment key={i}>
                    {i > 0 && <BreadcrumbSeparator />}
                    <BreadcrumbItem>
                      {i === crumbs.length - 1 || !c.to ? (
                        <BreadcrumbPage className={i === crumbs.length - 1 ? "" : "text-muted-foreground"}>
                          {c.label}
                        </BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink asChild>
                          <Link href={c.to}>{c.label}</Link>
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </Fragment>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
            <div className="ml-auto flex items-center gap-2">
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-muted">
                  <div className="hidden text-right leading-tight md:block">
                    <p className="text-sm font-semibold text-foreground">{me.name}</p>
                    <p className="text-xs text-muted-foreground">{me.roleName}</p>
                  </div>
                  <Avatar className="size-9">
                    <AvatarFallback className="bg-primary-soft text-sm font-semibold text-secondary">
                      {initials(me.name) || "U"}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <p className="text-sm font-semibold">{me.name}</p>
                    <p className="text-xs text-muted-foreground">{me.email}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profil">
                      <UserCircle /> Profil Akun
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => void signOut()} className="text-destructive">
                    <LogOut /> Keluar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="mx-auto w-full max-w-[1280px] flex-1 p-4 md:p-8">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
