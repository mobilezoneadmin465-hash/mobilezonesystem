import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function logActivity(params: {
  type: string;
  title: string;
  detail?: string | null;
  amount?: Prisma.Decimal | null;
  actorUserId: string;
  shopId?: string | null;
}) {
  await prisma.activityEvent.create({
    data: {
      type: params.type,
      title: params.title,
      detail: params.detail ?? null,
      amount: params.amount ?? null,
      actorUserId: params.actorUserId,
      shopId: params.shopId ?? null,
    },
  });
}
