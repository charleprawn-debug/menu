ALTER TYPE "KitchenTicketStatus" ADD VALUE IF NOT EXISTS 'DELAYED';

ALTER TABLE "products"
  ADD COLUMN "default_station_id" TEXT;

CREATE INDEX "products_default_station_id_idx"
  ON "products"("default_station_id");

ALTER TABLE "products"
  ADD CONSTRAINT "products_default_station_id_fkey"
  FOREIGN KEY ("default_station_id")
  REFERENCES "kitchen_stations"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

CREATE UNIQUE INDEX "kitchen_tickets_orderId_stationId_key"
  ON "kitchen_tickets"("orderId", "stationId");

-- PostgreSQL truncates the generated baseline index identifier at 63 bytes;
-- align it with Prisma's generated name so fresh and existing databases have no drift.
DO $$
BEGIN
  IF to_regclass('public."subscription_plan_changes_billingProvider_providerScheduleId_ke"') IS NOT NULL
     AND to_regclass('public."subscription_plan_changes_billingProvider_providerScheduleI_key"') IS NULL THEN
    ALTER INDEX "subscription_plan_changes_billingProvider_providerScheduleId_ke"
      RENAME TO "subscription_plan_changes_billingProvider_providerScheduleI_key";
  END IF;
END
$$;
