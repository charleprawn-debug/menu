import "server-only";
import type { PaymentMethod } from "@prisma/client";

export type BillingCycleValue = "MONTHLY" | "YEARLY";
export type ProviderSubscriptionStatus = "TRIALING" | "ACTIVE" | "PAST_DUE" | "PAUSED" | "CANCELLED" | "EXPIRED";
export type ProviderInvoiceStatus = "ISSUED" | "PARTIALLY_PAID" | "PAID" | "VOID" | "REFUNDED";

export type NormalizedBillingEvent =
  | {
      eventId: string;
      type: "event.ignored";
      occurredAt: Date;
      providerEventType: string;
    }
  | {
      eventId: string;
      type: "payment.succeeded" | "payment.failed";
      occurredAt: Date;
      providerSubscriptionId: string;
      providerPaymentId: string;
      providerInvoiceId?: string | null;
      amount: string;
      currency: string;
      method?: PaymentMethod | null;
    }
  | {
      eventId: string;
      type: "invoice.updated";
      occurredAt: Date;
      providerSubscriptionId: string;
      providerInvoiceId: string;
      invoiceNumber: string;
      amount: string;
      currency: string;
      status: ProviderInvoiceStatus;
      periodStart: Date;
      periodEnd: Date;
      dueAt?: Date | null;
      paidAt?: Date | null;
      hostedInvoiceUrl?: string | null;
      pdfUrl?: string | null;
    }
  | {
      eventId: string;
      type: "subscription.updated";
      occurredAt: Date;
      providerSubscriptionId: string;
      status: ProviderSubscriptionStatus;
      currentPeriodStart: Date;
      currentPeriodEnd: Date;
      trialEndsAt?: Date | null;
      graceEndsAt?: Date | null;
      cancelAtPeriodEnd?: boolean;
    }
  | {
      eventId: string;
      type: "plan_change.applied" | "plan_change.cancelled";
      occurredAt: Date;
      providerScheduleId: string;
    };

export class BillingWebhookRejectedError extends Error {
  constructor() {
    super("BILLING_WEBHOOK_REJECTED");
    this.name = "BillingWebhookRejectedError";
  }
}

export class BillingEventRejectedError extends Error {
  constructor(code: string) {
    super(code);
    this.name = "BillingEventRejectedError";
  }
}

export interface CheckoutRequest {
  restaurantId: string;
  subscriptionId: string;
  planId: string;
  billingCycle: BillingCycleValue;
  providerPriceId: string;
  customerEmail: string;
  customerName?: string;
  /** Stable server-generated key; the selected provider must preserve idempotency. */
  idempotencyKey: string;
  successUrl: string;
  cancelUrl: string;
}

export interface BillingProvider {
  /** Stable, non-secret provider namespace used for durable external identifiers. */
  readonly id: string;
  createCheckout(request: CheckoutRequest): Promise<{ url: string; sessionId?: string }>;
  createPortal(request: { providerCustomerId: string; returnUrl: string }): Promise<{ url: string }>;
  updateTrialPlan(request: { providerSubscriptionId: string; providerPriceId: string; billingCycle: BillingCycleValue }): Promise<void>;
  cancelSubscription(request: { providerSubscriptionId: string; atPeriodEnd: boolean }): Promise<void>;
  resumeSubscription(request: { providerSubscriptionId: string }): Promise<void>;
  schedulePlanChange(request: {
    providerSubscriptionId: string;
    providerPriceId: string;
    billingCycle: BillingCycleValue;
    effectiveAt: Date;
    /** Stable local plan-change row ID; the adapter must reuse the same result on retries. */
    idempotencyKey: string;
  }): Promise<{ providerScheduleId: string; effectiveAt: Date }>;
  cancelScheduledPlanChange(request: { providerScheduleId: string }): Promise<void>;
  /** Must authenticate and normalize the exact raw request bytes; never accept parsed client JSON. */
  verifyWebhook(rawBody: Uint8Array, headers: Headers): Promise<NormalizedBillingEvent>;
}

export type BillingProviderAvailability =
  | { available: true; provider: BillingProvider }
  | { available: false; reason: "disabled" | "unconfigured" };

let registeredProvider: BillingProvider | null = null;

/** Called only by a future, owner-approved provider adapter module. */
export function registerBillingProvider(provider: BillingProvider): void {
  if (!provider.id.trim()) throw new Error("BILLING_PROVIDER_ID_REQUIRED");
  registeredProvider = provider;
}

/** Billing is fail-closed: flags alone never enable an unregistered or unselected adapter. */
export function getBillingProvider(): BillingProviderAvailability {
  if (process.env.BILLING_ENABLED !== "true") return { available: false, reason: "disabled" };
  const selectedProvider = process.env.BILLING_PROVIDER?.trim();
  if (!selectedProvider || selectedProvider === "disabled" || !registeredProvider || registeredProvider.id !== selectedProvider) {
    return { available: false, reason: "unconfigured" };
  }
  return { available: true, provider: registeredProvider };
}
