"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { parseImeis, syncProductWarehouseQty } from "@/lib/imei-stock";
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
  const unitPriceRaw = String(formData.get("unitPrice") ?? "");
  const unitCostRaw = String(formData.get("unitCost") ?? "").trim();

  if (!brandId || !name || !unitPriceRaw) return { error: "Choose a brand, model name, and price." };

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
      warehouseQty: 0,
      unitPrice,
      unitCost,
    },
  });

  await logActivity({
    type: "CATALOG_CREATE",
    title: `Added ${br.name} ${name}`,
    detail: `Catalog item @ ${unitPrice.toString()}`,
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
  const unitPriceRaw = String(formData.get("unitPrice") ?? "");
  const unitCostRaw = String(formData.get("unitCost") ?? "").trim();

  if (!id || !name || !unitPriceRaw) return { error: "Missing fields." };

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

export async function addProductStockAction(formData: FormData) {
  const user = await requireOwner();
  if (!user) return { error: "Unauthorized." };

  const productId = String(formData.get("productId") ?? "");
  const rawImeis = String(formData.get("imeis") ?? "");
  if (!productId) return { error: "Missing product." };

  const imeis = parseImeis(rawImeis);
  if (!imeis.length) return { error: "Scan or enter at least one IMEI." };

  const product = await prisma.catalogProduct.findUnique({ where: { id: productId } });
  if (!product) return { error: "Product not found." };

  try {
    await prisma.$transaction(async (tx) => {
      for (const imei of imeis) {
        await tx.productImei.create({
          data: {
            productId,
            imei,
            location: "WAREHOUSE",
          },
        });
      }
      await syncProductWarehouseQty(tx, productId);
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not add stock.";
    if (msg.toLowerCase().includes("unique")) return { error: "One of those IMEIs already exists." };
    return { error: msg };
  }

  await logActivity({
    type: "WAREHOUSE_IN",
    title: `Added stock for ${product.brand} ${product.name}`,
    detail: `${imeis.length} IMEI${imeis.length === 1 ? "" : "s"}`,
    actorUserId: user.id,
  });

  revalidateCatalog();
  revalidatePath("/sr/warehouse");
  revalidatePath("/owner/team");
  return { success: true, count: imeis.length };
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
