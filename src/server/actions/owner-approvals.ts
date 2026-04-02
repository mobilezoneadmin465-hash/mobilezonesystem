"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { prisma } from "@/lib/prisma";

async function requireOwner() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "OWNER") return null;
  return session.user;
}

type UserRow = {
  id: string;
  role: string;
  approvedAt: Date | null;
  shopId: string | null;
};

export async function approvePendingRetailAction(formData: FormData) {
  const owner = await requireOwner();
  if (!owner) return { error: "Unauthorized." };

  const userId = String(formData.get("userId") ?? "").trim();
  if (!userId) return { error: "Missing userId." };

  const rows = await prisma.$queryRaw<UserRow[]>`
    SELECT "id", "role", "approvedAt", "shopId"
    FROM "User"
    WHERE "id" = ${userId}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row || row.role !== "RETAIL") return { error: "Account not found." };
  if (row.approvedAt) return { error: "Already approved." };

  await prisma.$executeRaw`
    UPDATE "User"
    SET "approvedAt" = CURRENT_TIMESTAMP
    WHERE "id" = ${userId}
  `;

  await logActivity({
    type: "OWNER_APPROVE_RETAIL",
    title: "Approved store account",
    detail: `Retail user ${row.id} approved.`,
    actorUserId: owner.id,
    shopId: row.shopId,
  });

  revalidatePath("/owner/approvals/stores");
  revalidatePath("/owner/shops");
  if (row.shopId) revalidatePath(`/owner/shops/${row.shopId}`);
  return { success: true };
}

export async function denyPendingRetailAction(formData: FormData) {
  const owner = await requireOwner();
  if (!owner) return { error: "Unauthorized." };

  const userId = String(formData.get("userId") ?? "").trim();
  if (!userId) return { error: "Missing userId." };

  const rows = await prisma.$queryRaw<UserRow[]>`
    SELECT "id", "role", "approvedAt", "shopId"
    FROM "User"
    WHERE "id" = ${userId}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row || row.role !== "RETAIL") return { error: "Account not found." };
  if (row.approvedAt) return { error: "Already approved." };
  if (!row.shopId) return { error: "Missing shop." };

  const shopId = row.shopId;

  await prisma.$transaction(async (tx) => {
    await tx.user.delete({ where: { id: userId } });

    const countRows = await tx.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int AS "count"
      FROM "User"
      WHERE "shopId" = ${shopId}
        AND "role" = 'RETAIL'
        AND "approvedAt" IS NOT NULL
    `;
    const count = countRows[0]?.count ?? 0;
    if (count === 0) {
      await tx.shop.delete({ where: { id: shopId } });
    }
  });

  await logActivity({
    type: "OWNER_DENY_RETAIL",
    title: "Denied store account",
    detail: `Retail user ${row.id} deleted.`,
    actorUserId: owner.id,
    shopId: row.shopId,
  });

  revalidatePath("/owner/approvals/stores");
  revalidatePath("/owner/shops");
  return { success: true };
}

type UserRowSR = {
  id: string;
  role: string;
  approvedAt: Date | null;
};

export async function approvePendingSrAction(formData: FormData) {
  const owner = await requireOwner();
  if (!owner) return { error: "Unauthorized." };

  const userId = String(formData.get("userId") ?? "").trim();
  if (!userId) return { error: "Missing userId." };

  const rows = await prisma.$queryRaw<UserRowSR[]>`
    SELECT "id", "role", "approvedAt"
    FROM "User"
    WHERE "id" = ${userId}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row || row.role !== "SR") return { error: "Account not found." };
  if (row.approvedAt) return { error: "Already approved." };

  await prisma.$executeRaw`
    UPDATE "User"
    SET "approvedAt" = CURRENT_TIMESTAMP
    WHERE "id" = ${userId}
  `;

  await logActivity({
    type: "OWNER_APPROVE_SR",
    title: "Approved field team account",
    detail: `SR user ${row.id} approved.`,
    actorUserId: owner.id,
  });

  revalidatePath("/owner/approvals/accounts");
  revalidatePath("/owner/team");
  return { success: true };
}

export async function denyPendingSrAction(formData: FormData) {
  const owner = await requireOwner();
  if (!owner) return { error: "Unauthorized." };

  const userId = String(formData.get("userId") ?? "").trim();
  if (!userId) return { error: "Missing userId." };

  const rows = await prisma.$queryRaw<UserRowSR[]>`
    SELECT "id", "role", "approvedAt"
    FROM "User"
    WHERE "id" = ${userId}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row || row.role !== "SR") return { error: "Account not found." };
  if (row.approvedAt) return { error: "Already approved." };

  await prisma.user.delete({ where: { id: userId } });

  await logActivity({
    type: "OWNER_DENY_SR",
    title: "Denied field team account",
    detail: `SR user ${row.id} deleted.`,
    actorUserId: owner.id,
  });

  revalidatePath("/owner/approvals/accounts");
  revalidatePath("/owner/team");
  return { success: true };
}

