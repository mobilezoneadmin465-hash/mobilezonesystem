import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getDefaultCashRecipientForShop } from "@/lib/cash-holdings";
import { getShopDue } from "@/lib/finance";
import { prisma } from "@/lib/prisma";
import { RetailPayForms } from "@/components/retail/RetailPayForms";
import { getT } from "@/lib/i18n/server";

export default async function RetailPayPage() {
  const t = await getT();
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "RETAIL" || !session.user.shopId) {
    redirect("/login");
  }

  const shopId = session.user.shopId;

  const [due, payees, defaultRecipientId] = await Promise.all([
    getShopDue(shopId),
    prisma.user.findMany({
      where: { role: { in: ["SR", "OWNER"] } },
      orderBy: [{ role: "asc" }, { name: "asc" }],
      select: { id: true, name: true, role: true },
    }),
    getDefaultCashRecipientForShop(shopId),
  ]);

  const payeeOptions = payees.map((p) => ({
    id: p.id,
    name: p.name,
    role: p.role as "OWNER" | "SR",
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-white">{t("retail.pay.title")}</h1>
      <RetailPayForms
        dueAmount={due.toString()}
        cashPayees={payeeOptions}
        defaultCashRecipientId={defaultRecipientId}
      />
    </div>
  );
}
