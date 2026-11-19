"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { confirmEmailChangeAction, type StaffActionState } from "@/app/actions/staff";

export function ConfirmEmailChangeForm({ token, locale }: { token: string; locale: string }) {
  const [state, action, pending] = useActionState(confirmEmailChangeAction, {} as StaffActionState);
  const router = useRouter();
  const ar = locale === "ar";
  useEffect(() => { if (state.ok) { const timer = setTimeout(() => router.replace("/login?emailChanged=1"), 1800); return () => clearTimeout(timer); } }, [state.ok, router]);
  return <div>
    <p className="text-sm font-medium text-emerald-700">DineFlow</p>
    <h1 className="mt-2 text-2xl font-bold">{ar ? "تأكيد البريد الجديد" : "Confirm the new email"}</h1>
    <p className="mt-2 text-sm leading-6 text-muted-foreground">{ar ? "تأكيد البريد يغيّر عنوان تسجيل الدخول ويبطل الجلسات السابقة لأمان الحساب." : "Confirmation changes the sign-in email and revokes previous sessions for account security."}</p>
    {!state.ok ? <form action={action} className="mt-6 space-y-4"><input type="hidden" name="token" value={token} />{state.error ? <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{state.error}</p> : null}<button disabled={pending} className="h-11 w-full rounded-lg bg-primary px-4 font-semibold text-primary-foreground disabled:opacity-50">{pending ? (ar ? "جارٍ التأكيد…" : "Confirming…") : (ar ? "تأكيد البريد وتسجيل الخروج" : "Confirm email and sign out")}</button></form> : <p role="status" className="mt-5 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{state.message}{ar ? " سيتم تحويلك لتسجيل الدخول…" : " Redirecting to sign in…"}</p>}
  </div>;
}
