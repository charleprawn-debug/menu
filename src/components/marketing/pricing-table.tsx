"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, Minus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export interface PricingFeature {
  id: string;
  nameAr: string;
  nameEn: string;
}

export interface PricingPlan {
  id: string;
  key: string;
  name: string;
  nameEn: string | null;
  description: string | null;
  descriptionEn: string | null;
  currency: string;
  monthlyPrice: number;
  yearlyPrice: number;
  maxBranches: number;
  maxStaff: number;
  maxTables: number;
  maxProducts: number;
  storageMb: number;
  maxOrdersPerMonth: number | null;
  isPopular: boolean;
  features: { featureId: string; enabled: boolean; limitValue: number | null; note: string | null }[];
}

function limit(value: number | null, locale: string, unit: string) {
  if (value === null || value === -1) return locale === "ar" ? `غير محدود ${unit}` : `Unlimited ${unit}`;
  return `${new Intl.NumberFormat(locale === "ar" ? "ar" : "en-US").format(value)} ${unit}`;
}

export function PricingTable({ plans, features, locale }: { plans: PricingPlan[]; features: PricingFeature[]; locale: string }) {
  const ar = locale === "ar";
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");
  const featureById = useMemo(() => new Map(features.map((feature) => [feature.id, feature])), [features]);
  const includedFeatures = features.filter((feature) => plans.some((plan) => plan.features.some((item) => item.featureId === feature.id && item.enabled)));

  return (
    <div>
      <div className="mx-auto mb-10 flex w-fit items-center gap-1 rounded-xl border bg-card p-1 shadow-soft" role="group" aria-label={ar ? "دورة الفوترة" : "Billing cycle"}>
        <button
          type="button"
          onClick={() => setCycle("monthly")}
          aria-pressed={cycle === "monthly"}
          className={cn("rounded-lg px-4 py-2 text-sm font-semibold transition-colors", cycle === "monthly" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
        >
          {ar ? "شهري" : "Monthly"}
        </button>
        <button
          type="button"
          onClick={() => setCycle("yearly")}
          aria-pressed={cycle === "yearly"}
          className={cn("inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors", cycle === "yearly" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
        >
          {ar ? "سنوي" : "Annual"}
          <span className={cn("rounded-full px-2 py-0.5 text-[10px]", cycle === "yearly" ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300")}>
            {ar ? "فوترة سنوية" : "Annual billing"}
          </span>
        </button>
      </div>

      {plans.length === 0 ? (
        <div className="rounded-2xl border bg-card p-10 text-center text-sm text-muted-foreground">
          {ar ? "لا توجد باقات منشورة حالياً. تواصل معنا لمعرفة الخيارات المتاحة." : "There are no published plans yet. Contact us to discuss available options."}
        </div>
      ) : (
        <>
          <div className="grid items-stretch gap-5 lg:grid-cols-3">
            {plans.map((plan) => {
              const annualSavings = plan.monthlyPrice > 0 && plan.yearlyPrice > 0
                ? Math.max(0, Math.round((1 - plan.yearlyPrice / (plan.monthlyPrice * 12)) * 100))
                : 0;
              const price = cycle === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
              const included = plan.features.filter((feature) => feature.enabled);
              return (
                <article key={plan.id} className={cn("relative flex flex-col rounded-2xl border bg-card p-6 shadow-soft transition-shadow hover:shadow-card", plan.isPopular && "border-primary shadow-glow")}>
                  {plan.isPopular ? (
                    <Badge className="absolute -top-3 start-1/2 z-10 -translate-x-1/2 gap-1 bg-primary text-primary-foreground shadow-card rtl:translate-x-1/2">
                      <Sparkles className="size-3" /> {ar ? "موصى بها" : "Recommended"}
                    </Badge>
                  ) : null}
                  <h2 className="text-lg font-bold">{ar ? plan.name : plan.nameEn || plan.name}</h2>
                  <p className="mt-1 min-h-10 text-xs leading-relaxed text-muted-foreground">{ar ? plan.description : plan.descriptionEn || plan.description}</p>
                  <div className="mt-5 flex items-end gap-1.5">
                    <span className="text-3xl font-extrabold tracking-tight">{formatMoney(cycle === "monthly" ? price : price / 12, plan.currency, locale, { maximumFractionDigits: 2 })}</span>
                    <span className="pb-1 text-xs text-muted-foreground">/{ar ? "شهر" : "month"}</span>
                  </div>
                  {cycle === "yearly" ? (
                    <div className="mt-1 text-xs text-muted-foreground">
                      {formatMoney(price, plan.currency, locale, { maximumFractionDigits: 0 })} / {ar ? "سنة، تدفع سنوياً" : "year, billed annually"}
                      {annualSavings > 0 ? <span className="ms-1 font-semibold text-emerald-700 dark:text-emerald-300">· {ar ? `وفر ${annualSavings}%` : `save ${annualSavings}%`}</span> : null}
                    </div>
                  ) : (
                    <div className="mt-1 text-xs text-muted-foreground">{ar ? "السعر الشهري حسب الخطة" : "Monthly price as configured"}</div>
                  )}
                  <Button asChild className="mt-5 w-full" variant={plan.isPopular ? "default" : "outline"}>
                    <Link href={`/register?plan=${encodeURIComponent(plan.key)}&cycle=${cycle.toUpperCase()}`}>
                      {ar ? "أنشئ حساباً" : "Create an account"}
                    </Link>
                  </Button>
                  <div className="mt-6 border-t pt-5">
                    <p className="mb-3 text-xs font-semibold">{ar ? "حدود الخطة" : "Plan limits"}</p>
                    <ul className="space-y-2">
                      {[
                        limit(plan.maxProducts, locale, ar ? "منتج" : "products"),
                        limit(plan.maxTables, locale, ar ? "طاولة" : "tables"),
                        limit(plan.maxStaff, locale, ar ? "موظف" : "staff"),
                        limit(plan.maxBranches, locale, ar ? "فرع" : "branches"),
                        limit(plan.maxOrdersPerMonth, locale, ar ? "طلب / شهر" : "orders / month"),
                        `${new Intl.NumberFormat(ar ? "ar" : "en-US").format(plan.storageMb)} ${ar ? "ميغابايت تخزين" : "MB storage"}`,
                      ].map((item) => (
                        <li key={item} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <Check className="mt-0.5 size-3.5 shrink-0 text-primary" /> {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-5 border-t pt-5">
                    <p className="mb-3 text-xs font-semibold">{ar ? "الميزات المشمولة" : "Included features"}</p>
                    <ul className="space-y-2">
                      {included.slice(0, 8).map((item) => {
                        const feature = featureById.get(item.featureId);
                        if (!feature) return null;
                        return (
                          <li key={item.featureId} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />
                            <span>{ar ? feature.nameAr : feature.nameEn}{item.limitValue !== null ? ` · ${item.limitValue}` : ""}</span>
                          </li>
                        );
                      })}
                      {included.length > 8 ? <li className="text-xs text-primary">{ar ? `و ${included.length - 8} ميزات أخرى في المقارنة` : `and ${included.length - 8} more in the comparison`}</li> : null}
                    </ul>
                  </div>
                </article>
              );
            })}
          </div>

          {includedFeatures.length > 0 ? (
            <section className="mt-16" aria-labelledby="plan-comparison">
              <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">{ar ? "اختيار واضح" : "Make an informed choice"}</p>
                  <h2 id="plan-comparison" className="mt-1 text-2xl font-bold">{ar ? "قارن الباقات" : "Compare plans"}</h2>
                </div>
                <p className="text-xs text-muted-foreground">{ar ? "الميزات والحدود بحسب إعدادات الباقة الحالية." : "Features and limits reflect current plan settings."}</p>
              </div>
              <div className="overflow-x-auto rounded-2xl border bg-card">
                <table className="w-full min-w-[760px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th scope="col" className="sticky start-0 bg-muted/40 px-4 py-3 text-start font-semibold">{ar ? "الميزة أو الحد" : "Feature or limit"}</th>
                      {plans.map((plan) => <th key={plan.id} scope="col" className="px-4 py-3 text-center font-semibold">{ar ? plan.name : plan.nameEn || plan.name}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: ar ? "المنتجات" : "Products", value: (plan: PricingPlan) => limit(plan.maxProducts, locale, "") },
                      { label: ar ? "الطاولات" : "Tables", value: (plan: PricingPlan) => limit(plan.maxTables, locale, "") },
                      { label: ar ? "الموظفون" : "Staff", value: (plan: PricingPlan) => limit(plan.maxStaff, locale, "") },
                      { label: ar ? "الفروع" : "Branches", value: (plan: PricingPlan) => limit(plan.maxBranches, locale, "") },
                      { label: ar ? "الطلبات الشهرية" : "Monthly orders", value: (plan: PricingPlan) => limit(plan.maxOrdersPerMonth, locale, "") },
                      ...includedFeatures.map((feature) => ({
                        label: ar ? feature.nameAr : feature.nameEn,
                        value: (plan: PricingPlan) => {
                          const item = plan.features.find((candidate) => candidate.featureId === feature.id);
                          return item?.enabled ? item.limitValue === null ? "yes" : `${item.limitValue}` : "no";
                        },
                      })),
                    ].map((row) => (
                      <tr key={row.label} className="border-b last:border-0">
                        <th scope="row" className="sticky start-0 bg-card px-4 py-3 text-start font-medium">{row.label}</th>
                        {plans.map((plan) => {
                          const value = row.value(plan);
                          return (
                            <td key={plan.id} className="px-4 py-3 text-center text-muted-foreground">
                              {value === "yes" ? <Check className="mx-auto size-4 text-primary" /> : value === "no" ? <Minus className="mx-auto size-4 opacity-40" /> : value}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </>
      )}
      <div className="mt-12 rounded-2xl border border-primary/15 bg-primary/5 p-5 text-center">
        <p className="font-semibold">{ar ? "تحتاج إلى إعداد مؤسسي؟" : "Need an enterprise arrangement?"}</p>
        <p className="mt-1 text-sm text-muted-foreground">{ar ? "أخبرنا عن عدد الفروع وسير العمل الذي تحتاجه." : "Tell us about the number of locations and workflows you need."}</p>
        <Button asChild variant="link" className="mt-1">
          <Link href="/contact?subject=enterprise">{ar ? "تواصل للمؤسسات" : "Talk to us about enterprise"}</Link>
        </Button>
      </div>
    </div>
  );
}
