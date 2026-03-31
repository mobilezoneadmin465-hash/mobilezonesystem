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
  try {
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
  } catch (e) {
    // Activity log should never break core flows (common after DB resets while JWT still holds old user id).
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") {
      return;
    }
    throw e;
  }
}
