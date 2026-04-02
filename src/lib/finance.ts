import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type DueDb = Pick<PrismaClient, "shopDelivery" | "payment">;

/** Confirmed deliveries (stock at shop) minus confirmed payments */
export async function getShopDueTx(db: DueDb, shopId: string): Promise<Prisma.Decimal> {  const deliveries = await db.shopDelivery.findMany({
    where: { shopId, status: { in: ["CONFIRMED", "CONFIRMED_WITH_IMEIS"] } },
    include: { lines: true },
  });

  let owed = new Prisma.Decimal(0);
  for (const d of deliveries) {
    for (const l of d.lines) {
      owed = owed.add(new Prisma.Decimal(l.unitPrice).mul(l.quantity));
    }
  }

  const paid = await db.payment.aggregate({
    where: { shopId, status: "CONFIRMED" },
    _sum: { amount: true },
  });

  return owed.minus(paid._sum.amount ?? new Prisma.Decimal(0));
}

/** Confirmed deliveries (stock at shop) minus confirmed payments */
export async function getShopDue(shopId: string): Promise<Prisma.Decimal> {
  return getShopDueTx(prisma, shopId);
}

export function formatMoney(value: Prisma.Decimal | number | string): string {
  const n =
    typeof value === "object" && value !== null && "toFixed" in value
      ? Number(value)
      : Number(value);
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}
