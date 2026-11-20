"use client";

import { useActionState, useState, useTransition } from "react";
import { deleteExpenseAction, saveExpenseAction, type SalesActionState } from "@/app/actions/sales";

export interface ExpenseFormRow {
  id: string;
  title: string;
  category: string;
  amount: string;
  method: string;
  spentAt: string;
  branchId: string | null;
  notes: string;
  attachmentUrl: string;
}
export interface ExpenseBranchOption { id: string; name: string }

const categories = ["FOOD", "PAYROLL", "RENT", "UTILITIES", "SUPPLIES", "MARKETING", "TRANSPORT", "OTHER"];
const methods = ["CASH", "CARD", "ONLINE", "WALLET", "BANK_TRANSFER", "PAY_AT_PICKUP", "PAY_ON_DELIVERY", "OTHER"];
const tx = (locale: string, en: string, ar: string) => locale === "ar" ? ar : en;

function Result({ state, locale }: { state: SalesActionState; locale: string }) {
  const message = state.error
    ? ({ INVALID_EXPENSE: tx(locale, "Check the required fields and amount.", "تحقق من الحقول المطلوبة والمبلغ."), INVALID_EXPENSE_DATE: tx(locale, "Enter a valid expense date.", "أدخل تاريخاً صالحاً للمصروف."), INVALID_ATTACHMENT_URL: tx(locale, "Attachment must be a valid HTTPS link.", "يجب أن يكون المرفق رابط HTTPS صالحاً."), INVALID_BRANCH: tx(locale, "The selected branch is unavailable.", "الفرع المحدد غير متاح."), BRANCH_SCOPE_VIOLATION: tx(locale, "That branch is outside your access scope.", "هذا الفرع خارج نطاق صلاحيتك.") } as Record<string, string>)[state.error] ?? tx(locale, "Unable to save the expense.", "تعذر حفظ المصروف.")
    : state.message === "SAVED" ? tx(locale, "Expense saved.", "تم حفظ المصروف.") : "";
  if (!message) return null;
  return <p role={state.error ? "alert" : "status"} className={`mt-3 rounded-lg p-3 text-sm ${state.error ? "bg-rose-50 text-rose-800" : "bg-emerald-50 text-emerald-800"}`}>{message}</p>;
}

export function ExpenseForm({ locale, branches, expense, allowRestaurantWide = true }: { locale: string; branches: ExpenseBranchOption[]; expense?: ExpenseFormRow; allowRestaurantWide?: boolean }) {
  const [state, action, pending] = useActionState(saveExpenseAction, {} as SalesActionState);
  const dateValue = expense?.spentAt ? new Date(expense.spentAt).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16);
  const ar = locale === "ar";
  return <form action={action} className="grid gap-3 md:grid-cols-2">
    {expense ? <input type="hidden" name="expenseId" value={expense.id} /> : null}
    <label className="grid gap-1 text-sm">{tx(locale, "Name", "اسم المصروف")}<input name="title" required minLength={2} maxLength={120} defaultValue={expense?.title} className="rounded-lg border bg-background px-3 py-2" /></label>
    <label className="grid gap-1 text-sm">{tx(locale, "Category", "التصنيف")}<select name="category" required defaultValue={expense?.category ?? "OTHER"} className="rounded-lg border bg-background px-3 py-2">{expense && !categories.includes(expense.category) ? <option value={expense.category}>{expense.category}</option> : null}{categories.map((category) => <option key={category} value={category}>{tx(locale, category.replaceAll("_", " "), ({ FOOD: "طعام", PAYROLL: "رواتب", RENT: "إيجار", UTILITIES: "خدمات", SUPPLIES: "مستلزمات", MARKETING: "تسويق", TRANSPORT: "نقل", OTHER: "أخرى" } as Record<string, string>)[category] ?? category)}</option>)}</select></label>
    <label className="grid gap-1 text-sm">{tx(locale, "Amount", "المبلغ")}<input name="amount" type="number" required min="0.01" max="9999999999.99" step="0.01" defaultValue={expense?.amount} className="rounded-lg border bg-background px-3 py-2" /></label>
    <label className="grid gap-1 text-sm">{tx(locale, "Payment method", "طريقة الدفع")}<select name="method" required defaultValue={expense?.method ?? "CASH"} className="rounded-lg border bg-background px-3 py-2">{methods.map((method) => <option key={method} value={method}>{tx(locale, method.replaceAll("_", " "), ({ CASH: "نقداً", CARD: "بطاقة", ONLINE: "إلكتروني", WALLET: "محفظة", BANK_TRANSFER: "تحويل بنكي", PAY_AT_PICKUP: "عند الاستلام", PAY_ON_DELIVERY: "عند التوصيل", OTHER: "أخرى" } as Record<string, string>)[method] ?? method)}</option>)}</select></label>
    <label className="grid gap-1 text-sm">{tx(locale, "Date and time", "التاريخ والوقت")}<input name="spentAt" type="datetime-local" required defaultValue={dateValue} className="rounded-lg border bg-background px-3 py-2" /></label>
    <label className="grid gap-1 text-sm">{tx(locale, "Branch", "الفرع")}<select name="branchId" defaultValue={expense?.branchId ?? (allowRestaurantWide ? "" : branches[0]?.id ?? "")} required={!allowRestaurantWide} className="rounded-lg border bg-background px-3 py-2">{allowRestaurantWide ? <option value="">{tx(locale, "Restaurant-wide", "على مستوى المطعم")}</option> : null}{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
    <label className="grid gap-1 text-sm md:col-span-2">{tx(locale, "Attachment HTTPS link", "رابط المرفق HTTPS")}<input name="attachmentUrl" type="url" maxLength={2048} defaultValue={expense?.attachmentUrl} placeholder="https://…" dir="ltr" className="rounded-lg border bg-background px-3 py-2" /><span className="text-xs text-muted-foreground">{tx(locale, "Use a secure link to a receipt or supporting document.", "أدخل رابطاً آمناً للإيصال أو المستند المؤيد.")}</span></label>
    <label className="grid gap-1 text-sm md:col-span-2">{tx(locale, "Notes", "ملاحظات")}<textarea name="notes" maxLength={2000} rows={3} defaultValue={expense?.notes} className="rounded-lg border bg-background px-3 py-2" /></label>
    <div className="md:col-span-2"><button disabled={pending} className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground disabled:opacity-50">{pending ? tx(locale, "Saving…", "جارٍ الحفظ…") : expense ? tx(locale, "Save changes", "حفظ التعديلات") : tx(locale, "Add expense", "إضافة المصروف")}</button><Result state={state} locale={locale} /></div>
    <span className="sr-only" dir={ar ? "rtl" : "ltr"}>{tx(locale, "Expense form", "نموذج المصروف")}</span>
  </form>;
}

export function DeleteExpenseButton({ expenseId, locale }: { expenseId: string; locale: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const ar = locale === "ar";
  return <div>
    <button type="button" disabled={pending} onClick={() => {
      if (!window.confirm(tx(locale, "Archive this expense? It will be hidden but retained for audit.", "أرشفة هذا المصروف؟ سيُخفى مع الاحتفاظ به للتدقيق."))) return;
      const data = new FormData(); data.set("expenseId", expenseId); setMessage("");
      startTransition(() => { void deleteExpenseAction(data).then(() => setMessage(tx(locale, "Archived.", "تمت الأرشفة."))).catch(() => setMessage(tx(locale, "Could not archive this expense.", "تعذرت أرشفة المصروف."))); });
    }} className="rounded-md border border-rose-200 px-3 py-1.5 text-sm text-rose-700 disabled:opacity-50">{pending ? (ar ? "جارٍ…" : "Working…") : (ar ? "أرشفة" : "Archive")}</button>
    {message ? <p role="status" className="mt-1 text-xs text-muted-foreground">{message}</p> : null}
  </div>;
}
