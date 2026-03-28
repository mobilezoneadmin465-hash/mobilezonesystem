import Link from "next/link";
import { OwnerAddStoreButton } from "@/components/owner/OwnerAddStoreButton";
import { formatMoney, getShopDue } from "@/lib/finance";
import { prisma } from "@/lib/prisma";
import { getT } from "@/lib/i18n/server";

export default async function OwnerShopsPage() {
  const t = await getT();
  const shops = await prisma.shop.findMany({ orderBy: { name: "asc" } });

  const rows = await Promise.all(
    shops.map(async (s) => ({
      shop: s,
      due: Number(await getShopDue(s.id)),
    }))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-white">{t("owner.shops.title")}</h1>
        <OwnerAddStoreButton />
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500">{t("owner.shops.noStores")}</p>
      ) : (
        <div className="scrollbar-hide overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950/40 shadow-inner">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/90">
                <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  {t("owner.shops.tableStore")}
                </th>
                <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  {t("owner.shops.tableContact")}
                </th>
                <th className="px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  {t("owner.shops.tableDue")}
                </th>
                <th className="px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  {t("owner.shops.tableCreditLimit")}
                </th>
                <th className="w-32 px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  {t("owner.shops.tableAction")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/90">
              {rows.map(({ shop: s, due }) => {
                const over = due > Number(s.creditLimit);
                return (
                  <tr key={s.id} className="transition-colors hover:bg-zinc-900/50">
                    <td className="px-4 py-4 align-middle">
                      <p className="text-base font-semibold text-white">{s.name}</p>
                    </td>
                    <td className="px-4 py-4 align-middle">
                      <p className="text-sm text-zinc-300">{s.ownerName}</p>
                      <p className="mt-0.5 font-mono text-xs text-zinc-500">{s.phone}</p>
                    </td>
                    <td className="px-4 py-4 align-middle text-right">
                      <p
                        className={`text-xl font-semibold tabular-nums tracking-tight ${over ? "text-red-400" : "text-teal-300"}`}
                      >
                        {formatMoney(due)}
                      </p>
                      {over ? (
                        <p className="mt-1 text-xs font-medium text-red-400/80">{t("owner.shops.over")}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-4 align-middle text-right">
                      <p className="text-lg font-medium tabular-nums tracking-tight text-zinc-200">
                        {formatMoney(s.creditLimit)}
                      </p>
                    </td>
                    <td className="px-4 py-4 align-middle">
                      <Link
                        href={`/owner/shops/${s.id}`}
                        className="app-btn inline-flex w-full justify-center py-2.5 text-center text-sm sm:w-auto sm:min-w-[5.5rem]"
                      >
                        {t("owner.shops.openStore")}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
