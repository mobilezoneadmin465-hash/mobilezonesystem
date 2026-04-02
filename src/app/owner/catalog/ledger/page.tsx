import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { isUnspecifiedImei } from "@/lib/imei-stock";
import { OwnerImeiLedgerClient } from "@/components/owner/OwnerImeiLedgerClient";

export default async function OwnerImeiLedgerPage() {
  const imeis = await prisma.productImei.findMany({
    include: {
      product: { include: { brandRel: true } },
    },
    orderBy: [{ product: { brand: "asc" } }, { product: { name: "asc" } }, { createdAt: "desc" }],
  });

  const srIds = Array.from(new Set(imeis.map((r) => r.srId).filter((v): v is string => Boolean(v))));
  const shopIds = Array.from(new Set(imeis.map((r) => r.shopId).filter((v): v is string => Boolean(v))));

  const [srs, shops] = await Promise.all([
    srIds.length ? prisma.user.findMany({ where: { id: { in: srIds } }, select: { id: true, name: true } }) : [],
    shopIds.length ? prisma.shop.findMany({ where: { id: { in: shopIds } }, select: { id: true, name: true } }) : [],
  ]);

  const srMap = new Map(srs.map((r) => [r.id, r.name]));
  const shopMap = new Map(shops.map((s) => [s.id, s.name]));

  const rows = imeis.map((row) => ({
    id: row.id,
    brand: row.product.brandRel?.name ?? row.product.brand,
    model: row.product.name,
    imeiActual: row.imei,
    imei: isUnspecifiedImei(row.imei) ? "unspecified imei" : row.imei,
    isPlaceholder: isUnspecifiedImei(row.imei),
    status:
      row.location === "DELIVERED"
        ? ("SOLD" as const)
        : row.location === "PENDING_RETAIL"
          ? ("IN_TRANSIT" as const)
          : ("IN_STOCK" as const),
    location: row.location.replace(/_/g, " "),
    sellPrice: row.product.unitPrice.toString(),
    costPrice: row.product.unitCost.toString(),
    addedAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    srName: row.srId ? srMap.get(row.srId) ?? null : null,
    shopName: row.shopId ? shopMap.get(row.shopId) ?? null : null,
  }));

  const brands = Array.from(new Set(rows.map((r) => r.brand))).sort((a, b) => a.localeCompare(b));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">IMEI ledger</h1>
          <p className="text-sm text-zinc-500">Phone-by-phone stock register.</p>
        </div>
        <Link href="/owner/catalog" className="app-btn-secondary py-2.5 text-sm">
          Back to stock
        </Link>
      </div>
      <OwnerImeiLedgerClient rows={rows} brands={brands} />
    </div>
  );
}
