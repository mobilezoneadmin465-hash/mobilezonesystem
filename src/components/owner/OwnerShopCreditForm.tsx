"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import type { ShopCreditDTO } from "@/lib/shop-dto";
import { formatMoney } from "@/lib/finance";
import { updateShopCreditAction } from "@/server/actions/catalog";
import { useLanguage } from "@/components/LanguageContext";

export function OwnerShopCreditForm({
  shop,
  due,
}: {
  shop: ShopCreditDTO;
  due: number;
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setErr(null);
    start(async () => {
      const r = await updateShopCreditAction(fd);
      if (r && "error" in r && r.error) setErr(r.error);
      else router.refresh();
    });
  }

  const over = due > Number(shop.creditLimit);

  return (
    <li className="app-card space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-lg font-semibold text-white">{shop.name}</p>
          <p className="text-sm text-zinc-400">{shop.ownerName}</p>
          <p className="text-xs text-zinc-600">{shop.phone}</p>
          <p className="mt-1 text-xs text-zinc-500">{shop.address}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-zinc-500">Due now</p>
          <p className={`text-xl font-semibold ${over ? "text-red-400" : "text-teal-300"}`}>{formatMoney(due)}</p>
          <p className="text-xs text-zinc-500">Limit {formatMoney(shop.creditLimit)}</p>
        </div>
      </div>
      <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2 border-t border-zinc-800 pt-4">
        <input type="hidden" name="shopId" value={shop.id} />
        <label className="text-xs text-zinc-500">
          {t("owner.shopCredit.creditLimitField")}
          <input
            name="creditLimit"
            type="text"
            defaultValue={shop.creditLimit}
            className="app-input mt-1 w-40"
          />
        </label>
        <button type="submit" disabled={pending} className="app-btn-secondary py-2 text-sm disabled:opacity-50">
          {t("owner.shopCredit.save")}
        </button>
      </form>
      {err ? <p className="text-sm text-red-400">{err}</p> : null}
    </li>
  );
}
