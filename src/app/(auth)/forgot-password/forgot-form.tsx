"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, CheckCircle2, Mail } from "lucide-react";
import { forgotPasswordAction, type ActionState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/i18n/provider";

const initialState: ActionState = {};

export function ForgotForm() {
  const { t } = useI18n();
  const [state, formAction, pending] = useActionState(forgotPasswordAction, initialState);

  return (
    <form action={formAction} className="space-y-5">
      {state.ok ? (
        <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            <span>{state.message}</span>
          </div>
          {state.resetUrl ? (
            <div className="rounded-lg bg-white/60 p-2 text-xs dark:bg-black/20">
              <p className="mb-1 font-semibold">رابط تجريبي (بيئة التطوير):</p>
              <Link href={state.resetUrl} className="break-all text-primary underline">
                {state.resetUrl}
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}

      {state.error ? (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="email">{t("common.email")}</Label>
        <Input id="email" name="email" type="email" placeholder="you@restaurant.com" leading={<Mail />} required />
      </div>

      <Button type="submit" size="lg" className="w-full" loading={pending}>
        {t("auth.forgot.submit")}
      </Button>

      <Link href="/login" className="flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4 rtl:rotate-180" />
        {t("auth.forgot.backToLogin")}
      </Link>
    </form>
  );
}
