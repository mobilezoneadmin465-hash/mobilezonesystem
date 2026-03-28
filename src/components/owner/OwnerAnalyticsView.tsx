import type { ReactNode } from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/finance";
import type { WholesaleAnalyticsRange, WholesaleAnalyticsSnapshot } from "@/lib/wholesale-analytics";

const RANGES: { id: WholesaleAnalyticsRange; label: string }[] = [
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "all", label: "All time" },
];

function Kpi({
  title,
  value,
  hint,
  accent,
}: {
  title: string;
  value: string;
  hint?: string;
  accent?: "teal" | "amber" | "zinc";
}) {
  const border =
    accent === "teal"
      ? "border-teal-500/30 bg-teal-950/20"
      : accent === "amber"
        ? "border-amber-500/25 bg-amber-950/15"
        : "border-zinc-800 bg-zinc-900/80";
  return (
    <div className={`app-card ${border}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{title}</p>
      <p className="mt-2 text-xl font-semibold tabular-nums text-white sm:text-2xl">{value}</p>
      {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
    </div>
  );
}

function TableCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="app-card space-y-3">
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      {children}
    </div>
  );
}

export function OwnerAnalyticsView({
  data,
  activeRange,
}: {
  data: WholesaleAnalyticsSnapshot;
  activeRange: WholesaleAnalyticsRange;
}) {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-zinc-400">
          <span className="font-medium text-zinc-300">{data.rangeDescription}</span>
          <span className="text-zinc-600"> · </span>
          Sales from orders you marked <span className="text-zinc-300">complete</span>. Profit uses each product&apos;s
          current <span className="text-zinc-300">cost price</span> on the Stock page.
        </p>
        <div className="flex flex-wrap gap-2">
          {RANGES.map((r) => {
            const active = r.id === activeRange;
            return (
              <Link
                key={r.id}
                href={`/owner/analytics?range=${r.id}`}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-teal-600 text-white shadow-lg shadow-teal-900/30"
                    : "border border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600 hover:text-white"
                }`}
                aria-current={active ? "page" : undefined}
              >
                {r.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          title="Sales revenue"
          value={formatMoney(data.revenue)}
          hint={`${data.completedOrders} completed orders · ${data.unitsSold} units`}
          accent="teal"
        />
        <Kpi title="Cost of goods (COGS)" value={formatMoney(data.cogs)} hint="Qty × cost on file" />
        <Kpi
          title="Gross profit"
          value={formatMoney(data.grossProfit)}
          hint={
            data.marginPercent !== null
              ? `${data.marginPercent.toFixed(1)}% margin on sales`
              : "Add cost prices to see margin"
          }
          accent="amber"
        />
        <Kpi
          title="Avg order value"
          value={formatMoney(data.avgOrderValue)}
          hint="Completed orders only"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Kpi
          title="Cash collected"
          value={formatMoney(data.cashCollected)}
          hint="Approved payments in this period (may differ from sales timing)"
          accent="teal"
        />
        <Kpi
          title="Open pipeline"
          value={formatMoney(data.pipelineValue)}
          hint={`${data.pipelineOrders} open / assigned orders`}
        />
        <Kpi
          title="Warehouse stock"
          value={`${data.inventoryUnits} units`}
          hint={`At cost ${formatMoney(data.inventoryAtCost)} · retail ${formatMoney(data.inventoryAtRetail)}`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TableCard title="Best sellers (by units)">
          {data.topByQuantity.length === 0 ? (
            <p className="text-sm text-zinc-500">No completed sales in this range.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {data.topByQuantity.map((row) => (
                <li
                  key={row.productId}
                  className="flex flex-wrap items-baseline justify-between gap-2 border-b border-zinc-800/80 py-2 last:border-0"
                >
                  <span className="min-w-0 flex-1 text-zinc-200">{row.label}</span>
                  <span className="tabular-nums text-zinc-400">{row.quantity} pcs</span>
                  <span className="w-full text-right text-xs text-zinc-500 sm:w-auto">
                    Rev {formatMoney(row.revenue)} · Profit {formatMoney(row.profit)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </TableCard>

        <TableCard title="Top by revenue">
          {data.topByRevenue.length === 0 ? (
            <p className="text-sm text-zinc-500">No completed sales in this range.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {data.topByRevenue.map((row) => (
                <li
                  key={`${row.productId}-rev`}
                  className="flex flex-wrap items-baseline justify-between gap-2 border-b border-zinc-800/80 py-2 last:border-0"
                >
                  <span className="min-w-0 flex-1 text-zinc-200">{row.label}</span>
                  <span className="font-medium tabular-nums text-teal-400">{formatMoney(row.revenue)}</span>
                  <span className="w-full text-right text-xs text-zinc-500 sm:w-auto">
                    {row.quantity} pcs · Profit {formatMoney(row.profit)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </TableCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TableCard title="Stores by sales">
          {data.topShops.length === 0 ? (
            <p className="text-sm text-zinc-500">No completed orders in this range.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {data.topShops.map((row) => (
                <li
                  key={row.shopId}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 py-2 last:border-0"
                >
                  <span className="font-medium text-zinc-200">{row.name}</span>
                  <span className="tabular-nums text-teal-400">{formatMoney(row.revenue)}</span>
                  <span className="w-full text-xs text-zinc-500 sm:w-auto">
                    {row.orders} orders · {row.units} units
                  </span>
                </li>
              ))}
            </ul>
          )}
        </TableCard>

        <TableCard title="Brands">
          {data.topBrands.length === 0 ? (
            <p className="text-sm text-zinc-500">No completed sales in this range.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {data.topBrands.map((row) => (
                <li
                  key={row.name}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 py-2 last:border-0"
                >
                  <span className="text-zinc-200">{row.name}</span>
                  <span className="tabular-nums text-teal-400">{formatMoney(row.revenue)}</span>
                  <span className="w-full text-xs text-zinc-500 sm:w-auto">
                    Profit {formatMoney(row.profit)} · {row.units} units
                  </span>
                </li>
              ))}
            </ul>
          )}
        </TableCard>
      </div>

      <TableCard title="Field team (completed orders)">
        {data.topReps.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No completed orders with an assigned rep in this range, or reps were unassigned before completion.
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {data.topReps.map((row) => (
              <li
                key={row.name}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 py-2 last:border-0"
              >
                <span className="text-zinc-200">{row.name}</span>
                <span className="tabular-nums text-teal-400">{formatMoney(row.revenue)}</span>
                <span className="text-xs text-zinc-500">{row.orders} orders</span>
              </li>
            ))}
          </ul>
        )}
      </TableCard>

      <TableCard title="Low warehouse stock (≤ 5 units)">
        {data.lowStock.length === 0 ? (
          <p className="text-sm text-zinc-500">Nothing low right now (or warehouse empty).</p>
        ) : (
          <ul className="grid gap-2 text-sm sm:grid-cols-2">
            {data.lowStock.map((row) => (
              <li key={row.label} className="flex justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-2">
                <span className="min-w-0 truncate text-zinc-300">{row.label}</span>
                <span className="shrink-0 tabular-nums text-amber-400">{row.qty} left</span>
              </li>
            ))}
          </ul>
        )}
      </TableCard>
    </div>
  );
}
