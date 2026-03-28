import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/finance";
import { authOptions } from "@/lib/auth";

export default async function SrDeliveriesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SR") redirect("/login");

  const deliveries = await prisma.shopDelivery.findMany({
    where: { srId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { shop: true, lines: { include: { product: true } } },
  });

  const waiting = deliveries.filter((d) => d.status === "PENDING_RETAIL");
  const done = deliveries.filter((d) => d.status === "CONFIRMED");

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-white">Shipments</h1>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-amber-400">Waiting on store</h2>
        <ul className="space-y-2">
          {waiting.map((d) => (
            <li key={d.id} className="app-card text-sm text-zinc-300">
              <span className="text-white">{d.shop.name}</span> · {d.createdAt.toLocaleString()}
              <ul className="mt-2 space-y-0.5 text-xs text-zinc-500">
                {d.lines.map((l) => (
                  <li key={l.id}>
                    {l.product.brand} {l.product.name} × {l.quantity} @ {formatMoney(l.unitPrice)}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
        {waiting.length === 0 ? <p className="text-sm text-zinc-500">None</p> : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-500">Confirmed</h2>
        <ul className="space-y-2">
          {done.map((d) => (
            <li key={d.id} className="app-card text-xs text-zinc-500">
              {d.shop.name} · {d.confirmedAt?.toLocaleString()}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
