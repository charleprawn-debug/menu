import type { Metadata } from "next";
import { db } from "@/lib/db";
import { toNumber } from "@/lib/money";
import { getI18n } from "@/i18n";
import { RegisterForm } from "./register-form";

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getI18n();
  return { title: locale === "ar" ? "إنشاء حساب" : "Create account" };
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const first = (value?: string | string[]) => Array.isArray(value) ? value[0] : value;

export default async function RegisterPage({ searchParams }: { searchParams: SearchParams }) {
  const [{ t }, query] = await Promise.all([getI18n(), searchParams]);
  const planKey = first(query.plan)?.trim() || "";
  const cycleParam = first(query.cycle)?.toUpperCase();
  const billingCycle = cycleParam === "YEARLY" || cycleParam === "ANNUAL" ? "YEARLY" : "MONTHLY";
  const plan = planKey
    ? await db.plan.findFirst({
        where: { key: planKey, isActive: true },
        select: { key: true, name: true, nameEn: true, monthlyPrice: true, yearlyPrice: true, currency: true, trialDays: true },
      })
    : null;
  let effectiveTrialDays = plan?.trialDays ?? 0;
  if (plan) {
    const trialSetting = await db.platformSetting.findUnique({ where: { key: "trial_days" }, select: { value: true } });
    const configuredTrialDays = typeof trialSetting?.value === "number" && Number.isFinite(trialSetting.value)
      ? trialSetting.value
      : plan.trialDays;
    effectiveTrialDays = Math.max(0, Math.min(365, Math.floor(configuredTrialDays)));
  }

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-2xl font-bold tracking-tight">{t("auth.register.title")}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{t("auth.register.subtitle")}</p>
      </div>
      <RegisterForm
        plan={plan ? {
          key: plan.key,
          name: plan.name,
          nameEn: plan.nameEn,
          monthlyPrice: toNumber(plan.monthlyPrice),
          yearlyPrice: toNumber(plan.yearlyPrice),
          currency: plan.currency,
          trialDays: effectiveTrialDays,
        } : null}
        planKey={planKey}
        planUnavailable={Boolean(planKey && !plan)}
        billingCycle={billingCycle}
      />
    </div>
  );
}
