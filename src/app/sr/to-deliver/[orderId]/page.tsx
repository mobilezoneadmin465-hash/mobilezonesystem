import { getServerSession } from "next-auth";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { formatMoney } from "@/lib/finance";
import {
  fullOrderInclude,
  orderDeliveryProgress,
  toShopOrderListDTO,
} from "@/lib/order-dto";
import { prisma } from "@/lib/prisma";
import { SrToDeliverOrderForm } from "@/components/sr/SrToDeliverOrderForm";

type Props = { params: Promise<{ orderId: string }> };

function lineTotal(lines: { quantity: number; unitPrice: string }[]) {
  return lines.reduce((s, l) => s + Number(l.unitPrice) * l.quantity, 0);
}

export default async function SrToDeliverOrderPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SR") redirect("/login");

  const { orderId } = await params;

  const row = await prisma.shopOrder.findFirst({
    where: { id: orderId, assignedSrId: session.user.id },
    include: fullOrderInclude,
  });

  if (!row) notFound();

  const order = toShopOrderListDTO(row);
  const prog = orderDeliveryProgress(order.lines);

  const inventory = await prisma.srInventory.findMany({
    where: { srId: session.user.id, quantity: { gt: 0 } },
    select: { productId: true, quantity: true },
  });

  const allLinesDone = order.lines.every((l) => l.deliveredQty >= l.quantity);
  const showForm = order.status === "ASSIGNED" && !allLinesDone;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/sr/to-deliver" className="text-sm text-sky-400 hover:underline">
          ← To deliver
        </Link>
      </div>

      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-white">{order.shopName}</h1>
        <p className="text-sm text-zinc-500">
          Order total {formatMoney(lineTotal(order.lines))} · {prog.delivered}/{prog.ordered} units delivered
        </p>
        <p className="text-xs uppercase tracking-wide text-teal-500/90">{order.status}</p>
      </header>

      {order.note ? <p className="text-sm text-zinc-400">{order.note}</p> : null}
      {order.ownerNote ? <p className="text-sm text-amber-200/80">{order.ownerNote}</p> : null}

      {order.status === "COMPLETED" || allLinesDone ? (
        <p className="app-card text-sm text-emerald-400/90">All lines delivered. Order is complete.</p>
      ) : showForm ? (
        <SrToDeliverOrderForm order={order} inventory={inventory} />
      ) : (
        <p className="app-card text-sm text-zinc-500">
          This order isn&apos;t assigned for delivery right now (unassigned, cancelled, or on hold).
        </p>
      )}
    </div>
  );
}
