export interface NavItem {
  labelKey: string;
  href: string;
  icon: string;
  permission?: string;
  badge?: "orders" | "calls" | "reservations" | "tickets";
  soon?: boolean;
  exact?: boolean;
}

export interface NavGroup {
  key: string;
  labelKey: string;
  items: NavItem[];
}

export const dashboardNav: NavGroup[] = [
  {
    key: "main",
    labelKey: "nav.main",
    items: [{ labelKey: "nav.overview", href: "/app/dashboard", icon: "LayoutDashboard", exact: true }],
  },
  {
    key: "menu",
    labelKey: "nav.menuManagement",
    items: [
      { labelKey: "nav.categories", href: "/app/menu/categories", icon: "Layers", permission: "menu.view" },
      { labelKey: "nav.products", href: "/app/menu/products", icon: "UtensilsCrossed", permission: "menu.view" },
      { labelKey: "nav.extras", href: "/app/menu/extras", icon: "PlusCircle", permission: "menu.view" },
      { labelKey: "nav.modifiers", href: "/app/menu/modifiers", icon: "SlidersHorizontal", permission: "menu.view" },
      { labelKey: "nav.offers", href: "/app/menu/offers", icon: "BadgePercent", permission: "menu.view" },
      { labelKey: "nav.seasonal", href: "/app/menu/seasonal", icon: "CalendarRange", permission: "menu.view" },
      { labelKey: "nav.menuOrder", href: "/app/menu/order", icon: "ListOrdered", permission: "menu.view" },
      { labelKey: "nav.menuBuilder", href: "/app/menu/builder", icon: "Palette", permission: "menu.themes.manage" },
      { labelKey: "nav.menuPreview", href: "/app/menu/preview", icon: "Smartphone", permission: "menu.view" },
    ],
  },
  {
    key: "orders",
    labelKey: "nav.ordersManagement",
    items: [
      { labelKey: "nav.ordersAll", href: "/app/orders", icon: "ReceiptText", permission: "orders.view", exact: true },
      { labelKey: "nav.ordersNew", href: "/app/orders/new", icon: "Inbox", permission: "orders.view", badge: "orders" },
      { labelKey: "nav.ordersPreparing", href: "/app/orders/preparing", icon: "CookingPot", permission: "orders.view" },
      { labelKey: "nav.ordersReady", href: "/app/orders/ready", icon: "BellRing", permission: "orders.view" },
      { labelKey: "nav.ordersCompleted", href: "/app/orders/completed", icon: "CheckCircle2", permission: "orders.view" },
      { labelKey: "nav.ordersCancelled", href: "/app/orders/cancelled", icon: "XCircle", permission: "orders.view" },
      { labelKey: "nav.newOrder", href: "/app/orders/create", icon: "Plus", permission: "orders.create" },
    ],
  },
  {
    key: "restaurant",
    labelKey: "nav.restaurant",
    items: [
      { labelKey: "nav.tables", href: "/app/tables", icon: "Grid2x2", permission: "tables.view" },
      { labelKey: "nav.floorplan", href: "/app/tables/floor-plan", icon: "Map", permission: "tables.view" },
      { labelKey: "nav.sessions", href: "/app/tables/sessions", icon: "Timer", permission: "tables.view" },
      { labelKey: "nav.reservations", href: "/app/reservations", icon: "CalendarCheck", permission: "reservations.view", badge: "reservations" },
      { labelKey: "nav.waiterCalls", href: "/app/waiter-calls", icon: "ConciergeBell", permission: "tables.view", badge: "calls" },
      { labelKey: "nav.qrCodes", href: "/app/qr-codes", icon: "QrCode", permission: "tables.qr.manage" },
    ],
  },
  {
    key: "staff",
    labelKey: "nav.staff",
    items: [
      { labelKey: "nav.staffAll", href: "/app/staff", icon: "Users", permission: "staff.view" },
      { labelKey: "nav.roles", href: "/app/staff/roles", icon: "ShieldCheck", permission: "staff.view" },
      { labelKey: "nav.permissions", href: "/app/staff/permissions", icon: "KeyRound", permission: "staff.view" },
      { labelKey: "nav.activity", href: "/app/staff/activity", icon: "History", permission: "staff.activity.view" },
    ],
  },
  {
    key: "sales",
    labelKey: "nav.sales",
    items: [
      { labelKey: "nav.invoices", href: "/app/sales/invoices", icon: "FileText", permission: "billing.view" },
      { labelKey: "nav.payments", href: "/app/sales/payments", icon: "CreditCard", permission: "billing.view" },
      { labelKey: "nav.refunds", href: "/app/sales/refunds", icon: "RotateCcw", permission: "billing.view" },
      { labelKey: "nav.expenses", href: "/app/sales/expenses", icon: "Wallet", permission: "expenses.manage" },
    ],
  },
  {
    key: "reports",
    labelKey: "nav.reports",
    items: [
      { labelKey: "nav.reportsSales", href: "/app/reports/sales", icon: "TrendingUp", permission: "reports.view" },
      { labelKey: "nav.reportsOrders", href: "/app/reports/orders", icon: "BarChart3", permission: "reports.view" },
      { labelKey: "nav.reportsProducts", href: "/app/reports/products", icon: "PieChart", permission: "reports.view" },
      { labelKey: "nav.reportsStaff", href: "/app/reports/staff", icon: "UserCheck", permission: "reports.view" },
      { labelKey: "nav.reportsPerformance", href: "/app/reports/performance", icon: "Activity", permission: "reports.view" },
      { labelKey: "nav.reportsCenter", href: "/app/reports", icon: "FileBarChart", permission: "reports.view", exact: true },
    ],
  },
  {
    key: "marketing",
    labelKey: "nav.marketing",
    items: [
      { labelKey: "nav.coupons", href: "/app/marketing/coupons", icon: "Ticket", permission: "marketing.view" },
      { labelKey: "nav.campaigns", href: "/app/marketing/campaigns", icon: "Megaphone", permission: "marketing.view" },
      { labelKey: "nav.loyalty", href: "/app/marketing/loyalty", icon: "Gift", permission: "marketing.view" },
      { labelKey: "nav.reviews", href: "/app/marketing/reviews", icon: "Star", permission: "marketing.view" },
    ],
  },
  {
    key: "settings",
    labelKey: "nav.settingsGroup",
    items: [
      { labelKey: "nav.settingsRestaurant", href: "/app/settings", icon: "Store", permission: "settings.view", exact: true },
      { labelKey: "nav.settingsMenu", href: "/app/settings/menu", icon: "Paintbrush", permission: "settings.view" },
      { labelKey: "nav.settingsOrders", href: "/app/settings/orders", icon: "ClipboardList", permission: "settings.view" },
      { labelKey: "nav.settingsPayments", href: "/app/settings/payments", icon: "Banknote", permission: "settings.view" },
      { labelKey: "nav.settingsHours", href: "/app/settings/hours", icon: "Clock", permission: "settings.view" },
      { labelKey: "nav.settingsNotifications", href: "/app/settings/notifications", icon: "Bell", permission: "settings.view" },
      { labelKey: "nav.settingsLocales", href: "/app/settings/locales", icon: "Globe2", permission: "settings.view" },
      { labelKey: "nav.settingsBranches", href: "/app/settings/branches", icon: "Building2", permission: "branches.view" },
      { labelKey: "nav.settingsDomains", href: "/app/settings/domains", icon: "Link2", permission: "settings.domains.manage" },
      { labelKey: "nav.settingsSecurity", href: "/app/settings/security", icon: "Lock", permission: "settings.security.manage" },
    ],
  },
  {
    key: "account",
    labelKey: "nav.account",
    items: [
      { labelKey: "nav.ai", href: "/app/ai", icon: "Sparkles", permission: "ai.use" },
      { labelKey: "nav.subscription", href: "/app/subscription", icon: "Crown", permission: "subscription.view" },
      { labelKey: "nav.support", href: "/app/support", icon: "LifeBuoy", permission: "support.view" },
    ],
  },
];

export const operationsNav = [
  { labelKey: "nav.kitchen", href: "/kitchen", icon: "ChefHat", permission: "kitchen.view" },
  { labelKey: "nav.pos", href: "/pos", icon: "MonitorSmartphone", permission: "pos.use" },
  { labelKey: "nav.waiter", href: "/waiter", icon: "HandPlatter", permission: "waiter.use" },
];

export const adminNav: NavGroup[] = [
  {
    key: "overview",
    labelKey: "admin.dashboard",
    items: [{ labelKey: "admin.dashboard", href: "/admin", icon: "LayoutDashboard", exact: true }],
  },
  {
    key: "restaurants",
    labelKey: "admin.restaurants",
    items: [
      { labelKey: "admin.restaurantsAll", href: "/admin/restaurants", icon: "Store", exact: true },
      { labelKey: "admin.restaurantsPending", href: "/admin/restaurants?status=PENDING", icon: "Clock3" },
      { labelKey: "admin.restaurantsActive", href: "/admin/restaurants?status=ACTIVE", icon: "CheckCircle2" },
      { labelKey: "admin.restaurantsSuspended", href: "/admin/restaurants?status=SUSPENDED", icon: "Ban" },
      { labelKey: "admin.restaurantsTrial", href: "/admin/restaurants?status=TRIAL", icon: "Timer" },
    ],
  },
  {
    key: "users",
    labelKey: "admin.users",
    items: [
      { labelKey: "admin.usersAll", href: "/admin/users", icon: "Users", exact: true },
      { labelKey: "admin.owners", href: "/admin/users?role=owners", icon: "Crown" },
      { labelKey: "admin.staff", href: "/admin/users?role=staff", icon: "UserCog" },
    ],
  },
  {
    key: "subscriptions",
    labelKey: "admin.subscriptions",
    items: [
      { labelKey: "admin.subsActive", href: "/admin/subscriptions?status=ACTIVE", icon: "CheckCircle2" },
      { labelKey: "admin.subsExpired", href: "/admin/subscriptions?status=EXPIRED", icon: "CalendarX" },
      { labelKey: "admin.subsCancelled", href: "/admin/subscriptions?status=CANCELLED", icon: "XCircle" },
      { labelKey: "admin.subsPayments", href: "/admin/subscriptions/payments", icon: "CreditCard" },
      { labelKey: "admin.plansAll", href: "/admin/plans", icon: "Package" },
      { labelKey: "admin.features", href: "/admin/plans/features", icon: "ToggleLeft" },
    ],
  },
  {
    key: "revenue",
    labelKey: "admin.revenue",
    items: [
      { labelKey: "admin.revenueAnalytics", href: "/admin/revenue", icon: "TrendingUp", exact: true },
      { labelKey: "admin.transactions", href: "/admin/revenue/transactions", icon: "ArrowLeftRight" },
      { labelKey: "admin.invoices", href: "/admin/revenue/invoices", icon: "FileText" },
    ],
  },
  {
    key: "support",
    labelKey: "admin.support",
    items: [
      { labelKey: "admin.tickets", href: "/admin/support", icon: "LifeBuoy", exact: true, badge: "tickets" },
      { labelKey: "admin.complaints", href: "/admin/support?type=complaints", icon: "MessageSquareWarning" },
      { labelKey: "admin.announcements", href: "/admin/announcements", icon: "Megaphone" },
    ],
  },
  {
    key: "platform",
    labelKey: "admin.platform",
    items: [
      { labelKey: "admin.featuresMgmt", href: "/admin/platform/features", icon: "ToggleLeft" },
      { labelKey: "admin.globalSettings", href: "/admin/platform/settings", icon: "Settings" },
      { labelKey: "admin.languages", href: "/admin/platform/languages", icon: "Languages" },
      { labelKey: "admin.currencies", href: "/admin/platform/currencies", icon: "Coins" },
      { labelKey: "admin.themes", href: "/admin/platform/themes", icon: "Palette" },
      { labelKey: "admin.integrations", href: "/admin/platform/integrations", icon: "Plug" },
    ],
  },
  {
    key: "security",
    labelKey: "admin.security",
    items: [
      { labelKey: "admin.auditLogs", href: "/admin/security/audit", icon: "ScrollText" },
      { labelKey: "admin.loginHistory", href: "/admin/security/logins", icon: "LogIn" },
      { labelKey: "admin.securityEvents", href: "/admin/security/events", icon: "ShieldAlert" },
    ],
  },
  {
    key: "marketing",
    labelKey: "admin.marketing",
    items: [
      { labelKey: "admin.coupons", href: "/admin/marketing/coupons", icon: "Ticket" },
      { labelKey: "admin.campaigns", href: "/admin/marketing/campaigns", icon: "Megaphone" },
      { labelKey: "admin.referrals", href: "/admin/marketing/referrals", icon: "Share2" },
    ],
  },
  {
    key: "system",
    labelKey: "admin.system",
    items: [
      { labelKey: "admin.health", href: "/admin/system/health", icon: "HeartPulse" },
      { labelKey: "admin.storage", href: "/admin/system/storage", icon: "HardDrive" },
      { labelKey: "admin.notifications", href: "/admin/system/notifications", icon: "Bell" },
      { labelKey: "admin.backups", href: "/admin/system/backups", icon: "DatabaseBackup" },
    ],
  },
];

export function filterNav(groups: NavGroup[], permissions: Set<string>, isOwner: boolean): NavGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.permission || isOwner || permissions.has(item.permission)),
    }))
    .filter((group) => group.items.length > 0);
}
