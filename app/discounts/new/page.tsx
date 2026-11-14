import type { Metadata } from "next";
import { listPriceItems, listQuotes } from "@/lib/db";
import { DiscountRequestForm } from "@/components/DiscountRequestForm";
import type { Discount } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Request discount",
};

export default async function NewDiscountPage({
  searchParams,
}: {
  searchParams: Promise<{ target?: string }>;
}) {
  const params = await searchParams;
  const [items, quotes] = await Promise.all([listPriceItems(), listQuotes()]);
  let prefill: {
    targetType: Discount["target_type"];
    targetId: string;
  } | null = null;
  const m = /^(\w+):(.+)$/.exec(params.target ?? "");
  if (m && (m[1] === "quote" || m[1] === "hosting" || m[1] === "subscription")) {
    prefill = { targetType: m[1], targetId: m[2] };
  }
  return (
    <div className="space-y-4">
      <div>
        <h1 className="page-title">Request discount</h1>
        <p className="page-sub">
          List, floor and resulting figure show before confirming —
          nobody approves a number they have not seen.
        </p>
      </div>
      <DiscountRequestForm items={items} quotes={quotes} prefill={prefill} />
    </div>
  );
}
