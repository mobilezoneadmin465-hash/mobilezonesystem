"use server";

import { hash } from "bcryptjs";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { internalEmailFromUsername, isPinFormat, isValidUsername, normalizeUsername } from "@/lib/user-identifiers";

function normalizeEmail(v: string) {
  return v.trim().toLowerCase();
}

function normalizePhone(v: string) {
  const t = v.trim().replace(/\s+/g, "");
  return t || "";
}

export async function registerOwnerAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const usernameRaw = String(formData.get("username") ?? "");
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  const password = String(formData.get("password") ?? "");

  if (!name || !email || !password) return { error: "Name, email, and password are required." };
  if (!usernameRaw.trim()) return { error: "Choose a username for sign-in." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (!phone) return { error: "Phone number is required." };

  const username = normalizeUsername(usernameRaw);
  if (!isValidUsername(username)) {
    return { error: "Username: 3–32 characters, letters, numbers, dots, dashes, underscores." };
  }

  const internal = internalEmailFromUsername(username);
  if (internal === email) {
    return { error: "Pick a different email; that address is reserved for system accounts." };
  }

  const taken = await prisma.user.findFirst({
    where: { OR: [{ email }, { phone }, { username }] },
  });
  if (taken) return { error: "That email, phone, or username is already in use." };

  const ownerCount = await prisma.user.count({ where: { role: "OWNER" } });
  if (ownerCount > 0) return { error: "An owner already exists. They add team and store logins from the dashboard." };

  const passwordHash = await hash(password, 12);
  await prisma.user.create({
    data: {
      name,
      username,
      email,
      phone,
      passwordHash,
      pinHash: null,
      role: "OWNER",
    },
  });

  redirect("/login?registered=owner");
}

export async function registerSrAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const usernameRaw = String(formData.get("username") ?? "");
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  const pin = String(formData.get("pin") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fieldRoleName = String(formData.get("fieldRoleName") ?? "").trim();

  if (!name || !usernameRaw || !pin || !password) return { error: "Fill name, username, PIN, and password." };
  if (!isPinFormat(pin)) return { error: "PIN must be exactly 6 digits." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  const username = normalizeUsername(usernameRaw);
  if (!isValidUsername(username)) {
    return { error: "Username: 3–32 characters, letters, numbers, dots, dashes, underscores." };
  }

  const email = internalEmailFromUsername(username);

  const taken = await prisma.user.findFirst({
    where: {
      OR: [
        { username },
        { email },
        // `phone` is optional; only include if provided.
        ...(phone ? [{ phone }] : []),
      ],
    },
  });
  if (taken) return { error: "That username/email/phone is already in use." };

  let fieldRoleId: string | null = null;
  if (fieldRoleName) {
    const label = fieldRoleName.trim();
    if (label.length < 2) return { error: "Role name is too short." };
    const existing = await prisma.fieldRole.findUnique({ where: { name: label } });
    if (existing) fieldRoleId = existing.id;
    else fieldRoleId = (await prisma.fieldRole.create({ data: { name: label } })).id;
  }

  const pinHash = await hash(pin, 12);
  const passwordHash = await hash(password, 12);

  await prisma.user.create({
    data: {
      name,
      username,
      email,
      phone: phone || null,
      role: "SR",
      pinHash,
      passwordHash,
      fieldRoleId,
    },
  });

  return { success: true };
}

export async function registerRetailAction(formData: FormData) {
  const shopName = String(formData.get("shopName") ?? "").trim();
  const ownerName = String(formData.get("ownerName") ?? "").trim();
  const shopPhone = normalizePhone(String(formData.get("shopPhone") ?? ""));
  const address = String(formData.get("address") ?? "").trim();
  const creditRaw = String(formData.get("creditLimit") ?? "").trim();

  const name = String(formData.get("name") ?? "").trim();
  const usernameRaw = String(formData.get("username") ?? "");
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  const pin = String(formData.get("pin") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!shopName || !ownerName || !shopPhone || !address) return { error: "Fill shop name, proprietor name, shop phone, and address." };
  if (!name || !usernameRaw || !pin || !password) return { error: "Fill staff name, username, PIN, and password." };
  if (!isPinFormat(pin)) return { error: "PIN must be exactly 6 digits." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  const username = normalizeUsername(usernameRaw);
  if (!isValidUsername(username)) return { error: "Username: 3–32 characters, letters, numbers, dots, dashes, underscores." };
  const email = internalEmailFromUsername(username);

  const taken = await prisma.user.findFirst({
    where: {
      OR: [
        { username },
        { email },
        ...(phone ? [{ phone }] : []),
      ],
    },
  });
  if (taken) return { error: "That username/email/phone is already in use." };

  let creditLimit = new Prisma.Decimal(0);
  if (creditRaw) {
    try {
      creditLimit = new Prisma.Decimal(creditRaw);
    } catch {
      return { error: "Invalid credit limit." };
    }
  }

  const pinHash = await hash(pin, 12);
  const passwordHash = await hash(password, 12);

  await prisma.$transaction(async (tx) => {
    const shop = await tx.shop.create({
      data: { name: shopName, ownerName, phone: shopPhone, address, creditLimit },
    });
    await tx.user.create({
      data: {
        name,
        username,
        email,
        phone: phone || null,
        role: "RETAIL",
        shopId: shop.id,
        pinHash,
        passwordHash,
      },
    });
  });

  return { success: true };
}
