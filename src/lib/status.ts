export type StatusVariant = "default" | "secondary" | "outline" | "success" | "warning" | "destructive" | "info" | "muted" | "purple";

interface StatusMeta {
  ar: string;
  en: string;
  variant: StatusVariant;
}

export const ORDER_STATUS: Record<string, StatusMeta> = {
  NEW: { ar: "جديد", en: "New", variant: "info" },
  ACCEPTED: { ar: "مقبول", en: "Accepted", variant: "default" },
  PREPARING: { ar: "قيد التحضير", en: "Preparing", variant: "warning" },
  READY: { ar: "جاهز", en: "Ready", variant: "success" },
  DELIVERED: { ar: "تم التسليم", en: "Delivered", variant: "purple" },
  COMPLETED: { ar: "مكتمل", en: "Completed", variant: "success" },
  REJECTED: { ar: "مرفوض", en: "Rejected", variant: "destructive" },
  CANCELLED: { ar: "ملغي", en: "Cancelled", variant: "destructive" },
};

export const ORDER_TYPE: Record<string, StatusMeta> = {
  DINE_IN: { ar: "داخل المطعم", en: "Dine-in", variant: "default" },
  PICKUP: { ar: "استلام", en: "Pickup", variant: "info" },
  DELIVERY: { ar: "توصيل", en: "Delivery", variant: "purple" },
};

export const PAYMENT_STATUS: Record<string, StatusMeta> = {
  UNPAID: { ar: "غير مدفوع", en: "Unpaid", variant: "muted" },
  PENDING: { ar: "قيد الدفع", en: "Pending", variant: "warning" },
  PARTIALLY_PAID: { ar: "مدفوع جزئياً", en: "Partially paid", variant: "warning" },
  PAID: { ar: "مدفوع", en: "Paid", variant: "success" },
  REFUNDED: { ar: "مسترد", en: "Refunded", variant: "purple" },
  FAILED: { ar: "فشل", en: "Failed", variant: "destructive" },
};

export const PAYMENT_METHOD: Record<string, StatusMeta> = {
  CASH: { ar: "نقداً", en: "Cash", variant: "default" },
  CARD: { ar: "بطاقة", en: "Card", variant: "info" },
  ONLINE: { ar: "دفع إلكتروني", en: "Online", variant: "info" },
  WALLET: { ar: "محفظة", en: "Wallet", variant: "purple" },
  BANK_TRANSFER: { ar: "تحويل بنكي", en: "Bank transfer", variant: "secondary" },
  PAY_AT_PICKUP: { ar: "دفع عند الاستلام", en: "Pay at pickup", variant: "warning" },
  PAY_ON_DELIVERY: { ar: "دفع عند التوصيل", en: "Pay on delivery", variant: "warning" },
  OTHER: { ar: "أخرى", en: "Other", variant: "muted" },
};

export const TABLE_STATUS: Record<string, StatusMeta> = {
  AVAILABLE: { ar: "متاحة", en: "Available", variant: "success" },
  OCCUPIED: { ar: "مشغولة", en: "Occupied", variant: "warning" },
  RESERVED: { ar: "محجوزة", en: "Reserved", variant: "info" },
  CLEANING: { ar: "تنظيف", en: "Cleaning", variant: "purple" },
  DISABLED: { ar: "معطلة", en: "Disabled", variant: "muted" },
};

export const RESERVATION_STATUS: Record<string, StatusMeta> = {
  PENDING: { ar: "جديد", en: "Pending", variant: "info" },
  CONFIRMED: { ar: "مؤكد", en: "Confirmed", variant: "success" },
  SEATED: { ar: "وصل العميل", en: "Seated", variant: "default" },
  NO_SHOW: { ar: "لم يحضر", en: "No show", variant: "destructive" },
  CANCELLED: { ar: "ملغي", en: "Cancelled", variant: "muted" },
  COMPLETED: { ar: "مكتمل", en: "Completed", variant: "success" },
};

export const INVOICE_STATUS: Record<string, StatusMeta> = {
  DRAFT: { ar: "مسودة", en: "Draft", variant: "muted" },
  ISSUED: { ar: "صادرة", en: "Issued", variant: "info" },
  PARTIALLY_PAID: { ar: "مدفوعة جزئياً", en: "Partially paid", variant: "warning" },
  PAID: { ar: "مدفوعة", en: "Paid", variant: "success" },
  VOID: { ar: "ملغاة", en: "Void", variant: "destructive" },
  REFUNDED: { ar: "مستردة", en: "Refunded", variant: "purple" },
};

export const SUBSCRIPTION_STATUS: Record<string, StatusMeta> = {
  TRIALING: { ar: "تجريبي", en: "Trial", variant: "info" },
  ACTIVE: { ar: "نشط", en: "Active", variant: "success" },
  PAST_DUE: { ar: "متأخر", en: "Past due", variant: "warning" },
  PAUSED: { ar: "موقوف", en: "Paused", variant: "muted" },
  CANCELLED: { ar: "ملغي", en: "Cancelled", variant: "destructive" },
  EXPIRED: { ar: "منتهي", en: "Expired", variant: "destructive" },
};

export const RESTAURANT_STATUS: Record<string, StatusMeta> = {
  DRAFT: { ar: "مسودة", en: "Draft", variant: "muted" },
  PENDING: { ar: "قيد المراجعة", en: "Pending", variant: "warning" },
  ACTIVE: { ar: "نشط", en: "Active", variant: "success" },
  SUSPENDED: { ar: "موقوف", en: "Suspended", variant: "destructive" },
  CLOSED: { ar: "مغلق", en: "Closed", variant: "muted" },
};

export const STAFF_STATUS: Record<string, StatusMeta> = {
  ACTIVE: { ar: "نشط", en: "Active", variant: "success" },
  INVITED: { ar: "مدعو", en: "Invited", variant: "warning" },
  SUSPENDED: { ar: "موقوف", en: "Suspended", variant: "destructive" },
};

export function statusMeta(
  map: Record<string, StatusMeta>,
  status: string | null | undefined,
  locale = "ar"
): { label: string; variant: StatusVariant } {
  const meta = status ? map[status] : undefined;
  if (!meta) return { label: status ?? "—", variant: "muted" };
  return { label: locale === "ar" ? meta.ar : meta.en, variant: meta.variant };
}
