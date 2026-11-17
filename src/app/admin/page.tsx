import type { Metadata } from "next";
import Link from "next/link";
import { Building2, CreditCard, Store, Users } from "lucide-react";
import { requirePlatformAdmin } from "@/lib/auth/context";
import { db } from "@/lib/db";
import { getI18n } from "@/i18n";
import { PageHeader, StatCard } from "@/components/ui/layout-blocks";
import { Button } from "@/components/ui/button";
import { formatMoney, toNumber } from "@/lib/money";

export const metadata: Metadata = { title: "إدارة المنصة" };

export default async function AdminDashboardPage() {
  await requirePlatformAdmin();
  const { locale } = await getI18n();

  const [restaurants, users, activeSubs, revenue] = await Promise.all([
    db.restaurant.count({ where: { deletedAt: null } }),
    db.user.count({ where: { deletedAt: null } }),
    db.subscription.count({ where: { status: "ACTIVE" } }),
    db.subscriptionPayment.aggregate({ _sum: { amount: true }, where: { status: "SUCCEEDED" } }),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <PageHeader
        title={locale === "ar" ? "إدارة منصة DineFlow" : "DineFlow platform admin"}
        description={locale === "ar" ? "نظرة عامة على المنصة (اللوحة الكاملة في الخطوة 10)." : "Platform overview (full console arrives in step 10)."}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/app/dashboard">{locale === "ar" ? "لوحة المطعم" : "Restaurant dashboard"}</Link>
          </Button>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={locale === "ar" ? "المطاعم" : "Restaurants"} value={restaurants} icon={<Store />} />
        <StatCard label={locale === "ar" ? "المستخدمون" : "Users"} value={users} icon={<Users />} accent="sky" />
        <StatCard label={locale === "ar" ? "اشتراكات نشطة" : "Active subscriptions"} value={activeSubs} icon={<Building2 />} accent="violet" />
        <StatCard
          label={locale === "ar" ? "إجمالي الإيرادات" : "Total revenue"}
          value={formatMoney(toNumber(revenue._sum.amount), "SAR", locale)}
          icon={<CreditCard />}
          accent="amber"
        />
      </div>
      <div className="mt-6 rounded-2xl border border-dashed bg-card p-8 text-center">
        <p className="text-sm font-medium">{locale === "ar" ? "لوحة Super Admin الكاملة قادمة في الخطوة 10" : "Full Super Admin console arrives in step 10"}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {locale === "ar" ? "المطاعم، المستخدمون، الباقات، الميزات، الاشتراكات، الإيرادات، الدعم، الأمان وصحة النظام." : "Restaurants, users, plans, features, subscriptions, revenue, support, security and system health."}
        </p>
      </div>
    </div>
  );
}
