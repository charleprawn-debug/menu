"use client";

import { useActionState } from "react";
import { voidInvoiceAction, type SalesActionState } from "@/app/actions/sales";

export function VoidInvoiceForm({ invoiceId, locale }: { invoiceId: string; locale: string }) {
  const [state, action, pending] = useActionState(voidInvoiceAction, {} as SalesActionState);
  const ar = locale === "ar";
  const text = state.error
    ? ({ VOID_CONFIRMATION_REQUIRED: ar ? "أكّد عملية الإلغاء قبل المتابعة." : "Confirm the void action before continuing.", INVOICE_CANNOT_BE_VOIDED: ar ? "تعذر الإلغاء؛ قد تكون الفاتورة دُفعت أو تغيرت حالتها." : "Could not void; the invoice may be paid or its status changed.", NOT_FOUND: ar ? "لم تعد الفاتورة متاحة." : "The invoice is no longer available." } as Record<string, string>)[state.error] ?? (ar ? "تعذر إلغاء الفاتورة." : "Unable to void the invoice.")
    : state.message === "INVOICE_VOIDED" ? (ar ? "تم إلغاء الفاتورة." : "Invoice voided.") : "";
  return <section className="rounded-2xl border border-rose-200 bg-rose-50/50 p-5 print:hidden"><h2 className="font-semibold text-rose-800">{ar ? "إلغاء الفاتورة" : "Void invoice"}</h2><p className="mt-1 text-sm text-muted-foreground">{ar ? "يمكن إلغاء الفواتير غير المدفوعة فقط. أما المدفوعة فيجب رد المبلغ بدلاً من إلغائها." : "Only unpaid invoices can be voided. Paid invoices must be refunded instead."}</p><form action={action} className="mt-3 flex flex-wrap items-center gap-3"><input type="hidden" name="invoiceId" value={invoiceId} /><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="confirmVoid" value="VOID" required />{ar ? "أؤكد إلغاء هذه الفاتورة." : "I confirm this invoice should be voided."}</label><button disabled={pending} className="rounded-lg border border-rose-300 px-4 py-2 text-sm font-medium text-rose-800 disabled:opacity-50">{pending ? (ar ? "جارٍ الإلغاء…" : "Voiding…") : (ar ? "إلغاء الفاتورة" : "Void invoice")}</button></form>{text ? <p role={state.error ? "alert" : "status"} className={`mt-3 text-sm ${state.error ? "text-rose-800" : "text-emerald-800"}`}>{text}</p> : null}</section>;
}
