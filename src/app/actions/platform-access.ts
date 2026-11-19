"use server";

import { PlatformRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/auth/context";
import { logPlatformAudit } from "@/lib/audit";

const allowedRoles = new Set<string>(Object.values(PlatformRole));

export async function setPlatformRoleAction(formData: FormData): Promise<void> {
  let targetId = "";
  try {
    const actor = await requirePlatformAdmin("users.manage");
    if (actor.platformRole !== "SUPER_ADMIN") throw new Error("SUPER_ADMIN_REQUIRED");
    targetId = String(formData.get("userId") ?? "");
    const roleValue = String(formData.get("platformRole") ?? "");
    if (!targetId || targetId.length > 100 || (roleValue && !allowedRoles.has(roleValue))) throw new Error("INVALID_INPUT");
    const nextRole = roleValue ? roleValue as PlatformRole : null;

    const result = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "users" WHERE "id" = ${targetId} FOR UPDATE`;
      const target = await tx.user.findUnique({ where: { id: targetId }, select: { id: true, email: true, platformRole: true, isPlatformAdmin: true, status: true, deletedAt: true } });
      if (!target || target.deletedAt || target.status !== "ACTIVE") throw new Error("TARGET_UNAVAILABLE");
      const currentRole = target.platformRole ?? (target.isPlatformAdmin ? "SUPER_ADMIN" : null);
      if (currentRole === "SUPER_ADMIN" && nextRole !== "SUPER_ADMIN") {
        const count = await tx.user.count({
          where: { status: "ACTIVE", deletedAt: null, OR: [{ platformRole: "SUPER_ADMIN" }, { isPlatformAdmin: true, platformRole: null }] },
        });
        if (count <= 1) throw new Error("LAST_SUPER_ADMIN");
      }
      await tx.user.update({ where: { id: target.id }, data: { platformRole: nextRole, isPlatformAdmin: nextRole !== null } });
      return { email: target.email, before: currentRole, after: nextRole };
    }, { isolationLevel: "Serializable" });

    await logPlatformAudit({
      actorId: actor.user.id,
      action: "platform.user_role.changed",
      entity: "User",
      entityId: targetId,
      meta: result,
    });
    revalidatePath("/admin");
    revalidatePath("/admin/platform-users");
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    const code = error instanceof Error ? error.message : "ERROR";
    redirect(`/admin/platform-users?error=${encodeURIComponent(code.slice(0, 60))}`);
  }
  redirect("/admin/platform-users?success=role");
}
