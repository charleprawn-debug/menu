"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRestaurant } from "@/lib/auth/context";
import { createSession, setRestaurantCookie } from "@/lib/auth/session";
import { getLocale } from "@/i18n";
import {
  acceptInvitationSchema,
  createStaffSchema,
  memberOverrideSchema,
  saveRoleSchema,
  updateStaffSchema,
} from "@/lib/validations/staff";
import {
  acceptInvitation,
  confirmEmailChange,
  createStaff,
  deleteRole,
  deleteStaffMembership,
  requestPasswordReset,
  resendInvitation,
  revokeInvitation,
  saveMemberOverrides,
  saveRole,
  setStaffStatus,
  updateStaff,
  type StaffServiceResult,
} from "@/lib/services/staff";

export interface StaffActionState {
  ok?: boolean;
  error?: string;
  message?: string;
  url?: string;
  delivery?: "sent" | "unavailable" | "failed";
}

const successRefresh = () => {
  revalidatePath("/app/staff");
  revalidatePath("/app/staff/roles");
  revalidatePath("/app/staff/permissions");
  revalidatePath("/app/staff/activity");
  revalidatePath("/app");
};

const errors: Record<string, { ar: string; en: string }> = {
  FORBIDDEN: { ar: "لا تملك الصلاحية اللازمة لهذا الإجراء.", en: "You do not have permission to perform this action." },
  SCOPE_ESCALATION: { ar: "لا يمكنك منح نطاق أوسع من نطاق صلاحيتك.", en: "You cannot grant a broader scope than your own." },
  RESTAURANT_SCOPE_REQUIRED: { ar: "تعديل تعريفات الأدوار يتطلب صلاحية على مستوى المطعم كاملاً.", en: "Managing role definitions requires restaurant-wide scope." },
  BRANCH_SCOPE_VIOLATION: { ar: "لا يمكنك إدارة هذا الفرع أو هذا الموظف ضمن نطاقك الحالي.", en: "This branch or employee is outside your access scope." },
  BRANCH_REQUIRED: { ar: "اختر فرعاً واحداً على الأقل لهذا الدور.", en: "Select at least one branch for this role." },
  INVALID_BRANCH: { ar: "أحد الفروع غير متاح أو لا يتبع هذا المطعم.", en: "A selected branch is inactive or belongs to another restaurant." },
  INVALID_ROLE: { ar: "الدور المحدد غير صالح أو لا يتبع هذا المطعم.", en: "The selected role is invalid or belongs to another restaurant." },
  ROLE_ESCALATION: { ar: "لا يمكنك إسناد صلاحيات لا تملكها بنفسك.", en: "You cannot grant permissions that you do not hold." },
  ACCOUNT_UNAVAILABLE: { ar: "هذا الحساب موقوف أو غير متاح.", en: "This account is suspended or unavailable." },
  MEMBER_EXISTS: { ar: "هذا المستخدم عضو بالفعل في المطعم.", en: "This user is already a member of the restaurant." },
  ALREADY_A_MEMBER: { ar: "أصبحت عضواً في هذا المطعم بالفعل.", en: "You are already a member of this restaurant." },
  ACCOUNT_EXISTS_USE_INVITE: { ar: "البريد لديه حساب مسبقاً؛ استخدم دعوة بدلاً من إنشاء حساب جديد.", en: "This email already has an account; send an invitation instead of creating a new account." },
  INVITE_ALREADY_PENDING: { ar: "توجد دعوة سارية لهذا البريد. استخدم إعادة الإرسال لتدوير الرابط.", en: "An active invitation already exists. Resend it to rotate the link." },
  INVITE_RATE_LIMIT: { ar: "وصلت إلى الحد المؤقت لإرسال الدعوات. حاول لاحقاً.", en: "Invitation rate limit reached. Try again later." },
  INVITATION_NOT_FOUND: { ar: "الدعوة غير موجودة أو لم تعد قابلة للإرسال.", en: "The invitation does not exist or can no longer be resent." },
  INVITATION_INVALID_OR_EXPIRED: { ar: "رابط الدعوة غير صالح أو منتهي أو استُخدم مسبقاً.", en: "This invitation link is invalid, expired, or already used." },
  INVITATION_INVALID_ROLE: { ar: "الدور المرتبط بالدعوة لم يعد صالحاً.", en: "The role assigned to this invitation is no longer valid." },
  INVITATION_INVALID_BRANCH: { ar: "الفرع المرتبط بالدعوة لم يعد صالحاً.", en: "The branch assigned to this invitation is no longer valid." },
  PASSWORD_INCORRECT: { ar: "كلمة المرور غير صحيحة لهذا الحساب الموجود.", en: "The password is incorrect for this existing account." },
  MEMBER_NOT_FOUND: { ar: "الموظف غير موجود أو خارج نطاقك.", en: "The employee was not found or is outside your scope." },
  CANNOT_MANAGE_OWNER: { ar: "لا يمكن إدارة عضوية المالك من هذه الشاشة.", en: "The restaurant owner membership cannot be managed here." },
  CANNOT_EDIT_OWNER_PROFILE: { ar: "لا يمكن تغيير ملف حساب المالك من عضوية موظف.", en: "The restaurant owner profile cannot be changed through staff membership." },
  CANNOT_CHANGE_OWN_STATUS: { ar: "لا يمكنك تعطيل عضويتك بنفسك.", en: "You cannot deactivate your own membership." },
  CANNOT_DELETE_MEMBER: { ar: "لا يمكن حذف عضويتك أو عضوية المالك.", en: "You cannot remove your own membership or the owner's membership." },
  CANNOT_CHANGE_OWN_PERMISSIONS: { ar: "لا يمكنك تعديل استثناءات صلاحياتك بنفسك.", en: "You cannot edit your own permission overrides." },
  EMAIL_IN_USE: { ar: "البريد مستخدم حالياً بحساب آخر أو لديه طلب تغيير معلّق.", en: "This email is already used by another account or has a pending change." },
  APP_URL_REQUIRED: { ar: "حُفظت بقية التغييرات، لكن يلزم إعداد رابط التطبيق العام لتأكيد هذا التغيير.", en: "Other changes were saved, but the public app URL must be configured to confirm this change." },
  RESET_RATE_LIMIT: { ar: "تم إنشاء عدة روابط إعادة ضبط مؤخراً؛ حاول لاحقاً.", en: "Several password reset links were created recently. Try again later." },
  ROLE_NOT_FOUND: { ar: "الدور غير موجود في هذا المطعم.", en: "The role was not found in this restaurant." },
  OWNER_ROLE_PROTECTED: { ar: "دور المالك محمي ولا يمكن تعديله أو نسخه بهذه الطريقة.", en: "The owner role is protected." },
  ROLE_PROTECTED: { ar: "لا يمكن حذف الأدوار الافتراضية أو المحمية.", en: "Default and protected roles cannot be deleted." },
  ROLE_IN_USE: { ar: "لا يمكن حذف دور ما زال مسنداً إلى موظفين.", en: "A role assigned to employees cannot be deleted." },
  ROLE_NAME_EXISTS: { ar: "يوجد دور آخر بهذا الاسم.", en: "Another role already has this name." },
  INVALID_PERMISSION: { ar: "تتضمن المصفوفة صلاحية غير معروفة.", en: "The permission matrix contains an unknown permission." },
  ROLE_UPDATED: { ar: "حُفظت تغييرات الدور.", en: "Role changes saved." },
  ROLE_CREATED: { ar: "أُنشئ الدور المخصص.", en: "Custom role created." },
  EMAIL_VERIFICATION_DELIVERY_FAILED: { ar: "لم يتم إنشاء الحساب لأن رسالة تأكيد البريد لم تُرسل. تحقق من إعدادات SMTP.", en: "The account was not created because its verification email could not be sent. Check SMTP settings." },
  EMAIL_CHANGE_INVALID_OR_EXPIRED: { ar: "رابط تغيير البريد غير صالح أو منتهي أو مستخدم.", en: "This email-change link is invalid, expired, or already used." },
};

function errorText(error: unknown, locale: string): string {
  const code = error instanceof Error ? error.message : "";
  if (errors[code]) return locale === "ar" ? errors[code].ar : errors[code].en;
  return locale === "ar" ? "تعذر إكمال العملية. تحقق من البيانات وحاول مجدداً." : "The operation could not be completed. Check the data and try again.";
}

function normalizeResult(result: StaffServiceResult, locale: string): StaffActionState {
  return { ...result, message: result.message?.startsWith("ROLE_") ? (errors[result.message]?.[locale === "ar" ? "ar" : "en"] ?? result.message) : result.message };
}

function getField(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function getBranchIds(formData: FormData): string[] {
  return formData.getAll("branchIds").filter((value): value is string => typeof value === "string" && value.length > 0);
}

function parseJson<T>(value: string, fallback: T): T {
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

export async function createStaffAction(_previous: StaffActionState, formData: FormData): Promise<StaffActionState> {
  const locale = await getLocale();
  const parsed = createStaffSchema.safeParse({
    name: getField(formData, "name"), email: getField(formData, "email"), phone: getField(formData, "phone") || undefined,
    roleId: getField(formData, "roleId"), branchIds: getBranchIds(formData), mode: getField(formData, "mode"),
    password: getField(formData, "password") || undefined, confirmPassword: getField(formData, "confirmPassword") || undefined,
  });
  if (!parsed.success) return { error: locale === "ar" ? parsed.error.issues[0]?.message ?? "تحقق من البيانات." : "Check the submitted fields." };
  try {
    const actor = await requireRestaurant("staff.invite");
    const result = await createStaff(actor, parsed.data, locale);
    successRefresh();
    return normalizeResult(result, locale);
  } catch (error) { return { error: errorText(error, locale) }; }
}

export async function updateStaffAction(_previous: StaffActionState, formData: FormData): Promise<StaffActionState> {
  const locale = await getLocale();
  const parsed = updateStaffSchema.safeParse({
    memberId: getField(formData, "memberId"), name: getField(formData, "name"), email: getField(formData, "email"),
    phone: getField(formData, "phone") || undefined, roleId: getField(formData, "roleId"), branchIds: getBranchIds(formData),
  });
  if (!parsed.success) return { error: locale === "ar" ? parsed.error.issues[0]?.message ?? "تحقق من البيانات." : "Check the submitted fields." };
  try {
    const actor = await requireRestaurant("staff.update");
    const result = await updateStaff(actor, parsed.data, locale);
    successRefresh();
    return normalizeResult(result, locale);
  } catch (error) { return { error: errorText(error, locale) }; }
}

export async function setStaffStatusAction(formData: FormData): Promise<void> {
  const memberId = getField(formData, "memberId");
  const status = getField(formData, "status");
  try {
    const actor = await requireRestaurant("staff.update");
    if (status !== "ACTIVE" && status !== "SUSPENDED") throw new Error("INVALID_STATUS");
    await setStaffStatus(actor, memberId, status);
    successRefresh();
  } catch (error) { redirect(`/app/staff?error=${encodeURIComponent((error instanceof Error ? error.message : "ERROR").slice(0, 60))}`); }
  redirect("/app/staff?success=status");
}

export async function deleteStaffMembershipAction(formData: FormData): Promise<void> {
  try {
    const actor = await requireRestaurant("staff.delete");
    await deleteStaffMembership(actor, getField(formData, "memberId"));
    successRefresh();
  } catch (error) { redirect(`/app/staff?error=${encodeURIComponent((error instanceof Error ? error.message : "ERROR").slice(0, 60))}`); }
  redirect("/app/staff?success=deleted");
}

export async function resendInvitationAction(_previous: StaffActionState, formData: FormData): Promise<StaffActionState> {
  const locale = await getLocale();
  try {
    const actor = await requireRestaurant("staff.invite");
    const result = await resendInvitation(actor, getField(formData, "invitationId"), locale);
    successRefresh();
    return normalizeResult(result, locale);
  } catch (error) { return { error: errorText(error, locale) }; }
}

export async function revokeInvitationAction(formData: FormData): Promise<void> {
  try {
    const actor = await requireRestaurant("staff.invite");
    await revokeInvitation(actor, getField(formData, "invitationId"));
    successRefresh();
  } catch (error) { redirect(`/app/staff?error=${encodeURIComponent((error instanceof Error ? error.message : "ERROR").slice(0, 60))}`); }
  redirect("/app/staff?success=revoked");
}

export async function requestPasswordResetAction(_previous: StaffActionState, formData: FormData): Promise<StaffActionState> {
  const locale = await getLocale();
  try {
    const actor = await requireRestaurant("staff.update");
    const result = await requestPasswordReset(actor, getField(formData, "memberId"), locale);
    return normalizeResult(result, locale);
  } catch (error) { return { error: errorText(error, locale) }; }
}

export async function saveRoleAction(_previous: StaffActionState, formData: FormData): Promise<StaffActionState> {
  const locale = await getLocale();
  const permissions = parseJson<unknown>(getField(formData, "permissions"), []);
  const parsed = saveRoleSchema.safeParse({
    roleId: getField(formData, "roleId") || undefined,
    name: getField(formData, "name"),
    nameEn: getField(formData, "nameEn") || undefined,
    description: getField(formData, "description") || undefined,
    permissions,
  });
  if (!parsed.success) return { error: locale === "ar" ? parsed.error.issues[0]?.message ?? "تحقق من الدور." : "Check the role fields." };
  try {
    const actor = await requireRestaurant("staff.roles.manage");
    const result = await saveRole(actor, parsed.data);
    successRefresh();
    return normalizeResult(result, locale);
  } catch (error) { return { error: errorText(error, locale) }; }
}

export async function deleteRoleAction(formData: FormData): Promise<void> {
  try {
    const actor = await requireRestaurant("staff.roles.manage");
    await deleteRole(actor, getField(formData, "roleId"));
    successRefresh();
  } catch (error) { redirect(`/app/staff/roles?error=${encodeURIComponent((error instanceof Error ? error.message : "ERROR").slice(0, 60))}`); }
  redirect("/app/staff/roles?success=deleted");
}

export async function saveMemberOverridesAction(_previous: StaffActionState, formData: FormData): Promise<StaffActionState> {
  const locale = await getLocale();
  const raw = parseJson<unknown>(getField(formData, "overrides"), []);
  if (!Array.isArray(raw)) return { error: locale === "ar" ? "بيانات مصفوفة الصلاحيات غير صالحة." : "Permission data is invalid." };
  const overrides = raw.map((item) => memberOverrideSchema.safeParse(item));
  const invalid = overrides.find((item) => !item.success);
  if (invalid && !invalid.success) return { error: locale === "ar" ? invalid.error.issues[0]?.message ?? "بيانات صلاحيات غير صالحة." : "Invalid permission override." };
  const validated = overrides.flatMap((item) => item.success ? [item.data] : []);
  try {
    const actor = await requireRestaurant("staff.permissions.manage");
    await saveMemberOverrides(actor, getField(formData, "memberId"), validated);
    successRefresh();
    return { ok: true, message: locale === "ar" ? "حُفظت الاستثناءات الفردية." : "Member-specific overrides saved." };
  } catch (error) { return { error: errorText(error, locale) }; }
}

export async function acceptInvitationAction(_previous: StaffActionState, formData: FormData): Promise<StaffActionState> {
  const locale = await getLocale();
  const parsed = acceptInvitationSchema.safeParse({
    token: getField(formData, "token"), name: getField(formData, "name") || undefined,
    password: getField(formData, "password"), confirmPassword: getField(formData, "confirmPassword"),
  });
  if (!parsed.success) return { error: locale === "ar" ? parsed.error.issues[0]?.message ?? "تحقق من البيانات." : "Check the submitted fields." };
  try {
    const result = await acceptInvitation({ ...parsed.data, locale });
    await createSession(result.userId);
    await db.user.update({ where: { id: result.userId }, data: { lastLoginAt: new Date() } });
    await setRestaurantCookie(result.restaurantSlug);
    successRefresh();
    redirect("/app/dashboard");
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    return { error: errorText(error, locale) };
  }
}

export async function confirmEmailChangeAction(_previous: StaffActionState, formData: FormData): Promise<StaffActionState> {
  const locale = await getLocale();
  const token = getField(formData, "token");
  if (!/^[A-Za-z0-9_-]{40,64}$/.test(token)) return { error: locale === "ar" ? "رابط التأكيد غير صالح." : "The confirmation link is invalid." };
  try {
    await confirmEmailChange(token);
    return { ok: true, message: locale === "ar" ? "تم تأكيد البريد. سجّل الدخول مجدداً بالبريد الجديد." : "Email confirmed. Sign in again with the new address." };
  } catch (error) { return { error: errorText(error, locale) }; }
}
