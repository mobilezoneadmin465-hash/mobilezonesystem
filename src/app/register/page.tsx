import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export default async function RegisterHubPage() {
  const session = await getServerSession(authOptions);
  if (session?.user) redirect("/");

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-4 bg-zinc-950 px-4 py-12">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-white">Create an account</h1>
      </div>
      <Link href="/register/owner" className="app-btn text-center">
        I am the business owner
      </Link>
      <p className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-center text-sm text-zinc-400">
        Field team and retail staff get a <span className="text-zinc-200">username + PIN</span> from the owner — no
        self-sign-up.
      </p>
      <Link href="/register/sr" className="app-btn-secondary text-center text-sm">
        Field / sales (info)
      </Link>
      <Link href="/register/retail" className="app-btn-secondary text-center text-sm">
        Retail (info)
      </Link>
      <p className="text-center text-sm text-zinc-500">
        Already have an account?{" "}
        <Link href="/login" className="text-teal-400 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
