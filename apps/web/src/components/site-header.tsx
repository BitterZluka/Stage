"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/auth-provider";
import { CloseIcon, MenuIcon } from "./icons";
import { LoginModal } from "./login-modal";
import { Button } from "./ui/button";

const NAV_LINKS = [
  { href: "/challenges", label: "Challenges" },
  { href: "/creators", label: "Creators" },
  { href: "/perks", label: "Perks" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { session, loading, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const firstMobileLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!mobileOpen) return;
    firstMobileLinkRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileOpen(false);
        menuButtonRef.current?.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  function handleAuthAction() {
    if (session) {
      void logout().catch(() => undefined);
    } else {
      setLoginOpen(true);
    }
  }

  const accountId = session?.user.accountIds[0];
  const authenticatedLinks = session
    ? [...NAV_LINKS, { href: "/my-perks", label: "My perks" }]
    : NAV_LINKS;
  const navLinks = session?.user.creatorId
    ? [...authenticatedLinks, { href: "/studio/challenges", label: "Studio" }]
    : authenticatedLinks;
  const authLabel = loading
    ? "Checking…"
    : accountId
      ? `${accountId} · Log out`
      : "Log in";

  return (
    <header
      className="sticky top-0 z-40 border-b-2 border-black bg-white"
      style={{ boxShadow: "0 4px 0 var(--color-stage-cyan)" }}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
        >
          <span
            className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-black bg-gradient-to-br from-stage-cyan to-stage-pink font-display text-sm font-bold shadow-offset"
            aria-hidden="true"
          >
            S
          </span>
          <span className="font-display text-xl font-bold">STAGE</span>
        </Link>

        <nav
          aria-label="Primary"
          className="hidden flex-1 items-center justify-center gap-1 md:flex"
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={
                pathname === link.href ||
                (link.href.startsWith("/studio") &&
                  pathname.startsWith("/studio"))
                  ? "page"
                  : undefined
              }
              className="rounded-xl border-2 border-transparent px-4 py-2 text-sm font-bold transition-colors hover:border-black hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black aria-[current=page]:border-black aria-[current=page]:bg-black aria-[current=page]:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            className="hidden sm:inline-flex"
            onClick={handleAuthAction}
            disabled={loading}
          >
            {authLabel}
          </Button>

          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-black transition-colors hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black md:hidden"
          >
            <MenuIcon size={18} />
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div
          id="mobile-nav"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
          className="fixed inset-0 z-50 flex flex-col bg-white md:hidden"
        >
          <div className="flex h-16 items-center justify-between border-b-2 border-black px-4">
            <span className="font-display text-xl font-bold">STAGE</span>
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                menuButtonRef.current?.focus();
              }}
              aria-label="Close menu"
              className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
            >
              <CloseIcon size={18} />
            </button>
          </div>

          <nav
            aria-label="Primary"
            className="flex flex-1 flex-col gap-2 overflow-y-auto p-4"
          >
            {navLinks.map((link, index) => (
              <Link
                key={link.href}
                ref={index === 0 ? firstMobileLinkRef : undefined}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-xl border-2 border-black px-5 py-4 text-base font-bold shadow-offset focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
              >
                {link.label}
              </Link>
            ))}

            <Button
              variant="primary"
              size="lg"
              className="mt-2 w-full"
              onClick={() => {
                setMobileOpen(false);
                handleAuthAction();
              }}
              disabled={loading}
            >
              {authLabel}
            </Button>
          </nav>
        </div>
      )}

      <LoginModal
        open={loginOpen}
        onOpen={() => setLoginOpen(true)}
        onClose={() => setLoginOpen(false)}
      />
    </header>
  );
}
