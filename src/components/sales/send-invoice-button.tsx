"use client";

import { useActionState } from "react";
import { sendInvoiceEmailAction, type SalesActionState } from "@/app/actions/sales";

export function SendInvoiceButton({ invoiceId, locale }: { invoiceId: string; locale: string }) {
  const [state, action, pending] = useActionState(sendInvoiceEmailAction, {} as SalesActionState);
  const ar = locale === "ar";
  const text = state.error
    ? ({ CUSTOMER_EMAIL_MISSING: ar ? "لا يوجد بريد إلكتروني للعميل." : "No customer email is available.", EMAIL_UNAVAILABLE: ar ? "لم يُرسل البريد؛ إعداد SMTP غير متاح." : "Not sent: SMTP is not configured.", EMAIL_FAILED: ar ? "فشل إرسال البريد. لم يُسجل كمرسل." : "Email delivery failed; it was not recorded as sent." } as Record<string, string>)[state.error] ?? (ar ? "تعذر إرسال الفاتورة." : "Could not send the invoice.")
    : state.message === "EMAIL_SENT" ? (ar ? "تم قبول رسالة الفاتورة للإرسال عبر SMTP." : "Invoice email was accepted for delivery via SMTP.") : "";
  return <form action={action} className="space-y-2">
    <input type="hidden" name="invoiceId" value={invoiceId} />
    <button disabled={pending} className="rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-50">{pending ? (ar ? "جارٍ الإرسال…" : "Sending…") : (ar ? "إرسال للعميل" : "Email customer")}</button>
    {text ? <p role={state.error ? "alert" : "status"} className={`text-sm ${state.error ? "text-rose-700" : "text-emerald-700"}`}>{text}</p> : null}
  </form>;
}

export function PrintInvoiceButton({ locale }: { locale: string }) {
  const ar = locale === "ar";
  return <button type="button" onClick={() => window.print()} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground print:hidden">{ar ? "طباعة / حفظ PDF" : "Print / Save PDF"}</button>;
}
