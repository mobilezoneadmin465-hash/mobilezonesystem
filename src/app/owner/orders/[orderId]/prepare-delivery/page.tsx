import { getServerSession } from "next-auth";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { OwnerPrepareDeliveryForm } from "@/components/owner/OwnerPrepareDeliveryForm";

type Props = { params: Promise<{ orderId: string }> };

export default async function OwnerPrepareDeliveryPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "OWNER") redirect("/login");

  const { orderId } = await params;

  const [order, srs] = await Promise.all([
    prisma.shopOrder.findFirst({
      where: { id: orderId, status: "OWNER_ACCEPTED" },
      include: {
        shop: { select: { id: true, name: true, phone: true, address: true, ownerName: true } },
        lines: { include: { product: { select: { id: true, brand: true, name: true } } } },
      },
    }),
    prisma.user.findMany({
      where: { role: "SR" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, approvedAt: true, role: true },
    }),
  ]);

  if (!order) notFound();

  const approvedSrs = srs.filter((sr) => Boolean((sr as unknown as { approvedAt: Date | null }).approvedAt));
  const agents = [{ id: session.user.id, name: session.user.name ?? "Owner" }, ...approvedSrs.map((sr) => ({ id: sr.id, name: sr.name }))];

  const lines = order.lines.map((l) => ({
    orderLineId: l.id,
    productId: l.productId,
    brand: l.product.brand,
    name: l.product.name,
    quantity: l.quantity,
    unitPrice: l.unitPrice.toString(),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight text-white">Prepare delivery</h1>
        <Link href="/owner/orders" className="app-btn-secondary py-2.5 text-xs">
          ← Back
        </Link>
      </div>

      <OwnerPrepareDeliveryForm orderId={order.id} lines={lines} agents={agents} />
    </div>
  );
}

