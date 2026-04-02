import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type CashHolderRow = {
  userId: string;
  name: string;
  role: string;
  total: string;
  paymentCount: number;
};

function holderKey(method: string, collectedBySRId: string | null, receivedByUserId: string | null): string | null {
  if (method === "CASH_SR" && collectedBySRId) return collectedBySRId;
  if (method === "CASH_HAND_RETAIL" && receivedByUserId) return receivedByUserId;
  return null;
}

/** Pending owner approval: cash physically with SR or owner (CASH_SR + CASH_HAND_RETAIL). */
export async function getPendingCashHoldingsByUser(): Promise<CashHolderRow[]> {
  const pending = await prisma.payment.findMany({
    where: {
      status: "PENDING_OWNER",
      OR: [
        { method: "CASH_SR", collectedBySRId: { not: null } },
        { method: "CASH_HAND_RETAIL", receivedByUserId: { not: null } },
      ],
    },
    select: {
      amount: true,
      method: true,
      collectedBySRId: true,
      receivedByUserId: true,
    },
  });

  const map = new Map<string, { total: Prisma.Decimal; paymentCount: number }>();
  for (const p of pending) {
    const uid = holderKey(p.method, p.collectedBySRId, p.receivedByUserId);
    if (!uid) continue;
    const prev = map.get(uid) ?? { total: new Prisma.Decimal(0), paymentCount: 0 };
    prev.total = prev.total.add(p.amount);
    prev.paymentCount += 1;
    map.set(uid, prev);
  }

  if (map.size === 0) return [];

  const users = await prisma.user.findMany({
    where: { id: { in: [...map.keys()] } },
    select: { id: true, name: true, role: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  return [...map.entries()]
    .map(([userId, v]) => {
      const u = userMap.get(userId);
      return {
        userId,
        name: u?.name ?? "Unknown",
        role: u?.role ?? "?",
        total: v.total.toString(),
        paymentCount: v.paymentCount,
      };
    })
    .sort((a, b) => Number(b.total) - Number(a.total));
}

/** Default person store should hand cash to: assigned order SR, else last delivery SR. */
export async function getDefaultCashRecipientForShop(shopId: string): Promise<string | null> {
  const assignedOrder = await prisma.shopOrder.findFirst({
    where: { shopId, status: "ASSIGNED", assignedSrId: { not: null } },
    orderBy: { assignedAt: "desc" },
    select: { assignedSrId: true },
  });
  if (assignedOrder?.assignedSrId) return assignedOrder.assignedSrId;

  const delivery = await prisma.shopDelivery.findFirst({
    where: { shopId, status: { in: ["CONFIRMED", "CONFIRMED_WITH_IMEIS"] } },
    orderBy: { confirmedAt: "desc" },
    select: { srId: true },
  });
  if (delivery) return delivery.srId;

  return null;
}

export async function getSrPendingCashTotal(srId: string): Promise<{
  total: Prisma.Decimal;
  count: number;
}> {
  const rows = await prisma.payment.findMany({
    where: {
      status: "PENDING_OWNER",
      OR: [
        { method: "CASH_SR", collectedBySRId: srId },
        { method: "CASH_HAND_RETAIL", receivedByUserId: srId },
      ],
    },
    select: { amount: true },
  });
  let total = new Prisma.Decimal(0);
  for (const r of rows) {
    total = total.add(r.amount);
  }
  return { total, count: rows.length };
}
