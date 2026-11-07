import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getProspect,
  listDraftsForProspect,
  listFollowupsForProspect,
  listRunsForProspect,
} from "@/lib/db";
import type { ResearchData, ScoreBand } from "@/lib/types";
import ApproveButton from "@/components/ApproveButton";
import StartRunButton from "@/components/StartRunButton";
import StatusChanger from "@/components/StatusChanger";

export const dynamic = "force-dynamic";

const BAND_BAR: Record<ScoreBand, string> = {
  hot: "bg-accent",
  warm: "bg-amber-600",
  cold: "bg-slate-500",
};

/** Score on a 0–100 meter with the 40/70 band thresholds marked. */
function ScoreMeter({
  score,
  band,
}: {
  score: number;
  band: ScoreBand;
}) {
  return (
    <div className="flex items-center gap-4">
      <p className="text-5xl font-extrabold tabular-nums tracking-tight">
        {score}
      </p>
      <div className="min-w-0 flex-1">
        <p className="mb-1 text-sm font-bold capitalize">{band}</p>
        <div
          role="img"
          aria-label={`Fit score ${score} out of 100, band ${band}`}
          className="relative h-2.5 overflow-visible rounded-full bg-stone-200"
        >
          <div
            className={`h-full rounded-full ${BAND_BAR[band]}`}
            style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
          />
          {[40, 70].map((t) => (
            <span
              key={t}
              aria-hidden="true"
              className="absolute top-[-3px] h-[14px] w-0.5 bg-white shadow-[0_0_0_1px_rgba(28,36,32,0.25)]"
              style={{ left: `calc(${t}% - 1px)` }}
            />
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[11px] tabular-nums text-stone-400">
          <span>0</span>
          <span>40 warm</span>
          <span>70 hot</span>
          <span>100</span>
        </div>
      </div>
    </div>
  );
}

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
    ["Room types", research.room_types.join(", ") || "—"],
    ["Mobile friendly", String(research.mobile_friendly)],
    ["Demand signals", research.demand_signals.join("; ") || "—"],
  ];
  return (
    <div>
      <dl className="grid grid-cols-[140px_1fr] gap-x-3 text-sm sm:grid-cols-[180px_1fr]">
        {rows.map(([k, v], i) => (
          <div
            key={k}
            className={`contents [&>dd]:py-1.5 [&>dt]:py-1.5 ${i > 0 ? "[&>dd]:border-t [&>dt]:border-t [&>dd]:border-stone-100 [&>dt]:border-stone-100" : ""}`}
          >
            <dt className="font-semibold text-stone-500">{k}</dt>
            <dd className="break-words">{v}</dd>
          </div>
        ))}
      </dl>
      {research.social_links.length > 0 && (
        <div className="mt-3">
          <p className="label mb-1.5">Social links</p>
          <ul className="flex flex-wrap gap-1.5">
            {research.social_links.map((url) => (
              <li key={url} className="max-w-full">
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  title={url}
                  className="badge max-w-full bg-brand-light text-brand-dark hover:bg-brand hover:text-white"
                >
                  <span className="max-w-56 truncate sm:max-w-80">
                    {url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                  </span>
                  <span aria-hidden="true">↗</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      {research.sources.length > 0 && (
        <div className="mt-3">
          <p className="label mb-1.5">Sources</p>
          <ul className="flex flex-wrap gap-1.5">
            {research.sources.map((url) => (
              <li key={url} className="max-w-full">
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  title={url}
                  className="badge max-w-full bg-brand-light text-brand-dark hover:bg-brand hover:text-white"
                >
                  <span className="max-w-56 truncate sm:max-w-80">
                    {url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                  </span>
                  <span aria-hidden="true">↗</span>
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
  const prospect = await getProspect(Number(id));
  if (!prospect) notFound();

  const drafts = await listDraftsForProspect(prospect.id);
  const runs = await listRunsForProspect(prospect.id);
  const followups = await listFollowupsForProspect(prospect.id);

  return (
    <div>
      <p className="mb-3 text-sm">
        <Link
          href="/"
          className="font-semibold text-brand hover:underline"
        >
          ← Back to board
        </Link>
      </p>

      <div className="card mb-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="page-title">{prospect.name}</h1>
          {prospect.demo && (
            <span className="badge bg-accent-light text-[10px] font-bold uppercase tracking-wide text-accent">
              Demo
            </span>
          )}
          <span className="badge bg-brand-dark capitalize text-cream">
            {prospect.status}
          </span>
        </div>
        <p className="mt-1.5 text-sm text-stone-600">
          {prospect.location || "Location unknown"}
          {prospect.website ? (
            <>
              {" · "}
              <a
                href={prospect.website}
                target="_blank"
                rel="noreferrer"
                className="break-all font-medium text-brand hover:underline"
              >
                {prospect.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              </a>
            </>
          ) : (
            " · No website on file"
          )}
          <span className="text-stone-400"> · Source: {prospect.source}</span>
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-stone-100 pt-3">
          <StartRunButton
            prospectId={prospect.id}
            prospectName={prospect.name}
          />
          <StatusChanger
            prospectId={prospect.id}
            currentStatus={prospect.status}
          />
        </div>
      </div>

      <section className="card mb-4" aria-label="Fit score">
        <h2 className="mb-3 text-lg font-bold">Fit score</h2>
        {prospect.fit_score === null || !prospect.score_band ? (
          <p className="text-sm text-stone-600">
            Not scored yet. Run the agent to score this prospect against
            the rubric: 70 and up is hot, 40 to 69 is warm, under 40 is
            cold.
          </p>
        ) : (
          <div>
            <ScoreMeter score={prospect.fit_score} band={prospect.score_band} />
            {prospect.score_reasons && prospect.score_reasons.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {prospect.score_reasons.map((r) => (
                  <li
                    key={r}
                    className="flex gap-2 text-sm leading-relaxed"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand"
                    />
                    {r}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      <section className="card mb-4" aria-label="Research fact sheet">
        <h2 className="mb-3 text-lg font-bold">Research fact sheet</h2>
        {prospect.research ? (
          <FactSheet research={prospect.research} />
        ) : (
          <p className="text-sm text-stone-600">
            Not researched yet. Run the agent to fetch the live web
            presence with a source behind every fact.
          </p>
        )}
      </section>

      <section className="card mb-4" aria-label="Drafts">
        <h2 className="mb-1 text-lg font-bold">Drafts</h2>
        {drafts.length === 0 ? (
          <p className="text-sm text-stone-600">
            No drafts yet. Drafts appear here after a run. A human
            approves every send, the agent never sends.
          </p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {drafts.map((d) => (
              <li key={d.id} className="py-3 first:pt-1 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex flex-wrap items-center gap-2 text-sm font-bold">
                    <span className="badge bg-brand-dark text-[11px] uppercase tracking-wide text-cream">
                      {d.channel}
                    </span>
                    {d.subject && (
                      <span className="font-semibold">{d.subject}</span>
                    )}
                  </span>
                  <span
                    className={`badge ${
                      d.status === "approved"
                        ? "bg-brand text-white"
                        : d.status === "sent"
                          ? "bg-accent text-white"
                          : "bg-stone-200 text-stone-600"
                    }`}
                  >
                    {d.status}
                  </span>
                </div>
                <p className="mono-block mt-2 !bg-stone-50">{d.body}</p>
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

      <section className="card mb-4" aria-label="Run history">
        <h2 className="mb-2 text-lg font-bold">Run history</h2>
        {runs.length === 0 ? (
          <p className="text-sm text-stone-600">No runs yet.</p>
        ) : (
          <ul className="divide-y divide-stone-100 text-sm">
            {runs.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2"
              >
                <Link
                  href={`/run?id=${r.id}`}
                  className="font-bold text-brand hover:underline"
                >
                  Run <span className="tabular-nums">#{r.id}</span>
                </Link>
                <span
                  className={`badge ${
                    r.status === "done"
                      ? "bg-brand text-white"
                      : r.status === "failed"
                        ? "bg-red-700 text-white"
                        : r.status === "running"
                          ? "bg-amber-600 text-white"
                          : "bg-stone-200 text-stone-600"
                  }`}
                >
                  {r.status}
                </span>
                <span className="text-xs tabular-nums text-stone-400">
                  {r.started_at}
                </span>
              </li>
            ))}
          </ul>
        )}
        {followups.length > 0 && (
          <div className="mt-3 border-t border-stone-100 pt-3">
            <h3 className="label mb-1.5">Follow-ups</h3>
            <ul className="space-y-1 text-sm">
              {followups.map((f) => (
                <li key={f.id}>
                  Due in{" "}
                  <span className="font-bold tabular-nums">
                    {f.due_after_days}
                  </span>{" "}
                  business days, {f.status}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
