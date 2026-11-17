-- Forward-only provider-neutral billing support. This migration preserves historical invoice/payment statuses.
CREATE TABLE "plan_provider_prices" (
  "id" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "billingProvider" TEXT NOT NULL,
  "billingCycle" "BillingCycle" NOT NULL,
  "providerPriceId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "plan_provider_prices_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "plan_provider_prices_planId_billingProvider_billingCycle_key"
  ON "plan_provider_prices"("planId", "billingProvider", "billingCycle");
CREATE UNIQUE INDEX "plan_provider_prices_billingProvider_providerPriceId_key"
  ON "plan_provider_prices"("billingProvider", "providerPriceId");
ALTER TABLE "plan_provider_prices"
  ADD CONSTRAINT "plan_provider_prices_planId_fkey"
  FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "subscriptions"
  ADD COLUMN "billingProvider" TEXT,
  ADD COLUMN "providerCustomerId" TEXT,
  ADD COLUMN "providerSubscriptionId" TEXT,
  ADD COLUMN "graceEndsAt" TIMESTAMP(3),
  ADD COLUMN "providerUpdatedAt" TIMESTAMP(3);

ALTER TABLE "subscription_invoices"
  ADD COLUMN "billingProvider" TEXT,
  ADD COLUMN "providerInvoiceId" TEXT,
  ADD COLUMN "providerInvoiceNumber" TEXT,
  ADD COLUMN "providerUpdatedAt" TIMESTAMP(3),
  ADD COLUMN "hostedInvoiceUrl" TEXT;

ALTER TABLE "subscription_payments"
  ADD COLUMN "billingProvider" TEXT,
  ADD COLUMN "providerPaymentId" TEXT,
  ADD COLUMN "providerInvoiceId" TEXT;

-- Successful provider-linked payments require a complete, timestamped reference.
-- Legacy manual/demo records with both provider fields NULL remain unchanged.
ALTER TABLE "subscription_payments" ALTER COLUMN "method" DROP DEFAULT;
ALTER TABLE "subscription_payments" ALTER COLUMN "method" DROP NOT NULL;
ALTER TABLE "subscription_payments" ALTER COLUMN "paidAt" DROP DEFAULT;
ALTER TABLE "subscription_payments" ALTER COLUMN "paidAt" DROP NOT NULL;

ALTER TABLE "subscription_plan_changes"
  ADD COLUMN "billingProvider" TEXT,
  ADD COLUMN "providerScheduleId" TEXT;

CREATE UNIQUE INDEX "subscriptions_billingProvider_providerSubscriptionId_key"
  ON "subscriptions"("billingProvider", "providerSubscriptionId");
CREATE UNIQUE INDEX "subscription_invoices_billingProvider_providerInvoiceId_key"
  ON "subscription_invoices"("billingProvider", "providerInvoiceId");
CREATE UNIQUE INDEX "subscription_payments_billingProvider_providerPaymentId_key"
  ON "subscription_payments"("billingProvider", "providerPaymentId");
CREATE UNIQUE INDEX "subscription_plan_changes_billingProvider_providerScheduleId_key"
  ON "subscription_plan_changes"("billingProvider", "providerScheduleId");
ALTER TABLE "subscription_payments"
  ADD CONSTRAINT "subscription_payments_success_requires_provider_check"
  CHECK (
    "status" <> 'SUCCEEDED'
    OR (
      "paidAt" IS NOT NULL
      AND (("billingProvider" IS NULL AND "providerPaymentId" IS NULL)
        OR ("billingProvider" IS NOT NULL AND "providerPaymentId" IS NOT NULL))
    )
  );

CREATE TABLE "billing_provider_events" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "result" TEXT NOT NULL DEFAULT 'RECEIVED',
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  CONSTRAINT "billing_provider_events_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "billing_provider_events_provider_eventId_key"
  ON "billing_provider_events"("provider", "eventId");
CREATE INDEX "billing_provider_events_provider_receivedAt_idx"
  ON "billing_provider_events"("provider", "receivedAt");
