import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "SuiteScout — Resort sales-ops agent",
  description:
    "SuiteScout researches prospect resorts, scores fit for ViveReply Suite, drafts outreach, and logs it on a CRM board.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-cream text-ink">
        <header className="border-b border-stone-300 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link
              href="/"
              className="text-xl font-bold text-brand-dark"
            >
              SuiteScout
            </Link>
            <nav className="flex gap-5 text-sm font-medium">
              <Link href="/" className="hover:text-brand">
                Board
              </Link>
              <Link href="/run" className="hover:text-brand">
                Run
              </Link>
              <Link href="/settings" className="hover:text-brand">
                Settings
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 pb-8 text-center text-xs text-stone-500">
          SuiteScout — the resort sales-ops agent. Research → score →
          draft → follow-up, with a human approving every send.
        </footer>
      </body>
    </html>
  );
}
