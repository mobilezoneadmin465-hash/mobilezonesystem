import type { PrismaClient } from "@prisma/client";

export type Tx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends" | "$use"
>;

/** Return SR van stock from all order-linked/PENDING batches, delete deliveries, zero deliveredQty. */
export async function reverseOrderDeliveriesInTx(tx: Tx, orderId: string): Promise<void> {
  const deliveries = await tx.shopDelivery.findMany({
    where: { orderId },
    include: { lines: true },
  });
  for (const d of deliveries) {
    for (const line of d.lines) {
      await tx.srInventory.upsert({
        where: { srId_productId: { srId: d.srId, productId: line.productId } },
        create: { srId: d.srId, productId: line.productId, quantity: line.quantity },
        update: { quantity: { increment: line.quantity } },
      });
    }
  }
  await tx.shopDelivery.deleteMany({ where: { orderId } });
  await tx.shopOrderLine.updateMany({
    where: { orderId },
    data: { deliveredQty: 0 },
  });
}

export async function assertOrderHasNoShippedProgressTx(tx: Tx, orderId: string): Promise<void> {
  const dCount = await tx.shopDelivery.count({ where: { orderId } });
  if (dCount > 0) {
    throw new Error("This order already has shipment records. Contact the owner to change it.");
  }
  const agg = await tx.shopOrderLine.aggregate({
    where: { orderId },
    _sum: { deliveredQty: true },
  });
  if ((agg._sum.deliveredQty ?? 0) > 0) {
    throw new Error("Part of this order is already marked delivered. Contact the owner to change it.");
  }
}
