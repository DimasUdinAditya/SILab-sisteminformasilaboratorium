"use client";

// Thin adapter so pages ported from TanStack Router keep their `to`/`params`/`search` call shape.
// Next.js owns routing; this file only converts those options into a URL.
import NextLink from "next/link";
import { useParams as useNextParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import type { AnchorHTMLAttributes, ReactNode } from "react";

type Search = Record<string, string | number | boolean | null | undefined>;

export function buildHref(to: string, params?: Record<string, string | number>, search?: Search) {
  let href = to.replace(/\$([A-Za-z0-9_]+)/g, (_, key: string) => encodeURIComponent(String(params?.[key] ?? "")));
  const entries = Object.entries(search ?? {}).filter(([, v]) => v !== undefined && v !== null && v !== "");
  if (entries.length) {
    const qs = new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
    href += `?${qs}`;
  }
  return href;
}

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  to: string;
  params?: Record<string, string | number>;
  search?: Search;
  replace?: boolean;
  children?: ReactNode;
};

export function Link({ to, params, search, replace, children, ...rest }: LinkProps) {
  return (
    <NextLink href={buildHref(to, params, search)} replace={replace} {...rest}>
      {children}
    </NextLink>
  );
}

type NavigateOptions = { to?: string; href?: string; params?: Record<string, string | number>; search?: Search; replace?: boolean };

export function useNavigate() {
  const router = useRouter();
  const pathname = usePathname();
  return (opts: NavigateOptions) => {
    // Without `to`, stay on the current page and only change the search params (as TanStack did).
    const url = opts.href ?? buildHref(opts.to ?? pathname, opts.params, opts.search);
    if (opts.replace) router.replace(url);
    else router.push(url);
  };
}

export function useParams<T extends Record<string, string> = Record<string, string>>(): T {
  return useNextParams() as T;
}

export function useSearch<T extends Search = Record<string, string>>(): T {
  const sp = useSearchParams();
  return Object.fromEntries(sp.entries()) as T;
}

export function useRouterState<T>({ select }: { select?: (s: { location: { pathname: string } }) => T } = {}): T {
  const pathname = usePathname();
  const state = { location: { pathname } };
  return select ? select(state) : (state as T);
}
