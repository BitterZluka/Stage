"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { CloseIcon, MenuIcon, SearchIcon } from "./icons";
import { LoginModal } from "./login-modal";
import { Button } from "./ui/button";

const NAV_LINKS = [
  { href: "/explore", label: "Explore" },
  { href: "/challenges", label: "Challenges" },
  { href: "/creators", label: "Creators" },
  { href: "/perks", label: "Perks" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
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

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearchOpen(false);
    setMobileOpen(false);
    router.push("/explore");
  }

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
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={pathname === link.href ? "page" : undefined}
              className="rounded-xl border-2 border-transparent px-4 py-2 text-sm font-bold transition-colors hover:border-black hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black aria-[current=page]:border-black aria-[current=page]:bg-black aria-[current=page]:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden items-center sm:flex">
            {searchOpen ? (
              <form
                onSubmit={handleSearchSubmit}
                className="flex items-center gap-2"
              >
                <label htmlFor="site-search" className="sr-only">
                  Search STAGE
                </label>
                <input
                  id="site-search"
                  type="search"
                  autoFocus
                  placeholder="Search challenges, creators..."
                  className="w-56 rounded-xl border-2 border-black px-3 py-2 text-sm placeholder:text-gray-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                  onBlur={() => setSearchOpen(false)}
                />
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                aria-label="Search STAGE"
                className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-black transition-colors hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
              >
                <SearchIcon size={16} />
              </button>
            )}
          </div>

          <Button
            variant="primary"
            size="sm"
            className="hidden sm:inline-flex"
            onClick={() => setLoginOpen(true)}
          >
            Log in
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
            {NAV_LINKS.map((link, index) => (
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

            <form onSubmit={handleSearchSubmit} className="mt-2">
              <label htmlFor="mobile-search" className="sr-only">
                Search STAGE
              </label>
              <input
                id="mobile-search"
                type="search"
                placeholder="Search challenges, creators..."
                className="w-full rounded-xl border-2 border-black px-4 py-4 text-base placeholder:text-gray-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
              />
            </form>

            <Button
              variant="primary"
              size="lg"
              className="mt-2 w-full"
              onClick={() => {
                setMobileOpen(false);
                setLoginOpen(true);
              }}
            >
              Log in
            </Button>
          </nav>
        </div>
      )}

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </header>
  );
}
