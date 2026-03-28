import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { formatMoney } from "@/lib/finance";
import { fullOrderInclude, orderDeliveryProgress, toShopOrderListDTO } from "@/lib/order-dto";
import { prisma } from "@/lib/prisma";

function lineTotal(lines: { quantity: number; unitPrice: string }[]) {
  return lines.reduce((s, l) => s + Number(l.unitPrice) * l.quantity, 0);
}

export default async function SrToDeliverListPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SR") redirect("/login");

  const raw = await prisma.shopOrder.findMany({
    where: { assignedSrId: session.user.id, status: "ASSIGNED" },
    orderBy: { assignedAt: "desc" },
    include: fullOrderInclude,
  });

  const orders = raw.map(toShopOrderListDTO);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-white">To deliver</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Orders assigned to you. Open one, enter quantities, confirm — the store&apos;s due updates
          immediately.
        </p>
      </header>

      {orders.length === 0 ? (
        <p className="app-card text-sm text-zinc-500">Nothing assigned right now.</p>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => {
            const prog = orderDeliveryProgress(o.lines);
            return (
              <li key={o.id}>
                <Link
                  href={`/sr/to-deliver/${o.id}`}
                  className="block app-card border-amber-500/20 transition hover:border-amber-400/40"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-lg font-semibold text-white">{o.shopName}</p>
                      <p className="text-xs text-zinc-500">
                        Assigned {o.assignedAt ? new Date(o.assignedAt).toLocaleString() : "—"}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-teal-300">{formatMoney(lineTotal(o.lines))}</p>
                  </div>
                  <div className="mt-3 space-y-1">
                    <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className="h-full bg-amber-500/90 transition-all"
                        style={{ width: `${prog.pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-zinc-400">
                      {prog.delivered} / {prog.ordered} units · {prog.linesComplete}/{prog.lineCount} lines done
                    </p>
                  </div>
                  {o.note ? <p className="mt-2 text-xs text-zinc-500">{o.note}</p> : null}
                  {o.ownerNote ? <p className="mt-1 text-xs text-amber-200/80">{o.ownerNote}</p> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
