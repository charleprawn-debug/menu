import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PrintReportButton } from "@/components/sales/print-report-button";
import { ReportFilters } from "@/components/reports/report-filters";
import { ReportPrintStyles } from "@/components/reports/report-print-styles";
import { requireRestaurant } from "@/lib/auth/context";
import { formatMoney } from "@/lib/money";
import { getI18n } from "@/i18n";
import { loadProductReport, type ProductReportRow } from "@/lib/reports/products";
import { formatReportDateInput, pageReportDateRange } from "@/lib/reports/date-range";
import { getReportBranches } from "@/lib/reports/filters";

export const metadata: Metadata = { title: "تقرير المنتجات | DineFlow" };
type Search = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
const tx = (locale: string, en: string, ar: string) => locale === "ar" ? ar : en;
const money = (amount: number, currency: string, locale: string) => formatMoney(amount, currency, locale === "ar" ? "ar" : "en");

function ProductTable({ rows, locale, currency, financialVisible, empty }: { rows: ProductReportRow[]; locale: string; currency: string; financialVisible: boolean; empty: string }) {
  const ar = locale === "ar";
  const label = (en: string, arabic: string) => ar ? arabic : en;
  if (!rows.length) return <p className="p-5 text-sm text-muted-foreground">{empty}</p>;
  return <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-start text-sm"><thead className="bg-muted/60 text-xs"><tr><th className="p-3">{label("Product", "المنتج")}</th><th className="p-3">{label("Category", "القسم")}</th><th className="p-3">{label("Units", "الكمية")}</th>{financialVisible ? <><th className="p-3">{label("Revenue", "الإيراد")}</th><th className="p-3">{label("Est. gross profit", "الربح الإجمالي التقديري")}</th><th className="p-3">{label("Margin", "الهامش")}</th></> : null}</tr></thead><tbody className="divide-y">{rows.map((row) => <tr key={row.id}><td className="p-3 font-medium">{ar ? row.nameAr : row.nameEn || row.nameAr}</td><td className="p-3 text-muted-foreground">{ar ? row.categoryAr || "—" : row.categoryEn || row.categoryAr || "—"}</td><td className="p-3">{row.quantity}</td>{financialVisible ? <><td className="p-3" dir="ltr">{row.revenue === null ? "—" : money(row.revenue, currency, locale)}</td><td className="p-3" dir="ltr">{row.grossProfit === null ? "—" : money(row.grossProfit, currency, locale)}</td><td className="p-3">{row.grossMarginPercent === null ? "—" : `${row.grossMarginPercent.toFixed(1)}%`}</td></> : null}</tr>)}</tbody></table></div>;
}

export default async function ProductsReportPage({ searchParams }: { searchParams: Promise<Search> }) {
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
  const report = await loadProductReport(membership, filters).catch((error: unknown) => {
    if (error instanceof Error && error.message === "BRANCH_SCOPE_VIOLATION") redirect("/app/forbidden");
    throw error;
  });
  const currency = membership.restaurant.currency;
  const canExport = membership.isOwner || membership.permissions.has("reports.export");
  const exportQuery = new URLSearchParams({ start: formatReportDateInput(filters.start), end: formatReportDateInput(new Date(filters.end.getTime() - 86_400_000)) });
  if (filters.branchId) exportQuery.set("branchId", filters.branchId);
  const bestSellers = report.rows.filter((row) => row.quantity > 0).slice(0, 10);
  const revenueRows = report.financialVisible ? report.rows.filter((row) => row.quantity > 0).sort((a, b) => (b.revenue ?? 0) - (a.revenue ?? 0) || a.nameAr.localeCompare(b.nameAr)).slice(0, 100) : [];
  const leastSellers = report.rows.filter((row) => row.quantity > 0).sort((a, b) => a.quantity - b.quantity || a.nameAr.localeCompare(b.nameAr)).slice(0, 10);
  const unsold = report.rows.filter((row) => row.quantity === 0).slice(0, 100);
  const dateLabel = `${formatReportDateInput(filters.start)} — ${formatReportDateInput(new Date(filters.end.getTime() - 86_400_000))}`;
  const exportHref = `/api/app/reports/products/export?${exportQuery.toString()}`;

  return <main className="space-y-6 pb-8" dir={ar ? "rtl" : "ltr"}>
    <header className="flex flex-wrap items-start justify-between gap-4 print:hidden"><div><p className="text-sm font-medium text-primary">{tx(locale, "Reports", "التقارير")}</p><h1 className="mt-1 text-2xl font-bold">{tx(locale, "Product report", "تقرير المنتجات")}</h1><p className="mt-2 text-sm text-muted-foreground">{tx(locale, "Completed orders in the selected period; quantities are units sold.", "تُحتسب الطلبات المكتملة ضمن الفترة؛ والكمية تعني الوحدات المباعة.")}</p></div><div className="flex flex-wrap gap-2">{canExport ? <a href={exportHref} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">{tx(locale, "Download Excel", "تنزيل Excel")}</a> : null}<PrintReportButton locale={locale} /></div></header>
    <ReportFilters locale={locale} action="/app/reports/products" start={formatReportDateInput(filters.start)} end={formatReportDateInput(new Date(filters.end.getTime() - 86_400_000))} branches={branchContext.branches} branchId={filters.branchId} invalidRange={rangeState.invalid} />
    <section id="report-print-area" className="space-y-5"><div className="hidden print:block"><h1 className="text-2xl font-bold">{tx(locale, "Product report", "تقرير المنتجات")}</h1><p>{dateLabel}</p></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><article className="rounded-2xl border bg-card p-5"><p className="text-sm text-muted-foreground">{tx(locale, "Products tracked", "المنتجات المشمولة")}</p><p className="mt-2 text-2xl font-bold">{report.productCount}</p></article><article className="rounded-2xl border bg-card p-5"><p className="text-sm text-muted-foreground">{tx(locale, "Units sold", "الوحدات المباعة")}</p><p className="mt-2 text-2xl font-bold">{report.totalUnits}</p></article><article className="rounded-2xl border bg-card p-5"><p className="text-sm text-muted-foreground">{tx(locale, "Products sold", "منتجات بيعت")}</p><p className="mt-2 text-2xl font-bold">{report.soldProductCount}</p></article><article className="rounded-2xl border bg-card p-5"><p className="text-sm text-muted-foreground">{tx(locale, "Not sold", "لم تُبع")}</p><p className="mt-2 text-2xl font-bold">{report.unsoldProductCount}</p></article></div>
      {report.financialVisible ? <div className="grid gap-3 sm:grid-cols-2"><article className="rounded-2xl border bg-card p-5"><p className="text-sm text-muted-foreground">{tx(locale, "Item revenue", "إيراد المنتجات")}</p><p className="mt-2 text-2xl font-bold" dir="ltr">{money(report.totalRevenue ?? 0, currency, locale)}</p></article><article className="rounded-2xl border bg-card p-5"><p className="text-sm text-muted-foreground">{tx(locale, "Estimated gross profit where current cost is set", "الربح التقديري للمنتجات ذات تكلفة مسجلة حالياً")}</p><p className="mt-2 text-2xl font-bold" dir="ltr">{money(report.estimatedGrossProfit ?? 0, currency, locale)}</p><p className="mt-1 text-xs text-muted-foreground">{tx(locale, `Cost is available for ${report.costCoveredProductCount} sold products; this is based on the current cost, not a historical cost snapshot.`, `تتوفر التكلفة لـ${report.costCoveredProductCount} منتجات مباعة؛ التقدير يستخدم التكلفة الحالية لا لقطة تاريخية.`)}</p></article></div> : <p className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">{tx(locale, "Revenue and margin are hidden because this membership lacks financial-report permission.", "الإيراد والهامش مخفيان لأن العضوية لا تملك صلاحية التقارير المالية.")}</p>}
      <section className="overflow-hidden rounded-2xl border bg-card"><div className="border-b p-4"><h2 className="font-semibold">{tx(locale, "Best sellers", "الأكثر مبيعاً")}</h2></div><ProductTable rows={bestSellers} locale={locale} currency={currency} financialVisible={report.financialVisible} empty={tx(locale, "No sold products in this period.", "لا توجد منتجات مباعة خلال هذه الفترة.")} /></section>
      {report.financialVisible ? <section className="overflow-hidden rounded-2xl border bg-card"><div className="border-b p-4"><h2 className="font-semibold">{tx(locale, "Revenue by product", "الإيرادات حسب المنتج")}</h2><p className="text-xs text-muted-foreground">{tx(locale, "Top 100 shown; the Excel export includes the full product list.", "أعلى 100 منتج معروض؛ ملف Excel يتضمن القائمة كاملة.")}</p></div><ProductTable rows={revenueRows} locale={locale} currency={currency} financialVisible empty={tx(locale, "No sold products in this period.", "لا توجد منتجات مباعة خلال هذه الفترة.")} /></section> : null}
      <section className="overflow-hidden rounded-2xl border bg-card"><div className="border-b p-4"><h2 className="font-semibold">{tx(locale, "Least sold products", "الأقل مبيعاً")}</h2></div><ProductTable rows={leastSellers} locale={locale} currency={currency} financialVisible={report.financialVisible} empty={tx(locale, "No sold products in this period.", "لا توجد منتجات مباعة خلال هذه الفترة.")} /></section>
      <section className="overflow-hidden rounded-2xl border bg-card"><div className="border-b p-4"><h2 className="font-semibold">{tx(locale, "Products with no sales", "المنتجات التي لم تُبع")}</h2><p className="text-xs text-muted-foreground">{unsold.length} {tx(locale, "shown; the Excel export includes the complete product list.", "معروضة؛ ملف Excel يتضمن قائمة المنتجات كاملة.")}</p></div><ProductTable rows={unsold} locale={locale} currency={currency} financialVisible={report.financialVisible} empty={tx(locale, "Every current product had at least one sale in this period.", "كل المنتجات الحالية سُجل لها بيع واحد على الأقل خلال هذه الفترة.")} /></section>
      {report.productListCapped ? <p className="text-xs text-muted-foreground">{tx(locale, "The product list is capped at 10,000 rows.", "قائمة المنتجات محدودة بـ10,000 صف.")}</p> : null}
    </section><ReportPrintStyles />
  </main>;
}
