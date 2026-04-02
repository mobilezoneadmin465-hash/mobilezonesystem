"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { formatMoney } from "@/lib/finance";
import { setManagedUserPinAction } from "@/server/actions/managed-users";

export type TeamSrRow = {
  id: string;
  username: string | null;
  name: string;
  email: string;
  fieldRoleName: string | null;
  units: number;
  onHandValue: string;
  pendingCash: string;
};

export type FieldRoleOption = { id: string; name: string };

export function OwnerTeamManageClient({
  initialSrs,
}: {
  initialSrs: TeamSrRow[];
  fieldRoles: FieldRoleOption[];
}) {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <Link href="/owner/approvals/accounts" className="app-btn py-2.5 text-sm">
          Approve accounts
        </Link>
      </div>

      <ul className="space-y-4">
        {initialSrs.map((sr) => (
          <li key={sr.id} className="app-card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-white">{sr.name}</p>
                <p className="text-xs text-zinc-500">
                  @{sr.username ?? "—"}
                  {sr.fieldRoleName ? (
                    <span className="text-zinc-600">
                      {" "}
                      · <span className="text-teal-500/90">{sr.fieldRoleName}</span>
                    </span>
                  ) : null}
                </p>
              </div>
              <Link href={`/p/${sr.id}`} className="text-xs font-medium text-teal-400 hover:text-teal-300">
                Profile
              </Link>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 border-t border-zinc-800 pt-3 text-sm sm:grid-cols-3">
              <div>
                <p className="text-xs text-zinc-500">Units</p>
                <p className="text-lg font-semibold text-white">{sr.units}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Stock value</p>
                <p className="text-lg font-semibold text-teal-300">{formatMoney(sr.onHandValue)}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Cash pending</p>
                <p className="text-lg font-semibold text-amber-300">{formatMoney(sr.pendingCash)}</p>
              </div>
            </div>
            <PinResetInline
              userId={sr.id}
              label="Change PIN"
              onSaved={() => router.refresh()}
            />
          </li>
        ))}
      </ul>
      {initialSrs.length === 0 ? <p className="text-sm text-zinc-500">None</p> : null}
    </div>
  );
}

function PinResetInline({
  userId,
  label,
  onSaved,
}: {
  userId: string;
  label: string;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <div className="mt-3 border-t border-zinc-800 pt-3">
        <button type="button" onClick={() => setOpen(true)} className="text-xs font-medium text-zinc-400 hover:text-white">
          {label}
        </button>
      </div>
    );
  }

  return (
    <form
      className="mt-3 space-y-2 border-t border-zinc-800 pt-3"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        setErr(null);
        setOk(false);
        start(async () => {
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
