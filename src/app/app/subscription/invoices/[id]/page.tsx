import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, FileText } from "lucide-react";
import type { InvoiceStatus, PaymentMethod } from "@prisma/client";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { requireRestaurant } from "@/lib/auth/context";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { getI18n } from "@/i18n";
import { InvoicePrintButton } from "./invoice-print-button";

export const metadata: Metadata = { title: "Subscription invoice | DineFlow" };

const label = (locale: string, en: string, ar: string) => locale === "ar" ? ar : en;
const invoiceStatus = (status: InvoiceStatus, locale: "ar" | "en") => {
  const texts: Record<string, [string, string]> = {
    DRAFT: ["Draft", "مسودة"], ISSUED: ["Issued", "صادرة"], PARTIALLY_PAID: ["Partially paid", "مدفوعة جزئياً"],
    PAID: ["Paid", "مدفوعة"], VOID: ["Void", "ملغاة"], REFUNDED: ["Refunded", "مستردة"],
  };
  const current = texts[status];
  return current ? label(locale, current[0], current[1]) : status;
};

const safeProviderUrl = (value: string | null) => {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
};

const paymentMethodLabel = (method: PaymentMethod | null | undefined, locale: "ar" | "en") => {
  const labels: Record<PaymentMethod, [string, string]> = {
    CASH: ["Cash", "نقداً"], CARD: ["Card", "بطاقة"], ONLINE: ["Online", "إلكتروني"],
    WALLET: ["Wallet", "محفظة"], BANK_TRANSFER: ["Bank transfer", "تحويل بنكي"],
    PAY_AT_PICKUP: ["Pay at pickup", "الدفع عند الاستلام"], PAY_ON_DELIVERY: ["Pay on delivery", "الدفع عند التوصيل"],
    OTHER: ["Other", "أخرى"],
  };
  return method ? label(locale, labels[method][0], labels[method][1]) : label(locale, "Not recorded", "غير مسجلة");
};

export default async function SubscriptionInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const [membership, { locale }, { id }] = await Promise.all([requireRestaurant(), getI18n(), params]);
  if (!membership.isOwner && !membership.permissions.has("subscription.view") && !membership.permissions.has("subscription.manage")) {
    redirect("/app/forbidden");
  }
  const invoice = await db.subscriptionInvoice.findFirst({
    where: { id, subscription: { restaurantId: membership.restaurantId } },
    include: {
      subscription: { include: { restaurant: { select: { id: true, name: true, legalName: true, email: true, phone: true, address: true } } } },
      payments: {
        where: { status: { in: ["SUCCEEDED", "REFUNDED"] } },
        orderBy: { paidAt: "desc" },
        take: 1,
        select: { method: true },
      },
    },
  });
  if (!invoice || invoice.subscription.restaurantId !== membership.restaurantId) notFound();

  const ar = locale === "ar";
  const hostedInvoiceUrl = safeProviderUrl(invoice.hostedInvoiceUrl);
  const providerPdfUrl = safeProviderUrl(invoice.pdfUrl);
  const backIcon = ar ? <ArrowRight className="size-4" /> : <ArrowLeft className="size-4" />;
  return (
    <div className="mx-auto max-w-4xl space-y-4 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Button asChild variant="ghost" size="sm"><Link href="/app/subscription">{backIcon}{label(locale, "Back to subscription", "العودة إلى الاشتراك")}</Link></Button>
        <InvoicePrintButton locale={locale} />
      </div>

      <article id="subscription-invoice" className="rounded-2xl border bg-card p-6 shadow-soft sm:p-10 print:rounded-none print:border-0 print:bg-white print:p-0 print:shadow-none">
        <header className="flex flex-col justify-between gap-6 border-b pb-6 sm:flex-row sm:items-start">
          <div>
            <div className="inline-flex items-center gap-2 text-primary"><FileText className="size-5" /><span className="text-xs font-bold uppercase tracking-[0.18em]">DineFlow</span></div>
            <h1 className="mt-4 text-2xl font-bold">{label(locale, "Subscription invoice", "فاتورة اشتراك")}</h1>
            <p className="mt-1 font-mono text-sm text-muted-foreground" dir="ltr">{invoice.providerInvoiceNumber || invoice.number}</p>
          </div>
          <div className="sm:text-end">
            <p className="text-sm font-semibold">{invoice.subscription.restaurant.legalName || invoice.subscription.restaurant.name}</p>
            {invoice.subscription.restaurant.address && <p className="mt-1 whitespace-pre-line text-xs text-muted-foreground">{invoice.subscription.restaurant.address}</p>}
            {invoice.subscription.restaurant.email && <p className="mt-1 text-xs text-muted-foreground" dir="ltr">{invoice.subscription.restaurant.email}</p>}
            {invoice.subscription.restaurant.phone && <p className="mt-1 text-xs text-muted-foreground" dir="ltr">{invoice.subscription.restaurant.phone}</p>}
          </div>
        </header>

        <section className="grid gap-4 border-b py-6 sm:grid-cols-2 lg:grid-cols-3">
          <div><p className="text-xs text-muted-foreground">{label(locale, "Invoice date", "تاريخ الفاتورة")}</p><p className="mt-1 text-sm font-medium">{formatDate(invoice.createdAt, locale)}</p></div>
          <div><p className="text-xs text-muted-foreground">{label(locale, "Status", "الحالة")}</p><p className="mt-1 text-sm font-medium">{invoiceStatus(invoice.status, locale)}</p></div>
          <div><p className="text-xs text-muted-foreground">{label(locale, "Billing period", "فترة الفوترة")}</p><p className="mt-1 text-sm font-medium">{formatDate(invoice.periodStart, locale)} – {formatDate(invoice.periodEnd, locale)}</p></div>
          <div><p className="text-xs text-muted-foreground">{label(locale, "Payment method", "طريقة الدفع")}</p><p className="mt-1 text-sm font-medium">{paymentMethodLabel(invoice.payments[0]?.method, locale)}</p></div>
        </section>

        <section className="py-6">
          <div className="overflow-hidden rounded-xl border print:rounded-none">
            <div className="grid grid-cols-[1fr_auto] gap-4 bg-muted/60 px-4 py-3 text-xs font-semibold print:bg-gray-100">
              <span>{label(locale, "Description", "الوصف")}</span><span>{label(locale, "Amount", "المبلغ")}</span>
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-4 px-4 py-5 text-sm">
              <div><p className="font-medium">{label(locale, "Subscription service", "خدمة الاشتراك")}</p><p className="mt-1 text-xs text-muted-foreground">{label(locale, "Subscription period shown above", "فترة الاشتراك موضحة أعلاه")}</p></div>
              <p className="font-semibold tabular-nums" dir="ltr">{formatMoney(invoice.amount, invoice.currency, locale)}</p>
            </div>
            <div className="flex items-center justify-between border-t px-4 py-4"><span className="font-semibold">{label(locale, "Invoice total", "إجمالي الفاتورة")}</span><span className="text-lg font-bold tabular-nums" dir="ltr">{formatMoney(invoice.amount, invoice.currency, locale)}</span></div>
          </div>
        </section>

        {(hostedInvoiceUrl || providerPdfUrl) && <section className="flex flex-wrap gap-3 border-b pb-6">
          {hostedInvoiceUrl && <a href={hostedInvoiceUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary underline underline-offset-4">{label(locale, "Open provider invoice", "فتح الفاتورة لدى مزود الدفع")}</a>}
          {providerPdfUrl && <a href={providerPdfUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary underline underline-offset-4">{label(locale, "Download provider PDF", "تنزيل ملف PDF من مزود الدفع")}</a>}
        </section>}

        <footer className="border-t pt-5 text-xs leading-6 text-muted-foreground">
          {label(locale, "This page does not collect or confirm payment. Provider invoice links appear only when stored from a verified integration.", "لا تحصّل هذه الصفحة أي دفعة ولا تؤكدها. لا تظهر روابط مزود الدفع إلا عند حفظها عبر تكامل موثوق.")}
        </footer>
      </article>
      <style>{`@media print { @page { size: auto; margin: 16mm; } body { background: white !important; } body * { visibility: hidden; } #subscription-invoice, #subscription-invoice * { visibility: visible; } #subscription-invoice { position: absolute; inset: 0; width: 100%; color: #111827 !important; } }`}</style>
    </div>
  );
}
