"use client";

import { useActionState } from "react";
import { acceptInvitationAction, type StaffActionState } from "@/app/actions/staff";

export function AcceptInvitationForm({ token, locale }: { token: string; locale: string }) {
  const [state, action, pending] = useActionState(acceptInvitationAction, {} as StaffActionState);
  const ar = locale === "ar";
  return <div>
    <p className="text-sm font-medium text-emerald-700">{ar ? "انضمام إلى فريق المطعم" : "Join a restaurant team"}</p>
    <h1 className="mt-2 text-2xl font-bold">{ar ? "قبول الدعوة" : "Accept invitation"}</h1>
    <p className="mt-2 text-sm leading-6 text-muted-foreground">{ar ? "إذا كان لديك حساب DineFlow، أدخل كلمة مروره الحالية. وإذا كنت مستخدماً جديداً، اختر كلمة مرور لحسابك. يثبت رابط الدعوة بريدك الإلكتروني لهذه العضوية." : "If you already have a DineFlow account, enter its current password. New users can choose a password. The invitation link verifies the invited email for this membership."}</p>
    <form action={action} className="mt-6 space-y-4">
      <input type="hidden" name="token" value={token} />
      <label className="grid gap-1.5 text-sm">{ar ? "الاسم (اختياري للحساب الموجود)" : "Name (optional for an existing account)"}<input name="name" autoComplete="name" minLength={2} maxLength={100} className="h-11 rounded-lg border bg-background px-3" /></label>
      <label className="grid gap-1.5 text-sm">{ar ? "كلمة المرور الحالية أو الجديدة" : "Current or new password"}<input name="password" type="password" minLength={8} maxLength={128} required autoComplete="new-password" className="h-11 rounded-lg border bg-background px-3" /></label>
      <label className="grid gap-1.5 text-sm">{ar ? "تأكيد كلمة المرور" : "Confirm password"}<input name="confirmPassword" type="password" minLength={8} maxLength={128} required autoComplete="new-password" className="h-11 rounded-lg border bg-background px-3" /></label>
      {state.error ? <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{state.error}</p> : null}
      <button disabled={pending} className="h-11 w-full rounded-lg bg-primary px-4 font-semibold text-primary-foreground disabled:opacity-50">{pending ? (ar ? "جارٍ قبول الدعوة…" : "Accepting…") : (ar ? "قبول الدعوة والدخول" : "Accept and sign in")}</button>
    </form>
  </div>;
}
