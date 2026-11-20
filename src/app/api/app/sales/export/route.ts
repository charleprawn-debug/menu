import { NextResponse } from "next/server";
import { requireRestaurant } from "@/lib/auth/context";
import { branchScopeWhere, ownedOrderWhere } from "@/lib/auth/scope";
import { db } from "@/lib/db";
import { csvCell } from "@/lib/finance";

export const dynamic = "force-dynamic";
function orderWhere(membership: Awaited<ReturnType<typeof requireRestaurant>>, permission: string) {
  return { restaurantId: membership.restaurantId, ...branchScopeWhere(membership, permission, "branchId"), ...ownedOrderWhere(membership, permission) };
}
function csvResponse(filename: string, header: unknown[], rows: unknown[][]) {
  const body = `\uFEFF${[header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
  return new NextResponse(body, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "private, no-store" } });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  if (!["invoices", "payments", "expenses"].includes(type ?? "")) return NextResponse.json({ error: "INVALID_EXPORT_TYPE" }, { status: 400 });
  const membership = type === "expenses" ? await requireRestaurant("expenses.manage") : await requireRestaurant("billing.view");
  if (!membership.isOwner && !membership.permissions.has("reports.export")) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  if (type === "invoices") {
    const records = await db.invoice.findMany({ where: { restaurantId: membership.restaurantId, order: { is: orderWhere(membership, "billing.view") } }, include: { order: { select: { orderNumber: true, customerName: true, branchId: true } } }, orderBy: { issuedAt: "desc" }, take: 5000 });
    const branchIds = [...new Set(records.map((invoice) => invoice.order?.branchId).filter((id): id is string => Boolean(id)))];
    const branches = branchIds.length ? await db.branch.findMany({ where: { restaurantId: membership.restaurantId, id: { in: branchIds } }, select: { id: true, name: true } }) : [];
    const branchNames = new Map(branches.map((branch) => [branch.id, branch.name]));
    return csvResponse(`invoices-${new Date().toISOString().slice(0, 10)}.csv`, ["invoiceNumber", "orderNumber", "customerName", "issuedAt", "branch", "subtotal", "discount", "tax", "serviceFee", "total", "paidAmount", "currency", "status"], records.map((invoice) => [invoice.invoiceNumber, invoice.order?.orderNumber ?? "", invoice.customerName ?? invoice.order?.customerName ?? "", invoice.issuedAt.toISOString(), branchNames.get(invoice.order?.branchId ?? "") ?? "", invoice.subtotal.toString(), invoice.discount.toString(), invoice.tax.toString(), invoice.serviceFee.toString(), invoice.total.toString(), invoice.paidAmount.toString(), invoice.currency, invoice.status]));
  }
  if (type === "payments") {
    const records = await db.payment.findMany({ where: { restaurantId: membership.restaurantId, order: { is: orderWhere(membership, "billing.view") } }, include: { order: { select: { orderNumber: true, branchId: true } }, invoice: { select: { invoiceNumber: true } } }, orderBy: { paidAt: "desc" }, take: 5000 });
    const branchIds = [...new Set(records.map((payment) => payment.order?.branchId).filter((id): id is string => Boolean(id)))];
    const branches = branchIds.length ? await db.branch.findMany({ where: { restaurantId: membership.restaurantId, id: { in: branchIds } }, select: { id: true, name: true } }) : [];
    const branchNames = new Map(branches.map((branch) => [branch.id, branch.name]));
    return csvResponse(`payments-${new Date().toISOString().slice(0, 10)}.csv`, ["transactionId", "invoiceNumber", "orderNumber", "branch", "amount", "currency", "method", "status", "paidAt", "receivedById"], records.map((payment) => [payment.id, payment.invoice?.invoiceNumber ?? "", payment.order?.orderNumber ?? "", branchNames.get(payment.order?.branchId ?? "") ?? "", payment.amount.toString(), payment.currency, payment.method, payment.status, payment.paidAt.toISOString(), payment.receivedById ?? ""]));
  }

  const expenses = await db.expense.findMany({ where: { restaurantId: membership.restaurantId, deletedAt: null, ...branchScopeWhere(membership, "expenses.manage", "branchId"), ...(membership.permissionScopes.get("expenses.manage") === "OWNED" ? { createdById: membership.userId } : {}) }, orderBy: { spentAt: "desc" }, take: 5000 });
  const branchIds = [...new Set(expenses.map((expense) => expense.branchId).filter((id): id is string => Boolean(id)))];
  const branches = branchIds.length ? await db.branch.findMany({ where: { restaurantId: membership.restaurantId, id: { in: branchIds } }, select: { id: true, name: true } }) : [];
  const branchNames = new Map(branches.map((branch) => [branch.id, branch.name]));
  return csvResponse(`expenses-${new Date().toISOString().slice(0, 10)}.csv`, ["title", "category", "amount", "currency", "method", "spentAt", "branch", "notes", "attachmentUrl", "createdById"], expenses.map((expense) => [expense.title, expense.category, expense.amount.toString(), expense.currency, expense.method, expense.spentAt.toISOString(), branchNames.get(expense.branchId ?? "") ?? "", expense.notes ?? "", expense.attachmentUrl ?? "", expense.createdById ?? ""]));
}
