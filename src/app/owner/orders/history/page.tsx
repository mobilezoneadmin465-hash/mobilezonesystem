import Link from "next/link";
import { fullOrderInclude, toShopOrderListDTO } from "@/lib/order-dto";
import { prisma } from "@/lib/prisma";
import { OwnerOrderCard } from "@/components/owner/OwnerOrderActions";
import { getT } from "@/lib/i18n/server";

export default async function OwnerOrdersHistoryPage() {
  const t = await getT();
  const [ordersRaw, salesReps] = await Promise.all([
    prisma.shopOrder.findMany({
      where: { status: { in: ["COMPLETED", "CANCELLED"] } },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: fullOrderInclude,
    }),
    prisma.user.findMany({ where: { role: "SR" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const orders = ordersRaw.map(toShopOrderListDTO);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">{t("owner.orders.historyTitle")}</h1>
          <p className="mt-1 text-sm text-zinc-500">{t("owner.orders.historyHint")}</p>
        </div>
        <Link href="/owner/orders" className="app-btn-secondary py-2.5 text-center text-sm">
          {t("owner.orders.activeLink")}
        </Link>
      </div>
      <ul className="space-y-4">
        {orders.map((o) => (
          <OwnerOrderCard key={o.id} mode="archive" order={o} salesReps={salesReps} />
        ))}
      </ul>
      {orders.length === 0 ? <p className="text-sm text-zinc-500">{t("owner.orders.noHistory")}</p> : null}
    </div>
  );
}
