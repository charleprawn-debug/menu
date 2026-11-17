"use server";

import { BillingCycle, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRestaurant } from "@/lib/auth/context";
import { db } from "@/lib/db";

function returnToSubscription(notice: string): never {
  revalidatePath("/app/subscription");
  redirect(`/app/subscription?notice=${encodeURIComponent(notice)}`);
}

function addCycle(date: Date, cycle: BillingCycle): Date {
  const monthDelta = cycle === BillingCycle.YEARLY ? 12 : 1;
  const targetMonthIndex = date.getMonth() + monthDelta;
  const firstOfTarget = new Date(date);
  firstOfTarget.setDate(1);
  firstOfTarget.setMonth(targetMonthIndex);
  const finalDay = new Date(firstOfTarget.getFullYear(), firstOfTarget.getMonth() + 1, 0).getDate();
  firstOfTarget.setDate(Math.min(date.getDate(), finalDay));
  return firstOfTarget;
}

export async function changeSubscriptionPlanAction(formData: FormData): Promise<void> {
  const membership = await requireRestaurant("subscription.manage");
  const planId = String(formData.get("planId") ?? "");
  const cycleRaw = String(formData.get("billingCycle") ?? "");
  if (!planId || (cycleRaw !== "MONTHLY" && cycleRaw !== "YEARLY")) returnToSubscription("invalid-selection");
  const cycle = cycleRaw as BillingCycle;

  const [subscription, selectedPlan] = await Promise.all([
    db.subscription.findFirst({
      where: { restaurantId: membership.restaurantId, restaurant: { deletedAt: null } },
      select: { id: true, planId: true, status: true, billingCycle: true, currentPeriodEnd: true, cancelAtPeriodEnd: true },
    }),
    db.plan.findFirst({ where: { id: planId, isActive: true }, select: { id: true } }),
  ]);
  if (!subscription || !selectedPlan) returnToSubscription("invalid-selection");
  if (subscription.cancelAtPeriodEnd) returnToSubscription("cancellation-scheduled");

  if (subscription.status === "TRIALING") {
    const updated = await db.subscription.updateMany({
      where: { id: subscription.id, restaurantId: membership.restaurantId, status: "TRIALING" },
      data: { planId: selectedPlan.id, billingCycle: cycle },
    });
    if (updated.count === 0) returnToSubscription("subscription-not-active");
    returnToSubscription("trial-plan-updated");
  }

  if (subscription.status !== "ACTIVE") returnToSubscription("subscription-not-active");
  if (subscription.planId === selectedPlan.id && subscription.billingCycle === cycle) {
    returnToSubscription("same-plan");
  }

  try {
    await db.$transaction(async (tx) => {
      const current = await tx.subscription.findFirst({
        where: { id: subscription.id, restaurantId: membership.restaurantId, status: "ACTIVE", cancelAtPeriodEnd: false },
        select: { id: true, planId: true, currentPeriodEnd: true },
      });
      if (!current) throw new Error("SUBSCRIPTION_CHANGED");
      const scheduled = await tx.subscriptionPlanChange.findFirst({
        where: { subscriptionId: current.id, status: "SCHEDULED" },
        select: { id: true },
      });
      if (scheduled) throw new Error("CHANGE_ALREADY_SCHEDULED");
      await tx.subscriptionPlanChange.create({
        data: {
          subscriptionId: current.id,
          fromPlanId: current.planId,
          toPlanId: selectedPlan.id,
          billingCycle: cycle,
          effectiveAt: current.currentPeriodEnd,
          status: "SCHEDULED",
          requestedById: membership.userId,
        },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "CHANGE_ALREADY_SCHEDULED") returnToSubscription("change-already-scheduled");
    if (message === "SUBSCRIPTION_CHANGED") returnToSubscription("subscription-not-active");
    throw error;
  }
  returnToSubscription("plan-change-scheduled");
}

export async function cancelScheduledPlanChangeAction(): Promise<void> {
  const membership = await requireRestaurant("subscription.manage");
  const subscription = await db.subscription.findFirst({
    where: { restaurantId: membership.restaurantId, restaurant: { deletedAt: null } },
    select: { id: true },
  });
  if (!subscription) returnToSubscription("subscription-not-found");

  await db.subscriptionPlanChange.updateMany({
    where: { subscriptionId: subscription.id, status: "SCHEDULED" },
    data: { status: "CANCELLED" },
  });
  returnToSubscription("plan-change-cancelled");
}

export async function cancelSubscriptionAtPeriodEndAction(): Promise<void> {
  const membership = await requireRestaurant("subscription.manage");
  await db.subscription.updateMany({
    where: {
      restaurantId: membership.restaurantId,
      restaurant: { deletedAt: null },
      status: { in: ["TRIALING", "ACTIVE"] },
    },
    data: { cancelAtPeriodEnd: true },
  });
  returnToSubscription("cancellation-scheduled");
}

export async function resumeSubscriptionAction(): Promise<void> {
  const membership = await requireRestaurant("subscription.manage");
  await db.subscription.updateMany({
    where: {
      restaurantId: membership.restaurantId,
      restaurant: { deletedAt: null },
      status: { in: ["TRIALING", "ACTIVE"] },
      cancelAtPeriodEnd: true,
    },
    data: { cancelAtPeriodEnd: false, cancelledAt: null },
  });
  returnToSubscription("renewal-resumed");
}

export async function createRenewalInvoiceAction(): Promise<void> {
  const membership = await requireRestaurant("subscription.manage");
  const subscription = await db.subscription.findFirst({
    where: {
      restaurantId: membership.restaurantId,
      restaurant: { deletedAt: null },
      status: "ACTIVE",
      cancelAtPeriodEnd: false,
    },
    include: {
      plan: { select: { monthlyPrice: true, yearlyPrice: true, currency: true, isActive: true } },
      planChanges: { where: { status: "SCHEDULED" }, select: { id: true }, take: 1 },
    },
  });
  if (!subscription || !subscription.plan.isActive) returnToSubscription("renewal-unavailable");
  if (subscription.planChanges.length > 0) returnToSubscription("renewal-with-change-scheduled");

  const periodStart = subscription.currentPeriodEnd;
  const periodEnd = addCycle(periodStart, subscription.billingCycle);
  const periodKey = `${periodStart.toISOString()}_${periodEnd.toISOString()}`;
  const idempotencyKey = `renewal:${subscription.id}:${periodKey}`;
  const invoiceNumber = `SUB-${subscription.id}-${periodStart.toISOString().slice(0, 10)}`;
  const amount = subscription.billingCycle === BillingCycle.YEARLY
    ? subscription.plan.yearlyPrice
    : subscription.plan.monthlyPrice;

  await db.subscriptionInvoice.upsert({
    where: { idempotencyKey },
    update: {},
    create: {
      subscriptionId: subscription.id,
      idempotencyKey,
      number: invoiceNumber,
      amount,
      currency: subscription.plan.currency,
      status: "ISSUED",
      periodStart,
      periodEnd,
    },
  });
  returnToSubscription("invoice-issued-pending-payment");
}
