import { NextResponse } from "next/server";
import { listScouts } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Recent scouts, newest first (history). */
export async function GET() {
  return NextResponse.json({ scouts: await listScouts(20) });
}
