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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">{t("owner.orders.historyTitle")}</h1>
        <Link href="/owner/orders" className="app-btn-secondary shrink-0 py-2.5 text-center text-xs sm:text-sm">
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
