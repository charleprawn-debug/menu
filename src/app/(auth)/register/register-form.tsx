"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, Eye, EyeOff, Lock, Mail, Phone, User } from "lucide-react";
import { registerAction, type ActionState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/controls";
import { useI18n } from "@/i18n/provider";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

const initialState: ActionState = {};

interface RegisterPlan {
  key: string;
  name: string;
  nameEn: string | null;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  trialDays: number;
}

function strengthOf(password: string): number {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return Math.min(3, Math.ceil(score / 2));
}

export function RegisterForm({
  plan,
  planKey,
  planUnavailable,
  billingCycle,
}: {
  plan: RegisterPlan | null;
  planKey: string;
  planUnavailable: boolean;
  billingCycle: "MONTHLY" | "YEARLY";
}) {
  const { t, locale } = useI18n();
  const [state, formAction, pending] = useActionState(registerAction, initialState);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const strength = useMemo(() => strengthOf(password), [password]);

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      ) : null}

      {state.message ? (
        <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-3 py-2.5 text-sm text-emerald-800 dark:text-emerald-300">
          {state.message}
        </div>
      ) : null}

      <input type="hidden" name="planKey" value={planKey} />
      <input type="hidden" name="billingCycle" value={billingCycle} />

      {planUnavailable ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm" role="alert">
          <p className="font-semibold">{t("auth.register.planUnavailableTitle")}</p>
          <p className="mt-1 text-muted-foreground">{t("auth.register.planUnavailableBody")}</p>
          <div className="mt-2 flex gap-4 text-xs font-semibold">
            <Link href="/pricing" className="text-primary hover:underline">{t("auth.register.viewPlans")}</Link>
            <Link href="/register" className="text-primary hover:underline">{t("auth.register.continueWithoutPlan")}</Link>
          </div>
        </div>
      ) : plan ? (
        <section className="rounded-xl border border-primary/25 bg-primary/5 px-4 py-3" aria-label={t("auth.register.selectedPlan")}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-xs font-medium text-muted-foreground">{t("auth.register.selectedPlan")}</p>
              <p className="mt-0.5 font-semibold">{locale === "ar" ? plan.name : plan.nameEn || plan.name}</p>
            </div>
            <div className="text-end">
              <p className="font-bold">{formatMoney(billingCycle === "YEARLY" ? plan.yearlyPrice : plan.monthlyPrice, plan.currency, locale)}</p>
              <p className="text-xs text-muted-foreground">{billingCycle === "YEARLY" ? t("auth.register.perYear") : t("auth.register.perMonth")}</p>
            </div>
          </div>
          {plan.trialDays > 0 ? <p className="mt-2 text-xs text-muted-foreground">{t("auth.register.trialDays", { days: plan.trialDays })}</p> : null}
          <p className="mt-2 border-t border-primary/15 pt-2 text-xs text-muted-foreground">{t("auth.register.noChargeNote")}</p>
        </section>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="name" required>
          {t("auth.register.fullName")}
        </Label>
        <Input
          id="name"
          name="name"
          autoComplete="name"
          placeholder="محمد أحمد"
          leading={<User />}
          required
          invalid={!!state.fieldErrors?.name}
        />
        {state.fieldErrors?.name ? <p className="text-xs text-destructive">{state.fieldErrors.name}</p> : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email" required>
          {t("common.email")}
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@restaurant.com"
          leading={<Mail />}
          required
          invalid={!!state.fieldErrors?.email}
        />
        {state.fieldErrors?.email ? <p className="text-xs text-destructive">{state.fieldErrors.email}</p> : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="phone">{t("auth.register.phoneOptional")}</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          placeholder="+966 5x xxx xxxx"
          leading={<Phone />}
          dir="ltr"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password" required>
          {t("common.password")}
        </Label>
        <Input
          id="password"
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          placeholder="8+ characters"
          leading={<Lock />}
          trailing={
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              tabIndex={-1}
              className="text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff /> : <Eye />}
            </button>
          }
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          invalid={!!state.fieldErrors?.password}
        />
        {password ? (
          <div className="flex items-center gap-2 pt-0.5">
            {[1, 2, 3].map((level) => (
              <span
                key={level}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors",
                  strength >= level
                    ? level === 1
                      ? "bg-red-400"
                      : level === 2
                        ? "bg-amber-400"
                        : "bg-emerald-500"
                    : "bg-muted"
                )}
              />
            ))}
            <span className="text-[11px] text-muted-foreground">
              {strength === 1 ? (locale === "ar" ? "ضعيفة" : "Weak") : strength === 2 ? (locale === "ar" ? "متوسطة" : "Medium") : (locale === "ar" ? "قوية" : "Strong")}
            </span>
          </div>
        ) : null}
        {state.fieldErrors?.password ? <p className="text-xs text-destructive">{state.fieldErrors.password}</p> : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword" required>
          {t("auth.register.confirmPassword")}
        </Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          placeholder="••••••••"
          leading={<Lock />}
          required
          invalid={!!state.fieldErrors?.confirmPassword}
        />
        {state.fieldErrors?.confirmPassword ? (
          <p className="text-xs text-destructive">{state.fieldErrors.confirmPassword}</p>
        ) : null}
      </div>

      <div className="flex items-start gap-2.5 pt-1">
        <Checkbox id="terms" name="terms" value="on" className="mt-0.5" />
        <label htmlFor="terms" className="text-xs leading-relaxed text-muted-foreground">
          {t("auth.register.terms")}
        </label>
      </div>
      {state.fieldErrors?.terms ? <p className="text-xs text-destructive">{state.fieldErrors.terms}</p> : null}

      <Button type="submit" size="lg" className="w-full" loading={pending}>
        {t("auth.register.submit")}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {t("auth.register.hasAccount")}{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          {t("auth.register.signIn")}
        </Link>
      </p>
    </form>
  );
}
