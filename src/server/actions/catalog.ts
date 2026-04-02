"use server";

import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UNSPECIFIED_IMEI_PREFIX, parseImeis, syncProductWarehouseQty } from "@/lib/imei-stock";
import { logActivity } from "@/lib/activity";
import { prisma } from "@/lib/prisma";

function revalidateCatalog() {
  revalidatePath("/owner/catalog");
  revalidatePath("/owner/catalog/ledger");
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
  const rawQuantity = String(formData.get("quantity") ?? "").trim();
  if (!productId) return { error: "Missing product." };

  const imeis = parseImeis(rawImeis);

  let quantity: number | null = null;
  if (rawQuantity) {
    const n = Number(rawQuantity);
    if (!Number.isFinite(n) || n < 1 || !Number.isInteger(n)) return { error: "Invalid quantity." };
    quantity = n;
  }

  if (!quantity) {
    if (!imeis.length) return { error: "Add at least one IMEI or specify quantity." };
    quantity = imeis.length;
  }

  if (imeis.length > quantity) return { error: "IMEI count cannot exceed quantity." };
  const placeholdersCount = quantity - imeis.length;

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
      for (let i = 0; i < placeholdersCount; i++) {
        await tx.productImei.create({
          data: {
            productId,
            // Stored as UNIQUE placeholder string in DB (since `imei` column is unique),
            // but displayed as "unspecified imei" in the ledger.
            imei: `${UNSPECIFIED_IMEI_PREFIX}${productId}_${Date.now()}_${i}_${randomUUID()}`,
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
    detail:
      placeholdersCount > 0
        ? `${quantity} units (${imeis.length} scanned IMEI${imeis.length === 1 ? "" : "s"}, ${placeholdersCount} unspecified)`
        : `${imeis.length} IMEI${imeis.length === 1 ? "" : "s"}`,
    actorUserId: user.id,
  });

  revalidateCatalog();
  revalidatePath("/sr/warehouse");
  revalidatePath("/owner/team");
  return { success: true, count: quantity };
}

export async function resolveUnspecifiedImeisAction(formData: FormData) {
  const user = await requireOwner();
  if (!user) return { error: "Unauthorized." };

  const placeholderIdsRaw = String(formData.get("placeholderIds") ?? "");
  if (!placeholderIdsRaw) return { error: "Missing placeholder IDs." };

  let placeholderIds: string[];
  try {
    const parsed = JSON.parse(placeholderIdsRaw) as unknown;
    placeholderIds = Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return { error: "Invalid placeholder IDs." };
  }
  if (!placeholderIds.length) return { error: "Missing placeholder IDs." };

  const rawImeis = String(formData.get("imeis") ?? "");
  const imeis = parseImeis(rawImeis);
  if (!imeis.length) return { error: "Enter at least one IMEI." };
  if (imeis.length > placeholderIds.length) {
    return { error: `You have ${placeholderIds.length} unspecified IMEIs, but entered ${imeis.length}.` };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const placeholders = await tx.productImei.findMany({
        where: { id: { in: placeholderIds } },
        select: { id: true, imei: true },
        orderBy: { createdAt: "asc" },
      });

      if (placeholders.length !== placeholderIds.length) {
        throw new Error("Some placeholder rows were not found.");
      }

      for (const p of placeholders) {
        if (!p.imei.startsWith(UNSPECIFIED_IMEI_PREFIX)) {
          throw new Error("Some selected IMEIs are already resolved.");
        }
      }

      for (let i = 0; i < imeis.length; i++) {
        await tx.productImei.update({
          where: { id: placeholders[i].id },
          data: { imei: imeis[i] },
        });
      }
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not resolve IMEIs.";
    if (msg.toLowerCase().includes("unique")) return { error: "One of those IMEIs already exists." };
    return { error: msg };
  }

  await logActivity({
    type: "IMEI_RESOLVE",
    title: `Resolved IMEIs`,
    detail: `Updated ${imeis.length} IMEI${imeis.length === 1 ? "" : "s"}`,
    actorUserId: user.id,
  });

  revalidatePath("/owner/catalog/ledger");
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
