"use server";

import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { prisma } from "@/lib/prisma";
import { internalEmailFromUsername, isPinFormat, isValidUsername, normalizeUsername } from "@/lib/user-identifiers";

async function requireOwner() {
  const s = await getServerSession(authOptions);
  if (!s?.user || s.user.role !== "OWNER") return null;
  return s.user;
}

function normalizePhone(v: string) {
  return v.trim().replace(/\s+/g, "");
}

export async function createShopAction(formData: FormData) {
  const owner = await requireOwner();
  if (!owner) return { error: "Unauthorized." };

  const name = String(formData.get("name") ?? "").trim();
  const ownerName = String(formData.get("ownerName") ?? "").trim();
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  const address = String(formData.get("address") ?? "").trim();
  const creditRaw = String(formData.get("creditLimit") ?? "").trim();

  const loginName = String(formData.get("loginName") ?? "").trim();
  const loginUsernameRaw = String(formData.get("loginUsername") ?? "");
  const loginPin = String(formData.get("loginPin") ?? "").trim();
  const loginPhoneRaw = normalizePhone(String(formData.get("loginPhone") ?? ""));

  if (!name || !ownerName || !phone || !address) return { error: "Fill store name, contact, phone, and address." };
  if (!loginName || !loginUsernameRaw || !loginPin) {
    return { error: "Add the first store login: display name, username, and 6-digit PIN." };
  }
  if (!isPinFormat(loginPin)) return { error: "PIN must be exactly 6 digits." };

  const loginUsername = normalizeUsername(loginUsernameRaw);
  if (!isValidUsername(loginUsername)) {
    return { error: "Login username: 3–32 characters, letters, numbers, dots, dashes, underscores." };
  }

  const loginEmail = internalEmailFromUsername(loginUsername);
  const usernameTaken = await prisma.user.findFirst({
    where: { OR: [{ username: loginUsername }, { email: loginEmail }] },
  });
  if (usernameTaken) return { error: "That login username is already taken." };

  if (loginPhoneRaw) {
    const pTaken = await prisma.user.findFirst({ where: { phone: loginPhoneRaw } });
    if (pTaken) return { error: "That staff phone is already used by another user." };
  }

  let creditLimit = new Prisma.Decimal(0);
  if (creditRaw) {
    try {
      creditLimit = new Prisma.Decimal(creditRaw);
    } catch {
      return { error: "Invalid credit limit." };
    }
  }

  const pinHash = await hash(loginPin, 12);

  const shop = await prisma.$transaction(async (tx) => {
    const s = await tx.shop.create({
      data: { name, ownerName, phone, address, creditLimit },
    });
    await tx.user.create({
      data: {
        username: loginUsername,
        email: loginEmail,
        name: loginName,
        phone: loginPhoneRaw || null,
        role: "RETAIL",
        shopId: s.id,
        pinHash,
        passwordHash: null,
      },
    });
    return s;
  });

  await logActivity({
    type: "SHOP_CREATE",
    title: `Store created: ${name} (@${loginUsername})`,
    actorUserId: owner.id,
    shopId: shop.id,
  });

  revalidatePath("/owner/shops");
  revalidatePath(`/owner/shops/${shop.id}`);
  return { success: true };
}
