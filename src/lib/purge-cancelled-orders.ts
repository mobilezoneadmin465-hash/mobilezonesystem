import { prisma } from "@/lib/prisma";

const MS_DAY = 24 * 60 * 60 * 1000;

/** Permanently remove cancelled orders (and lines) after 24h — deliveries must already be reversed on cancel. */
export async function purgeExpiredCancelledOrders(): Promise<{ deleted: number }> {
  const cutoff = new Date(Date.now() - MS_DAY);
  const result = await prisma.shopOrder.deleteMany({
    where: {
      status: "CANCELLED",
      cancelledAt: { lte: cutoff },
    },
  });
  return { deleted: result.count };
}
