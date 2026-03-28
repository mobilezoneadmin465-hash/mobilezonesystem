"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { getShopDue } from "@/lib/finance";
import { parseBdtAmount } from "@/lib/money";
import { prisma } from "@/lib/prisma";

const MAX_PROOF_CHARS = 450_000;

async function requireRetail() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "RETAIL" || !session.user.shopId) return null;
  const { id, name, email, phone, role, shopId } = session.user;
  return { id, name, email, phone, role, shopId };
}

/** Simulated online settlement — marks confirmed immediately (add a real gateway later). */
export async function retailPayOnlineAction(formData: FormData) {
  const user = await requireRetail();
  if (!user) return { error: "Unauthorized." };

  const amountRaw = String(formData.get("amount") ?? "");
  const amount = parseBdtAmount(amountRaw);
  if (!amount) return { error: "Enter a valid amount (numbers only, optional commas)." };

  await prisma.payment.create({
    data: {
      shopId: user.shopId,
      amount,
      method: "ONLINE",
      status: "PENDING_OWNER",
      submittedByUserId: user.id,
    },
  });

  await logActivity({
    type: "PAYMENT_ONLINE",
    title: "Online / mobile payment submitted (pending owner approval)",
    detail: "Awaiting owner approval",
    amount,
    actorUserId: user.id,
    shopId: user.shopId,
  });

  revalidatePath("/retail");
  revalidatePath("/retail/pay");
  revalidatePath("/owner/payments");
  revalidatePath("/owner/summary");
  revalidatePath("/owner/transactions");
  revalidatePath("/owner/analytics");
  return { success: true };
}

export async function retailPayProofAction(formData: FormData) {
  const user = await requireRetail();
  if (!user) return { error: "Unauthorized." };

  const amountRaw = String(formData.get("amount") ?? "");
  const proofNoteRaw = String(formData.get("proofNote") ?? "").trim();
  const proofImageBase64 = String(formData.get("proofImageBase64") ?? "").trim();

  const amount = parseBdtAmount(amountRaw);
  if (!amount) return { error: "Enter a valid amount (numbers only, optional commas)." };
  if (!proofImageBase64) return { error: "Please attach a photo or screenshot of the transfer." };
  if (proofImageBase64.length > MAX_PROOF_CHARS) return { error: "Image is too large. Try a smaller photo." };

  await prisma.payment.create({
    data: {
      shopId: user.shopId,
      amount,
      method: "PROOF_BANK",
      status: "PENDING_OWNER",
      ...(proofNoteRaw ? { proofNote: proofNoteRaw } : {}),
      proofImageBase64,
      submittedByUserId: user.id,
    },
  });

  await logActivity({
    type: "PAYMENT_PROOF_SUBMIT",
    title: "Bank / transfer proof submitted",
    amount,
    actorUserId: user.id,
    shopId: user.shopId,
  });

  revalidatePath("/retail");
  revalidatePath("/retail/pay");
  revalidatePath("/owner/payments");
  return { success: true };
}

/** Store hands cash to an SR or the owner; held until owner approves (same queue as other pending pay). */
export async function retailPayCashHandAction(formData: FormData) {
  const user = await requireRetail();
  if (!user) return { error: "Unauthorized." };

  const amountRaw = String(formData.get("amount") ?? "");
  const receivedByUserId = String(formData.get("receivedByUserId") ?? "").trim();
  const noteRaw = String(formData.get("note") ?? "").trim();

  const amount = parseBdtAmount(amountRaw);
  if (!amount || amount.lte(0)) return { error: "Enter a valid amount." };
  if (!receivedByUserId) return { error: "Choose who you handed the cash to." };

  const recipient = await prisma.user.findFirst({
    where: { id: receivedByUserId, role: { in: ["SR", "OWNER"] } },
    select: { id: true, name: true, role: true },
  });
  if (!recipient) return { error: "Invalid recipient." };

  const due = await getShopDue(user.shopId);
  if (amount.gt(due)) return { error: "Amount is more than your current due." };

  const shop = await prisma.shop.findUnique({ where: { id: user.shopId }, select: { name: true } });

  await prisma.payment.create({
    data: {
      shopId: user.shopId,
      amount,
      method: "CASH_HAND_RETAIL",
      status: "PENDING_OWNER",
      receivedByUserId: recipient.id,
      submittedByUserId: user.id,
      ...(noteRaw ? { note: noteRaw } : {}),
    },
  });

  await logActivity({
    type: "PAYMENT_CASH_HAND",
    title: `Cash in hand: ${shop?.name ?? "Store"} → ${recipient.name}`,
    detail: recipient.role === "OWNER" ? "Paid to owner" : `Paid to field: ${recipient.name}`,
    amount,
    actorUserId: user.id,
    shopId: user.shopId,
  });

  revalidatePath("/retail");
  revalidatePath("/retail/pay");
  revalidatePath("/owner/payments");
  revalidatePath("/owner/summary");
  revalidatePath("/sr/dashboard");
  return { success: true };
}

export async function srLogCashPaymentAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SR") return { error: "Unauthorized." };

  const shopId = String(formData.get("shopId") ?? "");
  const amountRaw = String(formData.get("amount") ?? "");
  const noteRaw = String(formData.get("note") ?? "").trim();

  const amount = parseBdtAmount(amountRaw);
  if (!shopId || !amount) return { error: "Pick a shop and enter a valid amount." };

  await prisma.payment.create({
    data: {
      shopId,
      amount,
      method: "CASH_SR",
      status: "PENDING_OWNER",
      ...(noteRaw ? { note: noteRaw } : {}),
      collectedBySRId: session.user.id,
    },
  });

  await logActivity({
    type: "PAYMENT_CASH_LOG",
    title: "Cash collection logged (pending owner approval)",
    amount,
    actorUserId: session.user.id,
    shopId,
  });

  revalidatePath("/owner/payments");
  revalidatePath("/owner/team");
  revalidatePath("/owner/summary");
  revalidatePath("/sr/dashboard");
  return { success: true };
}

export async function ownerReviewPaymentAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "OWNER") return { error: "Unauthorized." };

  const paymentId = String(formData.get("paymentId") ?? "");
  const decision = String(formData.get("decision") ?? "") as "CONFIRMED" | "REJECTED";
  if (!paymentId || (decision !== "CONFIRMED" && decision !== "REJECTED")) {
    return { error: "Invalid request." };
  }

  const p = await prisma.payment.findUnique({ where: { id: paymentId }, include: { shop: true } });
  if (!p || p.status !== "PENDING_OWNER") return { error: "Nothing to review." };

  await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: decision,
      reviewedAt: new Date(),
    },
  });

  await logActivity({
    type: decision === "CONFIRMED" ? "PAYMENT_APPROVED" : "PAYMENT_REJECTED",
    title: decision === "CONFIRMED" ? "Payment approved" : "Payment rejected",
    detail: p.shop.name,
    amount: p.amount,
    actorUserId: session.user.id,
    shopId: p.shopId,
  });

  revalidatePath("/owner/payments");
  revalidatePath("/owner/summary");
  revalidatePath("/retail");
  revalidatePath("/retail/pay");
  revalidatePath("/owner/analytics");
  revalidatePath("/sr/dashboard");
  return { success: true };
}
