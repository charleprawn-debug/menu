import type { Metadata } from "next";
import type { PaymentMethod } from "@prisma/client";
import { redirect } from "next/navigation";
import { PrintReportButton } from "@/components/sales/print-report-button";
import { requireRestaurant } from "@/lib/auth/context";
import { branchIdsForPermission } from "@/lib/auth/scope";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { getI18n } from "@/i18n";
import { loadSalesReport, type SalesGranularity } from "@/lib/reports/sales";

export const metadata: Metadata = { title: "تقرير المبيعات | DineFlow" };
type Search = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
const tx = (locale: string, en: string, ar: string) => locale === "ar" ? ar : en;
const methods = ["CASH", "CARD", "ONLINE", "WALLET", "BANK_TRANSFER", "PAY_AT_PICKUP", "PAY_ON_DELIVERY", "OTHER"];
function utcDay(value: Date) { return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())); }
function rangeFor(period: string, startValue?: string, endValue?: string) {
  if (startValue && endValue && /^\d{4}-\d{2}-\d{2}$/.test(startValue) && /^\d{4}-\d{2}-\d{2}$/.test(endValue)) {
    const start = new Date(`${startValue}T00:00:00.000Z`);
    const end = new Date(`${endValue}T00:00:00.000Z`);
    end.setUTCDate(end.getUTCDate() + 1);
    return { start, end, granularity: period === "year" ? "month" as const : "day" as const };
  }
  const today = utcDay(new Date());
  if (period === "day") return { start: today, end: new Date(today.getTime() + 86400000), granularity: "day" as const };
  if (period === "week") {
    const start = new Date(today); const weekday = start.getUTCDay() || 7; start.setUTCDate(start.getUTCDate() - weekday + 1);
    return { start, end: new Date(start.getTime() + 7 * 86400000), granularity: "day" as const };
  }
  if (period === "year") {
    const start = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
    return { start, end: new Date(Date.UTC(today.getUTCFullYear() + 1, 0, 1)), granularity: "month" as const };
  }
  if (period === "custom") {
    return { start: new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)), end: new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1)), granularity: "day" as const };
  }
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  return { start, end: new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1)), granularity: "day" as const };
}
function dateInput(value: Date) { return value.toISOString().slice(0, 10); }
function asMoney(value: number, currency: string, locale: string) { return formatMoney(value, currency, locale as "ar" | "en"); }
function periodLabel(key: string, granularity: SalesGranularity, locale: string) {
  if (granularity === "year") return key;
  const date = new Date(granularity === "month" ? `${key}-01T00:00:00Z` : `${key}T00:00:00Z`);
  return new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", granularity === "month" ? { month: "long", year: "numeric", timeZone: "UTC" } : { dateStyle: "medium", timeZone: "UTC" }).format(date);
}

export default async function SalesReportPage({ searchParams }: { searchParams: Promise<Search> }) {
  const [{ locale }, search, membership] = await Promise.all([getI18n(), searchParams, requireRestaurant("reports.financial.view")]);
  const ar = locale === "ar";
  const selectedPeriod = ["day", "week", "month", "year", "custom"].includes(first(search.period) ?? "") ? first(search.period)! : "month";
  const pickedRange = rangeFor(selectedPeriod, first(search.start), first(search.end));
  const maxRange = 366 * 24 * 60 * 60 * 1000;
  const end = pickedRange.end;
  const range = end > pickedRange.start && end.getTime() - pickedRange.start.getTime() <= maxRange ? pickedRange : rangeFor("month");
  const allowedIds = branchIdsForPermission(membership, "reports.financial.view");
  const branches = await db.branch.findMany({ where: { restaurantId: membership.restaurantId, isActive: true, ...(allowedIds === null ? {} : { id: { in: allowedIds } }) }, select: { id: true, name: true }, orderBy: { name: "asc" } });
  const requestedBranch = first(search.branchId);
  const selectedBranch = requestedBranch && branches.some((branch) => branch.id === requestedBranch) ? requestedBranch : undefined;
  const requestedMethod = first(search.method);
  const method = methods.includes(requestedMethod ?? "") ? requestedMethod as PaymentMethod : undefined;
  let data: Awaited<ReturnType<typeof loadSalesReport>>;
  try {
    data = await loadSalesReport(membership, { ...range, branchId: selectedBranch, method, granularity: range.granularity });
  } catch {
    redirect("/app/forbidden");
  }
  const currency = membership.restaurant.currency;
  const canExport = membership.isOwner || membership.permissions.has("reports.export");
  const exportQuery = new URLSearchParams({ start: dateInput(range.start), end: dateInput(new Date(range.end.getTime() - 86400000)), period: selectedPeriod, granularity: range.granularity });
  if (selectedBranch) exportQuery.set("branchId", selectedBranch);
  if (method) exportQuery.set("method", method);
  const change = data.current.total - data.previous.total;
  const changePct = data.previous.total > 0 ? change / data.previous.total * 100 : null;
  const periodOptions = [["day", tx(locale, "Today", "اليوم")], ["week", tx(locale, "This week", "هذا الأسبوع")], ["month", tx(locale, "This month", "هذا الشهر")], ["year", tx(locale, "This year", "هذه السنة")], ["custom", tx(locale, "Custom range", "فترة مخصصة")]];
  return <main className="space-y-6 pb-8" dir={ar ? "rtl" : "ltr"}>
    <header className="flex flex-wrap items-start justify-between gap-4 print:hidden"><div><p className="text-sm font-medium text-primary">{tx(locale, "Reports", "التقارير")}</p><h1 className="mt-1 text-2xl font-bold">{tx(locale, "Sales report", "تقرير المبيعات")}</h1><p className="mt-2 text-sm text-muted-foreground">{tx(locale, "Only completed orders count as sales; payment-method totals include confirmed recorded payments only.", "تُحتسب الطلبات المكتملة فقط كمبيعات؛ وتضم مجاميع وسائل الدفع الدفعات المؤكدة والمسجلة فقط.")}</p></div><div className="flex flex-wrap gap-2">{canExport ? <a href={`/api/app/reports/sales/export?${exportQuery.toString()}`} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">{tx(locale, "Download Excel", "تنزيل Excel")}</a> : null}<PrintReportButton locale={locale} /></div></header>
    <form method="get" action="/app/reports/sales" className="grid gap-3 rounded-2xl border bg-card p-4 md:grid-cols-6 print:hidden">
      <label className="grid gap-1 text-sm md:col-span-2">{tx(locale, "Period", "الفترة")}<select name="period" defaultValue={selectedPeriod} className="rounded-lg border bg-background px-3 py-2">{periodOptions.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label className="grid gap-1 text-sm">{tx(locale, "Start date", "من تاريخ")}<input name="start" type="date" defaultValue={dateInput(range.start)} className="rounded-lg border bg-background px-3 py-2" /></label>
      <label className="grid gap-1 text-sm">{tx(locale, "End date", "إلى تاريخ")}<input name="end" type="date" defaultValue={dateInput(new Date(range.end.getTime() - 86400000))} className="rounded-lg border bg-background px-3 py-2" /></label>
      <label className="grid gap-1 text-sm">{tx(locale, "Branch", "الفرع")}<select name="branchId" defaultValue={selectedBranch ?? ""} className="rounded-lg border bg-background px-3 py-2"><option value="">{tx(locale, "All allowed branches", "كل الفروع المسموحة")}</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
      <label className="grid gap-1 text-sm">{tx(locale, "Payment method", "طريقة الدفع")}<select name="method" defaultValue={method ?? ""} className="rounded-lg border bg-background px-3 py-2"><option value="">{tx(locale, "All methods", "كل الطرق")}</option>{methods.map((entry) => <option key={entry} value={entry}>{entry.replaceAll("_", " ")}</option>)}</select></label>
      <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white md:col-span-6 md:justify-self-start">{tx(locale, "Apply filters", "تطبيق الفلاتر")}</button>
    </form>
    <section id="sales-report-print" className="space-y-5"><div className="hidden print:block"><h1 className="text-2xl font-bold">{tx(locale, "Sales report", "تقرير المبيعات")}</h1><p>{dateInput(range.start)} — {dateInput(new Date(range.end.getTime() - 86400000))}</p></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><article className="rounded-2xl border bg-card p-5"><p className="text-sm text-muted-foreground">{method ? tx(locale, "Collected via selected method", "المحصل بطريقة الدفع المحددة") : tx(locale, "Gross sales", "إجمالي المبيعات")}</p><p className="mt-2 text-2xl font-bold" dir="ltr">{asMoney(data.current.total, currency, locale)}</p><p className={`mt-2 text-sm ${change >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{changePct === null ? tx(locale, "No prior-period baseline", "لا توجد فترة سابقة للمقارنة") : `${changePct >= 0 ? "+" : ""}${changePct.toFixed(1)}% ${tx(locale, "vs previous period", "مقارنة بالفترة السابقة")}`}</p></article><article className="rounded-2xl border bg-card p-5"><p className="text-sm text-muted-foreground">{tx(locale, "Completed orders", "الطلبات المكتملة")}</p><p className="mt-2 text-2xl font-bold">{data.current.count}</p><p className="mt-2 text-sm text-muted-foreground">{tx(locale, "previous period", "الفترة السابقة")}: {data.previous.count}</p></article><article className="rounded-2xl border bg-card p-5"><p className="text-sm text-muted-foreground">{method ? tx(locale, "Average collection", "متوسط التحصيل") : tx(locale, "Average order", "متوسط الطلب")}</p><p className="mt-2 text-2xl font-bold" dir="ltr">{asMoney(data.current.average, currency, locale)}</p></article><article className="rounded-2xl border bg-card p-5"><p className="text-sm text-muted-foreground">{tx(locale, "Tax / discounts", "الضريبة / الخصومات")}</p><p className="mt-2 text-sm">{tx(locale, "Tax", "الضريبة")}: <b dir="ltr">{asMoney(data.current.tax, currency, locale)}</b></p><p className="mt-1 text-sm">{tx(locale, "Discounts", "الخصومات")}: <b dir="ltr">{asMoney(data.current.discount, currency, locale)}</b></p></article></div>
      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]"><section className="overflow-hidden rounded-2xl border bg-card"><div className="border-b p-4"><h2 className="font-semibold">{tx(locale, "Sales by period", "المبيعات حسب الفترة")}</h2></div>{data.current.series.length ? <div className="overflow-x-auto"><table className="w-full min-w-[500px] text-start text-sm"><thead className="bg-muted/60 text-xs"><tr><th className="p-3">{tx(locale, "Period", "الفترة")}</th><th className="p-3">{tx(locale, "Orders", "الطلبات")}</th><th className="p-3">{method ? tx(locale, "Collected", "المحصل") : tx(locale, "Sales", "المبيعات")}</th></tr></thead><tbody className="divide-y">{data.current.series.map((entry) => <tr key={entry.key}><td className="p-3">{periodLabel(entry.key, range.granularity, locale)}</td><td className="p-3">{entry.count}</td><td className="p-3 font-semibold" dir="ltr">{asMoney(entry.total, currency, locale)}</td></tr>)}</tbody></table></div> : <p className="p-6 text-sm text-muted-foreground">{tx(locale, "No completed orders in this period.", "لا توجد طلبات مكتملة في هذه الفترة.")}</p>}</section>
        <section className="overflow-hidden rounded-2xl border bg-card"><div className="border-b p-4"><h2 className="font-semibold">{tx(locale, "Confirmed payments by method", "الدفعات المؤكدة حسب الطريقة")}</h2></div>{data.current.methodTotals.length ? <div className="divide-y">{data.current.methodTotals.map((entry) => <div key={entry.method} className="flex items-center justify-between gap-3 p-4 text-sm"><span>{entry.method.replaceAll("_", " ")} <span className="text-xs text-muted-foreground">({entry.count})</span></span><strong dir="ltr">{asMoney(entry.amount, currency, locale)}</strong></div>)}</div> : <p className="p-6 text-sm text-muted-foreground">{tx(locale, "No confirmed payment records in this period.", "لا توجد دفعات مؤكدة مسجلة خلال هذه الفترة.")}</p>}</section>
      </div>
      <section className="overflow-hidden rounded-2xl border bg-card"><div className="border-b p-4"><h2 className="font-semibold">{tx(locale, "Completed sales", "المبيعات المكتملة")}</h2><p className="text-xs text-muted-foreground">{data.current.rows.length} {tx(locale, "orders (maximum 100,000 rows)", "طلباً (حد أقصى 100,000 صف)")}</p></div>{data.current.rows.length ? <div className="overflow-x-auto"><table className="w-full min-w-[780px] text-start text-sm"><thead className="bg-muted/60 text-xs"><tr><th className="p-3">{tx(locale, "Order", "الطلب")}</th><th className="p-3">{tx(locale, "Date", "التاريخ")}</th><th className="p-3">{tx(locale, "Branch", "الفرع")}</th><th className="p-3">{tx(locale, "Service type", "نوع الخدمة")}</th><th className="p-3">{tx(locale, "Discount", "الخصم")}</th><th className="p-3">{tx(locale, "Tax", "الضريبة")}</th><th className="p-3">{tx(locale, "Total", "الإجمالي")}</th></tr></thead><tbody className="divide-y">{data.current.rows.slice(0, 100).map((row) => <tr key={row.orderNumber}><td className="p-3">#{row.orderNumber}</td><td className="p-3">{new Intl.DateTimeFormat(ar ? "ar" : "en", { dateStyle: "medium", timeStyle: "short" }).format(row.createdAt)}</td><td className="p-3">{row.branchName ?? "—"}</td><td className="p-3">{row.type.replaceAll("_", " ")}</td><td className="p-3" dir="ltr">{asMoney(row.discount, row.currency, locale)}</td><td className="p-3" dir="ltr">{asMoney(row.tax, row.currency, locale)}</td><td className="p-3 font-semibold" dir="ltr">{asMoney(row.total, row.currency, locale)}</td></tr>)}</tbody></table>{data.current.rows.length > 100 ? <p className="border-t p-3 text-xs text-muted-foreground">{tx(locale, "The table displays the first 100 rows; export contains up to 100,000.", "يعرض الجدول أول 100 صف؛ ويشمل التصدير حتى 100,000 صف.")}</p> : null}</div> : <p className="p-6 text-sm text-muted-foreground">{tx(locale, "No sales match these filters.", "لا توجد مبيعات تطابق هذه الفلاتر.")}</p>}</section>
    </section>
    <style>{`@media print { @page { margin: 14mm; } body * { visibility: hidden; } #sales-report-print, #sales-report-print * { visibility: visible; } #sales-report-print { position: absolute; inset: 0; width: 100%; } }`}</style>
  </main>;
}
