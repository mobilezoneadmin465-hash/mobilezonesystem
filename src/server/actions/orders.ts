"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { assertWithinCreditLimitTx, linesUndeliveredValue } from "@/lib/shop-credit";
import { reverseOrderDeliveriesInTx, assertOrderHasNoShippedProgressTx } from "@/lib/order-reversals";
import { prisma } from "@/lib/prisma";

type Line = { productId: string; quantity: number };

function parseLines(json: string): Line[] | null {
  try {
    const arr = JSON.parse(json) as unknown;
    if (!Array.isArray(arr)) return null;
    const out: Line[] = [];
    for (const x of arr) {
      if (!x || typeof x !== "object") return null;
      const productId = (x as { productId?: string }).productId;
      const quantity = (x as { quantity?: unknown }).quantity;
      if (typeof productId !== "string" || typeof quantity !== "number" || quantity < 1) return null;
      out.push({ productId, quantity: Math.floor(quantity) });
    }
    return out.length ? out : null;
  } catch {
    return null;
  }
}

async function requireOwner() {
  const s = await getServerSession(authOptions);
  if (!s?.user || s.user.role !== "OWNER") return null;
  return s.user;
}

async function requireRetail() {
  const s = await getServerSession(authOptions);
  if (!s?.user || s.user.role !== "RETAIL" || !s.user.shopId) return null;
  return { ...s.user, shopId: s.user.shopId };
}

export async function createRetailOrderAction(formData: FormData) {
  const user = await requireRetail();
  if (!user) return { error: "Unauthorized." };

  const linesRaw = String(formData.get("lines") ?? "");
  const note = String(formData.get("note") ?? "").trim() || undefined;

  const lines = parseLines(linesRaw);
  if (!lines) return { error: "Add at least one product with quantity." };

  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.shopOrder.create({
        data: {
          shopId: user.shopId,
          placedByUserId: user.id,
          status: "OPEN",
          note,
        },
      });
      let orderValue = new Prisma.Decimal(0);
      for (const line of lines) {
        const p = await tx.catalogProduct.findUnique({ where: { id: line.productId } });
        if (!p) throw new Error("Unknown product.");
        orderValue = orderValue.add(new Prisma.Decimal(p.unitPrice).mul(line.quantity));
        await tx.shopOrderLine.create({
          data: {
            orderId: order.id,
            productId: line.productId,
            quantity: line.quantity,
            unitPrice: p.unitPrice,
            unitCost: p.unitCost,
          },
        });
      }
      await assertWithinCreditLimitTx(tx, user.shopId, orderValue, order.id);
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not create order." };
  }

  await logActivity({
    type: "ORDER_CREATE",
    title: "Store placed an order",
    detail: note,
    actorUserId: user.id,
    shopId: user.shopId,
  });

  revalidatePath("/retail/orders");
  revalidatePath("/retail/place-order");
  revalidatePath("/owner/orders");
  revalidatePath("/owner/place-order");
  revalidatePath("/sr/to-deliver");
  revalidatePath(`/owner/shops/${user.shopId}`);
  revalidatePath("/owner/orders/history");
  return { success: true };
}

export async function createOwnerOrderForShopAction(formData: FormData) {
  const owner = await requireOwner();
  if (!owner) return { error: "Unauthorized." };

  const shopId = String(formData.get("shopId") ?? "");
  const linesRaw = String(formData.get("lines") ?? "");
  const note = String(formData.get("note") ?? "").trim() || undefined;
  const ownerNote = String(formData.get("ownerNote") ?? "").trim() || undefined;

  if (!shopId) return { error: "Missing store." };
  const lines = parseLines(linesRaw);
  if (!lines) return { error: "Add at least one line." };

  const shop = await prisma.shop.findUnique({ where: { id: shopId } });
  if (!shop) return { error: "Store not found." };

  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.shopOrder.create({
        data: {
          shopId,
          placedByUserId: owner.id,
          status: "OPEN",
          note,
          ownerNote,
        },
      });
      for (const line of lines) {
        const p = await tx.catalogProduct.findUnique({ where: { id: line.productId } });
        if (!p) throw new Error("Unknown product.");
        await tx.shopOrderLine.create({
          data: {
            orderId: order.id,
            productId: line.productId,
            quantity: line.quantity,
            unitPrice: p.unitPrice,
            unitCost: p.unitCost,
          },
        });
      }
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not create order." };
  }

  await logActivity({
    type: "ORDER_CREATE_OWNER",
    title: `Order created for ${shop.name}`,
    actorUserId: owner.id,
    shopId,
  });

  revalidatePath("/owner/orders");
  revalidatePath("/owner/orders/history");
  revalidatePath("/owner/place-order");
  revalidatePath("/sr/to-deliver");
  revalidatePath(`/owner/shops/${shopId}`);
  return { success: true };
}

export async function ownerAcceptOrderAction(formData: FormData) {
  const owner = await requireOwner();
  if (!owner) return { error: "Unauthorized." };

  const orderId = String(formData.get("orderId") ?? "");
  if (!orderId) return { error: "Missing order." };

  const order = await prisma.shopOrder.findUnique({ where: { id: orderId } });
  if (!order) return { error: "Order not found." };
  if (order.status !== "OPEN") return { error: "This order cannot be accepted." };

  try {
    await prisma.$transaction(async (tx) => {
      await assertOrderHasNoShippedProgressTx(tx, orderId);
      await tx.shopOrder.update({
        where: { id: orderId },
        data: {
          status: "OWNER_ACCEPTED",
          assignedSrId: null,
          assignedAt: null,
        },
      });
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not accept order." };
  }

  await logActivity({
    type: "ORDER_OWNER_ACCEPT",
    title: "Owner accepted order",
    actorUserId: owner.id,
    shopId: order.shopId,
  });

  revalidatePath("/owner/orders");
  revalidatePath("/owner/shops/" + order.shopId);
  revalidatePath("/owner/dashboard");
  revalidatePath("/retail/orders");
  revalidatePath("/sr/to-deliver");
  revalidatePath("/owner/orders/history");

  return { success: true };
}

export async function ownerRejectOrderAction(formData: FormData) {
  const owner = await requireOwner();
  if (!owner) return { error: "Unauthorized." };

  const orderId = String(formData.get("orderId") ?? "");
  if (!orderId) return { error: "Missing order." };

  const order = await prisma.shopOrder.findUnique({ where: { id: orderId } });
  if (!order) return { error: "Order not found." };
  if (order.status !== "OPEN" && order.status !== "OWNER_ACCEPTED") return { error: "This order cannot be rejected." };

  try {
    await prisma.$transaction(async (tx) => {
      await reverseOrderDeliveriesInTx(tx, orderId);
      await tx.shopOrder.update({
        where: { id: orderId },
        data: {
          status: "CANCELLED",
          assignedSrId: null,
          assignedAt: null,
          retailConfirmedAt: null,
          fulfilledBySrId: null,
          completedAt: null,
          cancelledAt: new Date(),
        },
      });
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not reject order." };
  }

  await logActivity({
    type: "ORDER_OWNER_REJECT",
    title: "Owner rejected order",
    actorUserId: owner.id,
    shopId: order.shopId,
  });

  revalidatePath("/owner/orders");
  revalidatePath("/owner/shops/" + order.shopId);
  revalidatePath("/owner/dashboard");
  revalidatePath("/retail/orders");
  revalidatePath("/sr/to-deliver");
  revalidatePath("/owner/orders/history");

  return { success: true };
}

export async function assignOrderToSrAction(formData: FormData) {
  const owner = await requireOwner();
  if (!owner) return { error: "Unauthorized." };

  const orderId = String(formData.get("orderId") ?? "");
  const srId = String(formData.get("srId") ?? "");
  if (!orderId || !srId) return { error: "Pick a sales rep." };

  const order = await prisma.shopOrder.findUnique({ where: { id: orderId } });
  if (!order || order.status === "COMPLETED" || order.status === "CANCELLED") {
    return { error: "This order cannot be assigned." };
  }

  const sr = await prisma.user.findFirst({ where: { id: srId, role: "SR" } });
  if (!sr) return { error: "Invalid rep." };

  await prisma.shopOrder.update({
    where: { id: orderId },
    data: {
      assignedSrId: srId,
      status: "ASSIGNED",
      assignedAt: new Date(),
    },
  });

  await logActivity({
    type: "ORDER_ASSIGN",
    title: `Order → ${sr.name} for delivery / collection`,
    actorUserId: owner.id,
    shopId: order.shopId,
  });

  revalidatePath("/owner/orders");
  revalidatePath("/owner/orders/history");
  revalidatePath(`/owner/shops/${order.shopId}`);
  revalidatePath("/sr/orders");
  revalidatePath("/sr/to-deliver");
  revalidatePath("/retail/orders");
  revalidatePath("/retail/place-order");
  return { success: true };
}

export async function unassignOrderAction(formData: FormData) {
  const owner = await requireOwner();
  if (!owner) return { error: "Unauthorized." };

  const orderId = String(formData.get("orderId") ?? "");
  const order = await prisma.shopOrder.findUnique({ where: { id: orderId } });
  if (!order || order.status === "COMPLETED" || order.status === "CANCELLED") {
    return { error: "Cannot change assignment." };
  }

  await prisma.shopOrder.update({
    where: { id: orderId },
    data: { assignedSrId: null, status: "OPEN", assignedAt: null, retailConfirmedAt: null },
  });

  await logActivity({
    type: "ORDER_UNASSIGN",
    title: "Order unassigned",
    actorUserId: owner.id,
    shopId: order.shopId,
  });

  revalidatePath("/owner/orders");
  revalidatePath("/owner/orders/history");
  revalidatePath(`/owner/shops/${order.shopId}`);
  revalidatePath("/sr/orders");
  revalidatePath("/sr/to-deliver");
  revalidatePath("/retail/orders");
  revalidatePath("/retail/place-order");
  return { success: true };
}

export async function completeOrderAction(formData: FormData) {
  const owner = await requireOwner();
  if (!owner) return { error: "Unauthorized." };

  const orderId = String(formData.get("orderId") ?? "");
  const order = await prisma.shopOrder.findUnique({ where: { id: orderId } });
  if (!order) return { error: "Not found." };
  if (order.status === "CANCELLED") return { error: "Order is cancelled." };
  if (order.status === "COMPLETED") return { success: true };

  const now = new Date();
  await prisma.shopOrder.update({
    where: { id: orderId },
    data: {
      status: "COMPLETED",
      completedAt: now,
      fulfilledBySrId: order.assignedSrId,
      assignedSrId: null,
      assignedAt: null,
    },
  });

  await logActivity({
    type: "ORDER_COMPLETE",
    title: "Order marked complete (owner)",
    actorUserId: owner.id,
    shopId: order.shopId,
  });

  revalidatePath("/owner/orders");
  revalidatePath("/owner/orders/history");
  revalidatePath(`/owner/shops/${order.shopId}`);
  revalidatePath("/sr/orders");
  revalidatePath("/sr/to-deliver");
  revalidatePath("/retail/orders");
  revalidatePath("/retail/place-order");
  revalidatePath("/owner/analytics");
  return { success: true };
}

export async function cancelOrderAction(formData: FormData) {
  const owner = await requireOwner();
  if (!owner) return { error: "Unauthorized." };

  const orderId = String(formData.get("orderId") ?? "");
  const order = await prisma.shopOrder.findUnique({ where: { id: orderId } });
  if (!order || order.status === "CANCELLED") return { error: "Cannot cancel." };

  const shopId = order.shopId;

  try {
    await prisma.$transaction(async (tx) => {
      await reverseOrderDeliveriesInTx(tx, orderId);
      await tx.shopOrder.update({
        where: { id: orderId },
        data: {
          status: "CANCELLED",
          assignedSrId: null,
          assignedAt: null,
          retailConfirmedAt: null,
          fulfilledBySrId: null,
          completedAt: null,
          cancelledAt: new Date(),
        },
      });
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not cancel order." };
  }

  await logActivity({
    type: "ORDER_CANCEL",
    title: "Order cancelled — shipments reversed, due cleared for this order’s deliveries",
    actorUserId: owner.id,
    shopId,
  });

  revalidatePath("/owner/orders");
  revalidatePath("/owner/orders/history");
  revalidatePath(`/owner/shops/${shopId}`);
  revalidatePath("/sr/orders");
  revalidatePath("/sr/to-deliver");
  revalidatePath("/retail/orders");
  revalidatePath("/retail/place-order");
  revalidatePath("/retail/deliveries");
  revalidatePath("/retail/pay");
  revalidatePath("/owner/analytics");
  return { success: true };
}

export async function updateRetailOpenOrderAction(formData: FormData) {
  const user = await requireRetail();
  if (!user) return { error: "Unauthorized." };

  const orderId = String(formData.get("orderId") ?? "");
  const linesRaw = String(formData.get("lines") ?? "");
  const note = String(formData.get("note") ?? "").trim() || undefined;

  if (!orderId) return { error: "Missing order." };
  const lines = parseLines(linesRaw);
  if (!lines) return { error: "Add at least one product with quantity." };

  const order = await prisma.shopOrder.findUnique({ where: { id: orderId } });
  if (!order || order.shopId !== user.shopId) return { error: "Order not found." };
  if (order.status !== "OPEN") return { error: "Only open orders can be edited." };

  try {
    await prisma.$transaction(async (tx) => {
      await assertOrderHasNoShippedProgressTx(tx, orderId);
      await tx.shopOrderLine.deleteMany({ where: { orderId } });
      await tx.shopOrder.update({
        where: { id: orderId },
        data: { note, retailConfirmedAt: null },
      });
      for (const line of lines) {
        const p = await tx.catalogProduct.findUnique({ where: { id: line.productId } });
        if (!p) throw new Error("Unknown product.");
        await tx.shopOrderLine.create({
          data: {
            orderId,
            productId: line.productId,
            quantity: line.quantity,
            unitPrice: p.unitPrice,
            unitCost: p.unitCost,
          },
        });
      }
      const createdLines = await tx.shopOrderLine.findMany({ where: { orderId } });
      const undel = linesUndeliveredValue(createdLines);
      await assertWithinCreditLimitTx(tx, user.shopId, undel, orderId);
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not update order." };
  }

  await logActivity({
    type: "ORDER_UPDATE_RETAIL",
    title: "Store updated an open order",
    actorUserId: user.id,
    shopId: user.shopId,
  });

  revalidatePath("/retail/orders");
  revalidatePath("/retail/place-order");
  revalidatePath("/owner/orders");
  revalidatePath("/owner/orders/history");
  revalidatePath("/sr/to-deliver");
  revalidatePath(`/owner/shops/${user.shopId}`);
  return { success: true };
}

export async function retailConfirmOrderAction(formData: FormData) {
  const user = await requireRetail();
  if (!user) return { error: "Unauthorized." };

  const orderId = String(formData.get("orderId") ?? "");
  const linesRaw = String(formData.get("lines") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim() || undefined;

  const order = await prisma.shopOrder.findUnique({ where: { id: orderId } });
  if (!order || order.shopId !== user.shopId) return { error: "Order not found." };
  if (order.status !== "OPEN") return { error: "Only open orders can be confirmed." };

  if (linesRaw) {
    const lines = parseLines(linesRaw);
    if (!lines) return { error: "Add at least one product with quantity." };
    try {
      await prisma.$transaction(async (tx) => {
        await assertOrderHasNoShippedProgressTx(tx, orderId);
        await tx.shopOrderLine.deleteMany({ where: { orderId } });
        await tx.shopOrder.update({
          where: { id: orderId },
          data: { note, retailConfirmedAt: new Date() },
        });
        for (const line of lines) {
          const p = await tx.catalogProduct.findUnique({ where: { id: line.productId } });
          if (!p) throw new Error("Unknown product.");
          await tx.shopOrderLine.create({
            data: {
              orderId,
              productId: line.productId,
              quantity: line.quantity,
              unitPrice: p.unitPrice,
            unitCost: p.unitCost,
            },
          });
        }
        const createdLines = await tx.shopOrderLine.findMany({ where: { orderId } });
        const undel = linesUndeliveredValue(createdLines);
        await assertWithinCreditLimitTx(tx, user.shopId, undel, orderId);
      });
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Could not confirm order." };
    }
  } else {
    await prisma.shopOrder.update({
      where: { id: orderId },
      data: { retailConfirmedAt: new Date() },
    });
  }

  await logActivity({
    type: "ORDER_CONFIRM_RETAIL",
    title: "Store confirmed order for warehouse",
    actorUserId: user.id,
    shopId: user.shopId,
  });

  revalidatePath("/retail/orders");
  revalidatePath("/owner/orders");
  revalidatePath("/owner/orders/history");
  revalidatePath("/sr/to-deliver");
  revalidatePath(`/owner/shops/${user.shopId}`);
  return { success: true };
}

export async function retailCancelOpenOrderAction(formData: FormData) {
  const user = await requireRetail();
  if (!user) return { error: "Unauthorized." };

  const orderId = String(formData.get("orderId") ?? "");
  const order = await prisma.shopOrder.findUnique({ where: { id: orderId } });
  if (!order || order.shopId !== user.shopId) return { error: "Order not found." };
  if (order.status !== "OPEN") return { error: "You can only cancel orders that are still open." };

  await prisma.shopOrder.update({
    where: { id: orderId },
    data: {
      status: "CANCELLED",
      assignedSrId: null,
      assignedAt: null,
      retailConfirmedAt: null,
      fulfilledBySrId: null,
      completedAt: null,
      cancelledAt: new Date(),
    },
  });

  await logActivity({
    type: "ORDER_CANCEL_RETAIL",
    title: "Store cancelled an order",
    actorUserId: user.id,
    shopId: user.shopId,
  });

  revalidatePath("/retail/orders");
  revalidatePath("/owner/orders");
  revalidatePath("/owner/orders/history");
  revalidatePath(`/owner/shops/${user.shopId}`);
  revalidatePath("/sr/orders");
  revalidatePath("/sr/to-deliver");
  return { success: true };
}
