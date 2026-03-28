import Link from "next/link";
import { notFound } from "next/navigation";
import { getShopDue } from "@/lib/finance";
import { fullOrderInclude, toShopOrderListDTO } from "@/lib/order-dto";
import { prisma } from "@/lib/prisma";
import { toShopCreditDTO } from "@/lib/shop-dto";
import { OwnerOrderCard } from "@/components/owner/OwnerOrderActions";
import { OwnerShopCreditForm } from "@/components/owner/OwnerShopCreditForm";
import { OwnerShopRetailLogins } from "@/components/owner/OwnerShopRetailLogins";
import { getT } from "@/lib/i18n/server";

type Props = { params: Promise<{ shopId: string }> };

export default async function OwnerShopDetailPage({ params }: Props) {
  const t = await getT();
  const { shopId } = await params;

  const shop = await prisma.shop.findUnique({ where: { id: shopId } });
  if (!shop) notFound();

  const [due, activeRaw, historyRaw, salesReps, retailUsers] = await Promise.all([
    getShopDue(shopId),
    prisma.shopOrder.findMany({
      where: { shopId, status: { in: ["OPEN", "ASSIGNED"] } },
      orderBy: { createdAt: "desc" },
      take: 40,
      include: fullOrderInclude,
    }),
    prisma.shopOrder.findMany({
      where: { shopId, status: { in: ["COMPLETED", "CANCELLED"] } },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: fullOrderInclude,
    }),
    prisma.user.findMany({ where: { role: "SR" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.user.findMany({
      where: { shopId, role: "RETAIL" },
      orderBy: { name: "asc" },
      select: { id: true, username: true, name: true },
    }),
  ]);

  const activeOrders = activeRaw.map(toShopOrderListDTO);
  const historyOrders = historyRaw.map(toShopOrderListDTO);

  return (
    <div className="space-y-8">
      <div>
        <Link href="/owner/shops" className="text-sm text-teal-400 hover:underline">
          {t("owner.shops.detailBack")}
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-white">{shop.name}</h1>
        <p className="text-sm text-zinc-400">{shop.ownerName}</p>
        <p className="text-xs text-zinc-600">{shop.phone}</p>
        <p className="mt-1 text-xs text-zinc-500">{shop.address}</p>
      </div>

      <OwnerShopCreditForm shop={toShopCreditDTO(shop)} due={Number(due)} />

      <OwnerShopRetailLogins shopId={shopId} users={retailUsers} />

      <section className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-bold text-white">{t("owner.shops.ordersProgress")}</h2>
          <Link
            href={`/owner/place-order?shop=${encodeURIComponent(shopId)}`}
            className="app-btn shrink-0 py-2.5 text-center text-sm"
          >
            {t("owner.shops.newOrder")}
          </Link>
        </div>
        <ul className="space-y-4">
          {activeOrders.map((o) => (
            <OwnerOrderCard key={o.id} mode="active" order={o} salesReps={salesReps} />
          ))}
        </ul>
        {activeOrders.length === 0 ? <p className="text-sm text-zinc-500">{t("owner.shops.noActive")}</p> : null}

        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide text-zinc-400">{t("owner.shops.recentPast")}</h3>
          <ul className="mt-3 space-y-4">
            {historyOrders.map((o) => (
              <OwnerOrderCard key={o.id} mode="archive" order={o} salesReps={salesReps} />
            ))}
          </ul>
          {historyOrders.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-500">{t("owner.shops.noPast")}</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
