/**
 * RBAC catalogue.
 * Permissions are granular, server-enforced and scoped to a restaurant.
 * A member's effective permissions = union(role permissions) + ALLOW overrides - DENY overrides.
 */

export type PermissionGroup =
  | "orders"
  | "menu"
  | "tables"
  | "reservations"
  | "kitchen"
  | "staff"
  | "reports"
  | "billing"
  | "marketing"
  | "settings"
  | "branches"
  | "operations"
  | "ai"
  | "subscription"
  | "support"
  | "customers";

export interface PermissionDef {
  key: string;
  group: PermissionGroup;
  ar: string;
  en: string;
  sensitive?: boolean;
}

export const PERMISSIONS: PermissionDef[] = [
  // Orders
  { key: "orders.view", group: "orders", ar: "عرض الطلبات", en: "View orders" },
  { key: "orders.create", group: "orders", ar: "إنشاء طلب", en: "Create orders" },
  { key: "orders.accept", group: "orders", ar: "قبول الطلبات", en: "Accept orders" },
  { key: "orders.reject", group: "orders", ar: "رفض الطلبات", en: "Reject orders" },
  { key: "orders.cancel", group: "orders", ar: "إلغاء الطلبات", en: "Cancel orders", sensitive: true },
  { key: "orders.change_status", group: "orders", ar: "تغيير حالة الطلب", en: "Change order status" },
  { key: "orders.refund", group: "orders", ar: "استرداد مبالغ الطلبات", en: "Refund orders", sensitive: true },
  { key: "orders.discount", group: "orders", ar: "تطبيق خصومات", en: "Apply discounts", sensitive: true },
  { key: "orders.print", group: "orders", ar: "طباعة الطلبات والفواتير", en: "Print orders & invoices" },
  { key: "orders.assign", group: "orders", ar: "تعيين الطلبات", en: "Assign orders" },

  // Menu
  { key: "menu.view", group: "menu", ar: "عرض المنيو", en: "View menu" },
  { key: "menu.categories.manage", group: "menu", ar: "إدارة الأقسام", en: "Manage categories" },
  { key: "menu.products.create", group: "menu", ar: "إضافة منتجات", en: "Create products" },
  { key: "menu.products.update", group: "menu", ar: "تعديل المنتجات", en: "Update products" },
  { key: "menu.products.delete", group: "menu", ar: "حذف المنتجات", en: "Delete products", sensitive: true },
  { key: "menu.prices.update", group: "menu", ar: "تعديل الأسعار", en: "Update prices", sensitive: true },
  { key: "menu.extras.manage", group: "menu", ar: "إدارة الإضافات", en: "Manage extras" },
  { key: "menu.modifiers.manage", group: "menu", ar: "إدارة مجموعات الخيارات", en: "Manage modifier groups" },
  { key: "menu.themes.manage", group: "menu", ar: "تصميم المنيو", en: "Design menu" },
  { key: "menu.publish", group: "menu", ar: "نشر المنيو", en: "Publish menu" },
  { key: "menu.import", group: "menu", ar: "استيراد المنيو", en: "Import menu" },

  // Tables
  { key: "tables.view", group: "tables", ar: "عرض الطاولات", en: "View tables" },
  { key: "tables.manage", group: "tables", ar: "إدارة الطاولات", en: "Manage tables" },
  { key: "tables.qr.manage", group: "tables", ar: "إدارة أكواد QR", en: "Manage QR codes" },
  { key: "tables.sessions.manage", group: "tables", ar: "إدارة جلسات الطاولات", en: "Manage table sessions" },
  { key: "tables.floorplan.manage", group: "tables", ar: "تعديل مخطط المطعم", en: "Edit floor plan" },

  // Reservations
  { key: "reservations.view", group: "reservations", ar: "عرض الحجوزات", en: "View reservations" },
  { key: "reservations.manage", group: "reservations", ar: "إدارة الحجوزات", en: "Manage reservations" },

  // Kitchen
  { key: "kitchen.view", group: "kitchen", ar: "عرض شاشة المطبخ", en: "View kitchen display" },
  { key: "kitchen.manage", group: "kitchen", ar: "إدارة تحضير الطلبات", en: "Manage kitchen flow" },
  { key: "kitchen.stations.manage", group: "kitchen", ar: "إدارة محطات التحضير", en: "Manage kitchen stations" },

  // Staff
  { key: "staff.view", group: "staff", ar: "عرض الموظفين", en: "View staff" },
  { key: "staff.invite", group: "staff", ar: "دعوة موظفين", en: "Invite staff" },
  { key: "staff.update", group: "staff", ar: "تعديل الموظفين", en: "Update staff" },
  { key: "staff.delete", group: "staff", ar: "حذف العضوية", en: "Remove members", sensitive: true },
  { key: "staff.roles.manage", group: "staff", ar: "إدارة الأدوار", en: "Manage roles", sensitive: true },
  { key: "staff.permissions.manage", group: "staff", ar: "إدارة الصلاحيات", en: "Manage permissions", sensitive: true },
  { key: "staff.activity.view", group: "staff", ar: "عرض سجل النشاط", en: "View activity log" },
  { key: "staff.shifts.manage", group: "staff", ar: "إدارة الدوام", en: "Manage shifts" },

  // Reports
  { key: "reports.view", group: "reports", ar: "عرض التقارير", en: "View reports" },
  { key: "reports.financial.view", group: "reports", ar: "عرض التقارير المالية", en: "View financial reports", sensitive: true },
  { key: "reports.export", group: "reports", ar: "تصدير التقارير", en: "Export reports" },

  // Billing
  { key: "billing.view", group: "billing", ar: "عرض الفواتير والمدفوعات", en: "View invoices & payments" },
  { key: "billing.manage", group: "billing", ar: "إدارة الفوترة", en: "Manage billing", sensitive: true },
  { key: "payments.record", group: "billing", ar: "تسجيل المدفوعات", en: "Record payments" },
  { key: "payments.refund", group: "billing", ar: "استرداد المدفوعات", en: "Refund payments", sensitive: true },
  { key: "invoices.create", group: "billing", ar: "إنشاء الفواتير", en: "Create invoices" },
  { key: "invoices.void", group: "billing", ar: "إلغاء الفواتير", en: "Void invoices", sensitive: true },
  { key: "expenses.manage", group: "billing", ar: "إدارة المصروفات", en: "Manage expenses" },

  // Marketing
  { key: "marketing.view", group: "marketing", ar: "عرض التسويق", en: "View marketing" },
  { key: "marketing.coupons.manage", group: "marketing", ar: "إدارة الكوبونات", en: "Manage coupons" },
  { key: "marketing.campaigns.manage", group: "marketing", ar: "إدارة الحملات", en: "Manage campaigns" },
  { key: "marketing.loyalty.manage", group: "marketing", ar: "إدارة الولاء", en: "Manage loyalty" },
  { key: "marketing.reviews.manage", group: "marketing", ar: "إدارة التقييمات", en: "Manage reviews" },

  // Settings
  { key: "settings.view", group: "settings", ar: "عرض الإعدادات", en: "View settings" },
  { key: "settings.manage", group: "settings", ar: "تعديل الإعدادات", en: "Manage settings" },
  { key: "settings.domains.manage", group: "settings", ar: "إدارة النطاقات", en: "Manage domains", sensitive: true },
  { key: "settings.security.manage", group: "settings", ar: "إدارة الأمان", en: "Manage security", sensitive: true },
  { key: "settings.notifications.manage", group: "settings", ar: "إدارة الإشعارات", en: "Manage notifications" },

  // Branches
  { key: "branches.view", group: "branches", ar: "عرض الفروع", en: "View branches" },
  { key: "branches.manage", group: "branches", ar: "إدارة الفروع", en: "Manage branches", sensitive: true },

  // Operations
  { key: "pos.use", group: "operations", ar: "استخدام نقطة البيع", en: "Use POS" },
  { key: "waiter.use", group: "operations", ar: "استخدام واجهة النادل", en: "Use waiter workspace" },
  { key: "delivery.use", group: "operations", ar: "استخدام واجهة التوصيل", en: "Use delivery workspace" },

  // AI
  { key: "ai.use", group: "ai", ar: "استخدام المساعد الذكي", en: "Use AI assistant" },

  // Subscription
  { key: "subscription.view", group: "subscription", ar: "عرض الاشتراك", en: "View subscription" },
  { key: "subscription.manage", group: "subscription", ar: "إدارة الاشتراك", en: "Manage subscription", sensitive: true },

  // Support
  { key: "support.view", group: "support", ar: "عرض تذاكر الدعم", en: "View support tickets" },
  { key: "support.manage", group: "support", ar: "إدارة تذاكر الدعم", en: "Manage support tickets" },

  // Customers
  { key: "customers.view", group: "customers", ar: "عرض العملاء", en: "View customers" },
  { key: "customers.manage", group: "customers", ar: "إدارة العملاء", en: "Manage customers" },
];

export const PERMISSION_KEYS = PERMISSIONS.map((p) => p.key);
export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export const PERMISSION_GROUPS: { key: PermissionGroup; ar: string; en: string }[] = [
  { key: "orders", ar: "الطلبات", en: "Orders" },
  { key: "menu", ar: "المنيو", en: "Menu" },
  { key: "tables", ar: "الطاولات", en: "Tables" },
  { key: "reservations", ar: "الحجوزات", en: "Reservations" },
  { key: "kitchen", ar: "المطبخ", en: "Kitchen" },
  { key: "staff", ar: "الموظفون", en: "Staff" },
  { key: "reports", ar: "التقارير", en: "Reports" },
  { key: "billing", ar: "الفوترة", en: "Billing" },
  { key: "marketing", ar: "التسويق", en: "Marketing" },
  { key: "settings", ar: "الإعدادات", en: "Settings" },
  { key: "branches", ar: "الفروع", en: "Branches" },
  { key: "operations", ar: "التشغيل", en: "Operations" },
  { key: "ai", ar: "الذكاء الاصطناعي", en: "AI" },
  { key: "subscription", ar: "الاشتراك", en: "Subscription" },
  { key: "support", ar: "الدعم", en: "Support" },
  { key: "customers", ar: "العملاء", en: "Customers" },
];

export interface RoleTemplate {
  key: string;
  ar: string;
  en: string;
  descriptionAr: string;
  permissions: "*" | string[];
}

const operational = [
  "orders.view",
  "orders.create",
  "orders.accept",
  "orders.reject",
  "orders.change_status",
  "orders.print",
  "orders.discount",
  "menu.view",
  "tables.view",
  "tables.manage",
  "tables.sessions.manage",
  "reservations.view",
  "reservations.manage",
  "kitchen.view",
  "kitchen.manage",
  "staff.view",
  "reports.view",
  "pos.use",
  "waiter.use",
  "customers.view",
];

export const ROLE_TEMPLATES: RoleTemplate[] = [
  {
    key: "owner",
    ar: "المالك",
    en: "Owner",
    descriptionAr: "صلاحيات كاملة على المطعم بما فيها الفوترة والاشتراك.",
    permissions: "*",
  },
  {
    key: "general_manager",
    ar: "المدير العام",
    en: "General Manager",
    descriptionAr: "إدارة التشغيل اليومي والموظفين والمنيو والتقارير.",
    permissions: [
      ...operational,
      "orders.cancel",
      "orders.assign",
      "menu.categories.manage",
      "menu.products.create",
      "menu.products.update",
      "menu.prices.update",
      "menu.extras.manage",
      "menu.modifiers.manage",
      "menu.themes.manage",
      "menu.publish",
      "tables.qr.manage",
      "tables.floorplan.manage",
      "kitchen.stations.manage",
      "staff.invite",
      "staff.update",
      "staff.roles.manage",
      "staff.activity.view",
      "staff.shifts.manage",
      "reports.financial.view",
      "reports.export",
      "billing.view",
      "payments.record",
      "invoices.create",
      "expenses.manage",
      "marketing.view",
      "marketing.coupons.manage",
      "marketing.campaigns.manage",
      "marketing.loyalty.manage",
      "marketing.reviews.manage",
      "settings.view",
      "settings.manage",
      "settings.notifications.manage",
      "branches.view",
      "branches.manage",
      "ai.use",
      "subscription.view",
      "support.view",
      "support.manage",
      "customers.manage",
      "delivery.use",
    ],
  },
  {
    key: "branch_manager",
    ar: "مدير الفرع",
    en: "Branch Manager",
    descriptionAr: "إدارة فرع واحد وموظفيه وطلباته وتقاريره.",
    permissions: [
      ...operational,
      "orders.cancel",
      "menu.categories.manage",
      "menu.products.update",
      "tables.qr.manage",
      "tables.floorplan.manage",
      "staff.invite",
      "staff.update",
      "staff.activity.view",
      "staff.shifts.manage",
      "reports.export",
      "settings.view",
      "branches.view",
      "customers.manage",
    ],
  },
  {
    key: "supervisor",
    ar: "المشرف",
    en: "Supervisor",
    descriptionAr: "مراقبة الطلبات والموظفين والطاولات وحل المشكلات التشغيلية.",
    permissions: [
      "orders.view",
      "orders.accept",
      "orders.reject",
      "orders.change_status",
      "orders.print",
      "menu.view",
      "tables.view",
      "tables.manage",
      "tables.sessions.manage",
      "reservations.view",
      "reservations.manage",
      "kitchen.view",
      "staff.view",
      "reports.view",
      "waiter.use",
      "customers.view",
    ],
  },
  {
    key: "waiter",
    ar: "النادل",
    en: "Waiter",
    descriptionAr: "الطاولات والطلبات واستدعاءات النادل وتسليم الطلبات.",
    permissions: [
      "orders.view",
      "orders.create",
      "orders.change_status",
      "orders.print",
      "menu.view",
      "tables.view",
      "tables.sessions.manage",
      "reservations.view",
      "waiter.use",
    ],
  },
  {
    key: "cashier",
    ar: "الكاشير",
    en: "Cashier",
    descriptionAr: "استقبال الطلبات وإصدار الفواتير وتسجيل المدفوعات.",
    permissions: [
      "orders.view",
      "orders.create",
      "orders.accept",
      "orders.change_status",
      "orders.print",
      "orders.discount",
      "menu.view",
      "tables.view",
      "tables.sessions.manage",
      "billing.view",
      "payments.record",
      "invoices.create",
      "reports.view",
      "pos.use",
      "customers.view",
    ],
  },
  {
    key: "chef",
    ar: "الطباخ",
    en: "Chef",
    descriptionAr: "شاشة المطبخ وتحديث حالة الأصناف وإنهاء التحضير.",
    permissions: ["orders.view", "orders.change_status", "menu.view", "kitchen.view", "kitchen.manage"],
  },
  {
    key: "kitchen_manager",
    ar: "مدير المطبخ",
    en: "Kitchen Manager",
    descriptionAr: "إدارة شاشة المطبخ ومحطات التحضير وأوقات التحضير.",
    permissions: [
      "orders.view",
      "orders.change_status",
      "menu.view",
      "kitchen.view",
      "kitchen.manage",
      "kitchen.stations.manage",
      "staff.view",
      "reports.view",
    ],
  },
  {
    key: "menu_manager",
    ar: "مسؤول المنيو",
    en: "Menu Manager",
    descriptionAr: "إدارة الأقسام والمنتجات والأسعار والصور والتصميم.",
    permissions: [
      "menu.view",
      "menu.categories.manage",
      "menu.products.create",
      "menu.products.update",
      "menu.products.delete",
      "menu.prices.update",
      "menu.extras.manage",
      "menu.modifiers.manage",
      "menu.themes.manage",
      "menu.publish",
      "menu.import",
      "reports.view",
    ],
  },
  {
    key: "accountant",
    ar: "المحاسب",
    en: "Accountant",
    descriptionAr: "مراجعة المبيعات والفواتير والمدفوعات والمصروفات والتقارير.",
    permissions: [
      "orders.view",
      "reports.view",
      "reports.financial.view",
      "reports.export",
      "billing.view",
      "billing.manage",
      "payments.record",
      "invoices.create",
      "expenses.manage",
      "subscription.view",
      "menu.view",
    ],
  },
  {
    key: "delivery_manager",
    ar: "مدير التوصيل",
    en: "Delivery Manager",
    descriptionAr: "إدارة طلبات التوصيل وتوزيعها على السائقين ومتابعتها.",
    permissions: [
      "orders.view",
      "orders.assign",
      "orders.change_status",
      "reports.view",
      "staff.view",
      "customers.view",
      "delivery.use",
    ],
  },
  {
    key: "delivery_driver",
    ar: "سائق التوصيل",
    en: "Delivery Driver",
    descriptionAr: "مشاهدة الطلبات المعينة وتحديث حالة التوصيل.",
    permissions: ["orders.view", "orders.change_status", "delivery.use"],
  },
  {
    key: "marketing_manager",
    ar: "مسؤول التسويق",
    en: "Marketing Manager",
    descriptionAr: "العروض والكوبونات والحملات والتقييمات ونتائج التسويق.",
    permissions: [
      "orders.view",
      "menu.view",
      "reports.view",
      "marketing.view",
      "marketing.coupons.manage",
      "marketing.campaigns.manage",
      "marketing.loyalty.manage",
      "marketing.reviews.manage",
      "customers.view",
      "customers.manage",
    ],
  },
  {
    key: "customer_support",
    ar: "خدمة العملاء",
    en: "Customer Support",
    descriptionAr: "متابعة طلبات العملاء والشكاوى والاستفسارات والتقييمات.",
    permissions: [
      "orders.view",
      "reservations.view",
      "reservations.manage",
      "marketing.reviews.manage",
      "customers.view",
      "customers.manage",
      "support.view",
      "support.manage",
    ],
  },
];

export function permissionsForTemplate(key: string): string[] {
  const template = ROLE_TEMPLATES.find((r) => r.key === key);
  if (!template) return [];
  return template.permissions === "*" ? PERMISSION_KEYS : template.permissions;
}

export function permissionLabel(key: string, locale = "ar"): string {
  const perm = PERMISSIONS.find((p) => p.key === key);
  if (!perm) return key;
  return locale === "ar" ? perm.ar : perm.en;
}

export interface EffectivePermissionSource {
  roles: { role: { permissions: { permission: { key: string } }[] } }[];
  permissions: { effect: "ALLOW" | "DENY"; permission: { key: string } }[];
}

/** Compute the effective permission set for a membership. */
export function effectivePermissions(member: EffectivePermissionSource): Set<string> {
  const set = new Set<string>();
  for (const memberRole of member.roles) {
    for (const rp of memberRole.role.permissions) {
      set.add(rp.permission.key);
    }
  }
  for (const override of member.permissions) {
    if (override.effect === "DENY") set.delete(override.permission.key);
    else set.add(override.permission.key);
  }
  return set;
}
