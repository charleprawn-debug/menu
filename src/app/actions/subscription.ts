"use server";

import { BillingCycle, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRestaurant } from "@/lib/auth/context";
import { db } from "@/lib/db";
import { getBillingProvider, type BillingProvider } from "@/lib/billing/provider";

function returnToSubscription(notice: string): never {
  revalidatePath("/app/subscription");
  redirect(`/app/subscription?notice=${encodeURIComponent(notice)}`);
}

function providerFor(subscription: { billingProvider: string | null; providerSubscriptionId: string | null }) {
  if (!subscription.providerSubscriptionId) return null;
  const selection = getBillingProvider();
  if (!selection.available || selection.provider.id !== subscription.billingProvider) returnToSubscription("billing-unavailable");
  return selection.provider;
}

async function schedulePendingProviderChange(
  provider: BillingProvider,
  change: { id: string; effectiveAt: Date },
  providerSubscriptionId: string,
  providerPriceId: string,
  billingCycle: BillingCycle,
): Promise<boolean> {
  let scheduled: { providerScheduleId: string; effectiveAt: Date };
  try {
    scheduled = await provider.schedulePlanChange({
      providerSubscriptionId,
      providerPriceId,
      billingCycle,
      effectiveAt: change.effectiveAt,
      idempotencyKey: change.id,
    });
  } catch {
    // Keep the durable pending row; a retry must use the same provider idempotency key.
    return false;
  }
  if (!scheduled.providerScheduleId.trim() || !(scheduled.effectiveAt instanceof Date)
    || !Number.isFinite(scheduled.effectiveAt.getTime()) || scheduled.effectiveAt < change.effectiveAt) {
    return false;
  }

  const attached = await db.subscriptionPlanChange.updateMany({
    where: { id: change.id, status: "PENDING_PROVIDER", providerScheduleId: null },
    data: { status: "SCHEDULED", providerScheduleId: scheduled.providerScheduleId, effectiveAt: scheduled.effectiveAt },
  });
  if (attached.count) return true;

  const current = await db.subscriptionPlanChange.findUnique({
    where: { id: change.id },
    select: { status: true, providerScheduleId: true },
  });
  if (current?.status === "SCHEDULED" && current.providerScheduleId === scheduled.providerScheduleId) return true;

  // A concurrent cancellation may have won while the provider call was in flight.
  await provider.cancelScheduledPlanChange({ providerScheduleId: scheduled.providerScheduleId }).catch(() => undefined);
  return false;
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
      select: {
        id: true, planId: true, status: true, billingCycle: true, currentPeriodEnd: true,
        cancelAtPeriodEnd: true, billingProvider: true, providerSubscriptionId: true,
      },
    }),
    db.plan.findFirst({ where: { id: planId, isActive: true }, include: { providerPrices: true } }),
  ]);
  if (!subscription || !selectedPlan) returnToSubscription("invalid-selection");
  if (subscription.cancelAtPeriodEnd) returnToSubscription("cancellation-scheduled");

  const provider = providerFor(subscription);
  if (subscription.status === "TRIALING") {
    if (provider) {
      const providerPrice = selectedPlan.providerPrices.find((price) => price.billingProvider === provider.id && price.billingCycle === cycle);
      if (!providerPrice) returnToSubscription("billing-unavailable");
      await provider.updateTrialPlan({
        providerSubscriptionId: subscription.providerSubscriptionId!,
        providerPriceId: providerPrice.providerPriceId,
        billingCycle: cycle,
      });
    }
    const updated = await db.subscription.updateMany({
      where: { id: subscription.id, restaurantId: membership.restaurantId, status: "TRIALING" },
      data: { planId: selectedPlan.id, billingCycle: cycle },
    });
    if (!updated.count) returnToSubscription("subscription-not-active");
    returnToSubscription("trial-plan-updated");
  }

  if (subscription.status !== "ACTIVE") returnToSubscription("subscription-not-active");
  if (subscription.planId === selectedPlan.id && subscription.billingCycle === cycle) returnToSubscription("same-plan");

  const existingChange = await db.subscriptionPlanChange.findFirst({
    where: { subscriptionId: subscription.id, status: { in: ["SCHEDULED", "AWAITING_PROVIDER", "PENDING_PROVIDER"] } },
    select: { id: true, status: true, toPlanId: true, billingCycle: true, billingProvider: true, effectiveAt: true },
  });
  if (existingChange) {
    if (existingChange.status === "PENDING_PROVIDER" && provider
      && existingChange.billingProvider === provider.id
      && existingChange.toPlanId === selectedPlan.id
      && existingChange.billingCycle === cycle) {
      const providerPrice = selectedPlan.providerPrices.find((price) => price.billingProvider === provider.id && price.billingCycle === cycle);
      if (!providerPrice) returnToSubscription("billing-unavailable");
      const scheduled = await schedulePendingProviderChange(
        provider,
        { id: existingChange.id, effectiveAt: existingChange.effectiveAt },
        subscription.providerSubscriptionId!,
        providerPrice.providerPriceId,
        cycle,
      );
      returnToSubscription(scheduled ? "plan-change-scheduled" : "billing-unavailable");
    }
    returnToSubscription("change-already-scheduled");
  }

  if (provider) {
    const providerPrice = selectedPlan.providerPrices.find((price) => price.billingProvider === provider.id && price.billingCycle === cycle);
    if (!providerPrice) returnToSubscription("billing-unavailable");
    let pending: { id: string; effectiveAt: Date };
    try {
      pending = await db.$transaction(async (tx) => {
        const current = await tx.subscription.findFirst({
          where: {
            id: subscription.id,
            restaurantId: membership.restaurantId,
            status: "ACTIVE",
            cancelAtPeriodEnd: false,
            billingProvider: provider.id,
            providerSubscriptionId: subscription.providerSubscriptionId,
          },
          select: { id: true, planId: true, currentPeriodEnd: true },
        });
        if (!current || current.planId !== subscription.planId) throw new Error("SUBSCRIPTION_CHANGED");
        const scheduled = await tx.subscriptionPlanChange.findFirst({
          where: { subscriptionId: current.id, status: { in: ["SCHEDULED", "AWAITING_PROVIDER", "PENDING_PROVIDER"] } },
          select: { id: true },
        });
        if (scheduled) throw new Error("CHANGE_ALREADY_SCHEDULED");
        return tx.subscriptionPlanChange.create({
          data: {
            subscriptionId: current.id,
            fromPlanId: current.planId,
            toPlanId: selectedPlan.id,
            billingCycle: cycle,
            effectiveAt: current.currentPeriodEnd,
            status: "PENDING_PROVIDER",
            requestedById: membership.userId,
            billingProvider: provider.id,
          },
          select: { id: true, effectiveAt: true },
        });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message === "CHANGE_ALREADY_SCHEDULED" || (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034")) {
        returnToSubscription("change-already-scheduled");
      }
      if (message === "SUBSCRIPTION_CHANGED") returnToSubscription("subscription-not-active");
      throw error;
    }
    const scheduled = await schedulePendingProviderChange(
      provider,
      pending,
      subscription.providerSubscriptionId!,
      providerPrice.providerPriceId,
      cycle,
    );
    returnToSubscription(scheduled ? "plan-change-scheduled" : "billing-unavailable");
  }

  try {
    await db.$transaction(async (tx) => {
      const current = await tx.subscription.findFirst({
        where: { id: subscription.id, restaurantId: membership.restaurantId, status: "ACTIVE", cancelAtPeriodEnd: false },
        select: { id: true, planId: true, currentPeriodEnd: true, providerSubscriptionId: true },
      });
      if (!current || current.providerSubscriptionId !== subscription.providerSubscriptionId || current.planId !== subscription.planId) {
        throw new Error("SUBSCRIPTION_CHANGED");
      }
      const scheduled = await tx.subscriptionPlanChange.findFirst({
        where: { subscriptionId: current.id, status: { in: ["SCHEDULED", "AWAITING_PROVIDER", "PENDING_PROVIDER"] } },
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
    if (message === "CHANGE_ALREADY_SCHEDULED" || (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034")) {
      returnToSubscription("change-already-scheduled");
    }
    if (message === "SUBSCRIPTION_CHANGED") returnToSubscription("subscription-not-active");
    throw error;
  }
  returnToSubscription("plan-change-scheduled");
}

export async function cancelScheduledPlanChangeAction(): Promise<void> {
  const membership = await requireRestaurant("subscription.manage");
  const subscription = await db.subscription.findFirst({
    where: { restaurantId: membership.restaurantId, restaurant: { deletedAt: null } },
    select: { id: true, billingProvider: true, providerSubscriptionId: true },
  });
  if (!subscription) returnToSubscription("subscription-not-found");
  const change = await db.subscriptionPlanChange.findFirst({
    where: { subscriptionId: subscription.id, status: { in: ["SCHEDULED", "AWAITING_PROVIDER", "PENDING_PROVIDER"] } },
    select: { id: true, status: true, billingProvider: true, providerScheduleId: true },
  });
  if (!change) returnToSubscription("plan-change-cancelled");
  if (change.providerScheduleId) {
    const provider = providerFor(subscription);
    if (!provider || provider.id !== change.billingProvider) returnToSubscription("billing-unavailable");
    await provider.cancelScheduledPlanChange({ providerScheduleId: change.providerScheduleId });
  }
  await db.subscriptionPlanChange.updateMany({
    where: { id: change.id, status: { in: ["SCHEDULED", "AWAITING_PROVIDER", "PENDING_PROVIDER"] } },
    data: { status: "CANCELLED" },
  });
  returnToSubscription("plan-change-cancelled");
}

export async function cancelSubscriptionAtPeriodEndAction(): Promise<void> {
  const membership = await requireRestaurant("subscription.manage");
  const subscription = await db.subscription.findFirst({
    where: { restaurantId: membership.restaurantId, restaurant: { deletedAt: null }, status: { in: ["TRIALING", "ACTIVE"] } },
    select: { id: true, billingProvider: true, providerSubscriptionId: true },
  });
  if (!subscription) returnToSubscription("subscription-not-active");
  const provider = providerFor(subscription);
  if (provider) await provider.cancelSubscription({ providerSubscriptionId: subscription.providerSubscriptionId!, atPeriodEnd: true });
  await db.subscription.updateMany({
    where: { id: subscription.id, restaurantId: membership.restaurantId, status: { in: ["TRIALING", "ACTIVE"] } },
    data: { cancelAtPeriodEnd: true },
  });
  returnToSubscription("cancellation-scheduled");
}

export async function resumeSubscriptionAction(): Promise<void> {
  const membership = await requireRestaurant("subscription.manage");
  const subscription = await db.subscription.findFirst({
    where: {
      restaurantId: membership.restaurantId, restaurant: { deletedAt: null },
      status: { in: ["TRIALING", "ACTIVE"] }, cancelAtPeriodEnd: true,
    },
    select: { id: true, billingProvider: true, providerSubscriptionId: true },
  });
  if (!subscription) returnToSubscription("subscription-not-active");
  const provider = providerFor(subscription);
  if (provider) await provider.resumeSubscription({ providerSubscriptionId: subscription.providerSubscriptionId! });
  await db.subscription.updateMany({
    where: { id: subscription.id, restaurantId: membership.restaurantId, status: { in: ["TRIALING", "ACTIVE"] }, cancelAtPeriodEnd: true },
    data: { cancelAtPeriodEnd: false, cancelledAt: null },
  });
  returnToSubscription("renewal-resumed");
}
