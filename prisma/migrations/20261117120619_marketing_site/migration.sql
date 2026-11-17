-- AlterTable
ALTER TABLE "plans" ADD COLUMN     "descriptionEn" TEXT;

-- CreateTable
CREATE TABLE "marketing_inquiries" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "restaurantName" TEXT,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "source" TEXT NOT NULL DEFAULT 'contact',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_inquiries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "marketing_inquiries_status_createdAt_idx" ON "marketing_inquiries"("status", "createdAt");

-- CreateIndex
CREATE INDEX "marketing_inquiries_email_createdAt_idx" ON "marketing_inquiries"("email", "createdAt");
