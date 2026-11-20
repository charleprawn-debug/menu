"use server";

import { Prisma, type PaymentStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRestaurant, type ActiveMembership } from "@/lib/auth/context";
import { branchIdsForPermission, branchScopeWhere, ownedOrderWhere } from "@/lib/auth/scope";
import { logActivity } from "@/lib/audit";
import { sendAuthEmail } from "@/lib/email/smtp";

export type SalesActionState = { error?: string; message?: string };
const field = (form: FormData, key: string) => {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
};
const fail = (code: string): never => { throw new Error(code); };
const refreshSales = () => {
  revalidatePath("/app/sales", "layout");
  revalidatePath("/app/orders");
  revalidatePath("/app/dashboard");
  revalidatePath("/app/reports/sales");
};

async function requirePermission(permission: string) {
  const membership = await requireRestaurant();
  if (!membership.isOwner && !membership.permissions.has(permission)) fail("FORBIDDEN");
  return membership;
}

function orderWhereFor(membership: ActiveMembership, permission: string): Prisma.OrderWhereInput {
  return {
    restaurantId: membership.restaurantId,
    ...branchScopeWhere(membership, permission, "branchId"),
    ...ownedOrderWhere(membership, permission),
  } as Prisma.OrderWhereInput;
}

function invoiceWhereFor(membership: ActiveMembership, permission: string): Prisma.InvoiceWhereInput {
  return {
    restaurantId: membership.restaurantId,
    order: { is: orderWhereFor(membership, permission) },
  };
}

function paymentWhereFor(membership: ActiveMembership, permission: string): Prisma.PaymentWhereInput {
  return {
    restaurantId: membership.restaurantId,
    order: { is: orderWhereFor(membership, permission) },
  };
}

function expenseWhereFor(membership: ActiveMembership, permission: string): Prisma.ExpenseWhereInput {
  const scope = membership.permissionScopes.get(permission) ?? "RESTAURANT";
  return {
    restaurantId: membership.restaurantId,
    deletedAt: null,
    ...branchScopeWhere(membership, permission, "branchId"),
    ...(scope === "OWNED" ? { createdById: membership.userId } : {}),
  } as Prisma.ExpenseWhereInput;
}

function decimalAmount(raw: string) {
  if (!/^\d{1,10}(?:\.\d{1,2})?$/.test(raw)) fail("INVALID_AMOUNT");
  const amount = new Prisma.Decimal(raw);
  if (!amount.isFinite() || !amount.gt(0)) fail("INVALID_AMOUNT");
  return amount;
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function invoicePaymentState(total: Prisma.Decimal, netPaid: Prisma.Decimal, hasRefund: boolean) {
  if (netPaid.lte(0)) return hasRefund ? "REFUNDED" as const : "ISSUED" as const;
  return netPaid.gte(total) ? "PAID" as const : "PARTIALLY_PAID" as const;
}

function orderPaymentState(total: Prisma.Decimal, netPaid: Prisma.Decimal, hasRefund: boolean): PaymentStatus {
  if (netPaid.lte(0)) return hasRefund ? "REFUNDED" : "UNPAID";
  return netPaid.gte(total) ? "PAID" : "PARTIALLY_PAID";
}

function expenseBranch(membership: ActiveMembership, branchId: string) {
  const allowed = branchIdsForPermission(membership, "expenses.manage");
  if (allowed !== null && (!branchId || !allowed.includes(branchId))) fail("BRANCH_SCOPE_VIOLATION");
  if (!branchId) return null;
  return branchId;
}

const expenseSchema = z.object({
  expenseId: z.string().optional(),
  title: z.string().trim().min(2).max(120),
  category: z.string().trim().min(1).max(60),
  amount: z.string().regex(/^\d{1,10}(?:\.\d{1,2})?$/),
  method: z.enum(["CASH", "CARD", "ONLINE", "WALLET", "BANK_TRANSFER", "PAY_AT_PICKUP", "PAY_ON_DELIVERY", "OTHER"]),
  spentAt: z.string().min(1).max(40),
  branchId: z.string().optional(),
  notes: z.string().max(2000).optional(),
  attachmentUrl: z.string().max(2048).optional(),
});

function toExpenseAudit(expense: {
  title: string; category: string; amount: Prisma.Decimal; currency: string; method: string;
  spentAt: Date; branchId: string | null; notes: string | null; attachmentUrl: string | null;
}) {
  return {
    title: expense.title, category: expense.category, amount: expense.amount.toString(), currency: expense.currency,
    method: expense.method, spentAt: expense.spentAt.toISOString(), branchId: expense.branchId,
    notes: expense.notes, attachmentUrl: expense.attachmentUrl,
  };
}

export async function saveExpenseAction(_previous: SalesActionState, form: FormData): Promise<SalesActionState> {
  const membership = await requirePermission("expenses.manage");
  const parsed = expenseSchema.safeParse({
    expenseId: field(form, "expenseId") || undefined,
    title: field(form, "title"),
    category: field(form, "category"),
    amount: field(form, "amount"),
    method: field(form, "method") || "CASH",
    spentAt: field(form, "spentAt"),
    branchId: field(form, "branchId") || undefined,
    notes: field(form, "notes") || undefined,
    attachmentUrl: field(form, "attachmentUrl") || undefined,
  });
  if (!parsed.success) return { error: "INVALID_EXPENSE" };

  const spentAt = new Date(parsed.data.spentAt);
  if (!Number.isFinite(spentAt.getTime())) return { error: "INVALID_EXPENSE_DATE" };
  let attachmentUrl: string | null = null;
  if (parsed.data.attachmentUrl) {
    try {
      const url = new URL(parsed.data.attachmentUrl);
      if (url.protocol !== "https:" || url.username || url.password) return { error: "INVALID_ATTACHMENT_URL" };
      attachmentUrl = url.toString();
    } catch {
      return { error: "INVALID_ATTACHMENT_URL" };
    }
  }

  const branchId = expenseBranch(membership, parsed.data.branchId ?? "");
  if (branchId && !await db.branch.findFirst({ where: { id: branchId, restaurantId: membership.restaurantId, isActive: true }, select: { id: true } })) {
    return { error: "INVALID_BRANCH" };
  }
  const amount = new Prisma.Decimal(parsed.data.amount);
  const data = {
    title: parsed.data.title,
    category: parsed.data.category,
    amount,
    currency: membership.restaurant.currency,
    method: parsed.data.method,
    spentAt,
    branchId,
    notes: parsed.data.notes ?? null,
    attachmentUrl,
  };

  if (parsed.data.expenseId) {
    const change = await db.$transaction(async (tx) => {
      const where = { id: parsed.data.expenseId!, ...expenseWhereFor(membership, "expenses.manage") };
      const existing = await tx.expense.findFirst({ where });
      if (!existing) return null;
      const updatedCount = await tx.expense.updateMany({ where, data });
      if (updatedCount.count !== 1) return null;
      const updated = await tx.expense.findFirst({ where });
      return updated ? { existing, updated } : null;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if (!change) return { error: "NOT_FOUND" };
    await logActivity({ restaurantId: membership.restaurantId, branchId: change.updated.branchId, actorId: membership.auth.user.id, action: "expenses.updated", entity: "Expense", entityId: change.updated.id, oldValue: toExpenseAudit(change.existing), newValue: toExpenseAudit(change.updated) });
  } else {
    const created = await db.expense.create({ data: { ...data, restaurantId: membership.restaurantId, createdById: membership.auth.user.id } });
    await logActivity({ restaurantId: membership.restaurantId, branchId: created.branchId, actorId: membership.auth.user.id, action: "expenses.created", entity: "Expense", entityId: created.id, oldValue: null, newValue: toExpenseAudit(created) });
  }

  refreshSales();
  return { message: "SAVED" };
}

export async function deleteExpenseAction(form: FormData): Promise<void> {
  const membership = await requirePermission("expenses.manage");
  const id = field(form, "expenseId");
  if (!id) fail("INVALID_EXPENSE");
  const existing = await db.expense.findFirst({ where: { id, ...expenseWhereFor(membership, "expenses.manage") } });
  if (!existing) fail("NOT_FOUND");
  const expense = existing!;
  const deleted = await db.expense.updateMany({ where: { id, ...expenseWhereFor(membership, "expenses.manage") }, data: { deletedAt: new Date() } });
  if (deleted.count !== 1) fail("NOT_FOUND");
  await logActivity({ restaurantId: membership.restaurantId, branchId: expense.branchId, actorId: membership.auth.user.id, action: "expenses.archived", entity: "Expense", entityId: expense.id, oldValue: toExpenseAudit(expense), newValue: { deletedAt: new Date().toISOString() } });
  refreshSales();
}

export async function voidInvoiceAction(_previous: SalesActionState, form: FormData): Promise<SalesActionState> {
  const membership = await requirePermission("invoices.void");
  const invoiceId = field(form, "invoiceId");
  if (field(form, "confirmVoid") !== "VOID" || !invoiceId) return { error: "VOID_CONFIRMATION_REQUIRED" };
  const invoice = await db.invoice.findFirst({ where: { id: invoiceId, ...invoiceWhereFor(membership, "invoices.void") }, include: { order: { select: { branchId: true } } } });
  if (!invoice) return { error: "NOT_FOUND" };
  const currentInvoice = invoice!;
  if (currentInvoice.status === "VOID" || currentInvoice.paidAmount.gt(0)) return { error: "INVOICE_CANNOT_BE_VOIDED" };
  const updated = await db.invoice.updateMany({ where: { id: currentInvoice.id, ...invoiceWhereFor(membership, "invoices.void"), status: { in: ["DRAFT", "ISSUED"] }, paidAmount: 0 }, data: { status: "VOID" } });
  if (updated.count !== 1) return { error: "INVOICE_CANNOT_BE_VOIDED" };
  await logActivity({ restaurantId: membership.restaurantId, branchId: currentInvoice.order?.branchId, actorId: membership.auth.user.id, action: "invoices.voided", entity: "Invoice", entityId: currentInvoice.id, oldValue: { status: currentInvoice.status, paidAmount: currentInvoice.paidAmount.toString() }, newValue: { status: "VOID", invoiceNumber: currentInvoice.invoiceNumber } });
  refreshSales();
  return { message: "INVOICE_VOIDED" };
}

export async function sendInvoiceEmailAction(_previous: SalesActionState, form: FormData): Promise<SalesActionState> {
  const membership = await requirePermission("invoices.create");
  const invoiceId = field(form, "invoiceId");
  if (!invoiceId) return { error: "NOT_FOUND" };
  const invoice = await db.invoice.findFirst({
    where: { id: invoiceId, ...invoiceWhereFor(membership, "invoices.create") },
    include: { items: true, order: { include: { customer: { select: { name: true, email: true } } } } },
  });
  if (!invoice) return { error: "NOT_FOUND" };
  const recipient = invoice.order?.customer?.email?.trim();
  if (!recipient) return { error: "CUSTOMER_EMAIL_MISSING" };
  const ar = membership.restaurant.defaultLocale === "ar";
  const itemLines = invoice.items.map((item) => `${item.quantity} × ${item.name}: ${item.total.toFixed(2)} ${invoice.currency}`).join("\n");
  const subject = ar ? `فاتورة ${invoice.invoiceNumber} من ${membership.restaurant.name}` : `Invoice ${invoice.invoiceNumber} from ${membership.restaurant.name}`;
  const text = [
    ar ? `مرحباً ${invoice.order?.customer?.name ?? ""}` : `Hello ${invoice.order?.customer?.name ?? ""}`,
    `${ar ? "رقم الفاتورة" : "Invoice number"}: ${invoice.invoiceNumber}`,
    `${ar ? "رقم الطلب" : "Order number"}: ${invoice.order?.orderNumber ?? "—"}`,
    itemLines,
    `${ar ? "الإجمالي" : "Total"}: ${invoice.total.toFixed(2)} ${invoice.currency}`,
    `${ar ? "حالة الدفع" : "Payment status"}: ${invoice.status}`,
  ].filter(Boolean).join("\n");
  const html = `<div dir="${ar ? "rtl" : "ltr"}" style="font-family:Arial,sans-serif;line-height:1.7"><h1>${escapeHtml(subject)}</h1><p>${ar ? "رقم الفاتورة" : "Invoice number"}: <b>${escapeHtml(invoice.invoiceNumber)}</b></p><p>${ar ? "رقم الطلب" : "Order number"}: ${invoice.order?.orderNumber ?? "—"}</p><ul>${invoice.items.map((item) => `<li>${escapeHtml(item.name)} — ${item.quantity} × ${item.unitPrice.toFixed(2)} = ${item.total.toFixed(2)} ${escapeHtml(invoice.currency)}</li>`).join("")}</ul><p><b>${ar ? "الإجمالي" : "Total"}: ${invoice.total.toFixed(2)} ${escapeHtml(invoice.currency)}</b></p><p>${ar ? "حالة الدفع" : "Payment status"}: ${escapeHtml(invoice.status)}</p><p>${escapeHtml(membership.restaurant.name)}</p></div>`;
  const delivery = await sendAuthEmail({ to: recipient, subject, text, html });
  if (delivery === "unavailable") return { error: "EMAIL_UNAVAILABLE" };
  if (delivery !== "sent") return { error: "EMAIL_FAILED" };
  await logActivity({ restaurantId: membership.restaurantId, branchId: invoice.order?.branchId, actorId: membership.auth.user.id, action: "invoices.email.sent", entity: "Invoice", entityId: invoice.id, oldValue: null, newValue: { delivery: "sent", invoiceNumber: invoice.invoiceNumber } });
  refreshSales();
  return { message: "EMAIL_SENT" };
}

export async function markPendingPaymentFailedAction(form: FormData): Promise<void> {
  const membership = await requirePermission("payments.record");
  const paymentId = field(form, "paymentId");
  const payment = await db.payment.findFirst({ where: { id: paymentId, ...paymentWhereFor(membership, "payments.record") }, include: { order: { select: { branchId: true } } } });
  if (!payment) fail("NOT_FOUND");
  if (payment!.status !== "PENDING") fail("PAYMENT_NOT_PENDING");
  const transition = await db.$transaction(async (tx) => {
    const updated = await tx.payment.updateMany({ where: { id: payment!.id, ...paymentWhereFor(membership, "payments.record"), status: "PENDING" }, data: { status: "FAILED" } });
    if (updated.count !== 1) fail("PAYMENT_NOT_PENDING");
    await tx.paymentTransaction.updateMany({ where: { paymentId: payment!.id, status: "PENDING" }, data: { status: "FAILED" } });
    if (!payment!.orderId) return { oldOrderStatus: null, newOrderStatus: null, invoiceStatus: null };
    const order = await tx.order!.findFirst({ where: { id: payment!.orderId, ...orderWhereFor(membership, "payments.record") }, include: { payments: true, invoice: true } });
    if (!order) fail("NOT_FOUND");
    const refunds = await tx.refund.findMany({ where: { orderId: order!.id, restaurantId: membership.restaurantId, status: "PROCESSED" }, select: { amount: true } });
    const paid = order!.payments.filter((row) => row.status === "PAID" || row.status === "REFUNDED").reduce((sum, row) => sum.plus(row.amount), new Prisma.Decimal(0));
    const refunded = refunds.reduce((sum, row) => sum.plus(row.amount), new Prisma.Decimal(0));
    const netPaid = paid.minus(refunded);
    const safeNet = netPaid.gt(0) ? netPaid : new Prisma.Decimal(0);
    const nextOrderStatus = orderPaymentState(order!.total, safeNet, refunded.gt(0));
    await tx.order!.update({ where: { id: order!.id }, data: { paymentStatus: nextOrderStatus } });
    if (order!.invoice) await tx.invoice.update({ where: { id: order!.invoice.id }, data: { paidAmount: safeNet, status: invoicePaymentState(order!.invoice.total, safeNet, refunded.gt(0)) } });
    return { oldOrderStatus: order!.paymentStatus, newOrderStatus: nextOrderStatus, invoiceStatus: order!.invoice?.status ?? null };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  await logActivity({ restaurantId: membership.restaurantId, branchId: payment!.order?.branchId, actorId: membership.auth.user.id, action: "payments.failed", entity: "Payment", entityId: payment!.id, oldValue: { status: payment!.status, orderPaymentStatus: transition.oldOrderStatus }, newValue: { status: "FAILED", orderPaymentStatus: transition.newOrderStatus, invoiceStatus: transition.invoiceStatus } });
  refreshSales();
}

/** Electronic success is accepted only after a provider integration has written a verified SUCCEEDED transaction. */
export async function confirmVerifiedPaymentAction(form: FormData): Promise<void> {
  const membership = await requirePermission("payments.record");
  const paymentId = field(form, "paymentId");
  const payment = await db.payment.findFirst({ where: { id: paymentId, ...paymentWhereFor(membership, "payments.record") }, include: { order: { include: { invoice: true, payments: true } } } });
  if (!payment) fail("NOT_FOUND");
  if (payment!.method === "CASH") fail("CASH_ALREADY_RECORDED");
  const verified = await db.paymentTransaction.findFirst({ where: { paymentId: payment!.id, status: "SUCCEEDED", providerRef: { not: null } }, orderBy: { createdAt: "desc" } });
  if (!verified || payment!.status !== "PENDING") fail("PROVIDER_VERIFICATION_REQUIRED");
  const verifiedTransaction = verified!;

  const transition = await db.$transaction(async (tx) => {
    const otherPayments = await tx.payment.findMany({ where: { orderId: payment!.orderId ?? "", restaurantId: membership.restaurantId, status: { in: ["PAID", "REFUNDED"] } }, select: { amount: true } });
    const refunds = payment!.orderId ? await tx.refund.findMany({ where: { orderId: payment!.orderId, restaurantId: membership.restaurantId, status: "PROCESSED" }, select: { amount: true } }) : [];
    const previousNet = otherPayments.reduce((sum, row) => sum.plus(row.amount), new Prisma.Decimal(0)).minus(refunds.reduce((sum, row) => sum.plus(row.amount), new Prisma.Decimal(0)));
    const newNet = (previousNet.gt(0) ? previousNet : new Prisma.Decimal(0)).plus(payment!.amount);
    const updated = await tx.payment.updateMany({ where: { id: payment!.id, ...paymentWhereFor(membership, "payments.record"), status: "PENDING" }, data: { status: "PAID" } });
    if (updated.count !== 1) fail("PAYMENT_NOT_PENDING");
    if (payment!.orderId) {
      const order = await tx.order!.findFirst({ where: { id: payment!.orderId, ...orderWhereFor(membership, "payments.record") }, include: { invoice: true } });
      if (!order) fail("NOT_FOUND");
      const state = orderPaymentState(order!.total, newNet, refunds.length > 0);
      await tx.order!.update({ where: { id: order!.id }, data: { paymentStatus: state } });
      if (order!.invoice) await tx.invoice.update({ where: { id: order!.invoice.id }, data: { paidAmount: newNet, status: invoicePaymentState(order!.invoice.total, newNet, refunds.length > 0) } });
    }
    return { oldStatus: payment!.status, newStatus: "PAID" as const, netPaid: newNet.toFixed(2) };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  await logActivity({ restaurantId: membership.restaurantId, branchId: payment!.order?.branchId, actorId: membership.auth.user.id, action: "payments.provider_confirmed", entity: "Payment", entityId: payment!.id, oldValue: { status: transition.oldStatus }, newValue: { status: transition.newStatus, providerRef: verifiedTransaction.providerRef, netPaid: transition.netPaid } });
  refreshSales();
}

export async function recordCashRefundAction(form: FormData): Promise<void> {
  const membership = await requirePermission("payments.refund");
  const paymentId = field(form, "paymentId");
  if (field(form, "cashReturned") !== "on") fail("CASH_REFUND_CONFIRMATION_REQUIRED");
  const amount = decimalAmount(field(form, "amount"));
  const payment = await db.payment.findFirst({ where: { id: paymentId, ...paymentWhereFor(membership, "payments.refund") }, include: { order: { include: { invoice: true, payments: true } } } });
  if (!payment) fail("NOT_FOUND");
  if (payment!.method !== "CASH") fail("PAYMENT_PROVIDER_REQUIRED");
  if (!payment!.orderId) fail("ORDER_REQUIRED");
  if (payment!.status !== "PAID") fail("PAYMENT_NOT_REFUNDABLE");

  const outcome = await db.$transaction(async (tx) => {
    const current = await tx.payment.findFirst({ where: { id: payment!.id, ...paymentWhereFor(membership, "payments.refund"), orderId: payment!.orderId, status: "PAID" } });
    if (!current) fail("PAYMENT_NOT_REFUNDABLE");
    const existingRefunds = await tx.refund.findMany({ where: { paymentId: payment!.id, restaurantId: membership.restaurantId, status: "PROCESSED" }, select: { amount: true } });
    const previouslyRefunded = existingRefunds.reduce((sum, row) => sum.plus(row.amount), new Prisma.Decimal(0));
    const remaining = current!.amount.minus(previouslyRefunded);
    if (amount.gt(remaining)) fail("REFUND_EXCEEDS_PAYMENT");
    const refund = await tx.refund.create({ data: { restaurantId: membership.restaurantId, orderId: current!.orderId, paymentId: current!.id, amount, reason: field(form, "reason").slice(0, 500) || null, status: "PROCESSED", requestedById: membership.auth.user.id, approvedById: membership.auth.user.id, processedAt: new Date() } });
    const totalRefundedForPayment = previouslyRefunded.plus(amount);
    const paymentStatus = totalRefundedForPayment.gte(current!.amount) ? "REFUNDED" : "PAID";
    await tx.payment.update({ where: { id: current!.id }, data: { status: paymentStatus } });

    const order = await tx.order!.findFirst({ where: { id: current!.orderId!, restaurantId: membership.restaurantId }, include: { payments: true, invoice: true } });
    if (!order) fail("NOT_FOUND");
    const grossPaid = order!.payments.filter((row) => row.status === "PAID" || row.status === "REFUNDED").reduce((sum, row) => sum.plus(row.amount), new Prisma.Decimal(0));
    const allRefunds = await tx.refund.findMany({ where: { orderId: order!.id, restaurantId: membership.restaurantId, status: "PROCESSED" }, select: { amount: true } });
    const totalRefunded = allRefunds.reduce((sum, row) => sum.plus(row.amount), new Prisma.Decimal(0));
    const netPaid = grossPaid.minus(totalRefunded);
    const safeNet = netPaid.gt(0) ? netPaid : new Prisma.Decimal(0);
    const nextOrderStatus = orderPaymentState(order!.total, safeNet, totalRefunded.gt(0));
    await tx.order!.update({ where: { id: order!.id }, data: { paymentStatus: nextOrderStatus } });
    if (order!.invoice) await tx.invoice.update({ where: { id: order!.invoice.id }, data: { paidAmount: safeNet, status: invoicePaymentState(order!.invoice.total, safeNet, totalRefunded.gt(0)) } });
    return { refund, previous: { paymentStatus: current!.status, refundedAmount: previouslyRefunded.toFixed(2), orderPaymentStatus: order!.paymentStatus }, next: { paymentStatus, refundedAmount: totalRefundedForPayment.toFixed(2), orderPaymentStatus: nextOrderStatus, invoiceStatus: order!.invoice?.status ?? null } };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  await logActivity({ restaurantId: membership.restaurantId, branchId: payment!.order?.branchId, actorId: membership.auth.user.id, action: "payments.cash_refunded", entity: "Refund", entityId: outcome.refund.id, oldValue: outcome.previous, newValue: { ...outcome.next, amount: amount.toFixed(2), paymentId: payment!.id, orderId: payment!.orderId } });
  refreshSales();
}
