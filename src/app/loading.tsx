/**
 * Global route loading UI — matches app shell (zinc-950 / teal) to avoid blank flashes.
 */
export default function RootLoading() {
  return (
    <div
      className="flex min-h-dvh flex-col bg-zinc-950 px-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-[max(1rem,env(safe-area-inset-top,0px))]"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-8">
        <div className="space-y-3 text-center">
          <div className="mx-auto h-14 w-14 animate-pulse rounded-2xl bg-teal-500/20 ring-2 ring-teal-500/30" />
          <div className="space-y-2">
            <div className="mx-auto h-3 w-40 animate-pulse rounded-full bg-zinc-800" />
            <div className="mx-auto h-3 w-28 animate-pulse rounded-full bg-zinc-800/80" />
          </div>
        </div>
        <div className="space-y-3">
          <div className="h-24 animate-pulse rounded-2xl border border-zinc-800/80 bg-zinc-900/60" />
          <div className="h-24 animate-pulse rounded-2xl border border-zinc-800/80 bg-zinc-900/60" />
          <div className="h-14 animate-pulse rounded-xl bg-teal-600/25" />
        </div>
        <p className="text-center text-xs text-zinc-600">Loading…</p>
      </div>
    </div>
  );
}
