import "server-only";

import { createHash } from "node:crypto";
import { InvoiceStatus, PaymentMethod, Prisma, type SubscriptionStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { BillingEventRejectedError, type NormalizedBillingEvent } from "./provider";

const subscriptionStatuses: readonly SubscriptionStatus[] = ["TRIALING", "ACTIVE", "PAST_DUE", "PAUSED", "CANCELLED", "EXPIRED"];
const invoiceStatuses = ["ISSUED", "PARTIALLY_PAID", "PAID", "VOID", "REFUNDED"] as const;
const paymentMethods = Object.values(PaymentMethod) as string[];

function validDate(value: Date): boolean {
  return value instanceof Date && Number.isFinite(value.getTime());
}

function verifiedMoney(amount: string, currency: string) {
  const decimal = new Prisma.Decimal(amount);
  const normalizedCurrency = currency.trim().toUpperCase();
  if (!decimal.isFinite() || decimal.lt(0) || !/^[A-Z]{3}$/.test(normalizedCurrency)) {
    throw new Error("INVALID_VERIFIED_BILLING_AMOUNT");
  }
  return { amount: decimal, currency: normalizedCurrency };
}

async function successfulPaymentsInCurrency(tx: Prisma.TransactionClient, invoiceId: string, currency: string) {
  const payments = await tx.subscriptionPayment.findMany({
    where: { invoiceId, status: "SUCCEEDED" },
    select: { amount: true, currency: true },
  });
  return payments.reduce(
    (sum, payment) => payment.currency.trim().toUpperCase() === currency ? sum.add(payment.amount) : sum,
    new Prisma.Decimal(0),
  );
}

function secureProviderUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password) throw new Error("INVALID_PROVIDER_URL");
  return url.toString();
}

function localInvoiceNumber(provider: string, providerInvoiceId: string): string {
  const digest = createHash("sha256").update(`${provider}\0${providerInvoiceId}`).digest("hex").slice(0, 24).toUpperCase();
  return `EXT-${digest}`;
}

/** Process only the normalized result returned by a registered adapter's webhook verifier.
 * Event rows contain provider/event identifiers and processing metadata, never raw payloads.
 */
export async function processVerifiedBillingEvent(provider: string, event: NormalizedBillingEvent) {
  if (!provider.trim() || !event.eventId.trim() || !event.type || !validDate(event.occurredAt)) {
    throw new Error("INVALID_VERIFIED_BILLING_EVENT");
  }

  try {
    return await db.$transaction(async (tx) => {
      await tx.billingProviderEvent.create({
        data: {
          provider,
          eventId: event.eventId,
          eventType: event.type === "event.ignored" ? event.providerEventType.slice(0, 200) : event.type,
        },
      });
      let result = "UNMATCHED";

      if (event.type === "payment.succeeded" || event.type === "payment.failed") {
        const { amount, currency } = verifiedMoney(event.amount, event.currency);
        if (!event.providerSubscriptionId.trim() || !event.providerPaymentId.trim()) throw new Error("INVALID_PROVIDER_PAYMENT_REFERENCE");
        if (event.method && !paymentMethods.includes(event.method)) throw new Error("INVALID_PROVIDER_PAYMENT_METHOD");

        const subscription = await tx.subscription.findFirst({
          where: { billingProvider: provider, providerSubscriptionId: event.providerSubscriptionId },
          select: { id: true },
        });
        if (!subscription) {
          result = "UNMATCHED";
        } else {
          const invoice = event.providerInvoiceId
            ? await tx.subscriptionInvoice.findFirst({
                where: { billingProvider: provider, providerInvoiceId: event.providerInvoiceId },
                select: { id: true, subscriptionId: true, amount: true, currency: true, status: true, providerUpdatedAt: true },
              })
            : null;
          if (invoice && invoice.subscriptionId !== subscription.id) throw new Error("PROVIDER_INVOICE_SUBSCRIPTION_MISMATCH");
          if (invoice && invoice.currency.trim().toUpperCase() !== currency) {
            throw new BillingEventRejectedError("PROVIDER_PAYMENT_CURRENCY_MISMATCH");
          }

          const existing = await tx.subscriptionPayment.findFirst({
            where: { billingProvider: provider, providerPaymentId: event.providerPaymentId },
          });
          if (existing && existing.subscriptionId !== subscription.id) throw new Error("PROVIDER_PAYMENT_SUBSCRIPTION_MISMATCH");
          if (existing && (!existing.amount.equals(amount) || existing.currency.toUpperCase() !== currency)) {
            throw new Error("VERIFIED_PAYMENT_DOES_NOT_MATCH_LOCAL_RECORD");
          }
          if (existing && event.providerInvoiceId && existing.providerInvoiceId && existing.providerInvoiceId !== event.providerInvoiceId) {
            throw new Error("PROVIDER_PAYMENT_INVOICE_MISMATCH");
          }

          const succeeded = event.type === "payment.succeeded";
          if (existing?.status === "SUCCEEDED" && !succeeded) {
            result = "STALE";
          } else {
            const paymentData = {
              invoiceId: invoice?.id ?? existing?.invoiceId ?? null,
              providerInvoiceId: event.providerInvoiceId ?? existing?.providerInvoiceId ?? null,
              amount,
              currency,
              method: event.method ?? existing?.method ?? null,
              status: succeeded ? ("SUCCEEDED" as const) : ("FAILED" as const),
              paidAt: succeeded ? event.occurredAt : null,
            };
            if (existing) {
              await tx.subscriptionPayment.update({ where: { id: existing.id }, data: paymentData });
            } else {
              await tx.subscriptionPayment.create({
                data: {
                  subscriptionId: subscription.id,
                  billingProvider: provider,
                  providerPaymentId: event.providerPaymentId,
                  ...paymentData,
                },
              });
            }
            result = "APPLIED";

            if (succeeded && invoice && invoice.status !== "VOID" && invoice.status !== "REFUNDED"
              && (!invoice.providerUpdatedAt || event.occurredAt >= invoice.providerUpdatedAt)) {
              const paidAmount = await successfulPaymentsInCurrency(tx, invoice.id, invoice.currency.trim().toUpperCase());
              const status: InvoiceStatus = paidAmount.gte(invoice.amount) ? "PAID" : paidAmount.gt(0) ? "PARTIALLY_PAID" : "ISSUED";
              await tx.subscriptionInvoice.update({
                where: { id: invoice.id },
                data: { status, paidAt: status === "PAID" ? event.occurredAt : null, providerUpdatedAt: event.occurredAt },
              });
            }
          }
        }
      } else if (event.type === "invoice.updated") {
        const { amount, currency } = verifiedMoney(event.amount, event.currency);
        if (!event.providerSubscriptionId.trim() || !event.providerInvoiceId.trim() || !event.invoiceNumber.trim()) {
          throw new Error("INVALID_PROVIDER_INVOICE_REFERENCE");
        }
        if (!validDate(event.periodStart) || !validDate(event.periodEnd) || event.periodEnd <= event.periodStart) {
          throw new Error("INVALID_PROVIDER_INVOICE_PERIOD");
        }
        if (event.dueAt && !validDate(event.dueAt) || event.paidAt && !validDate(event.paidAt)) {
          throw new Error("INVALID_PROVIDER_INVOICE_DATE");
        }
        if (!invoiceStatuses.includes(event.status)) throw new Error("INVALID_PROVIDER_INVOICE_STATUS");
        const hostedInvoiceUrl = secureProviderUrl(event.hostedInvoiceUrl);
        const pdfUrl = secureProviderUrl(event.pdfUrl);
        const subscription = await tx.subscription.findFirst({
          where: { billingProvider: provider, providerSubscriptionId: event.providerSubscriptionId },
          select: { id: true },
        });
        if (!subscription) {
          result = "UNMATCHED";
        } else {
          const existing = await tx.subscriptionInvoice.findFirst({
            where: { billingProvider: provider, providerInvoiceId: event.providerInvoiceId },
          });
          if (existing && existing.subscriptionId !== subscription.id) throw new Error("PROVIDER_INVOICE_SUBSCRIPTION_MISMATCH");
          if (existing && existing.currency.trim().toUpperCase() !== currency) {
            throw new BillingEventRejectedError("PROVIDER_INVOICE_CURRENCY_MISMATCH");
          }
          const isStale = !!existing?.providerUpdatedAt && event.occurredAt < existing.providerUpdatedAt;
          let invoiceId = existing?.id;
          if (!existing) {
            const created = await tx.subscriptionInvoice.create({
              data: {
                subscriptionId: subscription.id,
                number: localInvoiceNumber(provider, event.providerInvoiceId),
                amount,
                currency,
                status: event.status,
                periodStart: event.periodStart,
                periodEnd: event.periodEnd,
                dueAt: event.dueAt ?? null,
                paidAt: event.status === "PAID" ? (event.paidAt ?? event.occurredAt) : (event.paidAt ?? null),
                billingProvider: provider,
                providerInvoiceId: event.providerInvoiceId,
                providerInvoiceNumber: event.invoiceNumber,
                providerUpdatedAt: event.occurredAt,
                hostedInvoiceUrl,
                pdfUrl,
              },
              select: { id: true },
            });
            invoiceId = created.id;
          } else if (!isStale) {
            await tx.subscriptionInvoice.update({
              where: { id: existing.id },
              data: {
                amount,
                currency,
                status: event.status,
                periodStart: event.periodStart,
                periodEnd: event.periodEnd,
                dueAt: event.dueAt ?? null,
                paidAt: event.status === "PAID" ? (event.paidAt ?? event.occurredAt) : (event.paidAt ?? null),
                providerInvoiceNumber: event.invoiceNumber,
                providerUpdatedAt: event.occurredAt,
                hostedInvoiceUrl,
                pdfUrl,
              },
            });
          }

          if (invoiceId) {
            const unlinkedPayments = await tx.subscriptionPayment.findMany({
              where: {
                billingProvider: provider,
                providerInvoiceId: event.providerInvoiceId,
                subscriptionId: subscription.id,
                invoiceId: null,
              },
              select: { id: true, currency: true },
            });
            if (unlinkedPayments.some((payment) => payment.currency.trim().toUpperCase() !== currency)) {
              throw new BillingEventRejectedError("PROVIDER_PAYMENT_CURRENCY_MISMATCH");
            }
            if (unlinkedPayments.length) {
              await tx.subscriptionPayment.updateMany({
                where: { id: { in: unlinkedPayments.map((payment) => payment.id) }, invoiceId: null },
                data: { invoiceId },
              });
            }
            const paidAmount = await successfulPaymentsInCurrency(tx, invoiceId, currency);
            const invoiceNow = await tx.subscriptionInvoice.findUnique({ where: { id: invoiceId }, select: { amount: true, status: true } });
            if (invoiceNow && invoiceNow.status !== "VOID" && invoiceNow.status !== "REFUNDED") {
              if (paidAmount.gte(invoiceNow.amount) && paidAmount.gt(0)) {
                await tx.subscriptionInvoice.update({ where: { id: invoiceId }, data: { status: "PAID" } });
              } else if (paidAmount.gt(0) && invoiceNow.status === "ISSUED") {
                await tx.subscriptionInvoice.update({ where: { id: invoiceId }, data: { status: "PARTIALLY_PAID" } });
              }
            }
          }
          result = isStale ? "STALE" : "APPLIED";
        }
      } else if (event.type === "subscription.updated") {
        if (!subscriptionStatuses.includes(event.status)) throw new Error("INVALID_PROVIDER_SUBSCRIPTION_STATUS");
        if (!validDate(event.currentPeriodStart) || !validDate(event.currentPeriodEnd) || event.currentPeriodEnd < event.currentPeriodStart) {
          throw new Error("INVALID_PROVIDER_SUBSCRIPTION_PERIOD");
        }
        const subscription = await tx.subscription.findFirst({
          where: { billingProvider: provider, providerSubscriptionId: event.providerSubscriptionId },
          select: { id: true, providerUpdatedAt: true },
        });
        if (subscription && subscription.providerUpdatedAt && event.occurredAt < subscription.providerUpdatedAt) {
          result = "STALE";
        } else {
          const updated = await tx.subscription.updateMany({
            where: {
              billingProvider: provider,
              providerSubscriptionId: event.providerSubscriptionId,
              OR: [{ providerUpdatedAt: null }, { providerUpdatedAt: { lte: event.occurredAt } }],
            },
            data: {
              status: event.status,
              currentPeriodStart: event.currentPeriodStart,
              currentPeriodEnd: event.currentPeriodEnd,
              trialEndsAt: event.trialEndsAt,
              graceEndsAt: event.graceEndsAt,
              cancelAtPeriodEnd: event.cancelAtPeriodEnd,
              cancelledAt: event.status === "CANCELLED" ? event.occurredAt : null,
              providerUpdatedAt: event.occurredAt,
            },
          });
          if (updated.count) result = "APPLIED";
        }
      } else if (event.type === "plan_change.applied") {
        const change = await tx.subscriptionPlanChange.findFirst({
          where: { billingProvider: provider, providerScheduleId: event.providerScheduleId, status: "SCHEDULED" },
          select: { id: true, subscriptionId: true, toPlanId: true, billingCycle: true },
        });
        if (change) {
          const updated = await tx.subscription.updateMany({
            where: { id: change.subscriptionId, billingProvider: provider },
            data: { planId: change.toPlanId, billingCycle: change.billingCycle },
          });
          if (updated.count) {
            await tx.subscriptionPlanChange.update({ where: { id: change.id }, data: { status: "APPLIED", appliedAt: event.occurredAt } });
            result = "APPLIED";
          }
        }
      } else if (event.type === "plan_change.cancelled") {
        const changed = await tx.subscriptionPlanChange.updateMany({
          where: { billingProvider: provider, providerScheduleId: event.providerScheduleId, status: "SCHEDULED" },
          data: { status: "CANCELLED" },
        });
        if (changed.count) result = "APPLIED";
      } else if (event.type === "event.ignored") {
        result = "IGNORED";
      }

      await tx.billingProviderEvent.update({
        where: { provider_eventId: { provider, eventId: event.eventId } },
        data: { result, processedAt: new Date() },
      });
      return { duplicate: false, result };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existingEvent = await db.billingProviderEvent.findUnique({
        where: { provider_eventId: { provider, eventId: event.eventId } },
        select: { id: true },
      });
      if (existingEvent) return { duplicate: true, result: "DUPLICATE" };
    }
    throw error;
  }
}
