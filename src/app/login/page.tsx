import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { authOptions } from "@/lib/auth";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session?.user) redirect("/");

  return (
    <div className="relative flex min-h-dvh flex-col bg-zinc-950 pt-[max(0.5rem,env(safe-area-inset-top,0px))] sm:items-center sm:justify-center sm:px-4 sm:py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(20,184,166,0.12),transparent)]" />
      <Suspense
        fallback={<div className="mx-auto mt-auto h-48 w-full max-w-md animate-pulse rounded-t-3xl bg-zinc-900 sm:mt-0 sm:h-40 sm:rounded-3xl" />}
      >
        <div className="relative z-[1] mt-auto w-full sm:mt-0 sm:flex sm:justify-center">
          <LoginForm />
        </div>
      </Suspense>
    </div>
  );
}
