"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { prisma } from "@/lib/prisma";

function revalidateCatalog() {
  revalidatePath("/owner/catalog");
  revalidatePath("/owner/dashboard");
  revalidatePath("/owner/place-order");
  revalidatePath("/retail/place-order");
  revalidatePath("/retail/orders");
  revalidatePath("/sr/warehouse");
  revalidatePath("/sr/office");
  revalidatePath("/owner/analytics");
}

async function requireOwner() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "OWNER") return null;
  return session.user;
}

export async function createProductAction(formData: FormData) {
  const user = await requireOwner();
  if (!user) return { error: "Unauthorized." };

  const brandId = String(formData.get("brandId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const warehouseQty = Number(formData.get("warehouseQty") ?? 0);
  const unitPriceRaw = String(formData.get("unitPrice") ?? "");
  const unitCostRaw = String(formData.get("unitCost") ?? "").trim();

  if (!brandId || !name || !unitPriceRaw) return { error: "Choose a brand, model name, and price." };
  if (!Number.isFinite(warehouseQty) || warehouseQty < 0) return { error: "Invalid stock quantity." };

  const br = await prisma.brand.findUnique({ where: { id: brandId } });
  if (!br) return { error: "Invalid brand." };

  let unitPrice: Prisma.Decimal;
  try {
    unitPrice = new Prisma.Decimal(unitPriceRaw);
  } catch {
    return { error: "Invalid price." };
  }
  if (unitPrice.lte(0)) return { error: "Price must be greater than zero." };

  let unitCost = new Prisma.Decimal(0);
  if (unitCostRaw) {
    try {
      unitCost = new Prisma.Decimal(unitCostRaw);
    } catch {
      return { error: "Invalid cost price." };
    }
    if (unitCost.lt(0)) return { error: "Cost cannot be negative." };
  }

  const p = await prisma.catalogProduct.create({
    data: {
      brandId: br.id,
      brand: br.name,
      name,
      description,
      warehouseQty: Math.floor(warehouseQty),
      unitPrice,
      unitCost,
    },
  });

  await logActivity({
    type: "CATALOG_CREATE",
    title: `Added ${br.name} ${name}`,
    detail: `${warehouseQty} units @ ${unitPrice.toString()}`,
    actorUserId: user.id,
  });

  revalidateCatalog();
  return { success: true, id: p.id };
}

export async function updateProductAction(formData: FormData) {
  const user = await requireOwner();
  if (!user) return { error: "Unauthorized." };

  const id = String(formData.get("id") ?? "");
  const brandIdRaw = String(formData.get("brandId") ?? "").trim();
  const brandFallback = String(formData.get("brand") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const warehouseQty = Number(formData.get("warehouseQty") ?? 0);
  const unitPriceRaw = String(formData.get("unitPrice") ?? "");
  const unitCostRaw = String(formData.get("unitCost") ?? "").trim();

  if (!id || !name || !unitPriceRaw) return { error: "Missing fields." };
  if (!Number.isFinite(warehouseQty) || warehouseQty < 0) return { error: "Invalid stock quantity." };

  let brand: string;
  let brandId: string | null;
  if (brandIdRaw) {
    const br = await prisma.brand.findUnique({ where: { id: brandIdRaw } });
    if (!br) return { error: "Invalid brand." };
    brand = br.name;
    brandId = br.id;
  } else {
    if (!brandFallback) return { error: "Choose a dictionary brand or enter a legacy brand name." };
    brand = brandFallback;
    brandId = null;
  }

  let unitPrice: Prisma.Decimal;
  try {
    unitPrice = new Prisma.Decimal(unitPriceRaw);
  } catch {
    return { error: "Invalid price." };
  }

  let unitCost = new Prisma.Decimal(0);
  if (unitCostRaw) {
    try {
      unitCost = new Prisma.Decimal(unitCostRaw);
    } catch {
      return { error: "Invalid cost price." };
    }
    if (unitCost.lt(0)) return { error: "Cost cannot be negative." };
  }

  await prisma.catalogProduct.update({
    where: { id },
    data: {
      brandId,
      brand,
      name,
      description,
      warehouseQty: Math.floor(warehouseQty),
      unitPrice,
      unitCost,
    },
  });

  await logActivity({
    type: "CATALOG_UPDATE",
    title: `Updated ${brand} ${name}`,
    actorUserId: user.id,
  });

  revalidateCatalog();
  return { success: true };
}

export async function updateShopCreditAction(formData: FormData) {
  const user = await requireOwner();
  if (!user) return { error: "Unauthorized." };

  const shopId = String(formData.get("shopId") ?? "");
  const creditRaw = String(formData.get("creditLimit") ?? "");
  if (!shopId || !creditRaw) return { error: "Missing fields." };

  let creditLimit: Prisma.Decimal;
  try {
    creditLimit = new Prisma.Decimal(creditRaw);
  } catch {
    return { error: "Invalid amount." };
  }

  await prisma.shop.update({
    where: { id: shopId },
    data: { creditLimit },
  });

  revalidatePath("/owner/shops");
  revalidatePath("/owner/dashboard");
  return { success: true };
}
