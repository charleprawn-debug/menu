"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Mail } from "lucide-react";
import { resendVerificationEmailAction, verifyEmailAction, type ActionState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/i18n/provider";

const initialState: ActionState = {};

function FormStatus({ state }: { state: ActionState }) {
  const { t } = useI18n();
  if (state.error) {
    return (
      <div role="alert" className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
        <AlertCircle className="mt-0.5 size-4 shrink-0" />
        <span>{state.error}</span>
      </div>
    );
  }
  if (state.message) {
    return (
      <div role="status" className="flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-3 py-2.5 text-sm text-emerald-800 dark:text-emerald-300">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
        <span>{state.message}</span>
      </div>
    );
  }
  return <span className="sr-only">{t("auth.verify.status")}</span>;
}

export function VerifyEmailForm({ token }: { token?: string }) {
  const { t } = useI18n();
  const [verifyState, verifyAction, verifyPending] = useActionState(verifyEmailAction, initialState);
  const [resendState, resendAction, resendPending] = useActionState(resendVerificationEmailAction, initialState);

  return (
    <div className="space-y-7">
      {token ? (
        <section aria-labelledby="verify-action-title" className="space-y-4">
          <h2 id="verify-action-title" className="text-lg font-semibold">{t("auth.verify.confirmTitle")}</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{t("auth.verify.confirmBody")}</p>
          <form action={verifyAction} className="space-y-4">
            <FormStatus state={verifyState} />
            <input type="hidden" name="token" value={token} />
            <Button type="submit" size="lg" className="w-full" loading={verifyPending}>
              {t("auth.verify.confirmButton")}
            </Button>
          </form>
        </section>
      ) : null}

      <section aria-labelledby="resend-title" className="space-y-4 border-t border-border pt-6">
        <div>
          <h2 id="resend-title" className="text-lg font-semibold">{t("auth.verify.resendTitle")}</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t("auth.verify.resendBody")}</p>
        </div>
        <form action={resendAction} className="space-y-4">
          <FormStatus state={resendState} />
          <div className="space-y-1.5">
            <Label htmlFor="verification-email" required>{t("common.email")}</Label>
            <Input
              id="verification-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@restaurant.com"
              leading={<Mail />}
              required
              invalid={!!resendState.fieldErrors?.email}
              aria-describedby={resendState.fieldErrors?.email ? "verification-email-error" : undefined}
            />
            {resendState.fieldErrors?.email ? (
              <p id="verification-email-error" className="text-xs text-destructive">{resendState.fieldErrors.email}</p>
            ) : null}
          </div>
          <Button type="submit" variant="outline" className="w-full" loading={resendPending}>
            {t("auth.verify.resendButton")}
          </Button>
        </form>
      </section>

      <Link href="/login" className="block text-center text-sm font-medium text-primary hover:underline">
        {t("auth.verify.backToLogin")}
      </Link>
    </div>
  );
}
