import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PrintReportButton } from "@/components/sales/print-report-button";
import { ReportFilters } from "@/components/reports/report-filters";
import { ReportPrintStyles } from "@/components/reports/report-print-styles";
import { requireRestaurant } from "@/lib/auth/context";
import { getI18n } from "@/i18n";
import { formatReportDateInput, pageReportDateRange } from "@/lib/reports/date-range";
import { getReportBranches } from "@/lib/reports/filters";

export const metadata: Metadata = { title: "مركز التقارير | DineFlow" };
type Search = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
const tx = (locale: string, en: string, ar: string) => locale === "ar" ? ar : en;

export default async function ReportsCenterPage({ searchParams }: { searchParams: Promise<Search> }) {
  const [i18n, search, membership] = await Promise.all([getI18n(), searchParams, requireRestaurant("reports.view")]);
  const { locale } = i18n;
  const ar = locale === "ar";
  const rangeState = pageReportDateRange(first(search.start), first(search.end));
  const requestedBranch = first(search.branchId);
  const branchContext = await getReportBranches(membership, requestedBranch).catch((error: unknown) => {
    if (error instanceof Error && error.message === "BRANCH_SCOPE_VIOLATION") redirect("/app/forbidden");
    throw error;
  });
  const params = new URLSearchParams({ start: formatReportDateInput(rangeState.range.start), end: formatReportDateInput(new Date(rangeState.range.end.getTime() - 86_400_000)) });
  if (branchContext.branchId) params.set("branchId", branchContext.branchId);
  const query = params.toString();
  const canFinancial = membership.isOwner || membership.permissions.has("reports.financial.view");
  const canStaff = membership.isOwner || membership.permissions.has("staff.view");
  const reportCards = [
    ...(canFinancial ? [{ href: `/app/reports/sales?${query}`, title: tx(locale, "Sales report", "تقرير المبيعات"), description: tx(locale, "Sales by period, branch and confirmed payment method, with previous-period comparison.", "المبيعات حسب الفترة والفرع وطريقة الدفع المؤكدة مع مقارنة الفترة السابقة.") }] : []),
    { href: `/app/reports/products?${query}`, title: tx(locale, "Product report", "تقرير المنتجات"), description: tx(locale, "Best sellers, least sold, unsold products, units and authorized revenue/margin.", "الأكثر والأقل مبيعاً والمنتجات غير المباعة والكميات والإيراد والهامش للمخولين.") },
    { href: `/app/reports/orders?${query}`, title: tx(locale, "Order report", "تقرير الطلبات"), description: tx(locale, "Order volume, average preparation time, cancellations, rejections and service type.", "حجم الطلبات ومتوسط التحضير والإلغاءات والرفض ونوع الخدمة.") },
    ...(canStaff ? [{ href: `/app/reports/staff?${query}`, title: tx(locale, "Staff report", "تقرير الموظفين"), description: tx(locale, "Orders, completion speed, cancelled operations, price changes and activity.", "الطلبات وسرعة الإنجاز والعمليات الملغاة وتعديلات الأسعار والنشاط.") }] : []),
  ];

  return <main className="space-y-6 pb-8" dir={ar ? "rtl" : "ltr"}>
    <header className="flex flex-wrap items-start justify-between gap-4 print:hidden"><div><p className="text-sm font-medium text-primary">{tx(locale, "Analytics", "التحليلات")}</p><h1 className="mt-1 text-2xl font-bold">{tx(locale, "Reports center", "مركز التقارير")}</h1><p className="mt-2 text-sm text-muted-foreground">{tx(locale, "Choose a report. The selected date range and permitted branch are carried into each report.", "اختر تقريراً؛ تُمرر الفترة والفرع المصرح به إلى التقارير.")}</p></div><PrintReportButton locale={locale} /></header>
    <ReportFilters locale={locale} action="/app/reports" start={formatReportDateInput(rangeState.range.start)} end={formatReportDateInput(new Date(rangeState.range.end.getTime() - 86_400_000))} branches={branchContext.branches} branchId={branchContext.branchId} invalidRange={rangeState.invalid} />
    <section id="report-print-area" className="space-y-5"><div className="hidden print:block"><h1 className="text-2xl font-bold">{tx(locale, "Reports center", "مركز التقارير")}</h1><p>{formatReportDateInput(rangeState.range.start)} — {formatReportDateInput(new Date(rangeState.range.end.getTime() - 86_400_000))}</p></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{reportCards.map((card) => <a key={card.href.split("?")[0]} href={card.href} className="group rounded-2xl border bg-card p-5 transition hover:border-primary/50 hover:shadow-sm"><h2 className="text-lg font-semibold group-hover:text-primary">{card.title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{card.description}</p><span className="mt-5 inline-flex text-sm font-medium text-primary">{tx(locale, "Open report", "فتح التقرير")} <span aria-hidden="true" className={ar ? "me-1" : "ms-1"}>→</span></span></a>)}</div></section><ReportPrintStyles />
  </main>;
}
