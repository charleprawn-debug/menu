import type { BillingCycle, PermissionScope, Prisma } from "@prisma/client";
import { db } from "../db";
import { PERMISSION_KEYS, ROLE_TEMPLATES, permissionsForTemplate } from "../permissions";
import { randomCode, slugify } from "../utils";

export interface CreateRestaurantInput {
  userId: string;
  name: string;
  description?: string;
  legalName?: string;
  cuisineType?: string;
  country?: string;
  city?: string;
  address?: string;
  phone?: string;
  email?: string;
  currency?: string;
  timezone?: string;
  locale?: string;
  planKey?: string;
  billingCycle?: BillingCycle;
}

export interface RestaurantPlanSelection {
  planKey?: string;
  billingCycle?: BillingCycle;
}

async function uniqueSlug(tx: Prisma.TransactionClient, base: string): Promise<string> {
  const root = slugify(base) || "restaurant";
  let candidate = root;
  let attempt = 0;
  while (await tx.restaurant.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    attempt += 1;
    candidate = `${root}-${randomCode(4).toLowerCase()}`;
    if (attempt > 8) candidate = `${root}-${Date.now().toString(36)}`;
  }
  return candidate;
}

function readStringSetting(value: Prisma.JsonValue | null | undefined): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readNumberSetting(value: Prisma.JsonValue | null | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

async function resolvePlan(tx: Prisma.TransactionClient, planKey?: string) {
  if (planKey) {
    const chosen = await tx.plan.findFirst({ where: { key: planKey, isActive: true } });
    if (!chosen) throw new Error("SELECTED_PLAN_UNAVAILABLE");
    return chosen;
  }

  const configuredKey = readStringSetting(
    (await tx.platformSetting.findUnique({ where: { key: "default_plan_key" }, select: { value: true } }))?.value
  );
  const preferred = configuredKey ?? "starter";
  return (
    (await tx.plan.findFirst({ where: { key: preferred, isActive: true } })) ??
    (await tx.plan.findFirst({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }))
  );
}

async function createRestaurantInTransaction(tx: Prisma.TransactionClient, input: CreateRestaurantInput) {
  const [permissions, plan, currencySetting, trialSetting] = await Promise.all([
    tx.permission.findMany({ select: { id: true, key: true } }),
    resolvePlan(tx, input.planKey),
    tx.platformSetting.findUnique({ where: { key: "default_currency" }, select: { value: true } }),
    tx.platformSetting.findUnique({ where: { key: "trial_days" }, select: { value: true } }),
  ]);

  if (permissions.length === 0) {
    throw new Error("Permissions are not seeded. Run `npm run db:seed` first.");
  }
  if (!plan) throw new Error("No active subscription plan is configured.");

  const permissionMap = new Map(permissions.map((permission) => [permission.key, permission.id]));
  const slug = await uniqueSlug(tx, input.name);
  const currency = (input.currency || plan.currency || readStringSetting(currencySetting?.value) || "SAR").toUpperCase();
  const cycle: BillingCycle = input.billingCycle === "YEARLY" ? "YEARLY" : "MONTHLY";
  const configuredTrialDays = readNumberSetting(trialSetting?.value);
  const trialDays = Math.max(0, Math.min(365, Math.floor(configuredTrialDays ?? plan.trialDays)));
  const now = new Date();
  const trialEndsAt = trialDays > 0 ? new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000) : null;

  const restaurant = await tx.restaurant.create({
    data: {
      ownerId: input.userId,
      slug,
      name: input.name.trim(),
      legalName: input.legalName?.trim() || null,
      description: input.description?.trim() || null,
      cuisineType: input.cuisineType?.trim() || null,
      country: input.country?.trim() || null,
      city: input.city?.trim() || null,
      address: input.address?.trim() || null,
      phone: input.phone?.trim() || null,
      email: input.email?.trim().toLowerCase() || null,
      currency,
      timezone: input.timezone || "Asia/Riyadh",
      defaultLocale: input.locale || "ar",
      status: "DRAFT",
      onboardingStep: 1,
      branches: {
        create: {
          name: input.name.trim(),
          isMain: true,
          city: input.city?.trim() || null,
          country: input.country?.trim() || null,
          address: input.address?.trim() || null,
          phone: input.phone?.trim() || null,
          email: input.email?.trim().toLowerCase() || null,
          currency,
          timezone: input.timezone || "Asia/Riyadh",
        },
      },
      areas: { create: { name: input.locale === "en" ? "Main Hall" : "الصالة الرئيسية", sortOrder: 0 } },
    },
    include: { branches: true, areas: true },
  });

  for (const template of ROLE_TEMPLATES) {
    const permissionKeys = permissionsForTemplate(template.key);
    const roleScope: PermissionScope = template.key === "delivery_driver"
      ? "OWNED"
      : ["branch_manager", "waiter", "cashier", "chef", "kitchen_manager"].includes(template.key)
        ? "BRANCH"
        : "RESTAURANT";
    await tx.role.create({
      data: {
        restaurantId: restaurant.id,
        key: template.key,
        name: template.ar,
        nameEn: template.en,
        description: template.descriptionAr,
        isSystem: true,
        isDefault: template.key === "owner",
        permissions: {
          create: permissionKeys
            .filter((key) => permissionMap.has(key))
            .map((key) => ({ permissionId: permissionMap.get(key)!, scope: roleScope })),
        },
      },
    });
  }

  const ownerRole = await tx.role.findFirst({ where: { restaurantId: restaurant.id, key: "owner" } });
  await tx.restaurantMember.create({
    data: {
      restaurantId: restaurant.id,
      userId: input.userId,
      isOwner: true,
      title: input.locale === "en" ? "Owner" : "المالك",
      status: "ACTIVE",
      branchId: restaurant.branches[0]?.id,
      roles: ownerRole ? { create: { roleId: ownerRole.id } } : undefined,
    },
  });

  await tx.kitchenStation.createMany({
    data: [
      {
        restaurantId: restaurant.id,
        name: input.locale === "en" ? "Main kitchen" : "المطبخ الرئيسي",
        type: "KITCHEN",
        color: "#0ea5e9",
      },
      {
        restaurantId: restaurant.id,
        name: input.locale === "en" ? "Drinks" : "المشروبات",
        type: "BAR",
        color: "#8b5cf6",
      },
    ],
  });

  await tx.menu.create({
    data: {
      restaurantId: restaurant.id,
      name: input.locale === "en" ? "Main menu" : "المنيو الرئيسي",
      type: "MAIN",
      status: "DRAFT",
      isDefault: true,
    },
  });

  await tx.subscription.create({
    data: {
      restaurantId: restaurant.id,
      planId: plan.id,
      status: trialEndsAt ? "TRIALING" : "EXPIRED",
      billingCycle: cycle,
      currentPeriodStart: now,
      currentPeriodEnd: trialEndsAt ?? now,
      trialEndsAt,
    },
  });

  return restaurant;
}

/**
 * Provisions a restaurant, main branch, areas, roles, owner membership, default
 * kitchen stations, draft menu and trial subscription in one database transaction.
 */
export async function createRestaurantWithDefaults(input: CreateRestaurantInput) {
  return db.$transaction((tx) => createRestaurantInTransaction(tx, input));
}

/**
 * Returns the user's first owned restaurant, creating a draft atomically when none exists.
 * A PostgreSQL transaction advisory lock prevents two registration requests from
 * creating duplicate restaurants and subscriptions for the same owner.
 */
export async function ensureDraftRestaurant(userId: string, selection: RestaurantPlanSelection = {}) {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`restaurant-provision:${userId}`}))::text`;

    const existing = await tx.restaurantMember.findFirst({
      where: { userId, isOwner: true, status: "ACTIVE", restaurant: { deletedAt: null } },
      include: { restaurant: true },
      orderBy: { createdAt: "asc" },
    });
    if (existing) return existing.restaurant;

    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    return createRestaurantInTransaction(tx, {
      userId,
      name: user.name ? `مطعم ${user.name}` : "مطعمي",
      email: user.email,
      phone: user.phone ?? undefined,
      currency: undefined,
      timezone: "Asia/Riyadh",
      locale: user.locale,
      planKey: selection.planKey,
      billingCycle: selection.billingCycle,
    });
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
