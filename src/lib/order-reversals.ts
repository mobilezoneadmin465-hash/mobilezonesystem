import type { PrismaClient } from "@prisma/client";
import { syncProductWarehouseQty, syncSrQty } from "@/lib/imei-stock";

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

  const srIds = Array.from(new Set(deliveries.map((d) => d.srId)));
  const srRoles = await tx.user.findMany({
    where: { id: { in: srIds } },
    select: { id: true, role: true },
  });
  const ownerSrIds = new Set(srRoles.filter((r) => r.role === "OWNER").map((r) => r.id));

  for (const d of deliveries) {
    for (const line of d.lines) {
      if (ownerSrIds.has(d.srId)) {
        // Owner as delivery agent => reserved IMEIs live under the owner's "SR location" state.
        // Return them back to the warehouse and clear delivery linkage.
        await tx.productImei.updateMany({
          where: { deliveryId: d.id, location: "SR", srId: d.srId, productId: line.productId },
          data: { location: "WAREHOUSE", srId: null, shopId: null, deliveryId: null },
        });
        await syncProductWarehouseQty(tx, line.productId);
        // Also refresh any inventory counter row that may exist under srId=ownerId.
        await syncSrQty(tx, d.srId, line.productId);
      } else {
        await tx.srInventory.upsert({
          where: { srId_productId: { srId: d.srId, productId: line.productId } },
          create: { srId: d.srId, productId: line.productId, quantity: line.quantity },
          update: { quantity: { increment: line.quantity } },
        });
      }
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
