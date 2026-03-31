"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { moveImeis, syncOfficeQty, syncProductWarehouseQty, syncSrQty } from "@/lib/imei-stock";
import { assertCreditAfterConfirmingDeliveryTx } from "@/lib/shop-credit";
import { prisma } from "@/lib/prisma";

async function requireSr() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SR") return null;
  return session.user;
}

export async function takeFromWarehouseAction(formData: FormData) {
  const user = await requireSr();
  if (!user) return { error: "Unauthorized." };

  const productId = String(formData.get("productId") ?? "");
  const qty = Number(formData.get("quantity") ?? 0);
  if (!productId || !Number.isFinite(qty) || qty < 1) return { error: "Invalid quantity." };

  try {
    await prisma.$transaction(async (tx) => {
      const p = await tx.catalogProduct.findUnique({ where: { id: productId } });
      if (!p) throw new Error("Product not found.");
      if (p.warehouseQty < qty) throw new Error("Not enough stock in warehouse.");

      await tx.catalogProduct.update({
        where: { id: productId },
        data: { warehouseQty: p.warehouseQty - qty },
      });

      const moved = await moveImeis(tx, {
        productId,
        quantity: qty,
        fromLocation: "WAREHOUSE",
        toLocation: "SR",
        toSrId: user.id,
      });

      await tx.srInventory.upsert({
        where: { srId_productId: { srId: user.id, productId } },
        create: { srId: user.id, productId, quantity: qty },
        update: { quantity: { increment: qty } },
      });

      if (moved) {
        await syncProductWarehouseQty(tx, productId);
        await syncSrQty(tx, user.id, productId);
      }
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not update stock." };
  }

  await logActivity({
    type: "WAREHOUSE_TAKE",
    title: "SR took stock from warehouse",
    detail: `${qty} units · product ${productId}`,
    actorUserId: user.id,
  });

  revalidatePath("/sr/warehouse");
  revalidatePath("/sr/dashboard");
  revalidatePath("/owner/catalog");
  revalidatePath("/owner/dashboard");
  revalidatePath("/owner/team");
  return { success: true };
}

export async function sendToOfficeAction(formData: FormData) {
  const user = await requireSr();
  if (!user) return { error: "Unauthorized." };

  const productId = String(formData.get("productId") ?? "");
  const qty = Number(formData.get("quantity") ?? 0);
  if (!productId || !Number.isFinite(qty) || qty < 1) return { error: "Invalid quantity." };

  try {
    await prisma.$transaction(async (tx) => {
      const row = await tx.srInventory.findUnique({
        where: { srId_productId: { srId: user.id, productId } },
      });
      if (!row || row.quantity < qty) throw new Error("You do not have that many units.");

      await tx.srInventory.update({
        where: { srId_productId: { srId: user.id, productId } },
        data: { quantity: row.quantity - qty },
      });

      const moved = await moveImeis(tx, {
        productId,
        quantity: qty,
        fromLocation: "SR",
        toLocation: "OFFICE",
        fromSrId: user.id,
      });

      await tx.officeInventory.upsert({
        where: { productId },
        create: { productId, quantity: qty },
        update: { quantity: { increment: qty } },
      });

      if (moved) {
        await syncSrQty(tx, user.id, productId);
        await syncOfficeQty(tx, productId);
      }
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not move stock." };
  }

  const p = await prisma.catalogProduct.findUnique({ where: { id: productId } });
  await logActivity({
    type: "OFFICE_IN",
    title: "Delivered to office",
    detail: p ? `${qty}× ${p.brand} ${p.name}` : `${qty} units`,
    actorUserId: user.id,
  });

  revalidatePath("/sr/office");
  revalidatePath("/owner/dashboard");
  return { success: true };
}

export async function takeFromOfficeAction(formData: FormData) {
  const user = await requireSr();
  if (!user) return { error: "Unauthorized." };

  const productId = String(formData.get("productId") ?? "");
  const qty = Number(formData.get("quantity") ?? 0);
  if (!productId || !Number.isFinite(qty) || qty < 1) return { error: "Invalid quantity." };

  try {
    await prisma.$transaction(async (tx) => {
      const office = await tx.officeInventory.findUnique({ where: { productId } });
      if (!office || office.quantity < qty) throw new Error("Office does not have that many units.");

      await tx.officeInventory.update({
        where: { productId },
        data: { quantity: office.quantity - qty },
      });

      const moved = await moveImeis(tx, {
        productId,
        quantity: qty,
        fromLocation: "OFFICE",
        toLocation: "SR",
        toSrId: user.id,
      });

      await tx.srInventory.upsert({
        where: { srId_productId: { srId: user.id, productId } },
        create: { srId: user.id, productId, quantity: qty },
        update: { quantity: { increment: qty } },
      });

      if (moved) {
        await syncOfficeQty(tx, productId);
        await syncSrQty(tx, user.id, productId);
      }
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not pick up stock." };
  }

  await logActivity({
    type: "OFFICE_OUT",
    title: "SR took stock from office",
    detail: `${qty} units`,
    actorUserId: user.id,
  });

  revalidatePath("/sr/office");
  revalidatePath("/owner/dashboard");
  return { success: true };
}

type Line = { productId: string; quantity: number };

function parseOrderDeliverLines(
  json: string
): { orderLineId: string; quantity: number }[] | null {
  try {
    const arr = JSON.parse(json) as unknown;
    if (!Array.isArray(arr)) return null;
    const map = new Map<string, number>();
    for (const x of arr) {
      if (!x || typeof x !== "object") return null;
      const orderLineId = (x as { orderLineId?: string }).orderLineId;
      const quantity = (x as { quantity?: unknown }).quantity;
      if (typeof orderLineId !== "string" || typeof quantity !== "number" || !Number.isFinite(quantity)) {
        return null;
      }
      const q = Math.floor(quantity);
      if (q < 0) return null;
      if (q > 0) map.set(orderLineId, (map.get(orderLineId) ?? 0) + q);
    }
    return map.size ? Array.from(map, ([orderLineId, quantity]) => ({ orderLineId, quantity })) : null;
  } catch {
    return null;
  }
}

/** Assigned rep delivers against an order: confirms delivery to store due immediately, deducts SR inventory. */
export async function srDeliverOrderBatchAction(formData: FormData) {
  const user = await requireSr();
  if (!user) return { error: "Unauthorized." };

  const orderId = String(formData.get("orderId") ?? "");
  const linesRaw = String(formData.get("lines") ?? "");
  if (!orderId) return { error: "Missing order." };

  const parsed = parseOrderDeliverLines(linesRaw);
  if (!parsed) return { error: "Add at least one product quantity to deliver." };

  let result: { shopId: string; batchTotal: Prisma.Decimal; detailParts: string[] };
  try {
    result = await prisma.$transaction(async (tx) => {
      const order = await tx.shopOrder.findUnique({
        where: { id: orderId },
        include: { lines: true },
      });
      if (!order || order.assignedSrId !== user.id || order.status !== "ASSIGNED") {
        throw new Error("This order is not assigned to you for delivery.");
      }

      const lineById = new Map(order.lines.map((l) => [l.id, l]));

      for (const item of parsed) {
        const line = lineById.get(item.orderLineId);
        if (!line) throw new Error("Invalid order line.");
        const remaining = line.quantity - line.deliveredQty;
        if (item.quantity > remaining) throw new Error("Cannot deliver more than ordered / remaining.");
      }

      const now = new Date();
      const delivery = await tx.shopDelivery.create({
        data: {
          shopId: order.shopId,
          srId: user.id,
          orderId: order.id,
          status: "CONFIRMED",
          confirmedAt: now,
        },
      });

      let batchTotal = new Prisma.Decimal(0);
      const detailParts: string[] = [];

      for (const item of parsed) {
        const line = lineById.get(item.orderLineId)!;
        const inv = await tx.srInventory.findUnique({
          where: { srId_productId: { srId: user.id, productId: line.productId } },
        });
        if (!inv || inv.quantity < item.quantity) {
          throw new Error("Not enough stock on you for one of the lines.");
        }

        await tx.srInventory.update({
          where: { srId_productId: { srId: user.id, productId: line.productId } },
          data: { quantity: inv.quantity - item.quantity },
        });

        const moved = await moveImeis(tx, {
          productId: line.productId,
          quantity: item.quantity,
          fromLocation: "SR",
          toLocation: "DELIVERED",
          fromSrId: user.id,
          toShopId: order.shopId,
        });

        await tx.shopDeliveryLine.create({
          data: {
            deliveryId: delivery.id,
            productId: line.productId,
            quantity: item.quantity,
            unitPrice: line.unitPrice,
          },
        });

        await tx.shopOrderLine.update({
          where: { id: line.id },
          data: { deliveredQty: line.deliveredQty + item.quantity },
        });

        line.deliveredQty += item.quantity;
        batchTotal = batchTotal.add(new Prisma.Decimal(line.unitPrice).mul(item.quantity));
        const product = await tx.catalogProduct.findUnique({ where: { id: line.productId } });
        if (moved) await syncSrQty(tx, user.id, line.productId);
        detailParts.push(
          product
            ? `${product.brand} ${product.name}×${item.quantity}`
            : `product×${item.quantity}`
        );
      }

      const updatedLines = await tx.shopOrderLine.findMany({ where: { orderId: order.id } });
      const allDone = updatedLines.every((l) => l.deliveredQty >= l.quantity);
      if (allDone) {
        await tx.shopOrder.update({
          where: { id: order.id },
          data: {
            status: "COMPLETED",
            completedAt: now,
            fulfilledBySrId: order.assignedSrId,
            assignedSrId: null,
            assignedAt: null,
          },
        });
      }

      return { shopId: order.shopId, batchTotal, detailParts };
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Delivery failed." };
  }

  await logActivity({
    type: "ORDER_DELIVERY_SR",
    title: "Rep delivered against assigned order",
    detail: result.detailParts.join(", "),
    amount: result.batchTotal,
    actorUserId: user.id,
    shopId: result.shopId,
  });

  const paths = [
    "/sr/to-deliver",
    "/sr/dashboard",
    "/sr/warehouse",
    "/sr/deliveries",
    "/retail",
    "/retail/deliveries",
    "/retail/pay",
    "/retail/place-order",
    "/owner/orders",
    "/owner/orders/history",
    "/owner/dashboard",
    "/owner/analytics",
  ];
  for (const p of paths) revalidatePath(p);
  revalidatePath(`/sr/to-deliver/${orderId}`);
  revalidatePath(`/owner/shops/${result.shopId}`);

  return { success: true };
}

export async function deliverToRetailAction(formData: FormData) {
  const user = await requireSr();
  if (!user) return { error: "Unauthorized." };

  const shopId = String(formData.get("shopId") ?? "");
  const linesRaw = String(formData.get("lines") ?? "");
  if (!shopId || !linesRaw) return { error: "Missing data." };

  let lines: Line[];
  try {
    lines = JSON.parse(linesRaw) as Line[];
  } catch {
    return { error: "Invalid lines." };
  }
  if (!Array.isArray(lines) || !lines.length) return { error: "Add at least one line." };

  try {
    await prisma.$transaction(async (tx) => {
      const delivery = await tx.shopDelivery.create({
        data: {
          shopId,
          srId: user.id,
          status: "PENDING_RETAIL",
        },
      });

      for (const line of lines) {
        if (!line.productId || line.quantity < 1) throw new Error("Invalid line.");
        const inv = await tx.srInventory.findUnique({
          where: { srId_productId: { srId: user.id, productId: line.productId } },
        });
        if (!inv || inv.quantity < line.quantity) throw new Error("Not enough stock on you for one of the lines.");

        const product = await tx.catalogProduct.findUnique({ where: { id: line.productId } });
        if (!product) throw new Error("Unknown product.");

        await tx.srInventory.update({
          where: { srId_productId: { srId: user.id, productId: line.productId } },
          data: { quantity: inv.quantity - line.quantity },
        });

        const moved = await moveImeis(tx, {
          productId: line.productId,
          quantity: line.quantity,
          fromLocation: "SR",
          toLocation: "PENDING_RETAIL",
          fromSrId: user.id,
          toShopId: shopId,
          toDeliveryId: delivery.id,
        });

        await tx.shopDeliveryLine.create({
          data: {
            deliveryId: delivery.id,
            productId: line.productId,
            quantity: line.quantity,
            unitPrice: product.unitPrice,
          },
        });
        if (moved) await syncSrQty(tx, user.id, line.productId);
      }
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Delivery failed." };
  }

  await logActivity({
    type: "DELIVERY_OUT",
    title: "Shipment sent to retail (awaiting receive)",
    detail: `Shop ${shopId}`,
    actorUserId: user.id,
    shopId,
  });

  revalidatePath("/sr/to-deliver");
  revalidatePath("/sr/dashboard");
  revalidatePath("/retail/deliveries");
  revalidatePath("/retail/place-order");
  return { success: true };
}

export async function confirmRetailDeliveryAction(deliveryId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "RETAIL" || !session.user.shopId) {
    return { error: "Unauthorized." };
  }

  const d = await prisma.shopDelivery.findUnique({
    where: { id: deliveryId },
    include: { lines: { include: { product: true } } },
  });
  if (!d || d.shopId !== session.user.shopId) return { error: "Delivery not found." };
  if (d.status !== "PENDING_RETAIL") return { error: "Already processed." };

  let total = new Prisma.Decimal(0);
  const detailParts: string[] = [];
  for (const l of d.lines) {
    total = total.add(new Prisma.Decimal(l.unitPrice).mul(l.quantity));
    detailParts.push(`${l.product.brand} ${l.product.name}×${l.quantity}`);
  }

  try {
    await prisma.$transaction(async (tx) => {
      await assertCreditAfterConfirmingDeliveryTx(tx, d.shopId, total);
      await tx.shopDelivery.update({
        where: { id: deliveryId },
        data: { status: "CONFIRMED", confirmedAt: new Date() },
      });
      await tx.productImei.updateMany({
        where: { deliveryId, location: "PENDING_RETAIL" },
        data: { location: "DELIVERED", shopId: d.shopId },
      });
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not confirm." };
  }

  await logActivity({
    type: "DELIVERY_CONFIRM",
    title: "Retail confirmed receipt",
    detail: detailParts.join(", "),
    amount: total,
    actorUserId: session.user.id,
    shopId: d.shopId,
  });

  revalidatePath("/retail/deliveries");
  revalidatePath("/retail");
  revalidatePath("/retail/pay");
  revalidatePath("/retail/place-order");
  revalidatePath("/owner/dashboard");
  revalidatePath("/owner/orders");
  revalidatePath("/owner/orders/history");
  return { success: true };
}
