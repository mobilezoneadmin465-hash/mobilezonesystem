import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { catalogProductInclude, toCatalogProductDTO } from "@/lib/catalog-dto";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { SrOfficeClient } from "@/components/sr/SrOfficeClient";

export default async function SrOfficePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SR") redirect("/login");

  const [mine, office] = await Promise.all([
    prisma.srInventory.findMany({
      where: { srId: session.user.id, quantity: { gt: 0 } },
      include: { product: { include: catalogProductInclude } },
    }),
    prisma.officeInventory.findMany({
      where: { quantity: { gt: 0 } },
      include: { product: { include: catalogProductInclude } },
    }),
  ]);

  const mineDto = mine.map((row) => ({
    id: row.id,
    productId: row.productId,
    quantity: row.quantity,
    product: toCatalogProductDTO(row.product),
  }));
  const officeDto = office.map((row) => ({
    id: row.id,
    productId: row.productId,
    quantity: row.quantity,
    product: toCatalogProductDTO(row.product),
  }));

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-semibold text-white">Office</h1>
      <SrOfficeClient mine={mineDto} office={officeDto} />
    </div>
  );
}
