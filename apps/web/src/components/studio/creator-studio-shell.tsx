"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useAuth } from "../../auth/auth-provider";
import { SurfaceCard } from "../ui/surface-card";

const STUDIO_LINKS = [
  { href: "/studio/challenges", label: "Challenges" },
  { href: "/studio/perks", label: "Perks" },
];

export function CreatorStudioShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16">
        <div className="h-48 animate-pulse rounded-3xl border-2 border-black bg-white/70" />
      </div>
    );
  }

  if (!session?.user.creatorId) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20">
        <SurfaceCard
          accent="var(--color-stage-pink)"
          className="p-8 text-center"
        >
          <p className="mb-3 text-xs font-bold tracking-[0.2em] uppercase">
            Creator access only
          </p>
          <h1 className="font-display text-3xl font-bold">
            This studio belongs to creators
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-gray-600">
            Log in with a creator account to create and manage challenges and
            perks. Creator data is also protected by the API, so a fan session
            cannot access it.
          </p>
          <Link
            href="/"
            className="mt-7 inline-flex rounded-xl border-2 border-black bg-black px-5 py-2.5 text-sm font-bold text-white shadow-offset"
          >
            Back to STAGE
          </Link>
        </SurfaceCard>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-stage-bg">
      <section className="border-b-2 border-black bg-gradient-to-r from-stage-aqua via-white to-stage-pink">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
          <p className="mb-2 text-xs font-bold tracking-[0.22em] uppercase">
            Creator workspace
          </p>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="font-display text-4xl font-bold sm:text-5xl">
                Creator Studio
              </h1>
              <p className="mt-2 max-w-2xl text-gray-700">
                Build community challenges, publish token-gated perks, and
                manage their lifecycle from one protected workspace.
              </p>
            </div>
            <nav
              aria-label="Creator Studio"
              className="flex w-full rounded-2xl border-2 border-black bg-white p-1 shadow-offset sm:w-auto"
            >
              {STUDIO_LINKS.map((link) => {
                const active = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className="flex-1 rounded-xl px-5 py-2.5 text-center text-sm font-bold transition-colors hover:bg-black/5 aria-[current=page]:bg-black aria-[current=page]:text-white"
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </section>

      {children}
    </div>
  );
}
