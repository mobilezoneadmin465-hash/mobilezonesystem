"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createShopAction } from "@/server/actions/shops";

export function OwnerAddStoreButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="app-btn-secondary py-2.5 text-sm">
        Add store
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true">
          <button type="button" className="absolute inset-0 bg-black/70" aria-label="Close" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md rounded-t-2xl border border-zinc-700 bg-zinc-900 p-4 shadow-2xl sm:rounded-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">New store</h2>
              <button type="button" onClick={() => setOpen(false)} className="text-sm text-zinc-400 hover:text-white">
                Close
              </button>
            </div>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const fd = new FormData(form);
                setErr(null);
                start(async () => {
                  const r = await createShopAction(fd);
                  if (r && "error" in r && r.error) setErr(r.error);
                  else {
                    form.reset();
                    setOpen(false);
                    router.refresh();
                  }
                });
              }}
            >
              {err ? <p className="text-sm text-red-400">{err}</p> : null}
              <label className="block text-xs text-zinc-500">
                Store name
                <input name="name" required className="app-input mt-1" />
              </label>
              <label className="block text-xs text-zinc-500">
                Contact / proprietor name
                <input name="ownerName" required className="app-input mt-1" />
              </label>
              <label className="block text-xs text-zinc-500">
                Store phone
                <input name="phone" type="tel" required className="app-input mt-1" />
              </label>
              <label className="block text-xs text-zinc-500">
                Address
                <textarea name="address" required rows={2} className="app-input mt-1 resize-none" />
              </label>
              <label className="block text-xs text-zinc-500">
                Credit limit (BDT, optional)
                <input name="creditLimit" type="text" placeholder="0" className="app-input mt-1" />
              </label>

              <div className="border-t border-zinc-800 pt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-teal-500/90">First store login</p>
                <p className="mb-3 text-xs text-zinc-600">They sign in with username + PIN (same as Field team).</p>
                <label className="block text-xs text-zinc-500">
                  Staff display name
                  <input name="loginName" required className="app-input mt-1" placeholder="Shop manager" />
                </label>
                <label className="mt-3 block text-xs text-zinc-500">
                  Username
                  <input name="loginUsername" required autoComplete="off" className="app-input mt-1" placeholder="dhanmondi_shop" />
                </label>
                <label className="mt-3 block text-xs text-zinc-500">
                  6-digit PIN
                  <input
                    name="loginPin"
                    required
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    autoComplete="off"
                    className="app-input mt-1"
                    placeholder="••••••"
                  />
                </label>
                <label className="mt-3 block text-xs text-zinc-500">
                  Staff phone (optional)
                  <input name="loginPhone" type="tel" className="app-input mt-1" />
                </label>
              </div>

              <button type="submit" disabled={pending} className="app-btn w-full disabled:opacity-50">
                {pending ? "Saving…" : "Create store + login"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
