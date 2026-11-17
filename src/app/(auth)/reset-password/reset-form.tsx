"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, Lock } from "lucide-react";
import { resetPasswordAction, type ActionState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/i18n/provider";

const initialState: ActionState = {};

export function ResetForm({ token }: { token: string }) {
  const { t } = useI18n();
  const [state, formAction, pending] = useActionState(resetPasswordAction, initialState);

  return (
    <form action={formAction} className="space-y-5">
      {state.error ? (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      ) : null}

      <input type="hidden" name="token" value={token} />

      <div className="space-y-1.5">
        <Label htmlFor="password" required>
          {t("auth.reset.newPassword")}
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          leading={<Lock />}
          required
          invalid={!!state.fieldErrors?.password}
        />
        {state.fieldErrors?.password ? <p className="text-xs text-destructive">{state.fieldErrors.password}</p> : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword" required>
          {t("auth.reset.confirm")}
        </Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
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

      <Button type="submit" size="lg" className="w-full" loading={pending}>
        {t("auth.reset.submit")}
      </Button>

      <Link href="/login" className="flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4 rtl:rotate-180" />
        {t("auth.forgot.backToLogin")}
      </Link>
    </form>
  );
}
