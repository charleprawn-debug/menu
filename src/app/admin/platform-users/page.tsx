import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/auth/context";
import { PLATFORM_ROLE_DEFINITIONS } from "@/lib/auth/platform";
import { setPlatformRoleAction } from "@/app/actions/platform-access";
import { db } from "@/lib/db";
import { getI18n } from "@/i18n";
import { PageHeader } from "@/components/ui/layout-blocks";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Platform user roles", robots: { index: false, follow: false } };

export default async function PlatformUsersPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const auth = await requirePlatformAdmin("users.view");
  if (auth.platformRole !== "SUPER_ADMIN") notFound();
  const { locale } = await getI18n();
  const params = await searchParams;
  const query = typeof params?.q === "string" ? params.q.trim().slice(0, 120) : "";
  const users = await db.user.findMany({
    where: {
      deletedAt: null,
      ...(query ? { OR: [
        { email: { contains: query, mode: "insensitive" } },
        { name: { contains: query, mode: "insensitive" } },
      ] } : {}),
    },
    select: { id: true, name: true, email: true, platformRole: true, isPlatformAdmin: true, status: true, lastLoginAt: true, createdAt: true },
    orderBy: [{ platformRole: "asc" }, { createdAt: "desc" }],
    take: 200,
  });
  const roleName = (role: string | null) => {
    const def = PLATFORM_ROLE_DEFINITIONS.find((item) => item.role === role);
    return def ? (locale === "ar" ? def.labelAr : def.labelEn) : (locale === "ar" ? "لا يملك دور منصة" : "No platform role");
  };
  const ar = locale === "ar";

  return <main className="mx-auto max-w-6xl space-y-6 px-5 py-10" dir={ar ? "rtl" : "ltr"}>
    <PageHeader title={ar ? "أدوار مستخدمي المنصة" : "Platform user roles"} description={ar ? "إدارة أدوار المنصة منفصلة عن عضويات المطاعم. تعيين SUPER_ADMIN متاح لهذه الصفحة فقط ولا يمكن خفض آخر مدير أعلى." : "Platform roles are separate from restaurant memberships. Only Super Admin can change them; the last Super Admin cannot be removed."} actions={<Button asChild variant="outline" size="sm"><Link href="/admin">{ar ? "العودة إلى المنصة" : "Back to platform"}</Link></Button>} />
    {params?.error ? <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{ar ? "تعذر تغيير الدور. تحقق من الصلاحيات والحساب، ولا يمكن خفض آخر مدير أعلى." : "Role change failed. Check access/account status; the last Super Admin cannot be demoted."}</p> : null}
    {params?.success ? <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{ar ? "تم تحديث دور المنصة." : "Platform role updated."}</p> : null}
    <div className="rounded-xl border bg-amber-50 p-4 text-sm text-amber-900">{ar ? "هذه الأدوار تمنح وصولاً عابراً للمطاعم. امنح أقل صلاحية لازمة، ولا تستخدم المدير الأعلى للحسابات اليومية." : "These roles grant cross-restaurant access. Grant the least privilege required and avoid using Super Admin for routine work."}</div>
    <form method="get" className="flex max-w-xl gap-2"><input name="q" defaultValue={query} className="min-w-0 flex-1 rounded-lg border px-3 py-2" placeholder={ar ? "البحث بالبريد أو الاسم" : "Search by email or name"} /><button className="rounded-lg bg-slate-900 px-4 py-2 text-white">{ar ? "بحث" : "Search"}</button></form>
    <section className="space-y-3">{users.map((user) => {
      const current = user.platformRole ?? (user.isPlatformAdmin ? "SUPER_ADMIN" : null);
      return <article key={user.id} className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><h2 className="font-semibold">{user.name || user.email}</h2><p className="text-sm text-slate-600">{user.email}</p><p className="mt-1 text-xs text-slate-500">{roleName(current)} · {user.status}{user.lastLoginAt ? ` · ${new Intl.DateTimeFormat(ar ? "ar" : "en", { dateStyle: "medium", timeStyle: "short" }).format(user.lastLoginAt)}` : ""}</p></div>
          <form action={setPlatformRoleAction} className="flex flex-wrap gap-2"><input type="hidden" name="userId" value={user.id} /><select name="platformRole" defaultValue={current ?? ""} className="rounded-lg border px-3 py-2"><option value="">{ar ? "بدون دور منصة" : "No platform role"}</option>{PLATFORM_ROLE_DEFINITIONS.map((role) => <option key={role.role} value={role.role}>{ar ? role.labelAr : role.labelEn}</option>)}</select><button className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white">{ar ? "حفظ الدور" : "Save role"}</button></form>
        </div>
        <details className="mt-3 text-xs text-slate-500"><summary className="cursor-pointer">{ar ? "نطاق هذا الدور" : "Role scope"}</summary><p className="mt-2">{PLATFORM_ROLE_DEFINITIONS.find((role) => role.role === current)?.[ar ? "scopeAr" : "scopeEn"] ?? (ar ? "لا يملك وصولاً إدارياً للمنصة." : "No platform administration access.")}</p></details>
      </article>;
    })}</section>
  </main>;
}
