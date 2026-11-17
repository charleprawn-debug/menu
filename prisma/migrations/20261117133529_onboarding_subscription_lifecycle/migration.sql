/*
  Warnings:

  - A unique constraint covering the columns `[idempotencyKey]` on the table `subscription_invoices` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "subscription_invoices" ADD COLUMN     "idempotencyKey" TEXT;

-- AlterTable
ALTER TABLE "subscription_payments" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "restaurant_media" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "restaurant_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plan_changes" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "fromPlanId" TEXT NOT NULL,
    "toPlanId" TEXT NOT NULL,
    "billingCycle" "BillingCycle" NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "requestedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "appliedAt" TIMESTAMP(3),

    CONSTRAINT "subscription_plan_changes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "restaurant_media_restaurantId_kind_idx" ON "restaurant_media"("restaurantId", "kind");

-- CreateIndex
CREATE INDEX "subscription_plan_changes_subscriptionId_status_idx" ON "subscription_plan_changes"("subscriptionId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_invoices_idempotencyKey_key" ON "subscription_invoices"("idempotencyKey");

-- AddForeignKey
ALTER TABLE "restaurant_media" ADD CONSTRAINT "restaurant_media_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "subscription_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_plan_changes" ADD CONSTRAINT "subscription_plan_changes_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_plan_changes" ADD CONSTRAINT "subscription_plan_changes_fromPlanId_fkey" FOREIGN KEY ("fromPlanId") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_plan_changes" ADD CONSTRAINT "subscription_plan_changes_toPlanId_fkey" FOREIGN KEY ("toPlanId") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
