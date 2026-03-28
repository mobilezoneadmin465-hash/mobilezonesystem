import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfileBioForm } from "@/components/account/ProfileBioForm";
import { getT } from "@/lib/i18n/server";

export default async function OwnerAccountPage() {
  const t = await getT();
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "OWNER") redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { bio: true },
  });

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-white">{t("owner.account.title")}</h1>
      <Link href={`/p/${session.user.id}`} className="app-card block text-sm font-medium text-teal-400 hover:text-teal-300">
        {t("retail.account.publicProfile")}
      </Link>
      <ProfileBioForm initialBio={user?.bio ?? ""} />
    </div>
  );
}
