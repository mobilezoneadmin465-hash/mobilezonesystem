"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import type { CatalogProductDTO } from "@/lib/catalog-dto";
import { sendToOfficeAction, takeFromOfficeAction } from "@/server/actions/stock";

type InvRowDTO = {
  id: string;
  productId: string;
  quantity: number;
  product: CatalogProductDTO;
};

export function SrOfficeClient({ mine, office }: { mine: InvRowDTO[]; office: InvRowDTO[] }) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submitToOffice(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setErr(null);
    start(async () => {
      const r = await sendToOfficeAction(fd);
      if (r && "error" in r && r.error) setErr(r.error);
      else {
        form.reset();
        router.refresh();
      }
    });
  }

  function submitFromOffice(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setErr(null);
    start(async () => {
      const r = await takeFromOfficeAction(fd);
      if (r && "error" in r && r.error) setErr(r.error);
      else {
        form.reset();
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-10">
      {err ? <p className="text-sm text-red-400">{err}</p> : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-teal-400">On you → office</h2>
        <ul className="space-y-2">
          {mine.map((row) => (
            <li key={row.id} className="app-card flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-medium text-white">
                  {row.product.brand} {row.product.name}
                </p>
                <p className="text-xs text-zinc-500">You have {row.quantity}</p>
              </div>
              <form onSubmit={submitToOffice} className="flex items-end gap-2">
                <input type="hidden" name="productId" value={row.productId} />
                <label className="text-xs text-zinc-500">
                  Qty
                  <input
                    name="quantity"
                    type="number"
                    min={1}
                    max={row.quantity}
                    defaultValue={row.quantity}
                    className="app-input mt-1 w-20 py-2"
                  />
                </label>
                <button type="submit" disabled={pending} className="app-btn-secondary py-2 text-sm disabled:opacity-50">
                  Deliver to office
                </button>
              </form>
            </li>
          ))}
        </ul>
        {mine.length === 0 ? <p className="text-sm text-zinc-500">You are not holding stock.</p> : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-sky-400">Office → you</h2>
        <ul className="space-y-2">
          {office.map((row) => (
            <li key={row.id} className="app-card flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-medium text-white">
                  {row.product.brand} {row.product.name}
                </p>
                <p className="text-xs text-zinc-500">At office: {row.quantity}</p>
              </div>
              <form onSubmit={submitFromOffice} className="flex items-end gap-2">
                <input type="hidden" name="productId" value={row.productId} />
                <label className="text-xs text-zinc-500">
                  Qty
                  <input
                    name="quantity"
                    type="number"
                    min={1}
                    max={row.quantity}
                    defaultValue={1}
                    className="app-input mt-1 w-20 py-2"
                  />
                </label>
                <button type="submit" disabled={pending} className="app-btn py-2 text-sm disabled:opacity-50">
                  Take for run
                </button>
              </form>
            </li>
          ))}
        </ul>
        {office.length === 0 ? <p className="text-sm text-zinc-500">Office buffer is empty.</p> : null}
      </section>
    </div>
  );
}
