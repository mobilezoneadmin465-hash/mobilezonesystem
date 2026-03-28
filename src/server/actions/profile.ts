"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function updateBioAction(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized." };

  const bio = String(formData.get("bio") ?? "").trim().slice(0, 500) || null;

  await prisma.user.update({
    where: { id: session.user.id },
    data: { bio },
  });

  revalidatePath("/owner/account");
  revalidatePath("/retail/account");
  revalidatePath(`/p/${session.user.id}`);
  return { success: true };
}
