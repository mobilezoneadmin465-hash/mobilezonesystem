"use server";

import { hash } from "bcryptjs";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { internalEmailFromUsername, isValidUsername, normalizeUsername } from "@/lib/user-identifiers";

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

export async function registerSrAction(_formData: FormData) {
  return { error: "Field team accounts are created by the owner from Field team → Add field team." };
}

export async function registerRetailAction(_formData: FormData) {
  return {
    error:
      "Retail logins are created by the owner: open Stores, pick a shop, then Add store login. Create the store first with Add store if it does not exist yet.",
  };
}
