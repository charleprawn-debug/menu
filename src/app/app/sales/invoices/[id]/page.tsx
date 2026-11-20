import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Prisma } from "@prisma/client";
import { recordOrderPaymentAction } from "@/app/actions/orders";
import { PrintInvoiceButton, SendInvoiceButton } from "@/components/sales/send-invoice-button";
import { VoidInvoiceForm } from "@/components/sales/void-invoice-form";
import { requireRestaurant } from "@/lib/auth/context";
import { branchScopeWhere, ownedOrderWhere } from "@/lib/auth/scope";
import { db } from "@/lib/db";
import { getI18n } from "@/i18n";
import { formatDate } from "@/lib/utils";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "فاتورة المطعم | DineFlow" };
const tx = (locale: string, en: string, ar: string) => locale === "ar" ? ar : en;
const can = (membership: { isOwner: boolean; permissions: Set<string> }, permission: string) => membership.isOwner || membership.permissions.has(permission);
const money = (value: Prisma.Decimal | number, currency: string, locale: string) => formatMoney(typeof value === "number" ? value : value.toNumber(), currency, locale as "ar" | "en");

export default async function RestaurantInvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, { locale }, membership] = await Promise.all([params, getI18n(), requireRestaurant("billing.view")]);
  const ar = locale === "ar";
  const orderWhere: Prisma.OrderWhereInput = { restaurantId: membership.restaurantId, ...branchScopeWhere(membership, "billing.view", "branchId"), ...ownedOrderWhere(membership, "billing.view") } as Prisma.OrderWhereInput;
  const invoice = await db.invoice.findFirst({
    where: { id, restaurantId: membership.restaurantId, order: { is: orderWhere } },
    include: {
      items: { orderBy: { id: "asc" } },
      order: { include: { customer: { select: { name: true, email: true } }, payments: { orderBy: { paidAt: "desc" } }, refunds: { where: { status: "PROCESSED" }, orderBy: { createdAt: "desc" } } } },
    },
  });
  if (!invoice || !invoice.order) notFound();
  const branch = invoice.order.branchId ? await db.branch.findFirst({ where: { id: invoice.order.branchId, restaurantId: membership.restaurantId }, select: { name: true } }) : null;
  const canCreate = can(membership, "invoices.create");
  const canRecord = can(membership, "payments.record");
  const canVoid = can(membership, "invoices.void") && invoice.paidAmount.lte(0) && invoice.status !== "VOID";
  const due = invoice.total.minus(invoice.paidAmount);
  const validDue = due.gt(0) ? due : new Prisma.Decimal(0);
  const customerName = invoice.customerName || invoice.order.customer?.name || invoice.order.customerName || tx(locale, "Guest", "ضيف");
  const labelStatus: Record<string, string> = { DRAFT: tx(locale, "Draft", "مسودة"), ISSUED: tx(locale, "Issued", "صادرة"), PARTIALLY_PAID: tx(locale, "Partially paid", "مدفوعة جزئياً"), PAID: tx(locale, "Paid", "مدفوعة"), VOID: tx(locale, "Void", "ملغاة"), REFUNDED: tx(locale, "Refunded", "مستردة") };
  return <main className="mx-auto max-w-5xl space-y-5 pb-10" dir={ar ? "rtl" : "ltr"}>
    <div className="flex flex-wrap items-center justify-between gap-3 print:hidden"><Link href="/app/sales/invoices" className="rounded-lg border px-4 py-2 text-sm">{tx(locale, "Back to invoices", "العودة للفواتير")}</Link><div className="flex flex-wrap items-start gap-2"><PrintInvoiceButton locale={locale} />{canCreate ? <SendInvoiceButton invoiceId={invoice.id} locale={locale} /> : null}</div></div>
    <article id="restaurant-invoice" className="rounded-2xl border bg-card p-6 shadow-sm sm:p-10 print:rounded-none print:border-0 print:bg-white print:p-0 print:shadow-none">
      <header className="flex flex-col justify-between gap-5 border-b pb-6 sm:flex-row sm:items-start"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-primary">DineFlow · {tx(locale, "Restaurant invoice", "فاتورة المطعم")}</p><h1 className="mt-3 text-2xl font-bold">{tx(locale, "Invoice", "فاتورة")}</h1><p className="mt-2 font-mono text-sm" dir="ltr">{invoice.invoiceNumber}</p></div><div className="sm:text-end"><p className="font-semibold">{membership.restaurant.name}</p><p className="mt-1 text-sm text-muted-foreground">{branch?.name ?? tx(locale, "Restaurant-wide", "المطعم")}</p><p className="mt-1 text-xs text-muted-foreground">{membership.restaurant.slug}</p></div></header>
      <section className="grid gap-4 border-b py-6 sm:grid-cols-2 lg:grid-cols-4"><div><p className="text-xs text-muted-foreground">{tx(locale, "Invoice date", "تاريخ الفاتورة")}</p><p className="mt-1 text-sm font-medium">{formatDate(invoice.issuedAt, locale as "ar" | "en")}</p></div><div><p className="text-xs text-muted-foreground">{tx(locale, "Order", "الطلب")}</p><p className="mt-1 text-sm font-medium">#{invoice.order.orderNumber}</p></div><div><p className="text-xs text-muted-foreground">{tx(locale, "Customer", "العميل")}</p><p className="mt-1 text-sm font-medium">{customerName}</p>{invoice.order.customer?.email ? <p className="mt-1 text-xs text-muted-foreground" dir="ltr">{invoice.order.customer.email}</p> : null}</div><div><p className="text-xs text-muted-foreground">{tx(locale, "Payment status", "حالة الدفع")}</p><p className="mt-1 text-sm font-medium">{labelStatus[invoice.status] ?? invoice.status}</p></div></section>
      <section className="py-6"><div className="overflow-hidden rounded-xl border print:rounded-none"><div className="grid grid-cols-[1fr_auto_auto] gap-3 bg-muted/60 px-4 py-3 text-xs font-semibold print:bg-gray-100"><span>{tx(locale, "Item", "الصنف")}</span><span>{tx(locale, "Qty", "الكمية")}</span><span>{tx(locale, "Total", "الإجمالي")}</span></div>{invoice.items.map((item) => <div key={item.id} className="grid grid-cols-[1fr_auto_auto] gap-3 border-t px-4 py-4 text-sm"><span>{item.name}</span><span className="tabular-nums">{item.quantity}</span><span className="font-medium tabular-nums" dir="ltr">{money(item.total, invoice.currency, locale)}</span></div>)}<div className="space-y-2 border-t px-4 py-4 text-sm"><div className="flex justify-between gap-3"><span>{tx(locale, "Subtotal", "المجموع الفرعي")}</span><span dir="ltr">{money(invoice.subtotal, invoice.currency, locale)}</span></div><div className="flex justify-between gap-3"><span>{tx(locale, "Discount", "الخصم")}</span><span dir="ltr">−{money(invoice.discount, invoice.currency, locale)}</span></div><div className="flex justify-between gap-3"><span>{tx(locale, "Tax", "الضريبة")}</span><span dir="ltr">{money(invoice.tax, invoice.currency, locale)}</span></div><div className="flex justify-between gap-3"><span>{tx(locale, "Service fee", "رسوم الخدمة")}</span><span dir="ltr">{money(invoice.serviceFee, invoice.currency, locale)}</span></div><div className="flex justify-between gap-3 border-t pt-3 text-base font-bold"><span>{tx(locale, "Invoice total", "إجمالي الفاتورة")}</span><span dir="ltr">{money(invoice.total, invoice.currency, locale)}</span></div><div className="flex justify-between gap-3 text-muted-foreground"><span>{tx(locale, "Paid", "المدفوع")}</span><span dir="ltr">{money(invoice.paidAmount, invoice.currency, locale)}</span></div><div className="flex justify-between gap-3 font-semibold"><span>{tx(locale, "Balance due", "المتبقي")}</span><span dir="ltr">{money(validDue, invoice.currency, locale)}</span></div></div></div></section>
      {invoice.order.payments.length ? <section className="border-t py-5"><h2 className="mb-3 font-semibold">{tx(locale, "Payment history", "سجل الدفعات")}</h2><div className="space-y-2">{invoice.order.payments.map((payment) => <div key={payment.id} className="flex flex-wrap justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2 text-sm"><span>{payment.method} · {payment.status} · {formatDate(payment.paidAt, locale as "ar" | "en")}</span><span className="font-semibold" dir="ltr">{money(payment.amount, payment.currency, locale)}</span></div>)}</div></section> : null}
      <footer className="border-t pt-4 text-xs leading-6 text-muted-foreground">{tx(locale, "This invoice is a record of the restaurant order. Electronic payment confirmation depends on a verified payment provider.", "هذه الفاتورة سجل لطلب المطعم. ويعتمد تأكيد الدفع الإلكتروني على تحقق مزود دفع موثوق.")}</footer>
    </article>
    {canRecord && validDue.gt(0) && invoice.status !== "VOID" ? <section className="rounded-2xl border bg-card p-5 print:hidden"><h2 className="font-semibold">{tx(locale, "Record a cash payment", "تسجيل دفعة نقدية")}</h2><p className="mt-1 text-sm text-muted-foreground">{tx(locale, "Remaining balance", "الرصيد المتبقي")}: {money(validDue, invoice.currency, locale)}</p><form action={recordOrderPaymentAction} className="mt-3 flex flex-wrap items-end gap-3"><input type="hidden" name="orderId" value={invoice.order.id} /><input type="hidden" name="method" value="CASH" /><label className="grid gap-1 text-sm">{tx(locale, "Amount received", "المبلغ المستلم")}<input name="amount" type="number" min="0.01" max={validDue.toFixed(2)} step="0.01" defaultValue={validDue.toFixed(2)} required className="w-48 rounded-lg border bg-background px-3 py-2" /></label><button className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground">{tx(locale, "Record cash", "تسجيل النقد")}</button></form></section> : null}
    {canVoid ? <VoidInvoiceForm invoiceId={invoice.id} locale={locale} /> : null}
    <style>{`@media print { @page { size: auto; margin: 16mm; } body { background: white !important; } body * { visibility: hidden; } #restaurant-invoice, #restaurant-invoice * { visibility: visible; } #restaurant-invoice { position: absolute; inset: 0; width: 100%; color: #111827 !important; } }`}</style>
  </main>;
}
