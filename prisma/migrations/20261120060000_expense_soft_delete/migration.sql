ALTER TABLE "expenses"
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE INDEX "expenses_restaurantId_deletedAt_spentAt_idx"
  ON "expenses"("restaurantId", "deletedAt", "spentAt");

CREATE INDEX "expenses_branchId_spentAt_idx"
  ON "expenses"("branchId", "spentAt");
