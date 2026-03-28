"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import type { CatalogProductDTO } from "@/lib/catalog-dto";
import { formatMoney } from "@/lib/finance";
import { takeFromWarehouseAction } from "@/server/actions/stock";

export function SrWarehouseClient({ products }: { products: CatalogProductDTO[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setError(null);
    start(async () => {
      const r = await takeFromWarehouseAction(fd);
      if (r && "error" in r && r.error) setError(r.error);
      else {
        form.reset();
        router.refresh();
      }
    });
  }

  return (
    <>
      {error ? <p className="mb-3 text-sm text-red-400">{error}</p> : null}
      <ul className="space-y-3">
        {products.map((p) => (
          <li key={p.id} className="app-card flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-medium text-white">
                {p.brand} {p.name}
              </p>
              <p className="text-xs text-zinc-500">
                In godown: {p.warehouseQty} · {formatMoney(p.unitPrice)} each
              </p>
            </div>
            <form onSubmit={onSubmit} className="flex items-end gap-2">
              <input type="hidden" name="productId" value={p.id} />
              <label className="text-xs text-zinc-500">
                Qty
                <input
                  name="quantity"
                  type="number"
                  min={1}
                  max={p.warehouseQty}
                  defaultValue={1}
                  className="app-input mt-1 w-24 py-2"
                />
              </label>
              <button type="submit" disabled={pending} className="app-btn py-2 text-sm disabled:opacity-50">
                Take
              </button>
            </form>
          </li>
        ))}
      </ul>
    </>
  );
}
