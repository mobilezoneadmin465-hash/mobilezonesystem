import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { catalogProductInclude, toCatalogProductDTO } from "@/lib/catalog-dto";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { StorefrontCart } from "@/components/shop/StorefrontCart";
import { getT } from "@/lib/i18n/server";

function CartFallback() {
  return <div className="h-96 animate-pulse rounded-2xl bg-zinc-900/80" aria-hidden />;
}

export default async function RetailPlaceOrderPage() {
  const t = await getT();
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "RETAIL" || !session.user.shopId) redirect("/login");

  const products = await prisma.catalogProduct.findMany({
    orderBy: [{ brand: "asc" }, { name: "asc" }],
    include: catalogProductInclude,
  });
  const productsDto = products.map(toCatalogProductDTO);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-white">{t("retail.placeOrder.title")}</h1>

      <Suspense fallback={<CartFallback />}>
        <StorefrontCart products={productsDto} mode="retail" />
      </Suspense>
    </div>
  );
}
