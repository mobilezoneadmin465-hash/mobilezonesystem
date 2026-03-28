import { OwnerProofQueue } from "@/components/owner/OwnerProofQueue";
import { prisma } from "@/lib/prisma";
import { getT } from "@/lib/i18n/server";

export default async function OwnerPaymentsQueuePage() {
  const t = await getT();
  const rows = await prisma.payment.findMany({
    where: { status: "PENDING_OWNER" },
    orderBy: { createdAt: "asc" },
    include: { shop: true, collectedBySR: true, submittedBy: true, receivedBy: { select: { name: true, role: true } } },
  });

  const items = rows.map((r) => ({
    id: r.id,
    amount: Number(r.amount),
    method: r.method,
    note: r.note,
    proofNote: r.proofNote,
    proofImageBase64: r.proofImageBase64,
    createdAt: r.createdAt.toISOString(),
    shop: { name: r.shop.name },
    collectedBySR: r.collectedBySR ? { name: r.collectedBySR.name } : null,
    submittedBy: r.submittedBy ? { name: r.submittedBy.name } : null,
    receivedBy: r.receivedBy ? { name: r.receivedBy.name, role: r.receivedBy.role } : null,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">{t("owner.payments.title")}</h1>
      <OwnerProofQueue items={items} />
    </div>
  );
}
