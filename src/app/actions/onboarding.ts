"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, getActiveMembership } from "@/lib/auth/context";
import { setRestaurantCookie } from "@/lib/auth/session";
import { logActivity } from "@/lib/audit";

const schema = z.object({
  name: z.string().trim().min(2, "اسم المطعم مطلوب"),
  cuisineType: z.string().trim().max(80).optional(),
  city: z.string().trim().max(80).optional(),
  phone: z.string().trim().max(30).optional(),
  currency: z.string().trim().min(3).max(3),
  timezone: z.string().trim().max(60).optional(),
});

export interface OnboardingState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function saveRestaurantBasics(_prev: OnboardingState, formData: FormData): Promise<OnboardingState> {
  const auth = await requireAuth();
  const membership = await getActiveMembership();
  if (!membership) redirect("/login");

  const parsed = schema.safeParse({
    name: formData.get("name"),
    cuisineType: formData.get("cuisineType") || undefined,
    city: formData.get("city") || undefined,
    phone: formData.get("phone") || undefined,
    currency: formData.get("currency") || "SAR",
    timezone: formData.get("timezone") || "Asia/Riyadh",
  });

  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    return {
      error: "تحقق من البيانات",
      fieldErrors: Object.fromEntries(Object.entries(flat).map(([key, value]) => [key, value?.[0] ?? ""])),
    };
  }

  const launch = formData.get("intent") === "launch";

  await db.restaurant.update({
    where: { id: membership.restaurantId },
    data: {
      name: parsed.data.name,
      cuisineType: parsed.data.cuisineType || null,
      city: parsed.data.city || null,
      phone: parsed.data.phone || null,
      currency: parsed.data.currency.toUpperCase(),
      timezone: parsed.data.timezone || "Asia/Riyadh",
      onboardingStep: launch ? 6 : 2,
      ...(launch ? { status: "ACTIVE", onboardingCompletedAt: new Date() } : {}),
    },
  });

  await logActivity({
    restaurantId: membership.restaurantId,
    actorId: auth.user.id,
    action: launch ? "restaurant.launch" : "restaurant.update",
    entity: "Restaurant",
    entityId: membership.restaurantId,
    description: launch ? "تم إطلاق المطعم" : "تم تحديث بيانات المطعم",
  });

  await setRestaurantCookie(membership.restaurant.slug);

  if (launch) redirect("/app/dashboard");
  redirect("/onboarding?step=2");
}
