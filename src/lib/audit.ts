import "server-only";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { safeAuditValue } from "@/lib/audit-sanitize";

interface ActivityInput {
  restaurantId?: string | null;
  branchId?: string | null;
  actorId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  description?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
}

/** Records a tenant-scoped activity entry (best-effort, never throws). */
export async function logActivity(input: ActivityInput): Promise<void> {
  try {
    const headerStore = await headers();
    await db.staffActivityLog.create({
      data: {
        restaurantId: input.restaurantId ?? null,
        branchId: input.branchId ?? null,
        actorId: input.actorId ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        description: input.description ?? null,
        oldValue: (safeAuditValue(input.oldValue) as never) ?? undefined,
        newValue: (safeAuditValue(input.newValue) as never) ?? undefined,
        ip: headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
        userAgent: headerStore.get("user-agent")?.slice(0, 500) ?? null,
      },
    });
  } catch (error) {
    console.error("[audit] failed to write activity log", error);
  }
}

interface PlatformAuditInput {
  actorId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  meta?: unknown;
}

/** Records a platform-level audit entry. */
export async function logPlatformAudit(input: PlatformAuditInput): Promise<void> {
  try {
    const headerStore = await headers();
    await db.platformAuditLog.create({
      data: {
        actorId: input.actorId ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        meta: (safeAuditValue(input.meta) as never) ?? undefined,
        ip: headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
        userAgent: headerStore.get("user-agent")?.slice(0, 500) ?? null,
      },
    });
  } catch (error) {
    console.error("[audit] failed to write platform audit log", error);
  }
}
