import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { RegisterOwnerForm } from "@/components/register/RegisterForms";
import { authOptions } from "@/lib/auth";

export default async function RegisterOwnerPage() {
  const session = await getServerSession(authOptions);
  if (session?.user) redirect("/");
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center bg-zinc-950 px-4 py-10">
      <RegisterOwnerForm />
    </div>
  );
}
