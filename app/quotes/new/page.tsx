import type { Metadata } from "next";
import { getPriceRule, listPriceItems, listProspects } from "@/lib/db";
import { QuoteBuilder } from "@/components/QuoteBuilder";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "New quote",
};

export default async function NewQuotePage() {
  const [items, prospects, modelbShare] = await Promise.all([
    listPriceItems(),
    listProspects(),
    getPriceRule("modelb_revenue_share_pct"),
  ]);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="page-title">New quote</h1>
        <p className="page-sub">
          Compose from the pricelist. Base is required by policy;
          bundles cannot overlap their members.
        </p>
      </div>
      <QuoteBuilder
        items={items}
        prospects={prospects}
        modelbShare={modelbShare ?? "5"}
      />
    </div>
  );
}
