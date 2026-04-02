import { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

export const UNSPECIFIED_IMEI_PREFIX = "UNSPECIFIED_IMEI_";

export function isUnspecifiedImei(imei: string) {
  return imei.startsWith(UNSPECIFIED_IMEI_PREFIX);
}

export function normalizeImei(raw: string): string {
  return raw.replace(/\D/g, "").trim();
}

export function parseImeis(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(/[\s,;\r\n]+/)) {
    const imei = normalizeImei(part);
    if (!imei) continue;
    if (imei.length < 8) continue;
    if (seen.has(imei)) continue;
    seen.add(imei);
    out.push(imei);
  }
  return out;
}

export async function syncProductWarehouseQty(tx: Tx, productId: string) {
  const count = await tx.productImei.count({
    where: { productId, location: "WAREHOUSE" },
  });
  await tx.catalogProduct.update({
    where: { id: productId },
    data: { warehouseQty: count },
  });
}

export async function syncOfficeQty(tx: Tx, productId: string) {
  const count = await tx.productImei.count({
    where: { productId, location: "OFFICE" },
  });
  await tx.officeInventory.upsert({
    where: { productId },
    create: { productId, quantity: count },
    update: { quantity: count },
  });
}

export async function syncSrQty(tx: Tx, srId: string, productId: string) {
  const count = await tx.productImei.count({
    where: { productId, location: "SR", srId },
  });
  await tx.srInventory.upsert({
    where: { srId_productId: { srId, productId } },
    create: { srId, productId, quantity: count },
    update: { quantity: count },
  });
}

export async function moveImeis(
  tx: Tx,
  opts: {
    productId: string;
    quantity: number;
    fromLocation: string;
    toLocation: string;
    fromSrId?: string | null;
    toSrId?: string | null;
    toShopId?: string | null;
    toDeliveryId?: string | null;
  },
) {
  const available = await tx.productImei.count({
    where: {
      productId: opts.productId,
      location: opts.fromLocation,
      srId: opts.fromSrId ?? null,
    },
  });
  if (available === 0) return false;
  if (available < opts.quantity) {
    throw new Error("Not enough scanned stock for this product.");
  }

  const rows = await tx.productImei.findMany({
    where: {
      productId: opts.productId,
      location: opts.fromLocation,
      srId: opts.fromSrId ?? null,
    },
    orderBy: { createdAt: "asc" },
    take: opts.quantity,
    select: { id: true },
  });
  await tx.productImei.updateMany({
    where: { id: { in: rows.map((r) => r.id) } },
    data: {
      location: opts.toLocation,
      srId: opts.toSrId ?? null,
      shopId: opts.toShopId ?? null,
      deliveryId: opts.toDeliveryId ?? null,
    },
  });
  return true;
}
