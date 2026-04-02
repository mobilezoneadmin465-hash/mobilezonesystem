import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export default async function RegisterOwnerPage() {
  const session = await getServerSession(authOptions);
  if (session?.user) redirect("/");
  return (
    <div className="relative flex min-h-dvh flex-col bg-zinc-950 px-4 pb-10 pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(20,184,166,0.1),transparent)]" />
      <div className="relative z-[1] mx-auto mt-auto w-full max-w-md sm:mt-0 sm:flex sm:flex-1 sm:items-center sm:justify-center">
        <div className="w-full rounded-3xl border border-zinc-800/80 bg-zinc-900/95 px-6 py-10 text-center">
          <h1 className="text-xl font-bold text-white">Owner accounts</h1>
          <p className="mt-3 text-sm text-zinc-300">
            Owner accounts are created by the system/terminal only. Use your store or field registration link instead.
          </p>
          <div className="mt-6 space-y-2">
            <a href="/register/sr" className="app-btn-secondary block w-full py-3 text-center text-sm">
              Register Field
            </a>
            <a href="/register/retail" className="app-btn-secondary block w-full py-3 text-center text-sm">
              Register Retail
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
