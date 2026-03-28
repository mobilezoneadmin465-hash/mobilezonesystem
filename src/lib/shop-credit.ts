import { Prisma } from "@prisma/client";
import type { Prisma as PrismaNamespace } from "@prisma/client";
import { getShopDueTx } from "@/lib/finance";

type Tx = PrismaNamespace.TransactionClient;

/** Remaining (not yet delivered) order value for OPEN + ASSIGNED orders, optionally excluding one order. */
export async function getUndeliveredOrderExposureTx(
  tx: Tx,
  shopId: string,
  excludeOrderId?: string
): Promise<Prisma.Decimal> {
  const orders = await tx.shopOrder.findMany({
    where: {
      shopId,
      status: { in: ["OPEN", "ASSIGNED"] },
      ...(excludeOrderId ? { id: { not: excludeOrderId } } : {}),
    },
    include: { lines: true },
  });
  let sum = new Prisma.Decimal(0);
  for (const o of orders) {
    for (const l of o.lines) {
      const rem = Math.max(0, l.quantity - l.deliveredQty);
      if (rem > 0) sum = sum.add(new Prisma.Decimal(l.unitPrice).mul(rem));
    }
  }
  return sum;
}

/** Total remaining quantity value for lines (used when validating a single order’s lines). */
export function linesUndeliveredValue(
  lines: { quantity: number; deliveredQty: number; unitPrice: Prisma.Decimal }[]
): Prisma.Decimal {
  let sum = new Prisma.Decimal(0);
  for (const l of lines) {
    const rem = Math.max(0, l.quantity - l.deliveredQty);
    if (rem > 0) sum = sum.add(new Prisma.Decimal(l.unitPrice).mul(rem));
  }
  return sum;
}

/** due + all undelivered order exposure (minus optional exclude order) + increment must be ≤ credit limit. */
export async function assertWithinCreditLimitTx(
  tx: Tx,
  shopId: string,
  additionalExposure: Prisma.Decimal,
  excludeOrderId?: string
): Promise<void> {
  const shop = await tx.shop.findUnique({ where: { id: shopId } });
  if (!shop) throw new Error("Store not found.");

  const due = await getShopDueTx(tx, shopId);
  const exposure = await getUndeliveredOrderExposureTx(tx, shopId, excludeOrderId);
  const total = due.add(exposure).add(additionalExposure);
  const limit = shop.creditLimit;

  if (total.gt(limit)) {
    throw new Error(
      "Over this store’s credit limit (current due + open orders + this change). Raise the limit under the store or reduce quantities."
    );
  }
}

/** Call before retail confirms a PENDING_RETAIL delivery (due is about to increase by deliveryAdd). */
export async function assertCreditAfterConfirmingDeliveryTx(
  tx: Tx,
  shopId: string,
  deliveryAdd: Prisma.Decimal
): Promise<void> {
  const shop = await tx.shop.findUnique({ where: { id: shopId } });
  if (!shop) throw new Error("Store not found.");
  const dueNow = await getShopDueTx(tx, shopId);
  const exposure = await getUndeliveredOrderExposureTx(tx, shopId);
  const projected = dueNow.add(deliveryAdd).add(exposure);
  if (projected.gt(shop.creditLimit)) {
    throw new Error("This receipt would push the store over its credit limit. Owner must raise the limit first.");
  }
}
