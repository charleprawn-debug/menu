import { NextResponse } from "next/server";
import { requireRestaurant } from "@/lib/auth/context";
import { buildXlsx } from "@/lib/finance";
import { getI18n } from "@/i18n";
import { parseReportDateRange } from "@/lib/reports/date-range";
import { getReportBranches } from "@/lib/reports/filters";
import { loadStaffReport } from "@/lib/reports/staff";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const membership = await requireRestaurant("reports.view");
  if (!membership.isOwner && !membership.permissions.has("staff.view")) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  if (!membership.isOwner && !membership.permissions.has("reports.export")) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const url = new URL(request.url);
  const startText = url.searchParams.get("start") ?? "";
  const endText = url.searchParams.get("end") ?? "";
  const range = parseReportDateRange(startText, endText);
  if (!range) return NextResponse.json({ error: "INVALID_REPORT_RANGE" }, { status: 400 });
  const requestedBranch = url.searchParams.get("branchId") || undefined;
  try {
    const branch = await getReportBranches(membership, requestedBranch);
    const report = await loadStaffReport(membership, { ...range, branchId: branch.branchId });
    const { locale } = await getI18n();
    const ar = locale === "ar";
    const headers = ar
      ? ["الموظف", "الأدوار", "الفروع", "الطلبات المنشأة", "متوسط التحضير (دقيقة)", "إلغاءات", "رفض", "تعديلات الأسعار", "النشاط المسجل"]
      : ["Staff member", "Roles", "Branches", "Orders created", "Average preparation (minutes)", "Cancellations", "Rejections", "Price changes", "Activity events"];
    const rows = report.rows.map((row) => [
      row.name,
      row.roles.map((role) => ar ? role.name : role.nameEn || role.name).join(", "),
      row.branches.join(", "),
      row.ordersCreated,
      row.averagePreparationMinutes,
      row.cancelledOperations,
      row.rejectedOperations,
      report.priceChangesAvailable ? row.priceChanges : null,
      row.activityEvents,
    ]);
    const bytes = await buildXlsx(headers, rows, "Staff");
    return new NextResponse(new Uint8Array(bytes), { headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="staff-report-${startText}-${endText}.xlsx"`,
      "Cache-Control": "private, no-store",
    } });
  } catch (error) {
    if (error instanceof Error && error.message === "BRANCH_SCOPE_VIOLATION") return NextResponse.json({ error: "BRANCH_SCOPE_VIOLATION" }, { status: 403 });
    throw error;
  }
}
