import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { catalogProductInclude, toCatalogProductDTO } from "@/lib/catalog-dto";
import { fullOrderInclude, toShopOrderListDTO } from "@/lib/order-dto";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { RetailOrderManageCard } from "@/components/retail/RetailOrderManageCard";
import { getT } from "@/lib/i18n/server";

export default async function RetailOrdersPage() {
  const t = await getT();
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "RETAIL" || !session.user.shopId) redirect("/login");

  const shopId = session.user.shopId;

  const [products, ordersRaw] = await Promise.all([
    prisma.catalogProduct.findMany({
      orderBy: [{ brand: "asc" }, { name: "asc" }],
      include: catalogProductInclude,
    }),
    prisma.shopOrder.findMany({
      where: { shopId },
      orderBy: { createdAt: "desc" },
      take: 60,
      include: fullOrderInclude,
    }),
  ]);

  const productsDto = products.map(toCatalogProductDTO);
  const orders = ordersRaw.map(toShopOrderListDTO);

  const active = orders.filter(
    (o) => o.status === "OPEN" || o.status === "OWNER_ACCEPTED" || o.status === "OWNER_PREPARED" || o.status === "ASSIGNED"
  );
  const history = orders.filter((o) => o.status === "COMPLETED" || o.status === "CANCELLED");

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-white">{t("retail.orders.title")}</h1>
        <Link href="/retail/place-order" className="app-btn shrink-0 py-2.5 text-center text-sm">
          {t("retail.orders.new")}
        </Link>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-400">{t("retail.orders.active")}</h2>
        {active.length === 0 ? (
          <p className="text-sm text-zinc-500">{t("retail.orders.none")}</p>
        ) : (
          <ul className="space-y-4">
            {active.map((o) => (
              <RetailOrderManageCard key={o.id} order={o} products={productsDto} />
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-400">{t("retail.orders.history")}</h2>
        {history.length === 0 ? (
          <p className="text-sm text-zinc-500">{t("retail.orders.none")}</p>
        ) : (
          <ul className="space-y-4">
            {history.map((o) => (
              <RetailOrderManageCard key={o.id} order={o} products={productsDto} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
