import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { OwnerTeamManageClient, type TeamSrRow } from "@/components/owner/OwnerTeamManageClient";
import { getT } from "@/lib/i18n/server";

export default async function OwnerTeamPage() {
  const t = await getT();
  const [srs, fieldRoles, cashRows] = await Promise.all([
    prisma.user.findMany({
      where: { role: "SR" },
      orderBy: { name: "asc" },
      include: {
        srInventory: { include: { product: true } },
        fieldRole: true,
      },
    }),
    prisma.fieldRole.findMany({ orderBy: { name: "asc" } }),
    prisma.payment.groupBy({
      by: ["collectedBySRId"],
      where: {
        status: "PENDING_OWNER",
        method: "CASH_SR",
        collectedBySRId: { not: null },
      },
      _sum: { amount: true },
    }),
  ]);

  const cashMap = new Map(
    cashRows.filter((r) => r.collectedBySRId).map((r) => [r.collectedBySRId as string, r._sum.amount]),
  );

  const initialSrs: TeamSrRow[] = srs.map((sr) => {
    let onHand = new Prisma.Decimal(0);
    for (const row of sr.srInventory) {
      onHand = onHand.add(new Prisma.Decimal(row.product.unitPrice).mul(row.quantity));
    }
    const units = sr.srInventory.reduce((s, r) => s + r.quantity, 0);
    const pendingCash = cashMap.get(sr.id) ?? new Prisma.Decimal(0);
    return {
      id: sr.id,
      username: sr.username,
      name: sr.name,
      email: sr.email,
      fieldRoleName: sr.fieldRole?.name ?? null,
      units,
      onHandValue: onHand.toString(),
      pendingCash: pendingCash.toString(),
    };
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-white">{t("owner.team.title")}</h1>
      <OwnerTeamManageClient initialSrs={initialSrs} fieldRoles={fieldRoles.map((r) => ({ id: r.id, name: r.name }))} />
    </div>
  );
}
