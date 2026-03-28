import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { catalogProductInclude, toCatalogProductDTO } from "@/lib/catalog-dto";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { SrWarehouseClient } from "@/components/sr/SrWarehouseClient";

export default async function SrWarehousePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SR") redirect("/login");

  const products = await prisma.catalogProduct.findMany({
    where: { warehouseQty: { gt: 0 } },
    orderBy: [{ brand: "asc" }, { name: "asc" }],
    include: catalogProductInclude,
  });
  const dto = products.map(toCatalogProductDTO);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-white">Warehouse</h1>
      {products.length === 0 ? (
        <p className="text-sm text-zinc-500">No stock.</p>
      ) : (
        <SrWarehouseClient products={dto} />
      )}
    </div>
  );
}
