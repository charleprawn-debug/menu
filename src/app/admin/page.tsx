import type { Metadata } from "next";
import Link from "next/link";
import { Building2, CreditCard, Store, Users } from "lucide-react";
import { requirePlatformAdmin } from "@/lib/auth/context";
import { PLATFORM_ROLE_DEFINITIONS } from "@/lib/auth/platform";
import { db } from "@/lib/db";
import { getI18n } from "@/i18n";
import { PageHeader, StatCard } from "@/components/ui/layout-blocks";
import { Button } from "@/components/ui/button";
import { formatMoney, toNumber } from "@/lib/money";

export const metadata: Metadata = { title: "إدارة المنصة", robots: { index: false, follow: false } };

export default async function AdminDashboardPage() {
  const platform = await requirePlatformAdmin("dashboard.view");
  const { locale } = await getI18n();
  const canRestaurants = platform.platformCapabilities.has("restaurants.view");
  const canUsers = platform.platformCapabilities.has("users.view");
  const canBilling = platform.platformCapabilities.has("billing.view");
  const role = PLATFORM_ROLE_DEFINITIONS.find((item) => item.role === platform.platformRole);
  const [restaurants, users, activeSubs, revenue] = await Promise.all([
    canRestaurants ? db.restaurant.count({ where: { deletedAt: null } }) : Promise.resolve(null),
    canUsers ? db.user.count({ where: { deletedAt: null } }) : Promise.resolve(null),
    canBilling ? db.subscription.count({ where: { status: "ACTIVE" } }) : Promise.resolve(null),
    canBilling ? db.subscriptionPayment.aggregate({ _sum: { amount: true }, where: { status: "SUCCEEDED" } }) : Promise.resolve(null),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <PageHeader
        title={locale === "ar" ? "إدارة منصة DineFlow" : "DineFlow platform admin"}
        description={locale === "ar" ? `الدور الحالي: ${role?.labelAr ?? "—"}. تعرض هذه اللوحة ما يسمح به هذا الدور فقط.` : `Current role: ${role?.labelEn ?? "—"}. This dashboard displays only data allowed by this role.`}
        actions={<div className="flex flex-wrap gap-2">
          {platform.platformCapabilities.has("support.view") || platform.platformCapabilities.has("marketing.view") ? <Button asChild variant="outline" size="sm"><Link href="/admin/inquiries">{locale === "ar" ? "استفسارات الموقع" : "Website inquiries"}</Link></Button> : null}
          {platform.platformRole === "SUPER_ADMIN" ? <Button asChild variant="outline" size="sm"><Link href="/admin/platform-users">{locale === "ar" ? "أدوار مستخدمي المنصة" : "Platform user roles"}</Link></Button> : null}
        </div>}
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {restaurants !== null ? <StatCard label={locale === "ar" ? "المطاعم" : "Restaurants"} value={restaurants} icon={<Store />} /> : null}
        {users !== null ? <StatCard label={locale === "ar" ? "المستخدمون" : "Users"} value={users} icon={<Users />} accent="sky" /> : null}
        {activeSubs !== null ? <StatCard label={locale === "ar" ? "اشتراكات نشطة" : "Active subscriptions"} value={activeSubs} icon={<Building2 />} accent="violet" /> : null}
        {revenue ? <StatCard label={locale === "ar" ? "إجمالي إيرادات الاشتراكات الناجحة" : "Succeeded subscription payments"} value={formatMoney(toNumber(revenue._sum.amount), "SAR", locale)} icon={<CreditCard />} accent="amber" /> : null}
      </div>
      <div className="mt-6 rounded-2xl border border-dashed bg-card p-8 text-center">
        <p className="text-sm font-medium">{role?.[locale === "ar" ? "scopeAr" : "scopeEn"]}</p>
        <p className="mt-2 text-xs text-muted-foreground">{locale === "ar" ? "تُفصل صلاحيات الإدارة عن أدوار المطاعم، وتُسجل تغييرات الأدوار في سجل تدقيق المنصة." : "Platform administration is separate from restaurant roles; role changes are written to the platform audit log."}</p>
      </div>
    </div>
  );
}
