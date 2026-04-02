import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { isUnspecifiedImei } from "@/lib/imei-stock";
import { OwnerImeiLedgerClient } from "@/components/owner/OwnerImeiLedgerClient";

export default async function OwnerImeiLedgerPage() {
  const imeis = await prisma.$queryRaw<
    Array<{
      id: string;
      imeiActual: string;
      location: string;
      srId: string | null;
      shopId: string | null;
      createdAt: Date;
      updatedAt: Date;
      brand: string;
      brandRelName: string | null;
      model: string;
      unitPrice: string;
      unitCost: string;
      unitMrp: string;
    }>
  >`
    SELECT
      pi."id" AS "id",
      pi."imei" AS "imeiActual",
      pi."location" AS "location",
      pi."srId" AS "srId",
      pi."shopId" AS "shopId",
      pi."createdAt" AS "createdAt",
      pi."updatedAt" AS "updatedAt",
      cp."brand" AS "brand",
      br."name" AS "brandRelName",
      cp."name" AS "model",
      cp."unitPrice"::text AS "unitPrice",
      cp."unitCost"::text AS "unitCost",
      cp."unitMrp"::text AS "unitMrp"
    FROM "ProductImei" pi
    INNER JOIN "CatalogProduct" cp ON cp."id" = pi."productId"
    LEFT JOIN "Brand" br ON br."id" = cp."brandId"
    ORDER BY cp."brand" ASC, cp."name" ASC, pi."createdAt" DESC
  `;

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
    brand: row.brandRelName ?? row.brand,
    model: row.model,
    imeiActual: row.imeiActual,
    imei: isUnspecifiedImei(row.imeiActual) ? "unspecified imei" : row.imeiActual,
    isPlaceholder: isUnspecifiedImei(row.imeiActual),
    status:
      row.location === "DELIVERED"
        ? ("SOLD" as const)
        : row.location === "PENDING_RETAIL"
          ? ("IN_TRANSIT" as const)
          : ("IN_STOCK" as const),
    location: row.location.replace(/_/g, " "),
    rpPrice: row.unitPrice,
    dpPrice: row.unitCost,
    mrpPrice: row.unitMrp,
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
