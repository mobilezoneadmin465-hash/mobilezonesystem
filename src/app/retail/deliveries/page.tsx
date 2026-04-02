import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/finance";
import { authOptions } from "@/lib/auth";
import { RetailConfirmDelivery } from "@/components/retail/RetailConfirmDelivery";
import { getT } from "@/lib/i18n/server";

export default async function RetailDeliveriesPage() {
  const t = await getT();
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "RETAIL" || !session.user.shopId) redirect("/login");

  const deliveries = await prisma.shopDelivery.findMany({
    where: { shopId: session.user.shopId },
    orderBy: { createdAt: "desc" },
    include: { sr: true, lines: { include: { product: true } } },
  });

  const pending = deliveries.filter((d) => d.status === "PENDING_RETAIL");
  const done = deliveries.filter((d) => d.status === "CONFIRMED" || d.status === "CONFIRMED_WITH_IMEIS");

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-semibold text-white">Receive</h1>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-amber-400">Needs action</h2>
        <ul className="space-y-3">
          {pending.map((d) => (
            <li key={d.id} className="app-card space-y-3 border-amber-500/20">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm text-zinc-400">
                    {t("retail.receive.from")} {d.sr.name}
                  </p>
                  <p className="text-xs text-zinc-600">{d.createdAt.toLocaleString()}</p>
                </div>
                <RetailConfirmDelivery deliveryId={d.id} />
              </div>
              <ul className="space-1 text-sm text-zinc-300">
                {d.lines.map((l) => (
                  <li key={l.id}>
                    {l.product.brand} {l.product.name} × {l.quantity} @ {formatMoney(l.unitPrice)}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
        {pending.length === 0 ? <p className="text-sm text-zinc-500">{t("retail.receive.none")}</p> : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-400">{t("retail.receive.history")}</h2>
        <ul className="space-y-2">
          {done.map((d) => (
            <li key={d.id} className="app-card text-sm text-zinc-400">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <span className="text-white">{d.sr.name}</span> · {d.confirmedAt?.toLocaleString()}
                </div>
                <Link href={`/retail/deliveries/${d.id}/receipt`} className="app-btn-secondary py-1.5 text-xs">
                  View receipt
                </Link>
              </div>
              <ul className="mt-2 space-y-0.5 text-xs">
                {d.lines.map((l) => (
                  <li key={l.id}>
                    {l.product.name} × {l.quantity}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
