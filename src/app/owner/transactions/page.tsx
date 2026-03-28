import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/finance";
import { getT } from "@/lib/i18n/server";

export default async function OwnerTransactionsPage() {
  const t = await getT();
  const events = await prisma.activityEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { actor: true, shop: true },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-white">{t("owner.transactions.pageTitle")}</h1>
      <ul className="space-y-2">
        {events.map((e) => (
          <li key={e.id} className="app-card text-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium text-white">{e.title}</p>
                {e.detail ? <p className="text-xs text-zinc-500">{e.detail}</p> : null}
                <p className="mt-1 text-xs text-zinc-600">
                  {e.actor.name}
                  {e.shop ? ` · ${e.shop.name}` : ""}
                </p>
              </div>
              <div className="text-right">
                {e.amount ? <p className="font-semibold text-teal-300">{formatMoney(e.amount)}</p> : null}
                <p className="text-xs text-zinc-600">{e.createdAt.toLocaleString()}</p>
                <p className="text-[10px] uppercase tracking-wide text-zinc-600">{e.type}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>
      {events.length === 0 ? <p className="text-sm text-zinc-500">{t("owner.transactions.noEvents")}</p> : null}
    </div>
  );
}
