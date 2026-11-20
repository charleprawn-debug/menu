import { NextResponse } from "next/server";
import { requireRestaurant } from "@/lib/auth/context";
import { buildXlsx } from "@/lib/finance";
import { getI18n } from "@/i18n";
import { parseReportDateRange } from "@/lib/reports/date-range";
import { getReportBranches } from "@/lib/reports/filters";
import { loadProductReport } from "@/lib/reports/products";

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
    const report = await loadProductReport(membership, { ...range, branchId: branch.branchId });
    const { locale } = await getI18n();
    const ar = locale === "ar";
    const headers = ar
      ? ["معرف المنتج", "المنتج (عربي)", "المنتج (إنجليزي)", "القسم (عربي)", "القسم (إنجليزي)", "الوحدات المباعة"]
      : ["Product ID", "Product (Arabic)", "Product (English)", "Category (Arabic)", "Category (English)", "Units sold"];
    if (report.financialVisible) headers.push(...(ar ? ["الإيراد", "التكلفة الحالية", "الربح الإجمالي التقديري", "الهامش التقديري %"] : ["Revenue", "Current cost", "Estimated gross profit", "Estimated margin %"]));
    const rows = report.rows.map((row) => [
      row.id, row.nameAr, row.nameEn, row.categoryAr, row.categoryEn, row.quantity,
      ...(report.financialVisible ? [row.revenue, row.cost, row.grossProfit, row.grossMarginPercent] : []),
    ]);
    const bytes = await buildXlsx(headers, rows, "Products");
    return new NextResponse(new Uint8Array(bytes), { headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="products-report-${startText}-${endText}.xlsx"`,
      "Cache-Control": "private, no-store",
    } });
  } catch (error) {
    if (error instanceof Error && error.message === "BRANCH_SCOPE_VIOLATION") return NextResponse.json({ error: "BRANCH_SCOPE_VIOLATION" }, { status: 403 });
    throw error;
  }
}
