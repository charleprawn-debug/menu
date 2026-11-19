BEGIN;

CREATE TYPE "PermissionScope" AS ENUM ('RESTAURANT', 'BRANCH', 'OWNED');

ALTER TABLE "role_permissions"
  ADD COLUMN "scope" "PermissionScope" NOT NULL DEFAULT 'RESTAURANT';
ALTER TABLE "member_permissions"
  ADD COLUMN "scope" "PermissionScope" NOT NULL DEFAULT 'RESTAURANT';

CREATE TABLE "member_branch_access" (
  "memberId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "member_branch_access_pkey" PRIMARY KEY ("memberId", "branchId"),
  CONSTRAINT "member_branch_access_memberId_fkey"
    FOREIGN KEY ("memberId") REFERENCES "restaurant_members"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "member_branch_access_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "member_branch_access_branchId_idx" ON "member_branch_access" ("branchId");
INSERT INTO "member_branch_access" ("memberId", "branchId")
SELECT "id", "branchId" FROM "restaurant_members" WHERE "branchId" IS NOT NULL
ON CONFLICT ("memberId", "branchId") DO NOTHING;

-- Existing operational role templates use a branch boundary; delivery drivers see assigned work only.
UPDATE "role_permissions" AS rp SET "scope" = 'BRANCH'
FROM "roles" AS r
WHERE rp."roleId" = r."id" AND r."restaurantId" IS NOT NULL
  AND r."key" IN ('branch_manager', 'waiter', 'cashier', 'chef', 'kitchen_manager');
UPDATE "role_permissions" AS rp SET "scope" = 'OWNED'
FROM "roles" AS r
WHERE rp."roleId" = r."id" AND r."restaurantId" IS NOT NULL
  AND r."key" = 'delivery_driver';

ALTER TABLE "staff_invitations"
  ADD COLUMN "lastSentAt" TIMESTAMP(3),
  ADD COLUMN "sendCount" INTEGER NOT NULL DEFAULT 0,
  ADD CONSTRAINT "staff_invitations_restaurantId_fkey"
    FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "staff_invitations_roleId_fkey"
    FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "staff_invitations_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "staff_invitation_branches" (
  "invitationId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "staff_invitation_branches_pkey" PRIMARY KEY ("invitationId", "branchId"),
  CONSTRAINT "staff_invitation_branches_invitationId_fkey"
    FOREIGN KEY ("invitationId") REFERENCES "staff_invitations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "staff_invitation_branches_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "staff_invitation_branches_branchId_idx" ON "staff_invitation_branches" ("branchId");
INSERT INTO "staff_invitation_branches" ("invitationId", "branchId")
SELECT "id", "branchId" FROM "staff_invitations" WHERE "branchId" IS NOT NULL
ON CONFLICT ("invitationId", "branchId") DO NOTHING;

ALTER TABLE "staff_activity_logs" ADD COLUMN "branchId" TEXT;
ALTER TABLE "staff_activity_logs"
  ADD CONSTRAINT "staff_activity_logs_branchId_fkey"
  FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "staff_activity_logs_branchId_createdAt_idx"
  ON "staff_activity_logs" ("branchId", "createdAt");

ALTER TABLE "users" ADD COLUMN "pendingEmail" TEXT;
CREATE UNIQUE INDEX "users_pendingEmail_key" ON "users" ("pendingEmail");
CREATE TABLE "email_change_tokens" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "restaurantId" TEXT NOT NULL,
  "newEmail" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "email_change_tokens_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "email_change_tokens_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "email_change_tokens_restaurantId_fkey"
    FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "email_change_tokens_tokenHash_key" ON "email_change_tokens" ("tokenHash");
CREATE INDEX "email_change_tokens_userId_idx" ON "email_change_tokens" ("userId");
CREATE INDEX "email_change_tokens_newEmail_idx" ON "email_change_tokens" ("newEmail");

-- Preserve the already-existing full access of legacy platform administrators,
-- while moving authorization to the explicit role column.
UPDATE "users" SET "platformRole" = 'SUPER_ADMIN'
WHERE "isPlatformAdmin" = TRUE AND "platformRole" IS NULL;

COMMIT;
