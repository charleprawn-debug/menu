import { db } from "@/lib/db";
import { requireRestaurant } from "@/lib/auth/context";
import { PERMISSIONS, PERMISSION_GROUPS } from "@/lib/permissions";
import { hasRestaurantWideScope } from "@/lib/auth/scope";
import { getLocale } from "@/i18n";
import { redirect } from "next/navigation";
import { RolesWorkspace } from "@/components/staff/role-workspace";

export const dynamic = "force-dynamic";

export default async function StaffRolesPage() {
  const member = await requireRestaurant("staff.roles.manage");
  if (!hasRestaurantWideScope(member, "staff.roles.manage")) redirect("/app/forbidden");
  const locale = await getLocale();
  const roles = await db.role.findMany({
    where: { restaurantId: member.restaurantId },
    include: { permissions: { include: { permission: { select: { key: true } } } }, _count: { select: { members: true } } },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
  });
  const groups = new Map(PERMISSION_GROUPS.map((group) => [group.key, locale === "ar" ? group.ar : group.en]));
  return <main className="space-y-6 p-4 md:p-8" dir={locale === "ar" ? "rtl" : "ltr"}>
    <header><a className="text-sm text-emerald-700 underline" href="/app/staff">{locale === "ar" ? "العودة إلى الموظفين" : "Back to employees"}</a><h1 className="mt-2 text-3xl font-bold">{locale === "ar" ? "الأدوار" : "Roles"}</h1><p className="mt-2 text-sm text-slate-600">{locale === "ar" ? "الأدوار الافتراضية الأربعة عشر محمية. انسخ دوراً لتخصيصه؛ لا يمكن حذف دور مرتبط بموظف." : "The fourteen default roles are protected. Copy one to customize it; roles assigned to employees cannot be deleted."}</p></header>
    <RolesWorkspace locale={locale} roles={roles.map((role) => ({ id: role.id, key: role.key, name: role.name, nameEn: role.nameEn, description: role.description, isSystem: role.isSystem, isDefault: role.isDefault, memberCount: role._count.members, permissions: role.permissions.map((item) => ({ key: item.permission.key, scope: item.scope })) }))} catalog={PERMISSIONS.map((permission) => ({ key: permission.key, group: groups.get(permission.group) ?? permission.group, labelAr: permission.ar, labelEn: permission.en, isSensitive: !!permission.sensitive }))} canManage={member.isOwner || member.permissions.has("staff.roles.manage")} />
  </main>;
}
