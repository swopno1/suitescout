import type { Metadata } from "next";
import Link from "next/link";
import Logo from "@/components/Logo";

const SHORT_DESCRIPTION =
  "SuiteScout finds resorts that need ViveReply's Resort PMS and drafts the first message. You approve, it sends — ViveReply's sales-ops agent.";

export const metadata: Metadata = {
  title: "SuiteScout — ViveReply's Resort PMS sales agent",
  description: SHORT_DESCRIPTION,
  openGraph: {
    title: "SuiteScout — ViveReply's Resort PMS sales agent",
    description: SHORT_DESCRIPTION,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "SuiteScout — Resort PMS sales-ops",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SuiteScout — ViveReply's Resort PMS sales agent",
    description: SHORT_DESCRIPTION,
    images: ["/og-image.png"],
  },
};

const EXPLORE_LINKS = [
  {
    href: "https://suitescout.vivereply.com",
    label: "Live demo",
    note: "The running app — log in with the demo credentials from the submission.",
  },
  {
    href: "https://github.com/swopno1/suitescout",
    label: "Code on GitHub",
    note: "Public repo, MIT-licensed. README, architecture, and honest limitations.",
  },
  {
    href: "https://www.vivereply.com",
    label: "ViveReply",
    note: "Business software for resorts and hotels — CRM, HMS, RMS with an AI chatbot.",
  },
  {
    href: "https://www.vivereply.com/suite",
    label: "ViveReply Suite",
    note: "The Resort PMS SuiteScout sells — website, direct booking & management in one system.",
  },
  {
    href: "https://www.vivereply.com/docs",
    label: "Documentation",
    note: "Suite and Chatbot docs — what the products do, and what they do not do yet.",
  },
  {
    href: "https://app.vivereply.com",
    label: "Concierge demo",
    note: "ViveReply Concierge — the AI front-desk agent on live Suite booking data.",
  },
  {
    href: "https://www.vivereply.com/blog/hackathon-over-what-happens-to-concierge-now",
    label: "Concierge story",
    note: "What happened to the Concierge after the Meta Global AI Hackathon.",
  },
];

const RUBRIC_ROWS: Array<[string, string]> = [
  ["No working website", "+30"],
  ["Live site, no booking engine", "+20"],
  ["Phone / WhatsApp / Facebook only", "+15"],
  ["OTA / third-party dependent", "+15"],
  ["Demand signals", "+10"],
  ["Scale — 20+ rooms or multi-product", "+10"],
  ["Direct booking with payment", "−40"],
  ["Modern PMS already in place", "−30"],
];

const LOOP_STEPS = [
  {
    name: "Research",
    text: "Reads the resort's live website — and its listed contact details — and records what it actually finds. No fact enters the board without a source.",
  },
  {
    name: "Score",
    text: "A deterministic 0–100 rubric over the resort's booking gap. The score is computed by code, never by the model.",
  },
  {
    name: "Draft",
    text: "Writes a personalised email and WhatsApp opener from one genuine observation about that resort. Drafts never contain prices.",
  },
  {
    name: "Log",
    text: "Every run, draft, and follow-up lands on the prospect board with its evidence attached, so nothing is a black box.",
  },
  {
    name: "Follow up",
    text: "Prepares the next touch and its due date. The follow-up is a draft until a human approves it — it never sends itself.",
  },
];

/** Public landing page — no DB calls, no session checks, no client
 *  data fetching. The prospect board lives at /board. */
export default function LandingPage() {
  return (
    <div>
      {/* Hero */}
      <section className="mb-8 text-center">
        <div className="mb-4 flex justify-center">
          <Logo size={76} />
        </div>
        <p className="text-[34px] font-extrabold leading-none tracking-tight text-ink sm:text-[42px]">
          Suite<span className="text-accent">Scout</span>
        </p>
        <p className="mt-2 text-[12px] font-bold uppercase tracking-[0.18em] text-stone-500">
          Resort PMS sales-ops
        </p>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-stone-700">
          SuiteScout finds resorts that need ViveReply&apos;s Resort PMS and
          drafts the first message. You approve, it sends.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/login" className="btn-accent !px-5 !py-2.5 !text-base">
            Open live demo
          </Link>
          <a
            href="https://github.com/swopno1/suitescout"
            className="btn-ghost !px-5 !py-2.5 !text-base"
          >
            View the code
          </a>
        </div>
      </section>

      {/* Seller → product → prospect */}
      <section className="card mb-8" aria-label="Who sells what to whom">
        <p className="eyebrow mb-3 text-center">
          Who sells, what is sold, who it is sold to
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg bg-brand-light p-4 text-center">
            <p className="text-sm font-bold text-brand-dark">
              ViveReply sells
            </p>
            <p className="mt-1 text-sm leading-relaxed text-stone-600">
              The Resort PMS — ViveReply Suite: resort website, direct
              booking &amp; management in one system.
            </p>
          </div>
          <div className="rounded-lg bg-accent-light p-4 text-center">
            <p className="text-sm font-bold text-accent">
              SuiteScout finds
            </p>
            <p className="mt-1 text-sm leading-relaxed text-stone-600">
              The resorts that need it — researched, scored, and drafted
              into a first message.
            </p>
          </div>
          <div className="rounded-lg bg-brand-light p-4 text-center">
            <p className="text-sm font-bold text-brand-dark">
              The resort decides
            </p>
            <p className="mt-1 text-sm leading-relaxed text-stone-600">
              A human approves every send. Nothing goes out to a
              resort without a person saying yes.
            </p>
          </div>
        </div>
      </section>

      {/* For judges */}
      <section
        className="mb-8 rounded-xl bg-brand-dark p-5 text-cream"
        aria-label="For judges"
      >
        <p className="eyebrow !text-cream/70">For judges — start here</p>
        <h2 className="mt-1 text-xl font-extrabold tracking-tight">
          Vultr Agent Rush · Track 02 — Powering the Future of Work
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-cream/90">
          Challenge 2, Sales Operations. Solo team ViveScript. Built
          November 3–9, 2026, as a real multi-step sales-ops platform —
          not a one-off demo: a Vultr VM runs the app, shared Postgres
          holds the pipeline, and Serverless Inference drafts the
          outreach.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-cream/90">
          <span className="font-bold">Try it:</span> open the live demo
          and log in with username{" "}
          <code className="rounded bg-white/15 px-1.5 py-0.5 font-mono text-[13px]">
            demo
          </code>{" "}
          — the password is in the LabLab submission.
        </p>
      </section>

      {/* ViveReply story */}
      <section className="mb-8">
        <p className="eyebrow mb-1">Who we are</p>
        <h2 className="page-title">ViveReply</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-stone-700">
          ViveReply (vivereply.com) builds business software for resorts
          and hotels — CRM, HMS, and RMS with an AI chatbot. Its first
          product is ViveReply Suite, a Resort Property Management System:
          resort website, direct booking, and management in one system.
          ViveReply is a solo-founded company — Md Amir Hossain, based in
          Dhaka, Bangladesh, and Cheyenne, Wyoming — and SuiteScout is
          its sales office: the tool that finds the resorts the Suite was
          built for.
        </p>
      </section>

      {/* The problem */}
      <section className="mb-8">
        <p className="eyebrow mb-1">The problem</p>
        <h2 className="page-title">
          Resorts lose bookings to the phone and the OTA
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-stone-700">
          Across Bangladesh, resorts still take bookings by phone,
          Facebook message, and online travel agents. Every OTA booking
          costs 15–20% in commission, and every guest who wants to book
          late at night meets a phone nobody answers. The resorts that
          lose the most to this are the ones least likely to be found by
          a sales team working from a spreadsheet — so SuiteScout finds
          them first.
        </p>
      </section>

      {/* What SuiteScout does */}
      <section className="mb-8">
        <p className="eyebrow mb-1">What this app does</p>
        <h2 className="page-title">Research → Score → Draft → Log → Follow up</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {LOOP_STEPS.map((step, i) => (
            <article key={step.name} className="card">
              <p className="flex items-center gap-2 text-sm font-extrabold text-brand-dark">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-xs font-extrabold text-white">
                  {i + 1}
                </span>
                {step.name}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">
                {step.text}
              </p>
            </article>
          ))}
          <article className="card">
            <p className="text-sm font-extrabold text-brand-dark">
              Area scout
            </p>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">
              Finds new leads from OpenStreetMap across Bangladesh&apos;s
              resort destinations — Cox&apos;s Bazar, Saint Martin&apos;s
              Island, Bandarban, Sajek Valley, Sreemangal, Kuakata,
              Rangamati — and imports them as new prospects.
            </p>
          </article>
        </div>

        <h3 className="mb-2 mt-6 text-lg font-bold">
          The scoring rubric — deterministic, 0–100
        </h3>
        <div className="card overflow-x-auto !p-0">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-500">
                <th scope="col" className="px-4 py-2.5 font-bold">
                  Signal
                </th>
                <th scope="col" className="px-4 py-2.5 text-right font-bold">
                  Points
                </th>
              </tr>
            </thead>
            <tbody>
              {RUBRIC_ROWS.map(([signal, points]) => (
                <tr key={signal} className="border-b border-stone-100 last:border-0">
                  <td className="px-4 py-2">{signal}</td>
                  <td className="px-4 py-2 text-right font-bold tabular-nums">
                    {points}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-sm text-stone-600">
          <span className="font-bold text-accent">70+ Hot</span> ·{" "}
          <span className="font-bold text-amber-700">40–69 Warm</span> ·{" "}
          <span className="font-bold text-slate-500">&lt;40 Cold</span> — the
          bands the board sorts by.
        </p>
      </section>

      {/* Guardrails */}
      <section className="mb-8">
        <p className="eyebrow mb-1">Guardrails</p>
        <h2 className="page-title">A human approves every send</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-stone-700">
          <li>
            Approved email drafts go out through Resend — nothing sends
            from an unapproved draft, and the agent never sends on its
            own.
          </li>
          <li>One email per prospect, ever — and a 10-sends-per-day cap.</li>
          <li>
            Honest limits, stated plainly: there is no scheduled sending
            yet, and no suppression list yet.
          </li>
        </ul>
      </section>

      {/* Built on Vultr */}
      <section className="mb-8">
        <p className="eyebrow mb-1">Built on Vultr</p>
        <h2 className="page-title">The whole stack runs on Vultr</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-stone-700">
          <li>A Vultr VM hosts the Next.js app, behind Caddy with TLS.</li>
          <li>Shared Postgres holds the pipeline — prospects, runs, drafts, follow-ups.</li>
          <li>Nightly database backups, with a verified test restore.</li>
          <li>
            Vultr Serverless Inference (DeepSeek V4.1 Flash) writes the
            draft language; scoring stays deterministic code.
          </li>
        </ul>
      </section>

      {/* Explore more */}
      <section className="mb-8">
        <p className="eyebrow mb-1">Explore more</p>
        <h2 className="page-title">The story, in full</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {EXPLORE_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="card card-hover block"
            >
              <span className="font-semibold text-brand-dark hover:underline">
                {l.label} ↗
              </span>
              <span className="mt-1 block text-sm leading-relaxed text-stone-600">
                {l.note}
              </span>
            </a>
          ))}
        </div>
      </section>

      {/* Page footer */}
      <section className="border-t border-stone-300/70 pt-4 text-sm text-stone-600">
        <p>
          SuiteScout is MIT-licensed open source, built by Md Amir
          Hossain (ViveScript Solutions) for the Vultr Agent Rush
          hackathon. Contact:{" "}
          <a
            href="mailto:info@vivereply.com"
            className="font-semibold text-brand hover:underline"
          >
            info@vivereply.com
          </a>
          .
        </p>
      </section>
    </div>
  );
}
