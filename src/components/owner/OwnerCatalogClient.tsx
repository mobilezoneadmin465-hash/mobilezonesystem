"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { BrandDTO, OwnerCatalogProductDTO } from "@/lib/catalog-dto";
import { createBrandAction, deleteBrandAction } from "@/server/actions/brand";
import { createProductAction, updateProductAction } from "@/server/actions/catalog";
import { formatMoney } from "@/lib/finance";

type Props = {
  initial: OwnerCatalogProductDTO[];
  brands: BrandDTO[];
};

export function OwnerCatalogClient({ initial, brands }: Props) {
  const router = useRouter();
  const [brandsOpen, setBrandsOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const grouped = useMemo(() => {
    const m = new Map<string, OwnerCatalogProductDTO[]>();
    for (const p of initial) {
      const key = p.brand || "—";
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(p);
    }
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [initial]);

  const productCountByBrandId = useMemo(() => {
    const c = new Map<string, number>();
    for (const p of initial) {
      if (p.brandId) c.set(p.brandId, (c.get(p.brandId) ?? 0) + 1);
    }
    return c;
  }, [initial]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setBrandsOpen(true)} className="app-btn-secondary py-2.5 text-sm">
            Brands
          </button>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            disabled={brands.length === 0}
            title={brands.length === 0 ? "Add at least one brand first" : undefined}
            className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-teal-500/60 bg-teal-600/20 text-xl font-bold text-teal-300 transition hover:bg-teal-600/40 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Add product"
          >
            +
          </button>
        </div>
        {brands.length === 0 ? (
          <p className="text-xs text-amber-200/80">Open Brands and add your first brand before adding products.</p>
        ) : null}
      </div>

      {brandsOpen ? (
        <BrandsModal
          brands={brands}
          productCountByBrandId={productCountByBrandId}
          onClose={() => setBrandsOpen(false)}
          onChanged={() => router.refresh()}
        />
      ) : null}

      {addOpen ? (
        <AddProductModal brands={brands} onClose={() => setAddOpen(false)} onCreated={() => router.refresh()} />
      ) : null}

      <div className="space-y-6">
        <h2 className="text-sm font-semibold text-zinc-400">Warehouse catalogue</h2>
        {grouped.length === 0 ? (
          <p className="text-sm text-zinc-500">No products.</p>
        ) : (
          grouped.map(([brandName, rows]) => (
            <section key={brandName} className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-teal-500/90">{brandName}</h3>
              <ul className="space-y-3">
                {rows.map((p) => (
                  <CatalogRow key={p.id} product={p} brands={brands} onSaved={() => router.refresh()} />
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </div>
  );
}

function BrandsModal({
  brands,
  productCountByBrandId,
  onClose,
  onChanged,
}: {
  brands: BrandDTO[];
  productCountByBrandId: Map<string, number>;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function run(fd: FormData, action: (fd: FormData) => Promise<{ error?: string }>) {
    setErr(null);
    start(async () => {
      const r = await action(fd);
      if (r?.error) setErr(r.error);
      else onChanged();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 bg-black/70" aria-label="Close" onClick={onClose} />
      <div className="relative flex max-h-[min(88vh,640px)] w-full max-w-md flex-col rounded-t-2xl border border-zinc-700 bg-zinc-900 shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <h2 className="text-lg font-semibold text-white">Brands</h2>
          <button type="button" onClick={onClose} className="text-sm text-zinc-400 hover:text-white">
            Close
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {err ? <p className="mb-3 text-sm text-red-400">{err}</p> : null}
          <ul className="space-y-2">
            {brands.map((b) => {
              const n = productCountByBrandId.get(b.id) ?? 0;
              const canDelete = n === 0;
              return (
                <li
                  key={b.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2"
                >
                  <span className="text-sm text-white">{b.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500">{n} sku{n === 1 ? "" : "s"}</span>
                    {canDelete ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          const fd = new FormData();
                          fd.set("id", b.id);
                          run(fd, deleteBrandAction);
                        }}
                        className="text-xs text-red-400 hover:underline disabled:opacity-50"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
          {brands.length === 0 ? <p className="text-sm text-zinc-500">No brands yet. Add one below.</p> : null}
          <form
            className="mt-6 space-y-3 border-t border-zinc-800 pt-4"
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const fd = new FormData(form);
              setErr(null);
              start(async () => {
                const r = await createBrandAction(fd);
                if (r?.error) setErr(r.error);
                else {
                  form.reset();
                  onChanged();
                }
              });
            }}
          >
            <label className="block text-xs text-zinc-500">
              New brand name
              <input name="name" required className="app-input mt-1" placeholder="Samsung" />
            </label>
            <button type="submit" disabled={pending} className="app-btn w-full text-sm disabled:opacity-50">
              {pending ? "Adding…" : "Add brand"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function AddProductModal({
  brands,
  onClose,
  onCreated,
}: {
  brands: BrandDTO[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 bg-black/70" aria-label="Close" onClick={onClose} />
      <div className="relative flex max-h-[min(92vh,720px)] w-full max-w-md flex-col rounded-t-2xl border border-zinc-700 bg-zinc-900 shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <h2 className="text-lg font-semibold text-white">Add product</h2>
          <button type="button" onClick={onClose} className="text-sm text-zinc-400 hover:text-white">
            Close
          </button>
        </div>
        <form
          className="flex-1 overflow-y-auto px-4 py-4"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const fd = new FormData(form);
            setErr(null);
            start(async () => {
              const r = await createProductAction(fd);
              if (r && "error" in r && r.error) setErr(r.error);
              else {
                form.reset();
                onClose();
                onCreated();
              }
            });
          }}
        >
          {err ? <p className="mb-3 text-sm text-red-400">{err}</p> : null}
          <div className="space-y-4">
            <label className="block text-xs text-zinc-500">
              Brand
              <select name="brandId" required className="app-input mt-1">
                <option value="">Select…</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs text-zinc-500">
              Model name
              <input name="name" required className="app-input mt-1" placeholder="Galaxy A55" />
            </label>
            <label className="block text-xs text-zinc-500">
              Note (optional)
              <input name="description" className="app-input mt-1" />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs text-zinc-500">
                Warehouse pieces
                <input name="warehouseQty" type="number" min={0} defaultValue={0} required className="app-input mt-1" />
              </label>
              <label className="text-xs text-zinc-500">
                Unit price (BDT)
                <input name="unitPrice" type="text" required className="app-input mt-1" placeholder="35000" />
              </label>
              <label className="text-xs text-zinc-500 sm:col-span-2">
                Cost price (BDT, optional)
                <input name="unitCost" type="text" className="app-input mt-1" placeholder="31000 — for profit analytics" />
              </label>
            </div>
          </div>
          <button type="submit" disabled={pending} className="app-btn mt-6 w-full disabled:opacity-50">
            {pending ? "Saving…" : "Add to warehouse"}
          </button>
        </form>
      </div>
    </div>
  );
}

function CatalogRow({
  product: p,
  brands,
  onSaved,
}: {
  product: OwnerCatalogProductDTO;
  brands: BrandDTO[];
  onSaved: () => void;
}) {
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, start] = useTransition();
  const [useLegacyBrand, setUseLegacyBrand] = useState(!p.brandId);

  function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setErr(null);
    setOk(false);
    start(async () => {
      const r = await updateProductAction(fd);
      if (r && "error" in r && r.error) setErr(r.error);
      else {
        setOk(true);
        onSaved();
      }
    });
  }

  return (
    <li className="app-card space-y-3">
      <form onSubmit={save} className="space-y-3">
        <input type="hidden" name="id" value={p.id} />
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-medium text-white">
              {p.brand} {p.name}
            </p>
            <p className="text-xs text-zinc-500">
              Sell {formatMoney(p.unitPrice)}
              {Number(p.unitCost) > 0 ? (
                <span className="text-zinc-600"> · Cost {formatMoney(p.unitCost)}</span>
              ) : null}
            </p>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="text-xs text-zinc-500">
            Brand
            <select
              name="brandId"
              defaultValue={p.brandId ?? ""}
              className="app-input mt-1"
              onChange={(e) => setUseLegacyBrand(e.target.value === "")}
            >
              <option value="">Other (type name)</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          {useLegacyBrand ? (
            <label className="text-xs text-zinc-500">
              Brand name
              <input name="brand" defaultValue={p.brand} required className="app-input mt-1" />
            </label>
          ) : null}
          <label className="text-xs text-zinc-500">
            Model name
            <input name="name" defaultValue={p.name} required className="app-input mt-1" />
          </label>
          <label className="text-xs text-zinc-500">
            Price (BDT)
            <input name="unitPrice" defaultValue={p.unitPrice} required className="app-input mt-1" />
          </label>
          <label className="text-xs text-zinc-500">
            Cost (BDT)
            <input name="unitCost" defaultValue={p.unitCost} className="app-input mt-1" placeholder="0" />
          </label>
        </div>
        <label className="text-xs text-zinc-500">
          Warehouse count
          <input name="warehouseQty" type="number" min={0} defaultValue={p.warehouseQty} required className="app-input mt-1" />
        </label>
        <label className="text-xs text-zinc-500">
          Note
          <input name="description" defaultValue={p.description ?? ""} className="app-input mt-1" />
        </label>
        {!useLegacyBrand ? <input type="hidden" name="brand" value="" /> : null}
        {err ? <p className="text-sm text-red-400">{err}</p> : null}
        {ok ? <p className="text-sm text-teal-400">Saved.</p> : null}
        <button type="submit" disabled={pending} className="app-btn-secondary text-sm disabled:opacity-50">
          {pending ? "Saving…" : "Update"}
        </button>
      </form>
    </li>
  );
}
