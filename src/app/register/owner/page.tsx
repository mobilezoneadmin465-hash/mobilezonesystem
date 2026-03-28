import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { RegisterOwnerForm } from "@/components/register/RegisterForms";
import { authOptions } from "@/lib/auth";

export default async function RegisterOwnerPage() {
  const session = await getServerSession(authOptions);
  if (session?.user) redirect("/");
  return (
    <div className="relative flex min-h-dvh flex-col bg-zinc-950 px-4 pb-10 pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(20,184,166,0.1),transparent)]" />
      <div className="relative z-[1] mx-auto mt-auto w-full max-w-md sm:mt-0 sm:flex sm:flex-1 sm:items-center sm:justify-center">
        <RegisterOwnerForm />
      </div>
    </div>
  );
}
