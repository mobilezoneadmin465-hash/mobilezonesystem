"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { prisma } from "@/lib/prisma";

async function requireOwner() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "OWNER") return null;
  return session.user;
}

function revalidateCatalog() {
  revalidatePath("/owner/catalog");
  revalidatePath("/owner/dashboard");
  revalidatePath("/owner/place-order");
  revalidatePath("/retail/place-order");
  revalidatePath("/retail/orders");
  revalidatePath("/sr/warehouse");
  revalidatePath("/sr/office");
}

export async function createBrandAction(formData: FormData) {
  const user = await requireOwner();
  if (!user) return { error: "Unauthorized." };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Brand name is required." };

  try {
    await prisma.brand.create({ data: { name } });
  } catch {
    return { error: "That brand already exists." };
  }

  await logActivity({
    type: "BRAND_CREATE",
    title: `Brand: ${name}`,
    actorUserId: user.id,
  });

  revalidateCatalog();
  return { success: true };
}

export async function deleteBrandAction(formData: FormData) {
  const user = await requireOwner();
  if (!user) return { error: "Unauthorized." };

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing brand." };

  const count = await prisma.catalogProduct.count({ where: { brandId: id } });
  if (count > 0) return { error: "Remove or reassign products before deleting this brand." };

  const b = await prisma.brand.findUnique({ where: { id } });
  if (!b) return { error: "Brand not found." };

  await prisma.brand.delete({ where: { id } });

  await logActivity({
    type: "BRAND_DELETE",
    title: `Removed brand: ${b.name}`,
    actorUserId: user.id,
  });

  revalidateCatalog();
  return { success: true };
}
