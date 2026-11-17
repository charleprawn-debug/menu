"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getAuth, setRestaurantCookie } from "@/lib/auth/session";

export async function switchRestaurantAction(formData: FormData): Promise<void> {
  const auth = await getAuth();
  if (!auth) redirect("/login");
  const slug = String(formData.get("slug") || "");
  if (!slug) return;

  const membership = await db.restaurantMember.findFirst({
    where: { userId: auth.user.id, status: "ACTIVE", restaurant: { slug, deletedAt: null } },
    select: { id: true },
  });
  if (!membership) return;

  await setRestaurantCookie(slug);
  revalidatePath("/app", "layout");
  redirect("/app/dashboard");
}

export async function markNotificationsReadAction(): Promise<void> {
  const auth = await getAuth();
  if (!auth) return;
  await db.notification.updateMany({
    where: { userId: auth.user.id, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
  revalidatePath("/app", "layout");
}
