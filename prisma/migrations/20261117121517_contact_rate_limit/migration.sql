-- AlterTable
ALTER TABLE "marketing_inquiries" ADD COLUMN     "sourceIpHash" TEXT;

-- CreateIndex
CREATE INDEX "marketing_inquiries_sourceIpHash_createdAt_idx" ON "marketing_inquiries"("sourceIpHash", "createdAt");
