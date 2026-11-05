import { NextResponse } from "next/server";
import { listProspects } from "@/lib/db";
import { PROSPECT_STATUSES, type Prospect } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const prospects = listProspects();
  const columns: Record<string, Prospect[]> = {};
  const counts: Record<string, number> = {};
  for (const status of PROSPECT_STATUSES) {
    columns[status] = prospects.filter((p) => p.status === status);
    counts[status] = columns[status].length;
  }
  return NextResponse.json({ columns, counts, total: prospects.length });
}
