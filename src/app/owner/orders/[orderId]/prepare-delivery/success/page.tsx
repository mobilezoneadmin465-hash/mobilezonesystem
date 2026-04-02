import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DeliveryReceipt } from "@/components/receipts/DeliveryReceipt";

type Props = {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ deliveryId?: string }>;
};

export default async function OwnerPrepareDeliverySuccessPage({ params, searchParams }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "OWNER") redirect("/login");

  const { orderId } = await params;
  const sp = await searchParams;
  const deliveryId = sp.deliveryId;
  if (!deliveryId) redirect(`/owner/orders/${orderId}`);

  const [delivery, ownerUser, order] = await Promise.all([
    prisma.shopDelivery.findUnique({
      where: { id: deliveryId },
      include: { shop: true, sr: true, lines: { include: { product: true } }, order: true },
    }),
    prisma.user.findFirst({ where: { role: "OWNER" } }),
    prisma.shopOrder.findUnique({ where: { id: orderId }, include: { lines: true } }),
  ]);

  if (!delivery || !order || delivery.orderId !== order.id) redirect(`/owner/orders/${orderId}`);
  if (!ownerUser) redirect(`/owner/orders/${orderId}`);

  const showImeisInReceipt = delivery.status === "CONFIRMED_WITH_IMEIS";

  const imeis = showImeisInReceipt
    ? await prisma.productImei.findMany({
        where: { deliveryId },
        orderBy: { createdAt: "asc" },
        select: { productId: true, imei: true },
      })
    : [];

  const imeisByProduct = imeis.reduce((acc, r) => {
    acc[r.productId] = acc[r.productId] ?? [];
    acc[r.productId].push(r.imei);
    return acc;
  }, {} as Record<string, string[]>);

  const receiptLines = delivery.lines
    .map((l) => ({
      productId: l.productId,
      brand: l.product.brand,
      name: l.product.name,
      quantity: l.quantity,
      unitPrice: l.unitPrice.toString(),
    }))
    .sort((a, b) => a.productId.localeCompare(b.productId));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-white">Delivery confirmed</h1>

      <DeliveryReceipt
        receiptType="dealer"
        orderId={orderId}
        deliveryId={deliveryId}
        confirmedAt={delivery.confirmedAt?.toISOString() ?? delivery.createdAt.toISOString()}
        dealerName={ownerUser.name}
        deliveryAgentName={delivery.sr.name}
        shop={{ name: delivery.shop.name, ownerName: delivery.shop.ownerName, phone: delivery.shop.phone, address: delivery.shop.address }}
        lines={receiptLines}
        showImeisInReceipt={showImeisInReceipt}
        imeisByProduct={imeisByProduct}
      />

      <div className="flex flex-wrap gap-2">
        <a href="/owner/orders" className="app-btn-secondary py-2.5 text-sm">
          Back to orders
        </a>
      </div>
    </div>
  );
}

