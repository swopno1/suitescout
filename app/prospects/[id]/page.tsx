import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getProspect,
  listDraftsForProspect,
  listFollowupsForProspect,
  listRunsForProspect,
} from "@/lib/db";
import type { ResearchData } from "@/lib/types";
import ApproveButton from "@/components/ApproveButton";
import StartRunButton from "@/components/StartRunButton";
import StatusChanger from "@/components/StatusChanger";

export const dynamic = "force-dynamic";

function FactSheet({ research }: { research: ResearchData }) {
  const rows: [string, string][] = [
    ["Website", String(research.has_website)],
    ["Website status", research.website_status],
    ["Booking engine", String(research.has_booking_engine)],
    ["Direct booking", String(research.has_direct_booking)],
    ["OTA listings", research.ota_listings.join(", ") || "—"],
    ["Contact channels", research.contact_channels.join(", ") || "—"],
    ["Languages", research.languages.join(", ") || "—"],
    ["Rooms", research.room_count === null ? "—" : String(research.room_count)],
    ["Mobile friendly", String(research.mobile_friendly)],
    ["Demand signals", research.demand_signals.join(", ") || "—"],
  ];
  return (
    <div>
      <dl className="grid grid-cols-[160px_1fr] gap-x-3 gap-y-1 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="font-semibold text-stone-600">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      {research.social_links.length > 0 && (
        <div className="mt-3">
          <p className="text-sm font-semibold text-stone-600">Social links</p>
          <ul className="mt-1 space-y-1 text-sm">
            {research.social_links.map((url) => (
              <li key={url}>
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand hover:underline"
                >
                  {url}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      {research.sources.length > 0 && (
        <div className="mt-3">
          <p className="text-sm font-semibold text-stone-600">Sources</p>
          <ul className="mt-1 space-y-1 text-sm">
            {research.sources.map((url) => (
              <li key={url}>
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand hover:underline"
                >
                  {url}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default async function ProspectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const prospect = getProspect(Number(id));
  if (!prospect) notFound();

  const drafts = listDraftsForProspect(prospect.id);
  const runs = listRunsForProspect(prospect.id);
  const followups = listFollowupsForProspect(prospect.id);

  return (
    <div>
      <p className="mb-2 text-sm">
        <Link href="/" className="text-brand hover:underline">
          ← Back to board
        </Link>
      </p>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{prospect.name}</h1>
        {prospect.demo && (
          <span className="rounded bg-accent-light px-2 py-0.5 text-xs font-bold text-accent">
            DEMO
          </span>
        )}
        <span className="rounded-full bg-stone-200 px-2 py-0.5 text-xs font-semibold">
          {prospect.status}
        </span>
      </div>
      <p className="mb-4 text-sm text-stone-600">
        {prospect.location || "Location unknown"}
        {prospect.website ? (
          <>
            {" · "}
            <a
              href={prospect.website}
              target="_blank"
              rel="noreferrer"
              className="text-brand hover:underline"
            >
              {prospect.website}
            </a>
          </>
        ) : (
          " · No website on file"
        )}
        {" · Source: "}
        {prospect.source}
      </p>

      <div className="mb-4 flex flex-wrap gap-3">
        <StartRunButton prospectId={prospect.id} prospectName={prospect.name} />
        <StatusChanger prospectId={prospect.id} currentStatus={prospect.status} />
      </div>

      <section className="mb-4 rounded-lg border border-stone-300 bg-white p-4">
        <h2 className="mb-2 text-lg font-semibold">Fit score</h2>
        {prospect.fit_score === null ? (
          <p className="text-sm text-stone-600">
            Not scored yet — run the agent to score this prospect against
            the rubric (0–100; 70+ Hot, 40–69 Warm, under 40 Cold).
          </p>
        ) : (
          <div>
            <p className="text-3xl font-bold">
              {prospect.fit_score}
              <span className="ml-2 text-base font-semibold text-stone-500">
                {prospect.score_band}
              </span>
            </p>
            {prospect.score_reasons && prospect.score_reasons.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {prospect.score_reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      <section className="mb-4 rounded-lg border border-stone-300 bg-white p-4">
        <h2 className="mb-2 text-lg font-semibold">Research fact sheet</h2>
        {prospect.research ? (
          <FactSheet research={prospect.research} />
        ) : (
          <p className="text-sm text-stone-600">
            Not researched yet — run the agent to fetch the live web
            presence with sources for every fact.
          </p>
        )}
      </section>

      <section className="mb-4 rounded-lg border border-stone-300 bg-white p-4">
        <h2 className="mb-2 text-lg font-semibold">Drafts</h2>
        {drafts.length === 0 ? (
          <p className="text-sm text-stone-600">
            No drafts yet — drafts appear here after a run. A human
            approves every send; the agent never sends.
          </p>
        ) : (
          <ul className="space-y-3">
            {drafts.map((d) => (
              <li
                key={d.id}
                className="rounded border border-stone-200 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">
                    {d.channel}
                    {d.subject ? ` — ${d.subject}` : ""}
                  </span>
                  <span className="rounded-full bg-stone-200 px-2 py-0.5 text-xs font-semibold">
                    {d.status}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm">{d.body}</p>
                {d.status === "draft" && (
                  <div className="mt-2">
                    <ApproveButton draftId={d.id} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-4 rounded-lg border border-stone-300 bg-white p-4">
        <h2 className="mb-2 text-lg font-semibold">Run history</h2>
        {runs.length === 0 ? (
          <p className="text-sm text-stone-600">No runs yet.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {runs.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/run?id=${r.id}`}
                  className="text-brand hover:underline"
                >
                  Run #{r.id}
                </Link>
                {" — "}
                {r.status}
                {" · "}
                {r.started_at}
              </li>
            ))}
          </ul>
        )}
        {followups.length > 0 && (
          <div className="mt-3">
            <h3 className="text-sm font-semibold">Follow-ups</h3>
            <ul className="mt-1 space-y-1 text-sm">
              {followups.map((f) => (
                <li key={f.id}>
                  Due in {f.due_after_days} days — {f.status}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
