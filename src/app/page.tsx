import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  switch (session.user.role) {
    case "OWNER":
      redirect("/owner/dashboard");
    case "SR":
      redirect("/sr/dashboard");
    case "RETAIL":
      redirect("/retail");
    default:
      redirect("/login");
  }
}
