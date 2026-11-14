import type { Metadata, Viewport } from "next";
import Link from "next/link";
import Logo from "@/components/Logo";
import Nav from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://suitescout.vivereply.com"),
  title: {
    default: "ViveReply Admin — operator console",
    template: "%s · ViveReply Admin",
  },
  description:
    "ViveReply Admin — the operator console for the ViveReply business: sales pipeline, customers, invoices and health.",
  icons: {
    icon: [
      { url: "/brand/favicon.svg", type: "image/svg+xml" },
      { url: "/brand/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/brand/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#1d3a2f",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-cream text-ink">
        <header className="sticky top-0 z-20 border-b border-stone-300/70 bg-cream/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2.5">
            <Link href="/" className="flex items-center gap-2.5">
              <Logo size={34} />
              <span className="leading-none">
                <span className="block text-[19px] font-extrabold tracking-tight text-ink">
                  ViveReply <span className="text-accent">Admin</span>
                </span>
                <span className="mt-0.5 block text-[10px] font-bold uppercase tracking-[0.18em] text-stone-500">
                  Operator console
                </span>
              </span>
            </Link>
            <Nav />
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        <footer className="border-t border-stone-300/70">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-stone-500">
            <span className="flex items-center gap-2">
              <Logo size={18} variant="mono" label="" />
              SuiteScout · Research → Score → Draft → Log → Follow up
            </span>
            <span>
              Deterministic core, LLM language layer — a human approves
              every send.
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
