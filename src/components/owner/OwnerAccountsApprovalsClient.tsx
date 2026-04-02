"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { approvePendingSrAction, denyPendingSrAction } from "@/server/actions/owner-approvals";

type PendingSrRow = {
  id: string;
  username: string | null;
  name: string;
  phone: string | null;
  fieldRoleName: string | null;
  similarUsernames: { id: string; username: string | null; name: string }[];
};

export function OwnerAccountsApprovalsClient({ rows }: { rows: PendingSrRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  async function run(userId: string, action: (fd: FormData) => Promise<{ error?: string }>) {
    start(async () => {
      const fd = new FormData();
      fd.set("userId", userId);
      const r = await action(fd);
      if (r && "error" in r && r.error) return;
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {rows.length === 0 ? <p className="text-sm text-zinc-500">No pending accounts.</p> : null}
      <ul className="space-y-4">
        {rows.map((r) => (
          <li key={r.id} className="app-card space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-white">{r.name}</p>
                <p className="text-sm text-zinc-300">@{r.username ?? "—"}</p>
                {r.fieldRoleName ? <p className="text-xs text-teal-400">{r.fieldRoleName}</p> : null}
                {r.phone ? <p className="text-xs text-zinc-500">{r.phone}</p> : null}
                {r.similarUsernames.length ? (
                  <div className="mt-2">
                    <p className="text-[11px] font-medium text-zinc-500">Similar approved</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {r.similarUsernames.map((s) => (
                        <span
                          key={s.id}
                          className="rounded-full bg-zinc-800/60 px-2 py-0.5 text-[11px] text-zinc-300"
                        >
                          @{s.username ?? "—"}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
              <p className="text-xs text-teal-400">Pending</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => run(r.id, approvePendingSrAction)}
                className="app-btn py-2 text-sm disabled:opacity-50"
              >
                Approve
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => run(r.id, denyPendingSrAction)}
                className="app-btn-secondary border-red-900/50 py-2 text-sm text-red-300 disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

