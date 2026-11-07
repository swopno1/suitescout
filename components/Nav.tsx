// Header nav: inline pills on desktop, sandwich menu on mobile.
// Closes on every route change; the panel is fixed so it never
// shifts the header or forces sideways scroll.
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import LogoutButton from "@/components/LogoutButton";

const LINKS = [
  { href: "/", label: "Board" },
  { href: "/run", label: "Run" },
  { href: "/settings", label: "Settings" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // Logged-out visitors only ever see /login — no nav, no logout.
  useEffect(() => setOpen(false), [pathname]);
  if (pathname === "/login") return null;

  return (
    <>
      <nav
        aria-label="Primary"
        className="hidden items-center gap-1 text-sm font-semibold md:flex"
      >
        {LINKS.map((l) => {
          const active = isActive(pathname, l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active ? "page" : undefined}
              className={`rounded-full px-3.5 py-1.5 transition-colors ${
                active
                  ? "bg-brand-dark text-cream"
                  : "text-stone-600 hover:bg-brand-light hover:text-brand-dark"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
        <LogoutButton />
      </nav>

      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-ink hover:bg-brand-light"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 22 22"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            {open ? (
              <>
                <line x1="5" y1="5" x2="17" y2="17" />
                <line x1="17" y1="5" x2="5" y2="17" />
              </>
            ) : (
              <>
                <line x1="4" y1="6" x2="18" y2="6" />
                <line x1="4" y1="11" x2="18" y2="11" />
                <line x1="4" y1="16" x2="18" y2="16" />
              </>
            )}
          </svg>
        </button>
        {open && (
          <nav
            aria-label="Primary"
            className="card fixed right-4 top-16 z-30 flex w-48 flex-col gap-1 !p-2"
          >
            {LINKS.map((l) => {
              const active = isActive(pathname, l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                    active
                      ? "bg-brand-dark text-cream"
                      : "text-stone-600 hover:bg-brand-light hover:text-brand-dark"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
            <span className="mx-1 border-t border-stone-200" aria-hidden="true" />
            <LogoutButton className="rounded-lg px-3 py-2 text-left text-sm font-semibold text-stone-500 transition-colors hover:bg-accent-light hover:text-accent disabled:opacity-50" />
          </nav>
        )}
      </div>
    </>
  );
}
