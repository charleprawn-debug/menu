import { NextResponse } from "next/server";
import { requireRestaurant } from "@/lib/auth/context";
import { buildXlsx } from "@/lib/finance";
import { getI18n } from "@/i18n";
import { parseReportDateRange } from "@/lib/reports/date-range";
import { getReportBranches } from "@/lib/reports/filters";
import { loadOrderReport } from "@/lib/reports/orders";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const membership = await requireRestaurant("reports.view");
  if (!membership.isOwner && !membership.permissions.has("reports.export")) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const url = new URL(request.url);
  const startText = url.searchParams.get("start") ?? "";
  const endText = url.searchParams.get("end") ?? "";
  const range = parseReportDateRange(startText, endText);
  if (!range) return NextResponse.json({ error: "INVALID_REPORT_RANGE" }, { status: 400 });
  const requestedBranch = url.searchParams.get("branchId") || undefined;
  try {
    const branch = await getReportBranches(membership, requestedBranch);
    const report = await loadOrderReport(membership, { ...range, branchId: branch.branchId });
    const { locale } = await getI18n();
    const ar = locale === "ar";
    const rows: Array<Array<string | number | null>> = [
      [ar ? "الملخص" : "Summary", ar ? "المقياس" : "Metric", ar ? "القيمة" : "Value"],
      [ar ? "حجم الطلبات" : "Order volume", ar ? "الطلبات المنشأة" : "Orders created", report.totalOrders],
      [ar ? "الطلبات المكتملة" : "Completed orders", ar ? "العدد" : "Count", report.completedOrders],
      [ar ? "التحضير" : "Preparation", ar ? "متوسط الدقائق" : "Average minutes", report.averagePreparationMinutes],
      [ar ? "الإلغاءات" : "Cancellations", ar ? "العمليات" : "Operations", report.cancelled],
      [ar ? "الرفض" : "Rejections", ar ? "العمليات" : "Operations", report.rejected],
    ];
    if (report.financialVisible) {
      rows.push([ar ? "المالية" : "Financial", ar ? "متوسط الطلب المكتمل" : "Average completed order", report.averageOrderValue]);
      rows.push([ar ? "المالية" : "Financial", ar ? "المبيعات المكتملة" : "Completed sales", report.completedSales]);
    }
    for (const entry of report.types) rows.push([ar ? "حسب نوع الخدمة" : "By service type", entry.type, entry.count]);
    for (const entry of report.statuses) rows.push([ar ? "حسب الحالة الحالية" : "By current status", entry.status, entry.count]);
    const bytes = await buildXlsx(rows[0].map(String), rows.slice(1), "Orders");
    return new NextResponse(new Uint8Array(bytes), { headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="orders-report-${startText}-${endText}.xlsx"`,
      "Cache-Control": "private, no-store",
    } });
  } catch (error) {
    if (error instanceof Error && error.message === "BRANCH_SCOPE_VIOLATION") return NextResponse.json({ error: "BRANCH_SCOPE_VIOLATION" }, { status: 403 });
    throw error;
  }
}
