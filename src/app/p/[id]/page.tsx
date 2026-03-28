import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      name: true,
      phone: true,
      username: true,
      role: true,
      bio: true,
      shop: { select: { name: true, address: true } },
    },
  });
  if (!user) notFound();

  const roleLabel =
    user.role === "OWNER" ? "Owner" : user.role === "SR" ? "Sales representative" : "Retail partner";

  const phoneMask = user.phone
    ? user.phone.length > 6
      ? `${user.phone.slice(0, 4)}…${user.phone.slice(-3)}`
      : user.phone
    : null;

  return (
    <div className="min-h-dvh bg-zinc-950 px-4 py-10 text-zinc-100">
      <div className="mx-auto max-w-md space-y-6">
        <div className="app-card border-teal-500/20 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-teal-400">Mobile Zone</p>
          <h1 className="mt-3 text-2xl font-semibold text-white">{user.name}</h1>
          <p className="mt-1 text-sm text-zinc-500">{roleLabel}</p>
          {user.username ? <p className="mt-2 text-xs text-zinc-600">@{user.username}</p> : null}
          {phoneMask ? <p className="mt-2 text-sm text-zinc-400">{phoneMask}</p> : null}
        </div>
        {user.shop ? (
          <div className="app-card">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Store</p>
            <p className="mt-1 font-medium text-white">{user.shop.name}</p>
            <p className="mt-1 text-sm text-zinc-500">{user.shop.address}</p>
          </div>
        ) : null}
        {user.bio ? (
          <div className="app-card">
            <p className="text-xs text-zinc-500">Note</p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-300">{user.bio}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
