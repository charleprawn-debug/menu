import { NextResponse } from "next/server";
import { PaymentMethod } from "@prisma/client";
import { requireRestaurant } from "@/lib/auth/context";
import { buildXlsx } from "@/lib/finance";
import { loadSalesReport, type SalesGranularity } from "@/lib/reports/sales";

export const dynamic = "force-dynamic";
const methods = new Set(Object.values(PaymentMethod));
const granularities = new Set<SalesGranularity>(["day", "week", "month", "year"]);

export async function GET(request: Request) {
  const membership = await requireRestaurant("reports.financial.view");
  if (!membership.isOwner && !membership.permissions.has("reports.export")) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const url = new URL(request.url);
  const startText = url.searchParams.get("start") ?? "";
  const endText = url.searchParams.get("end") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startText) || !/^\d{4}-\d{2}-\d{2}$/.test(endText)) return NextResponse.json({ error: "INVALID_REPORT_RANGE" }, { status: 400 });
  const start = new Date(`${startText}T00:00:00.000Z`);
  const end = new Date(`${endText}T00:00:00.000Z`); end.setUTCDate(end.getUTCDate() + 1);
  const rawMethod = url.searchParams.get("method") ?? undefined;
  if (rawMethod && !methods.has(rawMethod as PaymentMethod)) return NextResponse.json({ error: "INVALID_PAYMENT_METHOD" }, { status: 400 });
  const rawGranularity = url.searchParams.get("granularity") ?? "day";
  const granularity = granularities.has(rawGranularity as SalesGranularity) ? rawGranularity as SalesGranularity : "day";
  const branchId = url.searchParams.get("branchId") ?? undefined;
  let report: Awaited<ReturnType<typeof loadSalesReport>>;
  try {
    report = await loadSalesReport(membership, { start, end, branchId, method: rawMethod as PaymentMethod | undefined, granularity });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error && error.message === "BRANCH_SCOPE_VIOLATION" ? "BRANCH_SCOPE_VIOLATION" : "INVALID_REPORT_RANGE" }, { status: 400 });
  }
  const rows: Array<Array<string | number | null>> = [];
  for (const order of report.current.rows) {
    if (order.payments.length) {
      order.payments.forEach((payment, index) => rows.push([order.orderNumber, order.createdAt.toISOString(), order.branchName, order.type, order.discount, order.tax, index === 0 ? order.total : 0, payment.method, payment.amount, order.currency]));
    } else {
      rows.push([order.orderNumber, order.createdAt.toISOString(), order.branchName, order.type, order.discount, order.tax, order.total, "", 0, order.currency]);
    }
  }
  const bytes = await buildXlsx(["Order", "Created at (UTC)", "Branch", "Service type", "Discount", "Tax", "Sales total (attributed once per order)", "Confirmed payment method", "Confirmed amount", "Currency"], rows, "Sales report");
  const filename = `sales-report-${startText}-${endText}.xlsx`;
  return new NextResponse(new Uint8Array(bytes), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "private, no-store" } });
}
