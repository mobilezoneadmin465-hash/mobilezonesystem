"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { BrandDTO, OwnerCatalogProductDTO } from "@/lib/catalog-dto";
import { createBrandAction, deleteBrandAction } from "@/server/actions/brand";
import { addProductStockAction, createProductAction, updateProductAction } from "@/server/actions/catalog";
import { formatMoney } from "@/lib/finance";

type Props = {
  initial: OwnerCatalogProductDTO[];
  brands: BrandDTO[];
};

export function OwnerCatalogClient({ initial, brands }: Props) {
  const router = useRouter();
  const [brandsOpen, setBrandsOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const totalUnits = useMemo(() => initial.reduce((sum, p) => sum + p.warehouseQty, 0), [initial]);
  const stockAtSell = useMemo(
    () =>
      initial.reduce(
        (sum, p) => sum + Number(p.unitPrice || "0") * p.warehouseQty,
        0,
      ),
    [initial],
  );
  const stockAtCost = useMemo(
    () =>
      initial.reduce(
        (sum, p) => sum + Number(p.unitCost || "0") * p.warehouseQty,
        0,
      ),
    [initial],
  );

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
      <section className="grid gap-3 sm:grid-cols-3">
        <div className="app-card">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Units in stock</p>
          <p className="mt-2 text-2xl font-semibold text-white">{totalUnits}</p>
        </div>
        <div className="app-card">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Current stock at sell price</p>
          <p className="mt-2 text-2xl font-semibold text-teal-300">{formatMoney(stockAtSell)}</p>
        </div>
        <div className="app-card">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Current stock at cost</p>
          <p className="mt-2 text-2xl font-semibold text-white">{formatMoney(stockAtCost)}</p>
        </div>
      </section>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-sm text-zinc-300">
        Price edits change <span className="font-medium text-white">current stock value</span> and
        <span className="font-medium text-white"> future orders</span>. Old revenue and old profit stay on the
        original order prices.
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Link href="/owner/catalog/ledger" className="app-btn-secondary py-2.5 text-sm">
            IMEI ledger
          </Link>
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
        <h2 className="text-sm font-semibold text-zinc-400">Current catalogue</h2>
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
      <div className="fixed inset-0 z-50 flex items-end justify-center pb-[96px] sm:items-center sm:p-4" role="dialog" aria-modal="true">
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
    <div className="fixed inset-0 z-50 flex items-end justify-center pb-[96px] sm:items-center sm:p-4" role="dialog" aria-modal="true">
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
                Sell price now (BDT)
                <input name="unitPrice" type="text" required className="app-input mt-1" placeholder="35000" />
              </label>
              <label className="text-xs text-zinc-500">
                Cost price now (BDT, optional)
                <input name="unitCost" type="text" className="app-input mt-1" placeholder="31000" />
              </label>
            </div>
          </div>
          <button type="submit" disabled={pending} className="app-btn mt-6 w-full disabled:opacity-50">
            {pending ? "Saving…" : "Create product"}
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
  const [stockOpen, setStockOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  return (
    <li className="app-card space-y-3">
      {stockOpen ? (
        <AddStockModal
          product={p}
          onClose={() => setStockOpen(false)}
          onDone={() => {
            setStockOpen(false);
            onSaved();
          }}
        />
      ) : null}
      {editOpen ? (
        <EditProductModal
          product={p}
          brands={brands}
          onClose={() => setEditOpen(false)}
          onDone={() => {
            setEditOpen(false);
            onSaved();
          }}
        />
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-white">
            {p.brand} {p.name}
          </p>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500">
            <span>{p.warehouseQty} in stock</span>
            <span>Sell {formatMoney(p.unitPrice)}</span>
            {Number(p.unitCost) > 0 ? <span>Cost {formatMoney(p.unitCost)}</span> : null}
          </div>
          {p.description ? <p className="mt-2 text-sm text-zinc-400">{p.description}</p> : null}
        </div>
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={() => setEditOpen(true)} className="app-btn-secondary py-2 text-xs sm:text-sm">
            Edit
          </button>
          <button type="button" onClick={() => setStockOpen(true)} className="app-btn py-2 text-xs sm:text-sm">
            Add stock
          </button>
        </div>
      </div>
    </li>
  );
}

function EditProductModal({
  product: p,
  brands,
  onClose,
  onDone,
}: {
  product: OwnerCatalogProductDTO;
  brands: BrandDTO[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [useLegacyBrand, setUseLegacyBrand] = useState(!p.brandId);

  function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setErr(null);
    start(async () => {
      const r = await updateProductAction(fd);
      if (r && "error" in r && r.error) setErr(r.error);
      else onDone();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center pb-[96px] sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 bg-black/70" aria-label="Close" onClick={onClose} />
      <div className="relative flex max-h-[min(92vh,720px)] w-full max-w-md flex-col rounded-t-2xl border border-zinc-700 bg-zinc-900 shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <h2 className="text-lg font-semibold text-white">Edit product</h2>
          <button type="button" onClick={onClose} className="text-sm text-zinc-400 hover:text-white">
            Close
          </button>
        </div>
        <form onSubmit={save} className="flex-1 overflow-y-auto px-4 py-4">
          <input type="hidden" name="id" value={p.id} />
          {err ? <p className="mb-3 text-sm text-red-400">{err}</p> : null}
          <div className="space-y-4">
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
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs text-zinc-500">
                New sell price (BDT)
                <input name="unitPrice" defaultValue={p.unitPrice} required className="app-input mt-1" />
              </label>
              <label className="text-xs text-zinc-500">
                New cost price (BDT)
                <input name="unitCost" defaultValue={p.unitCost} className="app-input mt-1" placeholder="0" />
              </label>
            </div>
            <label className="text-xs text-zinc-500">
              Note
              <input name="description" defaultValue={p.description ?? ""} className="app-input mt-1" />
            </label>
          </div>
          {!useLegacyBrand ? <input type="hidden" name="brand" value="" /> : null}
          <button type="submit" disabled={pending} className="app-btn mt-6 w-full disabled:opacity-50">
            {pending ? "Saving…" : "Save changes"}
          </button>
        </form>
      </div>
    </div>
  );
}

function AddStockModal({
  product,
  onClose,
  onDone,
}: {
  product: OwnerCatalogProductDTO;
  onClose: () => void;
  onDone: () => void;
}) {
  const [mode, setMode] = useState<"scanner" | "camera" | "manual">("scanner");
  const [input, setInput] = useState("");
  const [list, setList] = useState<string[]>([]);
  const [quantity, setQuantity] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);
  const [cameraStatus, setCameraStatus] = useState<string>("Ready");
  const [pending, start] = useTransition();

  // Lock background scroll while this bottom-sheet modal is open.
  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, []);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastScanRef = useRef<Map<string, number>>(new Map());
  const zxingControlsRef = useRef<{ stop: () => void } | null>(null);
  const scannerBufferRef = useRef("");
  const scannerTimerRef = useRef<number | null>(null);

  function normalize(raw: string) {
    return raw.replace(/\D/g, "").trim();
  }

  const addOne = useCallback((raw: string) => {
    const imei = normalize(raw);
    if (!imei) return;
    if (imei.length < 8) {
      setErr("Invalid IMEI.");
      return;
    }
    let added = false;
    setList((prev) => {
      if (prev.includes(imei)) return prev;
      added = true;
      return [...prev, imei];
    });
    setErr(added ? null : "Already scanned.");
  }, []);

  useEffect(() => {
    if (mode !== "camera") return;

    let cancelled = false;

    async function startCamera() {
      if (!window.isSecureContext) {
        setErr("Phone camera needs HTTPS or localhost. Open this app on a secure URL.");
        setCameraStatus("HTTPS required");
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setErr("This browser cannot access the camera here.");
        setCameraStatus("Camera unavailable");
        return;
      }

      try {
        setErr(null);
        setCameraStatus("Starting camera…");
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
        if (cancelled) {
          for (const track of stream.getTracks()) track.stop();
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        const onDecoded = (raw: string) => {
          const value = raw.trim();
          if (!value) return;
          const now = Date.now();
          const last = lastScanRef.current.get(value) ?? 0;
          if (now - last < 1200) return;
          lastScanRef.current.set(value, now);
          addOne(value);
        };
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();
        setCameraStatus("Point the camera at the barcode");
        const controls = await reader.decodeFromVideoDevice(undefined, video, (result) => {
          if (result?.getText()) onDecoded(result.getText());
        });
        zxingControlsRef.current = controls;
      } catch (e) {
        const msg =
          e instanceof Error ? e.message.toLowerCase() : "";
        if (msg.includes("permission") || msg.includes("denied") || msg.includes("notallowed")) {
          setErr("Camera permission was denied.");
          setCameraStatus("Permission denied");
          return;
        }
        if (msg.includes("secure") || msg.includes("https")) {
          setErr("Phone camera needs HTTPS or localhost. Open this app on a secure URL.");
          setCameraStatus("HTTPS required");
          return;
        }
        if (msg.includes("notfound") || msg.includes("devices not found")) {
          setErr("No camera was found on this device.");
          setCameraStatus("No camera found");
          return;
        }
        setErr("Could not open phone camera.");
        setCameraStatus("Camera blocked");
      }
    }

    void startCamera();

    return () => {
      cancelled = true;
      if (rafRef.current !== null) {
        window.clearTimeout(rafRef.current);
        rafRef.current = null;
      }
      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) track.stop();
        streamRef.current = null;
      }
      if (zxingControlsRef.current) {
        zxingControlsRef.current.stop();
        zxingControlsRef.current = null;
      }
    };
  }, [addOne, mode]);

  useEffect(() => {
    if (mode !== "scanner") return;

    function flushScannerBuffer() {
      const raw = scannerBufferRef.current.trim();
      if (raw) addOne(raw);
      scannerBufferRef.current = "";
      if (scannerTimerRef.current !== null) {
        window.clearTimeout(scannerTimerRef.current);
        scannerTimerRef.current = null;
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Enter") {
        e.preventDefault();
        flushScannerBuffer();
        return;
      }
      if (e.key === "Tab" || e.key === "Shift" || e.key === "Control" || e.key === "Alt" || e.key === "Meta") {
        return;
      }
      if (e.key.length !== 1) return;

      scannerBufferRef.current += e.key;
      if (scannerTimerRef.current !== null) {
        window.clearTimeout(scannerTimerRef.current);
      }
      scannerTimerRef.current = window.setTimeout(() => {
        flushScannerBuffer();
      }, 250) as unknown as number;
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      scannerBufferRef.current = "";
      if (scannerTimerRef.current !== null) {
        window.clearTimeout(scannerTimerRef.current);
        scannerTimerRef.current = null;
      }
    };
  }, [addOne, mode]);

  function submitAll() {
    const rawQuantity = quantity.trim();
    let qty: number | null = null;
    if (rawQuantity) {
      const n = Number(rawQuantity);
      if (!Number.isFinite(n) || n < 1 || !Number.isInteger(n)) {
        setErr("Invalid quantity.");
        return;
      }
      qty = n;
    }

    if (!qty) {
      if (!list.length) {
        setErr("Add at least one IMEI or specify quantity.");
        return;
      }
      qty = list.length;
    }

    if (list.length > qty) {
      setErr("IMEI count cannot exceed quantity.");
      return;
    }

    const fd = new FormData();
    fd.set("productId", product.id);
    fd.set("imeis", list.join("\n"));
    fd.set("quantity", String(qty));
    setErr(null);
    start(async () => {
      const r = await addProductStockAction(fd);
      if (r && "error" in r && r.error) setErr(r.error);
      else onDone();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center pb-[96px] sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 bg-black/70" aria-label="Close" onClick={onClose} />
      <div className="relative flex max-h-[min(92vh,720px)] w-full max-w-lg flex-col rounded-t-2xl border border-zinc-700 bg-zinc-900 shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Add stock</h2>
            <p className="text-xs text-zinc-500">
              {product.brand} {product.name}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-sm text-zinc-400 hover:text-white">
            Close
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="mb-4 flex gap-2">
            <button
              type="button"
              onClick={() => setMode("scanner")}
              className={`rounded-full px-4 py-2 text-sm ${mode === "scanner" ? "bg-teal-600 text-white" : "bg-zinc-800 text-zinc-400"}`}
            >
              Barcode scanner
            </button>
            <button
              type="button"
              onClick={() => setMode("camera")}
              className={`rounded-full px-4 py-2 text-sm ${mode === "camera" ? "bg-teal-600 text-white" : "bg-zinc-800 text-zinc-400"}`}
            >
              Phone camera
            </button>
            <button
              type="button"
              onClick={() => setMode("manual")}
              className={`rounded-full px-4 py-2 text-sm ${mode === "manual" ? "bg-teal-600 text-white" : "bg-zinc-800 text-zinc-400"}`}
            >
              Manual entry
            </button>
          </div>

          {mode === "scanner" ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-4" />
            </div>
          ) : mode === "camera" ? (
            <div className="space-y-3">
              <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-black">
                <video ref={videoRef} className="aspect-[3/4] w-full object-cover" playsInline muted />
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-sm text-zinc-300">
                {cameraStatus}
              </div>
              <label className="block text-xs text-zinc-500">
                Manual add while camera is open
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addOne(input);
                      setInput("");
                    }
                  }}
                  inputMode="numeric"
                  className="app-input mt-1"
                  placeholder="Type IMEI and press Enter"
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  addOne(input);
                  setInput("");
                }}
                className="app-btn-secondary py-2 text-sm"
              >
                Add typed IMEI
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="block text-xs text-zinc-500">
                IMEIs
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="app-input mt-1 min-h-40"
                  placeholder="One IMEI per line"
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  const parts = input.split(/[\r\n,;\s]+/);
                  for (const part of parts) addOne(part);
                  setInput("");
                }}
                className="app-btn-secondary py-2 text-sm"
              >
                Add entered IMEIs
              </button>
            </div>
          )}

          {err ? <p className="mt-3 text-sm text-red-400">{err}</p> : null}

          <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-white">Scanned IMEIs</p>
              <p className="text-2xl font-semibold text-teal-300">{list.length}</p>
            </div>
          </div>

          <label className="mt-4 block text-xs text-zinc-500">
            Units to add (optional)
            <input
              type="number"
              min={1}
              step={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="app-input mt-1"
              placeholder={list.length ? `e.g. ${list.length}` : "e.g. 5"}
            />
            <span className="mt-1 block text-[11px] text-zinc-500">
              Leave blank to add exactly the scanned IMEIs. If no IMEIs are scanned, placeholders will be created as{" "}
              &quot;unspecified imei&quot; in the ledger.
            </span>
          </label>

          <ul className="mt-4 max-h-60 space-y-2 overflow-y-auto">
            {list.map((imei) => (
              <li key={imei} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-300">
                <span className="font-mono">{imei}</span>
                <button
                  type="button"
                  onClick={() => setList((prev) => prev.filter((x) => x !== imei))}
                  className="text-xs text-red-400"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="border-t border-zinc-800 px-4 py-3">
          <button type="button" onClick={submitAll} disabled={pending} className="app-btn w-full disabled:opacity-50">
            {pending ? "Saving…" : "Save stock"}
          </button>
        </div>
      </div>
    </div>
  );
}
