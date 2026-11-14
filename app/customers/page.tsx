import type { Metadata } from "next";
import Link from "next/link";
import { listCustomers, stateLabel } from "@/lib/concierge-db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Customers",
};

export default async function CustomersPage() {
  const res = await listCustomers();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="page-title">Customers</h1>
        <p className="page-sub">
          Every Concierge tenant: plan, service state, usage, and Suite
          binding. Read live from the Concierge database.
        </p>
      </div>

      {res.status === "unconfigured" && (
        <p className="card text-sm text-stone-600">
          Concierge link not configured. Set CONCIERGE_DATABASE_URL on
          the server to see customers here.
        </p>
      )}
      {res.status === "unreachable" && (
        <p className="card text-sm text-stone-600">
          Concierge link unreachable — the database did not answer, so
          nothing is shown rather than stale figures. Check the server
          logs and the connection string.
        </p>
      )}
      {res.status === "ok" &&
        (res.data.length === 0 ? (
          <p className="card text-sm text-stone-600">
            No properties in the Concierge database yet.
          </p>
        ) : (
          <div className="card overflow-x-auto !p-0">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-500">
                  <th scope="col" className="px-4 py-2 font-bold">Property</th>
                  <th scope="col" className="px-4 py-2 font-bold">Owners</th>
                  <th scope="col" className="px-4 py-2 font-bold">Plan</th>
                  <th scope="col" className="px-4 py-2 font-bold">State</th>
                  <th scope="col" className="px-4 py-2 font-bold">Use this mo</th>
                  <th scope="col" className="px-4 py-2 font-bold">Suite</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {res.data.map((c) => (
                  <tr key={c.propertyId} className="hover:bg-stone-50">
                    <td className="px-4 py-2">
                      <Link
                        href={`/customers/${c.propertyId}`}
                        className="font-semibold text-brand-dark hover:underline"
                      >
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-stone-600">
                      {c.owners.length > 0 ? c.owners.join(", ") : "—"}
                    </td>
                    <td className="px-4 py-2 font-semibold">
                      {c.plan ?? "—"}
                      {c.manual && (
                        <span className="ml-1 text-xs font-normal text-stone-500">
                          manual
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <span className="badge bg-stone-200 text-stone-700">
                        {stateLabel(c.customerState)}
                      </span>
                    </td>
                    <td className="px-4 py-2 tabular-nums">
                      {c.usageThisMonth.toLocaleString()} /{" "}
                      {c.quotaThisMonth.toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-stone-600">
                      {c.binding ? "connected" : "not connected"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
    </div>
  );
}
