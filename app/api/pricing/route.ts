import { NextResponse } from "next/server";
import { listPriceItems, listPriceRules } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Pricelist + rules for the quote builder UI (server still totals). */
export async function GET() {
  const [items, rules] = await Promise.all([
    listPriceItems(),
    listPriceRules(),
  ]);
  return NextResponse.json({ items, rules });
}
