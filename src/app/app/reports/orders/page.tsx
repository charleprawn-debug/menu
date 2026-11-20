import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PrintReportButton } from "@/components/sales/print-report-button";
import { ReportFilters } from "@/components/reports/report-filters";
import { ReportPrintStyles } from "@/components/reports/report-print-styles";
import { requireRestaurant } from "@/lib/auth/context";
import { formatMoney } from "@/lib/money";
import { getI18n } from "@/i18n";
import { formatReportDateInput, pageReportDateRange } from "@/lib/reports/date-range";
import { getReportBranches } from "@/lib/reports/filters";
import { loadOrderReport } from "@/lib/reports/orders";

export const metadata: Metadata = { title: "تقرير الطلبات | DineFlow" };
type Search = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
const tx = (locale: string, en: string, ar: string) => locale === "ar" ? ar : en;
const statusLabel = (locale: string, value: string) => {
  const labels: Record<string, [string, string]> = {
    NEW: ["New", "جديد"], ACCEPTED: ["Accepted", "مقبول"], PREPARING: ["Preparing", "قيد التحضير"], READY: ["Ready", "جاهز"],
    DELIVERED: ["Delivered", "تم التوصيل"], COMPLETED: ["Completed", "مكتمل"], REJECTED: ["Rejected", "مرفوض"], CANCELLED: ["Cancelled", "ملغى"],
  };
  const entry = labels[value];
  return entry ? entry[locale === "ar" ? 1 : 0] : value;
};
const typeLabel = (locale: string, value: string) => {
  const labels: Record<string, [string, string]> = { DINE_IN: ["Dine in", "داخل المطعم"], PICKUP: ["Pickup", "استلام"], DELIVERY: ["Delivery", "توصيل"] };
  const entry = labels[value];
  return entry ? entry[locale === "ar" ? 1 : 0] : value;
};

export default async function OrdersReportPage({ searchParams }: { searchParams: Promise<Search> }) {
  const [i18n, search, membership] = await Promise.all([getI18n(), searchParams, requireRestaurant("reports.view")]);
  const { locale } = i18n;
  const ar = locale === "ar";
  const rangeState = pageReportDateRange(first(search.start), first(search.end));
  const requestedBranch = first(search.branchId);
  const branchContext = await getReportBranches(membership, requestedBranch).catch((error: unknown) => {
    if (error instanceof Error && error.message === "BRANCH_SCOPE_VIOLATION") redirect("/app/forbidden");
    throw error;
  });
  const filters = { ...rangeState.range, branchId: branchContext.branchId };
  const report = await loadOrderReport(membership, filters).catch((error: unknown) => {
    if (error instanceof Error && error.message === "BRANCH_SCOPE_VIOLATION") redirect("/app/forbidden");
    throw error;
  });
  const currency = membership.restaurant.currency;
  const canExport = membership.isOwner || membership.permissions.has("reports.export");
  const exportQuery = new URLSearchParams({ start: formatReportDateInput(filters.start), end: formatReportDateInput(new Date(filters.end.getTime() - 86_400_000)) });
  if (filters.branchId) exportQuery.set("branchId", filters.branchId);
  const dateLabel = `${formatReportDateInput(filters.start)} — ${formatReportDateInput(new Date(filters.end.getTime() - 86_400_000))}`;

  return <main className="space-y-6 pb-8" dir={ar ? "rtl" : "ltr"}>
    <header className="flex flex-wrap items-start justify-between gap-4 print:hidden"><div><p className="text-sm font-medium text-primary">{tx(locale, "Reports", "التقارير")}</p><h1 className="mt-1 text-2xl font-bold">{tx(locale, "Order report", "تقرير الطلبات")}</h1><p className="mt-2 text-sm text-muted-foreground">{tx(locale, "Order volume is grouped by creation date; cancellations and rejections use the date of the status-change event.", "يُجمع حجم الطلبات حسب تاريخ إنشائها؛ وتُحسب الإلغاءات والرفض حسب تاريخ انتقال الحالة.")}</p></div><div className="flex flex-wrap gap-2">{canExport ? <a href={`/api/app/reports/orders/export?${exportQuery.toString()}`} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">{tx(locale, "Download Excel", "تنزيل Excel")}</a> : null}<PrintReportButton locale={locale} /></div></header>
    <ReportFilters locale={locale} action="/app/reports/orders" start={formatReportDateInput(filters.start)} end={formatReportDateInput(new Date(filters.end.getTime() - 86_400_000))} branches={branchContext.branches} branchId={filters.branchId} invalidRange={rangeState.invalid} />
    <section id="report-print-area" className="space-y-5"><div className="hidden print:block"><h1 className="text-2xl font-bold">{tx(locale, "Order report", "تقرير الطلبات")}</h1><p>{dateLabel}</p></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><article className="rounded-2xl border bg-card p-5"><p className="text-sm text-muted-foreground">{tx(locale, "Orders created", "الطلبات المنشأة")}</p><p className="mt-2 text-2xl font-bold">{report.totalOrders}</p></article><article className="rounded-2xl border bg-card p-5"><p className="text-sm text-muted-foreground">{tx(locale, "Average preparation", "متوسط التحضير")}</p><p className="mt-2 text-2xl font-bold">{report.averagePreparationMinutes === null ? "—" : `${report.averagePreparationMinutes} ${tx(locale, "min", "دقيقة")}`}</p>{report.preparationSampled ? <p className="mt-1 text-xs text-muted-foreground">{tx(locale, "Calculated from the latest 100,000 eligible orders.", "محسوب من أحدث 100,000 طلب مستوفٍ للشروط.")}</p> : null}</article><article className="rounded-2xl border bg-card p-5"><p className="text-sm text-muted-foreground">{tx(locale, "Cancelled / rejected", "ملغاة / مرفوضة")}</p><p className="mt-2 text-2xl font-bold">{report.cancelled} / {report.rejected}</p><p className="mt-1 text-xs text-muted-foreground">{tx(locale, "Status changes during the selected period", "انتقالات الحالة خلال الفترة المحددة")}</p></article><article className="rounded-2xl border bg-card p-5"><p className="text-sm text-muted-foreground">{report.financialVisible ? tx(locale, "Average completed order", "متوسط الطلب المكتمل") : tx(locale, "Completed orders", "الطلبات المكتملة")}</p><p className="mt-2 text-2xl font-bold" dir={report.financialVisible ? "ltr" : undefined}>{report.financialVisible ? report.averageOrderValue === null ? "—" : formatMoney(report.averageOrderValue, currency, ar ? "ar" : "en") : report.completedOrders}</p>{report.financialVisible ? <p className="mt-1 text-xs text-muted-foreground">{tx(locale, "Completed sales", "المبيعات المكتملة")}: {formatMoney(report.completedSales ?? 0, currency, ar ? "ar" : "en")}</p> : null}</article></div>
      <div className="grid gap-5 lg:grid-cols-2"><section className="overflow-hidden rounded-2xl border bg-card"><div className="border-b p-4"><h2 className="font-semibold">{tx(locale, "Orders by service type", "الطلبات حسب نوع الخدمة")}</h2></div>{report.types.length ? <div className="divide-y">{report.types.map((entry) => <div key={entry.type} className="flex items-center justify-between gap-3 p-4 text-sm"><span>{typeLabel(locale, entry.type)}</span><strong>{entry.count}</strong></div>)}</div> : <p className="p-5 text-sm text-muted-foreground">{tx(locale, "No orders in this period.", "لا توجد طلبات خلال هذه الفترة.")}</p>}</section>
        <section className="overflow-hidden rounded-2xl border bg-card"><div className="border-b p-4"><h2 className="font-semibold">{tx(locale, "Current status of orders created in the period", "الحالة الحالية للطلبات المنشأة خلال الفترة")}</h2></div>{report.statuses.length ? <div className="divide-y">{report.statuses.map((entry) => <div key={entry.status} className="flex items-center justify-between gap-3 p-4 text-sm"><span>{statusLabel(locale, entry.status)}</span><strong>{entry.count}</strong></div>)}</div> : <p className="p-5 text-sm text-muted-foreground">{tx(locale, "No orders in this period.", "لا توجد طلبات خلال هذه الفترة.")}</p>}</section></div>
    </section><ReportPrintStyles />
  </main>;
}
