import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatMoney, getShopDue } from "@/lib/finance";
import { authOptions } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";

export default async function RetailHomePage() {
  const t = await getT();
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "RETAIL" || !session.user.shopId) redirect("/login");

  const shopId = session.user.shopId;

  const [shop, due, pendingD, pendingProofs] = await Promise.all([
    prisma.shop.findUnique({ where: { id: shopId } }),
    getShopDue(shopId),
    prisma.shopDelivery.count({ where: { shopId, status: "PENDING_RETAIL" } }),
    prisma.payment.count({
      where: {
        shopId,
        status: "PENDING_OWNER",
        method: "PROOF_BANK",
        submittedByUserId: { not: null },
      },
    }),
  ]);

  if (!shop) redirect("/login");

  const over = due.gt(shop.creditLimit);

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">{shop.name}</h1>

      <div className={`app-card ${over ? "border-red-500/40 bg-red-500/5" : "border-teal-500/20"}`}>
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{t("retail.home.amountDue")}</p>
        <p className={`mt-2 text-4xl font-semibold ${over ? "text-red-400" : "text-teal-300"}`}>{formatMoney(due)}</p>
        <p className="mt-2 text-xs text-zinc-500">
          {t("retail.home.creditLimit")} {formatMoney(shop.creditLimit)}
          {over ? <span className="ml-2 font-semibold text-red-400">{t("retail.home.overLimit")}</span> : null}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="app-card text-center">
          <p className="text-2xl font-semibold text-sky-400">{pendingD}</p>
          <p className="text-xs text-zinc-500">{t("retail.home.toReceive")}</p>
        </div>
        <div className="app-card text-center">
          <p className="text-2xl font-semibold text-amber-400">{pendingProofs}</p>
          <p className="text-xs text-zinc-500">{t("retail.home.proofsPending")}</p>
        </div>
      </div>
    </div>
  );
}
