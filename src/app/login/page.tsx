import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { authOptions } from "@/lib/auth";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session?.user) redirect("/");

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-zinc-950 px-4 py-12 pt-[max(2.5rem,env(safe-area-inset-top,0px))] pb-[max(2.5rem,env(safe-area-inset-bottom,0px))]">
      <Suspense fallback={<div className="h-40 w-full max-w-md animate-pulse rounded-2xl bg-zinc-900" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
