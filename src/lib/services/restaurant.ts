import { db } from "../db";
import { PERMISSION_KEYS, ROLE_TEMPLATES, permissionsForTemplate } from "../permissions";
import { randomCode, slugify } from "../utils";

async function uniqueSlug(base: string): Promise<string> {
  const root = slugify(base) || "restaurant";
  let candidate = root;
  let attempt = 0;
  while (await db.restaurant.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    attempt += 1;
    candidate = `${root}-${randomCode(4).toLowerCase()}`;
    if (attempt > 8) candidate = `${root}-${Date.now().toString(36)}`;
  }
  return candidate;
}

export interface CreateRestaurantInput {
  userId: string;
  name: string;
  description?: string;
  cuisineType?: string;
  country?: string;
  city?: string;
  address?: string;
  phone?: string;
  email?: string;
  currency?: string;
  timezone?: string;
  locale?: string;
}

/**
 * Provisions a restaurant with its main branch, system roles, owner membership,
 * default kitchen station and a trial subscription.
 */
export async function createRestaurantWithDefaults(input: CreateRestaurantInput) {
  const permissions = await db.permission.findMany({ select: { id: true, key: true } });
  if (permissions.length === 0) {
    throw new Error("Permissions are not seeded. Run `npm run db:seed` first.");
  }
  const permissionMap = new Map(permissions.map((p) => [p.key, p.id]));
  const slug = await uniqueSlug(input.name);

  const restaurant = await db.restaurant.create({
    data: {
      ownerId: input.userId,
      slug,
      name: input.name,
      description: input.description || null,
      cuisineType: input.cuisineType || null,
      country: input.country || null,
      city: input.city || null,
      address: input.address || null,
      phone: input.phone || null,
      email: input.email || null,
      currency: input.currency || "USD",
      timezone: input.timezone || "Asia/Riyadh",
      defaultLocale: input.locale || "ar",
      status: "DRAFT",
      onboardingStep: 1,
      branches: {
        create: {
          name: input.name,
          isMain: true,
          city: input.city || null,
          country: input.country || null,
          phone: input.phone || null,
          email: input.email || null,
          currency: input.currency || "USD",
          timezone: input.timezone || "Asia/Riyadh",
        },
      },
      areas: {
        create: { name: "الصالة الرئيسية", sortOrder: 0 },
      },
    },
    include: { branches: true, areas: true },
  });

  // System roles
  for (const template of ROLE_TEMPLATES) {
    const keys = permissionsForTemplate(template.key);
    await db.role.create({
      data: {
        restaurantId: restaurant.id,
        key: template.key,
        name: template.ar,
        nameEn: template.en,
        description: template.descriptionAr,
        isSystem: true,
        isDefault: template.key === "owner",
        permissions: {
          create: keys
            .filter((key) => permissionMap.has(key))
            .map((key) => ({ permissionId: permissionMap.get(key)! })),
        },
      },
    });
  }

  const ownerRole = await db.role.findFirst({ where: { restaurantId: restaurant.id, key: "owner" } });

  await db.restaurantMember.create({
    data: {
      restaurantId: restaurant.id,
      userId: input.userId,
      isOwner: true,
      title: "Owner",
      status: "ACTIVE",
      roles: ownerRole ? { create: { roleId: ownerRole.id } } : undefined,
    },
  });

  // Kitchen stations
  await db.kitchenStation.createMany({
    data: [
      { restaurantId: restaurant.id, name: "المطبخ الرئيسي", type: "KITCHEN", color: "#0ea5e9" },
      { restaurantId: restaurant.id, name: "المشروبات", type: "BAR", color: "#8b5cf6" },
    ],
  });

  // Default menu
  await db.menu.create({
    data: {
      restaurantId: restaurant.id,
      name: "المنيو الرئيسي",
      type: "MAIN",
      status: "ACTIVE",
      isDefault: true,
    },
  });

  // Trial subscription
  const plan = await db.plan.findFirst({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  if (plan) {
    const trialEnds = new Date(Date.now() + plan.trialDays * 24 * 60 * 60 * 1000);
    await db.subscription.create({
      data: {
        restaurantId: restaurant.id,
        planId: plan.id,
        status: "TRIALING",
        billingCycle: "MONTHLY",
        currentPeriodStart: new Date(),
        currentPeriodEnd: trialEnds,
        trialEndsAt: trialEnds,
      },
    });
  }

  return restaurant;
}

/** Returns the user's first owned restaurant, creating a draft when none exists. */
export async function ensureDraftRestaurant(userId: string) {
  const existing = await db.restaurantMember.findFirst({
    where: { userId, restaurant: { deletedAt: null } },
    include: { restaurant: true },
    orderBy: { createdAt: "asc" },
  });
  if (existing) return existing.restaurant;

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  return createRestaurantWithDefaults({
    userId,
    name: user.name ? `مطعم ${user.name}` : "مطعمي",
    email: user.email,
    phone: user.phone ?? undefined,
    currency: "USD",
    timezone: "Asia/Riyadh",
    locale: user.locale,
  });
}

/** Ensures every permission key exists in the database. Used by seed and admin tooling. */
export async function syncPermissions(): Promise<number> {
  const { PERMISSIONS } = await import("../permissions");
  let count = 0;
  for (const permission of PERMISSIONS) {
    await db.permission.upsert({
      where: { key: permission.key },
      update: {
        group: permission.group,
        labelAr: permission.ar,
        labelEn: permission.en,
        isSensitive: permission.sensitive ?? false,
      },
      create: {
        key: permission.key,
        group: permission.group,
        labelAr: permission.ar,
        labelEn: permission.en,
        isSensitive: permission.sensitive ?? false,
      },
    });
    count += 1;
  }
  return count;
}

export { PERMISSION_KEYS };
