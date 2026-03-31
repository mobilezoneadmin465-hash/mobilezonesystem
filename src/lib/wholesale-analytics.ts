import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type WholesaleAnalyticsRange = "7d" | "30d" | "all";

export function parseAnalyticsRange(raw: string | undefined): WholesaleAnalyticsRange {
  if (raw === "7d" || raw === "30d" || raw === "all") return raw;
  return "30d";
}

export function rangeStartDate(range: WholesaleAnalyticsRange): Date | undefined {
  if (range === "all") return undefined;
  const d = new Date();
  if (range === "7d") d.setDate(d.getDate() - 7);
  else d.setDate(d.getDate() - 30);
  d.setHours(0, 0, 0, 0);
  return d;
}

function productLabel(
  p: { brand: string; name: string; brandRel?: { name: string } | null },
): string {
  const b = p.brandRel?.name ?? p.brand;
  return `${b} ${p.name}`;
}

function brandLabel(p: { brand: string; brandRel?: { name: string } | null }): string {
  const b = p.brandRel?.name ?? p.brand;
  return b.trim() ? b : "—";
}

const completedOrderInclude = {
  shop: true,
  assignedSr: true,
  fulfilledBy: true,
  lines: {
    include: {
      product: { include: { brandRel: true } },
    },
  },
} as const;

export type WholesaleAnalyticsSnapshot = {
  range: WholesaleAnalyticsRange;
  rangeDescription: string;
  completedOrders: number;
  unitsSold: number;
  revenue: string;
  cogs: string;
  grossProfit: string;
  marginPercent: number | null;
  avgOrderValue: string;
  cashCollected: string;
  pipelineOrders: number;
  pipelineValue: string;
  inventoryUnits: number;
  inventoryAtCost: string;
  inventoryAtRetail: string;
  topByQuantity: { productId: string; label: string; quantity: number; revenue: string; profit: string }[];
  topByRevenue: { productId: string; label: string; quantity: number; revenue: string; profit: string }[];
  topShops: { shopId: string; name: string; revenue: string; orders: number; units: number }[];
  topBrands: { name: string; revenue: string; profit: string; units: number }[];
  topReps: { name: string; revenue: string; orders: number }[];
  lowStock: { label: string; qty: number }[];
};

export async function computeWholesaleAnalytics(
  range: WholesaleAnalyticsRange,
): Promise<WholesaleAnalyticsSnapshot> {
  const start = rangeStartDate(range);
  const rangeDescription =
    range === "all" ? "All time" : range === "7d" ? "Last 7 days" : "Last 30 days";

  const [completedRaw, pipelineRaw, payments, catalog] = await Promise.all([
    prisma.shopOrder.findMany({
      where: {
        status: "COMPLETED",
        ...(start ? { completedAt: { gte: start } } : {}),
      },
      include: completedOrderInclude,
    }),
    prisma.shopOrder.findMany({
      where: { status: { in: ["OPEN", "ASSIGNED"] } },
      include: completedOrderInclude,
    }),
    prisma.payment.findMany({
      where: {
        status: "CONFIRMED",
        ...(start
          ? {
              OR: [
                { reviewedAt: { gte: start } },
                { AND: [{ reviewedAt: null }, { createdAt: { gte: start } }] },
              ],
            }
          : {}),
      },
    }),
    prisma.catalogProduct.findMany({
      include: { brandRel: true },
    }),
  ]);

  let revenue = new Prisma.Decimal(0);
  let cogs = new Prisma.Decimal(0);
  let unitsSold = 0;

  type Agg = { qty: number; revenue: Prisma.Decimal; profit: Prisma.Decimal };
  const byProduct = new Map<string, { label: string } & Agg>();
  const byShop = new Map<string, { name: string; revenue: Prisma.Decimal; orders: number; units: number }>();
  const byBrand = new Map<string, { revenue: Prisma.Decimal; profit: Prisma.Decimal; units: number }>();
  const byRep = new Map<string, { name: string; revenue: Prisma.Decimal; orders: number }>();

  for (const order of completedRaw) {
    const srKey = order.fulfilledBySrId ?? order.assignedSrId;
    const srName = order.fulfilledBy?.name ?? order.assignedSr?.name ?? null;
    if (srKey && srName) {
      if (!byRep.has(srKey)) {
        byRep.set(srKey, { name: srName, revenue: new Prisma.Decimal(0), orders: 0 });
      }
      byRep.get(srKey)!.orders += 1;
    }

    const shopKey = order.shopId;
    let shopRow = byShop.get(shopKey);
    if (!shopRow) {
      shopRow = {
        name: order.shop.name,
        revenue: new Prisma.Decimal(0),
        orders: 0,
        units: 0,
      };
      byShop.set(shopKey, shopRow);
    }
    shopRow.orders += 1;

    for (const line of order.lines) {
      const p = line.product;
      const lineRev = new Prisma.Decimal(line.unitPrice).mul(line.quantity);
      const unitCost = new Prisma.Decimal(line.unitCost);
      const lineCogs = unitCost.mul(line.quantity);
      const lineProfit = lineRev.minus(lineCogs);

      revenue = revenue.add(lineRev);
      cogs = cogs.add(lineCogs);
      unitsSold += line.quantity;

      shopRow.revenue = shopRow.revenue.add(lineRev);
      shopRow.units += line.quantity;

      if (srKey && byRep.has(srKey)) {
        byRep.get(srKey)!.revenue = byRep.get(srKey)!.revenue.add(lineRev);
      }

      const plabel = productLabel(p);
      const pid = p.id;
      const prev = byProduct.get(pid) ?? {
        label: plabel,
        qty: 0,
        revenue: new Prisma.Decimal(0),
        profit: new Prisma.Decimal(0),
      };
      prev.qty += line.quantity;
      prev.revenue = prev.revenue.add(lineRev);
      prev.profit = prev.profit.add(lineProfit);
      byProduct.set(pid, prev);

      const bname = brandLabel(p);
      const bPrev = byBrand.get(bname) ?? {
        revenue: new Prisma.Decimal(0),
        profit: new Prisma.Decimal(0),
        units: 0,
      };
      bPrev.revenue = bPrev.revenue.add(lineRev);
      bPrev.profit = bPrev.profit.add(lineProfit);
      bPrev.units += line.quantity;
      byBrand.set(bname, bPrev);
    }
  }

  const grossProfit = revenue.minus(cogs);
  const marginPercent =
    revenue.gt(0) ? Number(grossProfit.div(revenue).mul(100)) : null;
  const n = completedRaw.length;
  const avgOrderValue = n > 0 ? revenue.div(n) : new Prisma.Decimal(0);

  let cashCollected = new Prisma.Decimal(0);
  for (const pay of payments) {
    cashCollected = cashCollected.add(pay.amount);
  }

  let pipelineValue = new Prisma.Decimal(0);
  for (const order of pipelineRaw) {
    for (const line of order.lines) {
      pipelineValue = pipelineValue.add(new Prisma.Decimal(line.unitPrice).mul(line.quantity));
    }
  }

  let inventoryAtCost = new Prisma.Decimal(0);
  let inventoryAtRetail = new Prisma.Decimal(0);
  let inventoryUnits = 0;
  for (const p of catalog) {
    inventoryUnits += p.warehouseQty;
    inventoryAtCost = inventoryAtCost.add(new Prisma.Decimal(p.unitCost).mul(p.warehouseQty));
    inventoryAtRetail = inventoryAtRetail.add(new Prisma.Decimal(p.unitPrice).mul(p.warehouseQty));
  }

  const productRows = [...byProduct.entries()]
    .map(([productId, r]) => ({ productId, ...r }))
    .sort((a, b) => b.qty - a.qty);
  const topByQuantity = productRows.slice(0, 8).map((r) => ({
    productId: r.productId,
    label: r.label,
    quantity: r.qty,
    revenue: r.revenue.toString(),
    profit: r.profit.toString(),
  }));
  const topByRevenue = [...byProduct.entries()]
    .map(([productId, r]) => ({ productId, ...r }))
    .sort((a, b) => (b.revenue.gt(a.revenue) ? 1 : b.revenue.lt(a.revenue) ? -1 : 0))
    .slice(0, 8)
    .map((r) => ({
      productId: r.productId,
      label: r.label,
      quantity: r.qty,
      revenue: r.revenue.toString(),
      profit: r.profit.toString(),
    }));

  const topShops = [...byShop.entries()]
    .map(([shopId, r]) => ({ shopId, ...r }))
    .sort((a, b) => (b.revenue.gt(a.revenue) ? 1 : b.revenue.lt(a.revenue) ? -1 : 0))
    .slice(0, 8)
    .map((r) => ({
      shopId: r.shopId,
      name: r.name,
      revenue: r.revenue.toString(),
      orders: r.orders,
      units: r.units,
    }));

  const topBrands = [...byBrand.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => (b.revenue.gt(a.revenue) ? 1 : b.revenue.lt(a.revenue) ? -1 : 0))
    .slice(0, 8)
    .map((r) => ({
      name: r.name,
      revenue: r.revenue.toString(),
      profit: r.profit.toString(),
      units: r.units,
    }));

  const topReps = [...byRep.values()]
    .sort((a, b) => (b.revenue.gt(a.revenue) ? 1 : b.revenue.lt(a.revenue) ? -1 : 0))
    .slice(0, 8)
    .map((r) => ({
      name: r.name,
      revenue: r.revenue.toString(),
      orders: r.orders,
    }));

  const lowStock = catalog
    .filter((p) => p.warehouseQty > 0 && p.warehouseQty <= 5)
    .sort((a, b) => a.warehouseQty - b.warehouseQty)
    .slice(0, 10)
    .map((p) => ({ label: productLabel(p), qty: p.warehouseQty }));

  return {
    range,
    rangeDescription,
    completedOrders: completedRaw.length,
    unitsSold,
    revenue: revenue.toString(),
    cogs: cogs.toString(),
    grossProfit: grossProfit.toString(),
    marginPercent,
    avgOrderValue: avgOrderValue.toString(),
    cashCollected: cashCollected.toString(),
    pipelineOrders: pipelineRaw.length,
    pipelineValue: pipelineValue.toString(),
    inventoryUnits,
    inventoryAtCost: inventoryAtCost.toString(),
    inventoryAtRetail: inventoryAtRetail.toString(),
    topByQuantity,
    topByRevenue,
    topShops,
    topBrands,
    topReps,
    lowStock,
  };
}
