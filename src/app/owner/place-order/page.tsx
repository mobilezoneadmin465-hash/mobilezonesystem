import { Suspense } from "react";
import { catalogProductInclude, toCatalogProductDTO } from "@/lib/catalog-dto";
import { prisma } from "@/lib/prisma";
import { StorefrontCart } from "@/components/shop/StorefrontCart";
import { getT } from "@/lib/i18n/server";

function CartFallback() {
  return <div className="h-96 animate-pulse rounded-2xl bg-zinc-900/80" aria-hidden />;
}

export default async function OwnerPlaceOrderPage() {
  const t = await getT();
  const [products, shops] = await Promise.all([
    prisma.catalogProduct.findMany({
      orderBy: [{ brand: "asc" }, { name: "asc" }],
      include: catalogProductInclude,
    }),
    prisma.shop.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const productsDto = products.map(toCatalogProductDTO);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-white">{t("owner.placeOrder.title")}</h1>

      <Suspense fallback={<CartFallback />}>
        <StorefrontCart products={productsDto} mode="owner" shops={shops} />
      </Suspense>
    </div>
  );
}
