import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PrintReportButton } from "@/components/sales/print-report-button";
import { ReportFilters } from "@/components/reports/report-filters";
import { ReportPrintStyles } from "@/components/reports/report-print-styles";
import { requireRestaurant } from "@/lib/auth/context";
import { getI18n } from "@/i18n";
import { formatReportDateInput, pageReportDateRange } from "@/lib/reports/date-range";
import { getReportBranches } from "@/lib/reports/filters";
import { loadStaffReport } from "@/lib/reports/staff";

export const metadata: Metadata = { title: "تقرير الموظفين | DineFlow" };
type Search = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
const tx = (locale: string, en: string, ar: string) => locale === "ar" ? ar : en;

export default async function StaffReportPage({ searchParams }: { searchParams: Promise<Search> }) {
  const [i18n, search, membership] = await Promise.all([getI18n(), searchParams, requireRestaurant("reports.view")]);
  if (!membership.isOwner && !membership.permissions.has("staff.view")) redirect("/app/forbidden");
  const { locale } = i18n;
  const ar = locale === "ar";
  const rangeState = pageReportDateRange(first(search.start), first(search.end));
  const requestedBranch = first(search.branchId);
  const branchContext = await getReportBranches(membership, requestedBranch).catch((error: unknown) => {
    if (error instanceof Error && error.message === "BRANCH_SCOPE_VIOLATION") redirect("/app/forbidden");
    throw error;
  });
  const filters = { ...rangeState.range, branchId: branchContext.branchId };
  const report = await loadStaffReport(membership, filters).catch((error: unknown) => {
    if (error instanceof Error && error.message === "BRANCH_SCOPE_VIOLATION") redirect("/app/forbidden");
    throw error;
  });
  const canExport = membership.isOwner || membership.permissions.has("reports.export");
  const exportQuery = new URLSearchParams({ start: formatReportDateInput(filters.start), end: formatReportDateInput(new Date(filters.end.getTime() - 86_400_000)) });
  if (filters.branchId) exportQuery.set("branchId", filters.branchId);
  const totalOrders = report.rows.reduce((sum, row) => sum + row.ordersCreated, 0);
  const totalActivities = report.rows.reduce((sum, row) => sum + row.activityEvents, 0);
  const totalPriceChanges = report.rows.reduce((sum, row) => sum + row.priceChanges, 0);
  const dateLabel = `${formatReportDateInput(filters.start)} — ${formatReportDateInput(new Date(filters.end.getTime() - 86_400_000))}`;

  return <main className="space-y-6 pb-8" dir={ar ? "rtl" : "ltr"}>
    <header className="flex flex-wrap items-start justify-between gap-4 print:hidden"><div><p className="text-sm font-medium text-primary">{tx(locale, "Reports", "التقارير")}</p><h1 className="mt-1 text-2xl font-bold">{tx(locale, "Staff report", "تقرير الموظفين")}</h1><p className="mt-2 text-sm text-muted-foreground">{tx(locale, "Staff names and activity require both report and staff-view permissions.", "يتطلب عرض أسماء الموظفين ونشاطهم صلاحيتي التقارير وعرض الموظفين.")}</p></div><div className="flex flex-wrap gap-2">{canExport ? <a href={`/api/app/reports/staff/export?${exportQuery.toString()}`} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">{tx(locale, "Download Excel", "تنزيل Excel")}</a> : null}<PrintReportButton locale={locale} /></div></header>
    <ReportFilters locale={locale} action="/app/reports/staff" start={formatReportDateInput(filters.start)} end={formatReportDateInput(new Date(filters.end.getTime() - 86_400_000))} branches={branchContext.branches} branchId={filters.branchId} invalidRange={rangeState.invalid} />
    <section id="report-print-area" className="space-y-5"><div className="hidden print:block"><h1 className="text-2xl font-bold">{tx(locale, "Staff report", "تقرير الموظفين")}</h1><p>{dateLabel}</p></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><article className="rounded-2xl border bg-card p-5"><p className="text-sm text-muted-foreground">{tx(locale, "Staff members", "الموظفون")}</p><p className="mt-2 text-2xl font-bold">{report.rows.length}</p></article><article className="rounded-2xl border bg-card p-5"><p className="text-sm text-muted-foreground">{tx(locale, "Orders created", "الطلبات التي أنشأها الموظفون")}</p><p className="mt-2 text-2xl font-bold">{totalOrders}</p></article><article className="rounded-2xl border bg-card p-5"><p className="text-sm text-muted-foreground">{tx(locale, "Recorded activity", "أنشطة مسجلة")}</p><p className="mt-2 text-2xl font-bold">{totalActivities}</p></article><article className="rounded-2xl border bg-card p-5"><p className="text-sm text-muted-foreground">{tx(locale, "Price changes", "تعديلات الأسعار")}</p><p className="mt-2 text-2xl font-bold">{report.priceChangesAvailable ? totalPriceChanges : "—"}</p></article></div>
      {!report.priceChangesAvailable ? <p className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">{tx(locale, "Price edits are restaurant-wide and cannot be reliably attributed to a single branch, so they are omitted for this branch filter/scope.", "تعديلات الأسعار على مستوى المطعم ولا يمكن نسبتها بدقة إلى فرع واحد؛ لذلك لا تظهر مع هذا الفرع أو النطاق.")}</p> : null}
      {report.preparationSampled || report.memberListCapped ? <p className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">{report.preparationSampled ? tx(locale, "Preparation averages use the latest 100,000 READY events.", "متوسط التحضير يستخدم أحدث 100,000 حدث جاهزية.") : null}{report.preparationSampled && report.memberListCapped ? " " : null}{report.memberListCapped ? tx(locale, "Staff list is capped at 10,000 memberships.", "قائمة الموظفين محدودة بـ10,000 عضوية.") : null}</p> : null}
      <section className="overflow-hidden rounded-2xl border bg-card"><div className="border-b p-4"><h2 className="font-semibold">{tx(locale, "Employee activity and performance", "نشاط الموظفين وأداؤهم")}</h2><p className="mt-1 text-xs text-muted-foreground">{tx(locale, "Orders are attributed to their creator; preparation time to the staff member who recorded READY; cancellations and rejections to the status-change actor.", "تُنسب الطلبات إلى منشئها؛ وزمن التحضير لمن سجّل حالة جاهز؛ والإلغاء والرفض لمن نفّذ انتقال الحالة.")}</p></div>{report.rows.length ? <div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-start text-sm"><thead className="bg-muted/60 text-xs"><tr><th className="p-3">{tx(locale, "Staff member", "الموظف")}</th><th className="p-3">{tx(locale, "Role", "الدور")}</th><th className="p-3">{tx(locale, "Branch", "الفرع")}</th><th className="p-3">{tx(locale, "Orders", "الطلبات")}</th><th className="p-3">{tx(locale, "Avg prep (min)", "متوسط التحضير (دقيقة)")}</th><th className="p-3">{tx(locale, "Cancelled", "ملغاة")}</th><th className="p-3">{tx(locale, "Rejected", "مرفوضة")}</th><th className="p-3">{tx(locale, "Price edits", "تعديلات الأسعار")}</th><th className="p-3">{tx(locale, "Activity", "النشاط")}</th></tr></thead><tbody className="divide-y">{report.rows.map((row) => <tr key={row.userId}><td className="p-3 font-medium">{row.name}</td><td className="p-3">{row.roles.length ? row.roles.map((role) => ar ? role.name : role.nameEn || role.name).join("، ") : "—"}</td><td className="p-3">{row.branches.length ? row.branches.join("، ") : "—"}</td><td className="p-3">{row.ordersCreated}</td><td className="p-3">{row.averagePreparationMinutes === null ? "—" : row.averagePreparationMinutes}</td><td className="p-3">{row.cancelledOperations}</td><td className="p-3">{row.rejectedOperations}</td><td className="p-3">{report.priceChangesAvailable ? row.priceChanges : "—"}</td><td className="p-3">{row.activityEvents}</td></tr>)}</tbody></table></div> : <p className="p-6 text-sm text-muted-foreground">{tx(locale, "No staff memberships match this branch and report scope.", "لا توجد عضويات موظفين تطابق هذا الفرع ونطاق التقرير.")}</p>}</section>
    </section><ReportPrintStyles />
  </main>;
}
