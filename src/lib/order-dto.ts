export type ShopOrderLineDTO = {
  id: string;
  productId: string;
  brand: string;
  name: string;
  quantity: number;
  deliveredQty: number;
  unitPrice: string;
};

export type ShopOrderListDTO = {
  id: string;
  shopId: string;
  shopName: string;
  status: string;
  note: string | null;
  ownerNote: string | null;
  retailConfirmedAt: string | null;
  createdAt: string;
  assignedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  placedByName: string | null;
  assignedSrId: string | null;
  assignedSrName: string | null;
  fulfilledBySrId: string | null;
  fulfilledSrName: string | null;
  lines: ShopOrderLineDTO[];
};

/** Use after prisma.shopOrder.findMany({ include: fullOrderInclude }) */
export const fullOrderInclude = {
  shop: { select: { id: true, name: true } },
  placedBy: { select: { name: true } },
  assignedSr: { select: { id: true, name: true } },
  fulfilledBy: { select: { id: true, name: true } },
  lines: { include: { product: { select: { id: true, brand: true, name: true } } } },
} as const;

/** Units ordered vs already delivered (for SR / owner progress UI). */
export function orderDeliveryProgress(lines: ShopOrderLineDTO[]) {
  const ordered = lines.reduce((s, l) => s + l.quantity, 0);
  const delivered = lines.reduce((s, l) => s + Math.min(l.deliveredQty, l.quantity), 0);
  const linesComplete = lines.filter((l) => l.deliveredQty >= l.quantity).length;
  const pct = ordered > 0 ? Math.round((delivered / ordered) * 100) : 0;
  return { ordered, delivered, linesComplete, lineCount: lines.length, pct };
}

export function toShopOrderListDTO(
  o: {
    id: string;
    shopId: string;
    status: string;
    note: string | null;
    ownerNote: string | null;
    retailConfirmedAt: Date | null;
    createdAt: Date;
    assignedAt: Date | null;
    completedAt: Date | null;
    cancelledAt: Date | null;
    assignedSrId: string | null;
    fulfilledBySrId: string | null;
    shop: { name: string };
    placedBy: { name: string } | null;
    assignedSr: { id: string; name: string } | null;
    fulfilledBy: { id: string; name: string } | null;
    lines: Array<{
      id: string;
      productId: string;
      quantity: number;
      deliveredQty: number;
      unitPrice: { toString(): string };
      product: { brand: string; name: string };
    }>;
  }
): ShopOrderListDTO {
  return {
    id: o.id,
    shopId: o.shopId,
    shopName: o.shop.name,
    status: o.status,
    note: o.note,
    ownerNote: o.ownerNote,
    retailConfirmedAt: o.retailConfirmedAt?.toISOString() ?? null,
    createdAt: o.createdAt.toISOString(),
    assignedAt: o.assignedAt?.toISOString() ?? null,
    completedAt: o.completedAt?.toISOString() ?? null,
    cancelledAt: o.cancelledAt?.toISOString() ?? null,
    placedByName: o.placedBy?.name ?? null,
    assignedSrId: o.assignedSrId,
    assignedSrName: o.assignedSr?.name ?? null,
    fulfilledBySrId: o.fulfilledBySrId,
    fulfilledSrName: o.fulfilledBy?.name ?? null,
    lines: o.lines.map((l) => ({
      id: l.id,
      productId: l.productId,
      brand: l.product.brand,
      name: l.product.name,
      quantity: l.quantity,
      deliveredQty: l.deliveredQty,
      unitPrice: l.unitPrice.toString(),
    })),
  };
}
