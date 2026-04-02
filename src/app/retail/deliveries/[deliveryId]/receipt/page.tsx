import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DeliveryReceipt } from "@/components/receipts/DeliveryReceipt";

type Props = { params: Promise<{ deliveryId: string }> };

export default async function RetailDeliveryReceiptPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "RETAIL" || !session.user.shopId) redirect("/login");

  const { deliveryId } = await params;

  const [delivery, ownerUser] = await Promise.all([
    prisma.shopDelivery.findUnique({
      where: { id: deliveryId },
      include: { shop: true, sr: true, lines: { include: { product: true } } },
    }),
    prisma.user.findFirst({ where: { role: "OWNER" } }),
  ]);

  if (!delivery || !ownerUser) redirect("/retail/deliveries");
  if (delivery.shopId !== session.user.shopId) redirect("/retail/deliveries");

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

  const receiptLines = delivery.lines.map((l) => ({
    productId: l.productId,
    brand: l.product.brand,
    name: l.product.name,
    quantity: l.quantity,
    unitPrice: l.unitPrice.toString(),
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-white">Receipt</h1>
      <DeliveryReceipt
        receiptType="retailer"
        orderId={delivery.orderId ?? "—"}
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
        <a href="/retail/deliveries" className="app-btn-secondary py-2.5 text-sm">
          Back to deliveries
        </a>
      </div>
    </div>
  );
}

