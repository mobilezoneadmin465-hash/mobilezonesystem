"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import type { CatalogProductDTO } from "@/lib/catalog-dto";
import { formatMoney } from "@/lib/finance";
import { createOwnerOrderForShopAction, createRetailOrderAction } from "@/server/actions/orders";
import { useLanguage } from "@/components/LanguageContext";
import { closeModal, openModal } from "@/lib/modal-manager";

type ShopOption = { id: string; name: string };

type Props = {
  products: CatalogProductDTO[];
  mode: "retail" | "owner";
  shops?: ShopOption[];
  initialShopId?: string;
};

export function StorefrontCart({ products, mode, shops = [], initialShopId = "" }: Props) {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedShop, setSelectedShop] = useState(initialShopId || shops[0]?.id || "");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [note, setNote] = useState("");
  const [ownerNote, setOwnerNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  /** Product whose + was clicked — quantity picker modal */
  const [picker, setPicker] = useState<CatalogProductDTO | null>(null);
  const [draftQty, setDraftQty] = useState(1);

  /** Cart review panel */
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    const q = searchParams.get("shop");
    if (mode !== "owner" || !q) return;
    if (shops.some((s) => s.id === q)) setSelectedShop(q);
  }, [mode, searchParams, shops]);

  useEffect(() => {
    if (!picker) return;
    const inCart = cart[picker.id] ?? 0;
    setDraftQty(inCart > 0 ? inCart : 1);
  }, [picker, cart]);

  // Prevent background scroll / bounce when fixed modals/sheets are open.
  useEffect(() => {
    const anyOverlay = Boolean(picker || cartOpen);
    if (!anyOverlay) return;

    if (picker) openModal("cart-qty-modal");
    if (cartOpen) openModal("cart-panel-modal");

    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
      closeModal("cart-qty-modal");
      closeModal("cart-panel-modal");
    };
  }, [picker, cartOpen]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) => p.brand.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)
    );
  }, [products, query]);

  const cartLines = useMemo(() => {
    return Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => {
        const p = products.find((x) => x.id === id);
        return p ? { ...p, qty } : null;
      })
      .filter((x): x is CatalogProductDTO & { qty: number } => x !== null);
  }, [cart, products]);

  const subtotal = useMemo(
    () => cartLines.reduce((s, l) => s + Number(l.unitPrice) * l.qty, 0),
    [cartLines]
  );

  const itemCount = cartLines.reduce((s, l) => s + l.qty, 0);

  function openPicker(p: CatalogProductDTO) {
    setPicker(p);
    setDraftQty(cart[p.id] > 0 ? cart[p.id] : 1);
  }

  function closePicker() {
    setPicker(null);
  }

  function applyPickerToCart() {
    if (!picker) return;
    const n = Math.max(0, Math.floor(Number(draftQty) || 0));
    setCart((prev) => {
      const next = { ...prev };
      if (n <= 0) delete next[picker.id];
      else next[picker.id] = n;
      return next;
    });
    closePicker();
  }

  function adjustCartLine(pid: string, delta: number) {
    setCart((prev) => {
      const next = { ...prev };
      const cur = next[pid] ?? 0;
      const n = Math.max(0, cur + delta);
      if (n <= 0) delete next[pid];
      else next[pid] = n;
      return next;
    });
  }

  function setCartLineQty(pid: string, raw: string) {
    const n = Math.max(0, Math.floor(Number(raw) || 0));
    setCart((prev) => {
      const next = { ...prev };
      if (n <= 0) delete next[pid];
      else next[pid] = n;
      return next;
    });
  }

  function submitOrder() {
    if (mode === "owner" && !selectedShop) {
      setError(t("retail.cart.chooseStore"));
      return;
    }
    const lines = cartLines.map((l) => ({ productId: l.id, quantity: l.qty }));
    if (!lines.length) {
      setError(t("retail.cart.emptyCart"));
      return;
    }
    setError(null);
    const fd = new FormData();
    fd.set("lines", JSON.stringify(lines));
    fd.set("note", note);
    if (mode === "owner") {
      fd.set("shopId", selectedShop);
      fd.set("ownerNote", ownerNote);
    }
    start(async () => {
      const r =
        mode === "retail"
          ? await createRetailOrderAction(fd)
          : await createOwnerOrderForShopAction(fd);
      if (r && "error" in r && r.error) setError(r.error);
      else {
        setCart({});
        setNote("");
        setOwnerNote("");
        setCartOpen(false);
        if (mode === "retail") router.push("/retail/orders");
        else router.refresh();
      }
    });
  }

  const CartPanel = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <h2 className="text-lg font-semibold text-white">{t("retail.cart.yourCart")}</h2>
        <button
          type="button"
          onClick={() => setCartOpen(false)}
          className="rounded-lg px-3 py-1.5 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-white"
        >
          {t("retail.cart.close")}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {cartLines.length === 0 ? (
          <p className="text-center text-sm text-zinc-500">{t("retail.cart.empty")}</p>
        ) : (
          <ul className="space-y-3">
            {cartLines.map((l) => (
              <li
                key={l.id}
                className="flex flex-col gap-2 rounded-xl border border-zinc-800 bg-zinc-950/80 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white">
                    {l.brand} {l.name}
                  </p>
                  <p className="text-xs text-zinc-500">{formatMoney(l.unitPrice)} × {l.qty}</p>
                </div>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label={t("retail.orderCard.decrease")}
                      onClick={() => adjustCartLine(l.id, -1)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-600 text-lg text-white hover:bg-zinc-800"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={l.qty}
                      onChange={(e) => setCartLineQty(l.id, e.target.value)}
                      className="app-input w-16 py-2 text-center text-sm font-semibold"
                    />
                    <button
                      type="button"
                      aria-label={t("retail.orderCard.increase")}
                      onClick={() => adjustCartLine(l.id, 1)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 text-lg text-white hover:bg-teal-500"
                    >
                      +
                    </button>
                  </div>
                  <p className="w-24 text-right text-sm font-semibold text-teal-300">
                    {formatMoney(Number(l.unitPrice) * l.qty)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="border-t border-zinc-800 px-4 py-4">
        <div className="mb-4 flex items-center justify-between text-sm">
          <span className="text-zinc-400">{t("retail.cart.subtotal")}</span>
          <span className="text-xl font-semibold text-white">{formatMoney(subtotal)}</span>
        </div>
        <label className="mb-3 block text-xs text-zinc-500">
          {t("retail.cart.note")}
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="app-input mt-1 resize-none"
          />
        </label>
        {mode === "owner" ? (
          <label className="mb-3 block text-xs text-zinc-500">
            {t("retail.cart.internal")}
            <input
              value={ownerNote}
              onChange={(e) => setOwnerNote(e.target.value)}
              className="app-input mt-1"
            />
          </label>
        ) : null}
        {error ? <p className="mb-2 text-sm text-red-400">{error}</p> : null}
        <button
          type="button"
          disabled={pending || itemCount === 0}
          onClick={submitOrder}
          className="app-btn w-full disabled:opacity-40"
        >
          {pending
            ? t("retail.cart.placing")
            : mode === "retail"
              ? t("retail.cart.placeOrder")
              : t("retail.cart.submitOrder")}
        </button>
      </div>
    </div>
  );

  return (
    <div className="pb-6 md:pb-6">
      {mode === "owner" && shops.length > 0 ? (
        <div className="app-card mb-4">
          <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">{t("retail.cart.store")}</label>
          <select
            value={selectedShop}
            onChange={(e) => setSelectedShop(e.target.value)}
            className="app-input mt-2"
          >
            <option value="">{t("retail.cart.selectStore")}</option>
            {shops.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {/* Toolbar: search + cart */}
      <div className="sticky top-0 z-20 -mx-1 mb-4 flex flex-wrap items-center gap-2 border-b border-zinc-800/80 bg-zinc-950/95 px-1 py-3 backdrop-blur-sm">
        <input
          type="search"
          placeholder={t("retail.cart.searchPlaceholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="app-input min-w-0 flex-1 sm:max-w-md"
          autoComplete="off"
        />
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="relative flex shrink-0 items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800"
        >
          {t("retail.cart.cartBtn")}
          {itemCount > 0 ? (
            <span className="flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-teal-600 px-1.5 text-xs font-bold text-white">
              {itemCount}
            </span>
          ) : null}
        </button>
      </div>

      {/* Product list — text only, + opens quantity modal */}
      <ul className="divide-y divide-zinc-800 rounded-2xl border border-zinc-800 bg-zinc-900/40">
        {filtered.map((p) => {
          return (
            <li
              key={p.id}
              className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-zinc-800/30"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-teal-500/90">{p.brand}</p>
                <p className="text-sm font-medium leading-snug text-white">{p.name}</p>
                <p className="mt-1 text-sm text-teal-300/80">{formatMoney(p.unitPrice)}</p>
              </div>
              <button
                type="button"
                onClick={() => openPicker(p)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-teal-500/60 bg-teal-600/20 text-xl font-bold text-teal-300 transition hover:bg-teal-600/40"
                aria-label={`Add ${p.name}`}
              >
                +
              </button>
            </li>
          );
        })}
      </ul>
      {filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-zinc-500">{t("retail.cart.noMatch")}</p>
      ) : null}

      {/* Quantity modal: large +/− and typed amount */}
      {picker ? (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center overflow-y-auto p-4 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="qty-modal-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/70"
            aria-label="Close"
            onClick={closePicker}
          />
          <div className="relative w-full max-w-md max-h-[min(90dvh,720px)] overflow-y-auto rounded-t-3xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl sm:rounded-2xl">
            <h3 id="qty-modal-title" className="text-lg font-semibold text-white">
              {picker.brand} {picker.name}
            </h3>
            <p className="mt-1 text-sm text-zinc-500">{formatMoney(picker.unitPrice)}</p>

            <p className="mb-2 mt-6 text-xs font-medium uppercase tracking-wide text-zinc-500">{t("retail.cart.qtyPcs")}</p>
            <div className="flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => setDraftQty((d) => Math.max(0, d - 1))}
                className="flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-600 text-2xl font-bold text-white hover:bg-zinc-800"
              >
                −
              </button>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={draftQty === 0 ? "" : draftQty}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "") setDraftQty(0);
                  else setDraftQty(Math.max(0, Math.floor(Number(v)) || 0));
                }}
                className="app-input w-28 py-4 text-center text-2xl font-bold text-white"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setDraftQty((d) => d + 1)}
                className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-600 text-2xl font-bold text-white hover:bg-teal-500"
              >
                +
              </button>
            </div>
            <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closePicker}
                className="app-btn-secondary order-2 sm:order-1"
              >
                {t("retail.cart.cancel")}
              </button>
              <button type="button" onClick={applyPickerToCart} className="app-btn order-1 sm:order-2">
                {draftQty <= 0 ? t("retail.cart.removeFromCart") : t("retail.cart.addToCart")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Cart panel: slide-over on desktop, bottom sheet on mobile */}
      {cartOpen ? (
        <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true" aria-labelledby="cart-panel-title">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label={t("retail.cart.closeCart")}
            onClick={() => setCartOpen(false)}
          />
          <div
            id="cart-panel-title"
            className="absolute inset-0 flex flex-col justify-end p-4 sm:flex-row sm:p-0 sm:pb-0 sm:items-stretch sm:justify-end"
          >
            <div className="flex h-[min(92vh,720px)] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-zinc-800 bg-zinc-950 shadow-2xl sm:h-full sm:rounded-none sm:border-y-0 sm:border-l sm:border-r-0">
              {CartPanel}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
