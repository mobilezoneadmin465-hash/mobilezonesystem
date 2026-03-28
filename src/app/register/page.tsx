import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export default async function RegisterHubPage() {
  const session = await getServerSession(authOptions);
  if (session?.user) redirect("/");

  return (
    <div className="relative flex min-h-dvh flex-col bg-zinc-950 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(20,184,166,0.1),transparent)]" />
      <div className="relative z-[1] mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-3">
        <h1 className="mb-4 text-center text-2xl font-bold tracking-tight text-white">Sign up</h1>
        <Link href="/register/owner" className="app-btn py-4 text-center text-base">
          Owner
        </Link>
        <Link href="/register/sr" className="app-btn-secondary py-3.5 text-center text-sm">
          Field
        </Link>
        <Link href="/register/retail" className="app-btn-secondary py-3.5 text-center text-sm">
          Retail
        </Link>
        <Link
          href="/login"
          className="mt-6 py-3 text-center text-sm font-medium text-teal-400 active:text-teal-300"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
