"use server";

import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
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
  const t = v.trim().replace(/\s+/g, "");
  return t || "";
}

export async function createFieldTeamUserAction(formData: FormData) {
  const owner = await requireOwner();
  if (!owner) return { error: "Unauthorized." };

  const name = String(formData.get("name") ?? "").trim();
  const usernameRaw = String(formData.get("username") ?? "");
  const pin = String(formData.get("pin") ?? "").trim();
  const phoneRaw = normalizePhone(String(formData.get("phone") ?? ""));
  const fieldRoleId = String(formData.get("fieldRoleId") ?? "").trim();
  const newFieldRoleName = String(formData.get("newFieldRoleName") ?? "").trim();

  if (!name || !usernameRaw || !pin) return { error: "Name, username, and PIN are required." };
  if (!isPinFormat(pin)) return { error: "PIN must be exactly 6 digits." };

  const username = normalizeUsername(usernameRaw);
  if (!isValidUsername(username)) {
    return { error: "Username: 3–32 characters, letters, numbers, dots, dashes, underscores." };
  }

  const email = internalEmailFromUsername(username);
  const taken = await prisma.user.findFirst({
    where: { OR: [{ username }, { email }] },
  });
  if (taken) return { error: "That username is already taken." };

  if (phoneRaw) {
    const pTaken = await prisma.user.findFirst({ where: { phone: phoneRaw } });
    if (pTaken) return { error: "That phone is already used by another user." };
  }

  let roleId: string | null = null;
  if (newFieldRoleName) {
    const label = newFieldRoleName.trim();
    if (label.length < 2) return { error: "Role name is too short." };
    const existing = await prisma.fieldRole.findUnique({ where: { name: label } });
    if (existing) {
      roleId = existing.id;
    } else {
      const created = await prisma.fieldRole.create({ data: { name: label } });
      roleId = created.id;
    }
  } else if (fieldRoleId) {
    const fr = await prisma.fieldRole.findUnique({ where: { id: fieldRoleId } });
    if (!fr) return { error: "Invalid role." };
    roleId = fr.id;
  }

  const pinHash = await hash(pin, 12);
  await prisma.user.create({
    data: {
      username,
      email,
      name,
      phone: phoneRaw || null,
      role: "SR",
      pinHash,
      passwordHash: null,
      fieldRoleId: roleId,
    },
  });

  await logActivity({
    type: "USER_CREATE_SR",
    title: `Field team: ${name} (@${username})`,
    actorUserId: owner.id,
  });

  revalidatePath("/owner/team");
  return { success: true };
}

export async function createRetailShopUserAction(formData: FormData) {
  const owner = await requireOwner();
  if (!owner) return { error: "Unauthorized." };

  const shopId = String(formData.get("shopId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const usernameRaw = String(formData.get("username") ?? "");
  const pin = String(formData.get("pin") ?? "").trim();
  const phoneRaw = normalizePhone(String(formData.get("phone") ?? ""));

  if (!shopId || !name || !usernameRaw || !pin) return { error: "Fill all required fields." };
  if (!isPinFormat(pin)) return { error: "PIN must be exactly 6 digits." };

  const shop = await prisma.shop.findUnique({ where: { id: shopId } });
  if (!shop) return { error: "Store not found." };

  const username = normalizeUsername(usernameRaw);
  if (!isValidUsername(username)) {
    return { error: "Username: 3–32 characters, letters, numbers, dots, dashes, underscores." };
  }

  const email = internalEmailFromUsername(username);
  const taken = await prisma.user.findFirst({
    where: { OR: [{ username }, { email }] },
  });
  if (taken) return { error: "That username is already taken." };

  if (phoneRaw) {
    const pTaken = await prisma.user.findFirst({ where: { phone: phoneRaw } });
    if (pTaken) return { error: "That phone is already used by another user." };
  }

  const pinHash = await hash(pin, 12);
  await prisma.user.create({
    data: {
      username,
      email,
      name,
      phone: phoneRaw || null,
      role: "RETAIL",
      shopId,
      pinHash,
      passwordHash: null,
    },
  });

  await logActivity({
    type: "USER_CREATE_RETAIL",
    title: `Store login: ${name} (@${username}) for ${shop.name}`,
    actorUserId: owner.id,
    shopId,
  });

  revalidatePath("/owner/shops");
  revalidatePath(`/owner/shops/${shopId}`);
  return { success: true };
}

export async function setManagedUserPinAction(formData: FormData) {
  const owner = await requireOwner();
  if (!owner) return { error: "Unauthorized." };

  const userId = String(formData.get("userId") ?? "").trim();
  const pin = String(formData.get("pin") ?? "").trim();
  if (!userId || !pin) return { error: "Missing fields." };
  if (!isPinFormat(pin)) return { error: "PIN must be exactly 6 digits." };

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || (target.role !== "SR" && target.role !== "RETAIL")) {
    return { error: "Invalid user." };
  }

  const pinHash = await hash(pin, 12);
  await prisma.user.update({
    where: { id: userId },
    data: { pinHash, passwordHash: null },
  });

  await logActivity({
    type: "USER_PIN_RESET",
    title: `PIN updated for ${target.name}`,
    actorUserId: owner.id,
    shopId: target.shopId,
  });

  revalidatePath("/owner/team");
  revalidatePath("/owner/shops");
  if (target.shopId) revalidatePath(`/owner/shops/${target.shopId}`);
  return { success: true };
}
