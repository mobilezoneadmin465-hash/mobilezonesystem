import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/finance";
import {
  OwnerOverviewCards,
  type OverviewDetailPayload,
  type OverviewTotals,
} from "@/components/owner/OwnerOverviewCards";
import { getT } from "@/lib/i18n/server";

function lineTotal(qty: number, unit: Prisma.Decimal) {
  return new Prisma.Decimal(unit).mul(qty);
}

export default async function OwnerDashboardPage() {
  const t = await getT();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [
    products,
    officeRows,
    srs,
    pendingPayments,
    todayPayments,
    pendingDeliveries,
    activeOrdersRaw,
  ] = await Promise.all([
    prisma.catalogProduct.findMany({ orderBy: [{ brand: "asc" }, { name: "asc" }] }),
    prisma.officeInventory.findMany({
      where: { quantity: { gt: 0 } },
      include: { product: true },
      orderBy: { product: { brand: "asc" } },
    }),
    prisma.user.findMany({
      where: { role: "SR" },
      orderBy: { name: "asc" },
      include: { srInventory: { where: { quantity: { gt: 0 } }, include: { product: true } } },
    }),
    prisma.payment.findMany({
      where: { status: "PENDING_OWNER" },
      orderBy: { createdAt: "asc" },
      include: { shop: true, collectedBySR: true, submittedBy: true },
    }),
    prisma.payment.findMany({
      where: {
        status: "CONFIRMED",
        createdAt: { gte: startOfDay },
      },
      orderBy: { createdAt: "desc" },
      include: { shop: true, collectedBySR: true, submittedBy: true },
    }),
    prisma.shopDelivery.findMany({
      where: { status: "PENDING_RETAIL" },
      orderBy: { createdAt: "desc" },
      include: { shop: true, sr: true, lines: { include: { product: true } } },
    }),
    prisma.shopOrder.findMany({
      where: { status: { in: ["OPEN", "ASSIGNED"] } },
      orderBy: { createdAt: "desc" },
      include: { shop: true, assignedSr: true, lines: { include: { product: true } } },
    }),
  ]);

  const approvedSrs = srs.filter((sr) => {
    const approvedAt = (sr as unknown as { approvedAt: Date | null }).approvedAt;
    return Boolean(approvedAt);
  });

  let warehouseValue = new Prisma.Decimal(0);
  for (const p of products) {
    warehouseValue = warehouseValue.add(lineTotal(p.warehouseQty, p.unitPrice));
  }

  let officeValue = new Prisma.Decimal(0);
  for (const r of officeRows) {
    officeValue = officeValue.add(lineTotal(r.quantity, r.product.unitPrice));
  }

  let onRepsValue = new Prisma.Decimal(0);
  for (const sr of approvedSrs) {
    for (const row of sr.srInventory) {
      onRepsValue = onRepsValue.add(lineTotal(row.quantity, row.product.unitPrice));
    }
  }

  const warehouseLines = products
    .filter((p) => p.warehouseQty > 0)
    .map((p) => {
      const lt = lineTotal(p.warehouseQty, p.unitPrice);
      return {
        brand: p.brand,
        name: p.name,
        qty: p.warehouseQty,
        unitPrice: p.unitPrice.toString(),
        lineTotal: formatMoney(lt),
      };
    });

  const officeLines = officeRows.map((r) => {
    const lt = lineTotal(r.quantity, r.product.unitPrice);
    return {
      brand: r.product.brand,
      name: r.product.name,
      qty: r.quantity,
      unitPrice: r.product.unitPrice.toString(),
      lineTotal: formatMoney(lt),
    };
  });

  const salesRepsDetail = approvedSrs.map((sr) => {
    let total = new Prisma.Decimal(0);
    const lines = sr.srInventory.map((row) => {
      const lt = lineTotal(row.quantity, row.product.unitPrice);
      total = total.add(lt);
      return {
        brand: row.product.brand,
        name: row.product.name,
        qty: row.quantity,
        unitPrice: row.product.unitPrice.toString(),
        lineTotal: formatMoney(lt),
      };
    });
    return {
      srId: sr.id,
      srName: sr.name,
      totalValue: formatMoney(total),
      lines,
    };
  });

  const paymentsTodayDetail = todayPayments.map((p) => ({
    id: p.id,
    shopName: p.shop.name,
    amount: formatMoney(p.amount),
    method: p.method,
    createdAt: p.createdAt.toISOString(),
    subtitle:
      p.method === "CASH_SR" && p.collectedBySR
        ? `SR: ${p.collectedBySR.name}`
        : p.method === "PROOF_BANK" && p.submittedBy
          ? `Submitted: ${p.submittedBy.name}`
          : undefined,
  }));

  const awaitingDetail = pendingPayments.map((p) => ({
    id: p.id,
    shopName: p.shop.name,
    amount: formatMoney(p.amount),
    method: p.method,
    createdAt: p.createdAt.toISOString(),
    subtitle:
      p.method === "CASH_SR" && p.collectedBySR
        ? `SR: ${p.collectedBySR.name}`
        : p.method === "PROOF_BANK" && p.submittedBy
          ? `Submitted: ${p.submittedBy.name}`
          : undefined,
  }));

  const shipmentsDetail = pendingDeliveries.map((d) => ({
    id: d.id,
    shopName: d.shop.name,
    srName: d.sr.name,
    createdAt: d.createdAt.toISOString(),
    lines: d.lines.map((l) => {
      const lt = lineTotal(l.quantity, l.unitPrice);
      return {
        brand: l.product.brand,
        name: l.product.name,
        qty: l.quantity,
        unitPrice: l.unitPrice.toString(),
        lineTotal: formatMoney(lt),
      };
    }),
  }));

  const activeOrdersDetail = activeOrdersRaw.map((o) => {
    let total = new Prisma.Decimal(0);
    for (const l of o.lines) {
      total = total.add(lineTotal(l.quantity, l.unitPrice));
    }
    return {
      id: o.id,
      shopName: o.shop.name,
      status: o.status,
      srName: o.assignedSr?.name ?? null,
      createdAt: o.createdAt.toISOString(),
      total: formatMoney(total),
      lines: o.lines.map((l) => {
        const lt = lineTotal(l.quantity, l.unitPrice);
        return {
          brand: l.product.brand,
          name: l.product.name,
          qty: l.quantity,
          unitPrice: l.unitPrice.toString(),
          lineTotal: formatMoney(lt),
        };
      }),
    };
  });

  const detail: OverviewDetailPayload = {
    warehouse: warehouseLines,
    office: officeLines,
    salesReps: salesRepsDetail,
    paymentsToday: paymentsTodayDetail,
    awaitingApproval: awaitingDetail,
    shipments: shipmentsDetail,
    activeOrders: activeOrdersDetail,
  };

  const totals: OverviewTotals = {
    warehouseValue: formatMoney(warehouseValue),
    officeValue: formatMoney(officeValue),
    salesRepsValue: formatMoney(onRepsValue),
    paymentsToday: formatMoney(
      todayPayments.reduce((s, p) => s.add(p.amount), new Prisma.Decimal(0))
    ),
    awaitingApprovalCount: pendingPayments.length,
    shipmentsPending: pendingDeliveries.length,
    activeOrdersCount: activeOrdersRaw.length,
  };

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">{t("owner.dashboard.overview")}</h1>
      <OwnerOverviewCards totals={totals} detail={detail} />
    </div>
  );
}
