import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { orderDeliveryProgress, fullOrderInclude, toShopOrderListDTO } from "@/lib/order-dto";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/finance";

function lineTotal(lines: { quantity: number; unitPrice: string }[]) {
  return lines.reduce((s, l) => s + Number(l.unitPrice) * l.quantity, 0);
}

export default async function SrDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SR") redirect("/login");

  const userId = session.user.id;

  const [assignedOrdersRaw, inventory, pendingDeliveries] = await Promise.all([
    prisma.shopOrder.findMany({
      where: { assignedSrId: userId, status: "ASSIGNED" },
      orderBy: { assignedAt: "desc" },
      take: 20,
      include: fullOrderInclude,
    }),
    prisma.srInventory.findMany({
      where: { srId: userId, quantity: { gt: 0 } },
      include: { product: true },
    }),
    prisma.shopDelivery.count({
      where: { srId: userId, status: "PENDING_RETAIL" },
    }),
  ]);

  const assignedOrders = assignedOrdersRaw.map(toShopOrderListDTO);

  let loadValue = new Prisma.Decimal(0);
  let units = 0;
  for (const row of inventory) {
    loadValue = loadValue.add(new Prisma.Decimal(row.product.unitPrice).mul(row.quantity));
    units += row.quantity;
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-white">Home</h1>
      </header>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-400">Assigned to you</h2>
          <Link href="/sr/to-deliver" className="text-xs font-medium text-sky-400 hover:underline">
            Open To deliver
          </Link>
        </div>
        {assignedOrders.length === 0 ? (
          <p className="app-card text-sm text-zinc-500">Nothing assigned right now.</p>
        ) : (
          <ul className="space-y-3">
            {assignedOrders.map((o) => {
              const prog = orderDeliveryProgress(o.lines);
              return (
                <li key={o.id} className="app-card border-amber-500/20">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-lg font-semibold text-white">{o.shopName}</p>
                      <p className="text-xs text-zinc-500">{new Date(o.createdAt).toLocaleDateString()}</p>
                    </div>
                    <p className="text-sm font-semibold text-teal-300">{formatMoney(lineTotal(o.lines))}</p>
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full bg-amber-500/80"
                      style={{ width: `${prog.pct}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    {prog.delivered}/{prog.ordered} units · {prog.linesComplete}/{prog.lineCount} lines
                  </p>
                  <ul className="mt-2 space-y-0.5 text-xs text-zinc-400">
                    {o.lines.map((l) => (
                      <li key={l.id}>
                        {l.brand} {l.name} — {l.deliveredQty}/{l.quantity}
                      </li>
                    ))}
                  </ul>
                  {o.note ? <p className="mt-2 text-xs text-zinc-500">{o.note}</p> : null}
                  {o.ownerNote ? <p className="mt-1 text-xs text-amber-200/90">{o.ownerNote}</p> : null}
                  <div className="mt-3">
                    <Link href={`/sr/to-deliver/${o.id}`} className="app-btn inline-block py-2 text-xs">
                      Deliver
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="app-card">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Units with you</p>
          <p className="mt-2 text-3xl font-semibold text-white">{units}</p>
          <p className="mt-1 text-sm text-teal-300">Retail value {formatMoney(loadValue)}</p>
        </div>
        <div className="app-card">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Awaiting store receive (older flow)</p>
          <p className="mt-2 text-3xl font-semibold text-white">{pendingDeliveries}</p>
          <p className="mt-1 text-xs text-zinc-500">New assigned orders use To deliver — confirmed to due at once.</p>
        </div>
      </div>
    </div>
  );
}
