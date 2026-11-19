import type { PlatformRole } from "@prisma/client";

export type PlatformCapability =
  | "dashboard.view"
  | "restaurants.view"
  | "restaurants.manage"
  | "users.view"
  | "users.manage"
  | "billing.view"
  | "billing.manage"
  | "support.view"
  | "support.manage"
  | "marketing.view"
  | "marketing.manage"
  | "system.view"
  | "system.manage"
  | "audit.view";

export interface PlatformRoleDefinition {
  role: PlatformRole;
  labelAr: string;
  labelEn: string;
  scopeAr: string;
  scopeEn: string;
  capabilities: readonly PlatformCapability[] | "*";
}

const viewOnly: PlatformCapability[] = [
  "dashboard.view", "restaurants.view", "users.view", "billing.view",
  "support.view", "marketing.view", "system.view", "audit.view",
];

export const PLATFORM_ROLE_DEFINITIONS: PlatformRoleDefinition[] = [
  {
    role: "SUPER_ADMIN", labelAr: "مدير المنصة الأعلى", labelEn: "Platform Super Admin",
    scopeAr: "جميع إعدادات المنصة وإدارتها؛ يمنح لحسابات قليلة جداً.",
    scopeEn: "All platform settings and operations; assign sparingly.", capabilities: "*",
  },
  {
    role: "ADMIN", labelAr: "مدير المنصة", labelEn: "Platform Admin",
    scopeAr: "إدارة المطاعم والمستخدمين، دون صلاحيات مالية أو تقنية شاملة.",
    scopeEn: "Manage restaurants and users; no broad finance or technical access.",
    capabilities: ["dashboard.view", "restaurants.view", "restaurants.manage", "users.view", "users.manage", "audit.view"],
  },
  {
    role: "FINANCE_ADMIN", labelAr: "مدير المالية", labelEn: "Finance Admin",
    scopeAr: "الاشتراكات والمدفوعات والبيانات المالية فقط.",
    scopeEn: "Subscriptions, payments and finance data only.",
    capabilities: ["dashboard.view", "billing.view", "billing.manage", "audit.view"],
  },
  {
    role: "SUPPORT_AGENT", labelAr: "موظف الدعم", labelEn: "Support Agent",
    scopeAr: "تذاكر واستفسارات الدعم دون إدارة المطاعم أو الأموال.",
    scopeEn: "Support tickets and enquiries; no restaurant administration or finance.",
    capabilities: ["dashboard.view", "support.view", "support.manage"],
  },
  {
    role: "MARKETING_ADMIN", labelAr: "مدير التسويق", labelEn: "Marketing Admin",
    scopeAr: "الحملات والإعلانات والاستفسارات التسويقية فقط.",
    scopeEn: "Campaigns, ads and marketing enquiries only.",
    capabilities: ["dashboard.view", "marketing.view", "marketing.manage"],
  },
  {
    role: "TECHNICAL_ADMIN", labelAr: "مدير تقني", labelEn: "Technical Admin",
    scopeAr: "الصحة التقنية والأخطاء والأمن الفني، دون بيانات الفوترة.",
    scopeEn: "Technical health, errors and security; no billing data.",
    capabilities: ["dashboard.view", "system.view", "system.manage", "audit.view"],
  },
  {
    role: "READ_ONLY_ADMIN", labelAr: "مدير للقراءة فقط", labelEn: "Read Only Admin",
    scopeAr: "عرض بيانات المنصة دون أي إجراء تغييري.",
    scopeEn: "Read platform data without mutation capabilities.", capabilities: viewOnly,
  },
];

export function platformCapabilities(role: PlatformRole | null | undefined): Set<PlatformCapability> {
  const definition = PLATFORM_ROLE_DEFINITIONS.find((item) => item.role === role);
  if (!definition) return new Set();
  return new Set(definition.capabilities === "*"
    ? PLATFORM_ROLE_DEFINITIONS.flatMap((item) => item.capabilities === "*" ? [] : [...item.capabilities])
    : definition.capabilities);
}

export function hasPlatformCapability(role: PlatformRole | null | undefined, capability: PlatformCapability): boolean {
  const definition = PLATFORM_ROLE_DEFINITIONS.find((item) => item.role === role);
  return definition?.capabilities === "*" || platformCapabilities(role).has(capability);
}
