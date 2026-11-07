// Header nav with active-route states (client: usePathname).
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  // Logged-out visitors only ever see /login — no nav, no logout.
  if (pathname === "/login") return null;
  return (
    <nav className="flex items-center gap-1 text-sm font-semibold">
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
  );
}
