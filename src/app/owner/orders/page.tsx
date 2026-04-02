import Link from "next/link";
import { getServerSession } from "next-auth";
import { fullOrderInclude, toShopOrderListDTO } from "@/lib/order-dto";
import { prisma } from "@/lib/prisma";
import { OwnerOrderCard } from "@/components/owner/OwnerOrderActions";
import { getT } from "@/lib/i18n/server";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function OwnerOrdersPage() {
  const t = await getT();
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "OWNER") redirect("/login");

  const [ordersRaw, salesReps] = await Promise.all([
    prisma.shopOrder.findMany({
      where: { status: { in: ["OPEN", "OWNER_ACCEPTED", "OWNER_PREPARED", "ASSIGNED"] } },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: fullOrderInclude,
    }),
    prisma.user.findMany({ where: { role: "SR" }, orderBy: { name: "asc" } }),
  ]);

  const orders = ordersRaw.map(toShopOrderListDTO);
  const salesRepsApproved = salesReps
    .filter((sr) => Boolean((sr as unknown as { approvedAt: Date | null }).approvedAt))
    .map((sr) => ({ id: sr.id, name: sr.name }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">{t("owner.orders.activeTitle")}</h1>
        <Link href="/owner/orders/history" className="app-btn-secondary shrink-0 py-2.5 text-center text-xs sm:text-sm">
          {t("owner.orders.pastLink")}
        </Link>
      </div>
      <ul className="space-y-4">
        {orders.map((o) => (
          <OwnerOrderCard
            key={o.id}
            mode="active"
            order={o}
            salesReps={salesRepsApproved}
            viewerId={session.user.id}
          />
        ))}
      </ul>
      {orders.length === 0 ? <p className="text-sm text-zinc-500">{t("owner.orders.noActive")}</p> : null}
    </div>
  );
}
