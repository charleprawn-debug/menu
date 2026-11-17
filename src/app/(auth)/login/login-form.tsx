"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { loginAction, type ActionState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/i18n/provider";

const initialState: ActionState = {};

export function LoginForm({ next, reset }: { next?: string; reset?: boolean }) {
  const { t } = useI18n();
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="space-y-5">
      {reset ? (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          <CheckCircle2 className="size-4 shrink-0" />
          {t("auth.reset.title")} — {t("common.success")}
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
        <div className="flex items-center justify-between">
          <Label htmlFor="password">{t("common.password")}</Label>
          <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">
            {t("auth.login.forgot")}
          </Link>
        </div>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            leading={<Lock />}
            trailing={
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="pointer-events-auto text-muted-foreground hover:text-foreground"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            }
            required
            invalid={!!state.fieldErrors?.password}
          />
        </div>
        {state.fieldErrors?.password ? <p className="text-xs text-destructive">{state.fieldErrors.password}</p> : null}
      </div>

      {next ? <input type="hidden" name="next" value={next} /> : null}

      <Button type="submit" size="lg" className="w-full" loading={pending}>
        {t("auth.login.submit")}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {t("auth.login.noAccount")}{" "}
        <Link href="/register" className="font-semibold text-primary hover:underline">
          {t("auth.login.createAccount")}
        </Link>
      </p>

      <div className="rounded-xl border border-dashed bg-muted/40 p-3 text-center text-xs text-muted-foreground">
        <p className="font-medium text-foreground">حسابات تجريبية</p>
        <p className="mt-1" dir="ltr">
          owner@dineflow.app · Admin123!
        </p>
        <p dir="ltr">admin@dineflow.app · Admin123!</p>
      </div>
    </form>
  );
}
