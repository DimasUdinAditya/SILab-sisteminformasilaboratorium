"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import heroLab from "@/assets/hero-lab.jpg";
import { Logo, TAGLINE } from "@/components/app/logo";

export function AuthLayout({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden lg:block">
        <img src={heroLab.src} alt="Laboratorium FIKES" width={1536} height={1024} className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-hero opacity-80" />
        <div className="relative flex h-full flex-col justify-end p-12 text-primary-foreground">
          <h2 className="font-display text-3xl font-bold leading-tight">
            Praktikum virtual dan pengelolaan laboratorium dalam satu tempat.
          </h2>
          <p className="mt-3 max-w-md text-sm opacity-90">{TAGLINE}</p>
        </div>
      </div>
      <div className="flex flex-col bg-surface px-6 py-8 sm:px-12">
        <Link href="/" className="w-fit">
          <Logo />
        </Link>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
