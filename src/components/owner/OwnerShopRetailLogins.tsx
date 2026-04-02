"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setManagedUserPinAction } from "@/server/actions/managed-users";

export type RetailLoginRow = { id: string; username: string | null; name: string };

export function OwnerShopRetailLogins({ users }: { users: RetailLoginRow[] }) {
  const router = useRouter();

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-white">Store logins</h2>
      </div>

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
      {users.length === 0 ? <p className="text-sm text-zinc-500">None</p> : null}
    </section>
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
