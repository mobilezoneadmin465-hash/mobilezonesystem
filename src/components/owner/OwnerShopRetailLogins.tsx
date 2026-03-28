"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createRetailShopUserAction, setManagedUserPinAction } from "@/server/actions/managed-users";

export type RetailLoginRow = { id: string; username: string | null; name: string };

export function OwnerShopRetailLogins({ shopId, users }: { shopId: string; users: RetailLoginRow[] }) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Store logins</h2>
          <p className="text-sm text-zinc-500">Each person gets a username and 6-digit PIN.</p>
        </div>
        <button type="button" onClick={() => setAddOpen(true)} className="app-btn py-2.5 text-sm">
          Add store login
        </button>
      </div>

      {addOpen ? (
        <AddRetailLoginModal
          shopId={shopId}
          onClose={() => setAddOpen(false)}
          onDone={() => {
            setAddOpen(false);
            router.refresh();
          }}
        />
      ) : null}

      <ul className="space-y-3">
        {users.map((u) => (
          <li key={u.id} className="app-card space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium text-white">{u.name}</p>
                <p className="text-xs text-zinc-500">@{u.username ?? "—"}</p>
              </div>
            </div>
            <RetailPinReset userId={u.id} onSaved={() => router.refresh()} />
          </li>
        ))}
      </ul>
      {users.length === 0 ? <p className="text-sm text-zinc-500">No logins yet for this store.</p> : null}
    </section>
  );
}

function AddRetailLoginModal({
  shopId,
  onClose,
  onDone,
}: {
  shopId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 bg-black/70" aria-label="Close" onClick={onClose} />
      <div className="relative max-h-[min(92vh,640px)] w-full max-w-md overflow-y-auto rounded-t-2xl border border-zinc-700 bg-zinc-900 p-4 shadow-2xl sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Add store login</h2>
          <button type="button" onClick={onClose} className="text-sm text-zinc-400 hover:text-white">
            Close
          </button>
        </div>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const fd = new FormData(form);
            setErr(null);
            start(async () => {
              const r = await createRetailShopUserAction(fd);
              if (r && "error" in r && r.error) setErr(r.error);
              else {
                form.reset();
                onDone();
              }
            });
          }}
        >
          <input type="hidden" name="shopId" value={shopId} />
          {err ? <p className="text-sm text-red-400">{err}</p> : null}
          <label className="block text-xs text-zinc-500">
            Display name
            <input name="name" required className="app-input mt-1" />
          </label>
          <label className="block text-xs text-zinc-500">
            Username
            <input name="username" required autoComplete="off" className="app-input mt-1" />
          </label>
          <label className="block text-xs text-zinc-500">
            6-digit PIN
            <input
              name="pin"
              required
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              className="app-input mt-1"
              autoComplete="off"
            />
          </label>
          <label className="block text-xs text-zinc-500">
            Phone (optional)
            <input name="phone" type="tel" className="app-input mt-1" />
          </label>
          <button type="submit" disabled={pending} className="app-btn w-full disabled:opacity-50">
            {pending ? "Creating…" : "Create login"}
          </button>
        </form>
      </div>
    </div>
  );
}

function RetailPinReset({ userId, onSaved }: { userId: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs font-medium text-zinc-400 hover:text-white">
        Change PIN
      </button>
    );
  }

  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        setErr(null);
        setOk(false);
        start(async () => {
          const fd = new FormData(form);
          const r = await setManagedUserPinAction(fd);
          if (r && "error" in r && r.error) setErr(r.error);
          else {
            setOk(true);
            const pinEl = form.querySelector<HTMLInputElement>('input[name="pin"]');
            if (pinEl) pinEl.value = "";
            onSaved();
          }
        });
      }}
    >
      <input type="hidden" name="userId" value={userId} />
      <label className="block text-xs text-zinc-500">
        New 6-digit PIN
        <input
          name="pin"
          required
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          className="app-input mt-1"
          autoComplete="off"
        />
      </label>
      {err ? <p className="text-sm text-red-400">{err}</p> : null}
      {ok ? <p className="text-xs text-teal-400">PIN updated.</p> : null}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={pending} className="app-btn-secondary text-xs disabled:opacity-50">
          {pending ? "Saving…" : "Save PIN"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-zinc-500 hover:text-zinc-300">
          Cancel
        </button>
      </div>
    </form>
  );
}
