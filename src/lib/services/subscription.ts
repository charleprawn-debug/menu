import "server-only";
import { db } from "@/lib/db";

export type SubscriptionLimitKey = "staff" | "branches" | "products" | "tables" | "ordersPerMonth" | "storageMb";

const ACTIVE_ACCESS_STATUSES = ["TRIALING", "ACTIVE"] as const;

/** Resolve access from the current database subscription; callers cannot supply entitlements. */
export async function assertSubscriptionAccess(restaurantId: string) {
  const subscription = await db.subscription.findFirst({
    where: { restaurantId, restaurant: { deletedAt: null } },
    include: { plan: true },
  });
  if (!subscription || !ACTIVE_ACCESS_STATUSES.includes(subscription.status as (typeof ACTIVE_ACCESS_STATUSES)[number])) {
    throw new Error("SUBSCRIPTION_ACCESS_REQUIRED");
  }
  return subscription;
}

/** Throws unless the current subscription plan includes the requested active feature. */
export async function assertPlanFeature(restaurantId: string, featureKey: string) {
  const subscription = await assertSubscriptionAccess(restaurantId);
  const feature = await db.planFeature.findFirst({
    where: {
      planId: subscription.planId,
      enabled: true,
      feature: { key: featureKey, isActive: true },
    },
    select: { featureId: true, enabled: true, limitValue: true, note: true },
  });
  if (!feature) throw new Error("PLAN_FEATURE_REQUIRED");
  return feature;
}

/**
 * Check a plan allowance using both the current DB plan and a server-side usage count.
 * The result is useful to callers for limit messaging; no client-provided usage/limit is trusted.
 */
export async function assertPlanLimit(restaurantId: string, key: SubscriptionLimitKey) {
  const subscription = await assertSubscriptionAccess(restaurantId);
  const plan = subscription.plan;
  let usage: number;
  let limit: number | null;

  switch (key) {
    case "staff":
      [usage, limit] = [
        await db.restaurantMember.count({ where: { restaurantId, status: "ACTIVE" } }),
        plan.maxStaff,
      ];
      break;
    case "branches":
      [usage, limit] = [
        await db.branch.count({ where: { restaurantId, isActive: true } }),
        plan.maxBranches,
      ];
      break;
    case "products":
      [usage, limit] = [
        await db.product.count({ where: { restaurantId, deletedAt: null } }),
        plan.maxProducts,
      ];
      break;
    case "tables":
      [usage, limit] = [
        await db.table.count({ where: { restaurantId, isActive: true } }),
        plan.maxTables,
      ];
      break;
    case "ordersPerMonth": {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      [usage, limit] = [
        await db.order.count({ where: { restaurantId, createdAt: { gte: monthStart } } }),
        plan.maxOrdersPerMonth,
      ];
      break;
    }
    case "storageMb": {
      const stored = await db.restaurantMedia.aggregate({
        where: { restaurantId },
        _sum: { sizeBytes: true },
      });
      usage = (stored._sum.sizeBytes ?? 0) / (1024 * 1024);
      limit = plan.storageMb;
      break;
    }
  }

  if (limit === -1) limit = null;
  if (limit !== null && usage >= limit) throw new Error("PLAN_LIMIT_REACHED");
  return { usage, limit, remaining: limit === null ? null : Math.max(0, limit - usage) };
}
