import "server-only";
import { randomBytes } from "crypto";
import { Prisma, type PermissionScope, type RestaurantMember, type StaffInvitation, type User } from "@prisma/client";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/audit";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { hashToken, isEmailVerificationRequired } from "@/lib/auth/session";
import type { ActiveMembership } from "@/lib/auth/context";
import { branchIdsForPermission } from "@/lib/auth/scope";
import { sendEmployeeEmailChangeEmail, sendStaffInvitationEmail, sendStaffPasswordResetEmail } from "@/lib/email/staff";
import { sendVerificationEmail } from "@/lib/email/verification";
import { PERMISSION_KEYS } from "@/lib/permissions";
import type { createStaffSchema, saveRoleSchema, updateStaffSchema, rolePermissionSchema, memberOverrideSchema } from "@/lib/validations/staff";

export type CreateStaffInput = Omit<ReturnType<typeof createStaffSchema.parse>, "password" | "confirmPassword"> & {
  password?: string;
  confirmPassword?: string;
};
export type UpdateStaffInput = ReturnType<typeof updateStaffSchema.parse>;
export type SaveRoleInput = ReturnType<typeof saveRoleSchema.parse>;
export type RolePermissionInput = ReturnType<typeof rolePermissionSchema.parse>;
export type MemberOverrideInput = ReturnType<typeof memberOverrideSchema.parse>;

export interface StaffServiceResult {
  ok: boolean;
  error?: string;
  message?: string;
  url?: string;
  delivery?: "sent" | "unavailable" | "failed";
}

const scopeRank: Record<PermissionScope, number> = { RESTAURANT: 0, BRANCH: 1, OWNED: 2 };
const randomToken = () => randomBytes(32).toString("base64url");
const tokenExpiry = (hours: number) => new Date(Date.now() + hours * 60 * 60 * 1000);

function ensurePermission(member: ActiveMembership, key: string): void {
  if (!member.isOwner && !member.permissions.has(key)) throw new Error("FORBIDDEN");
}

function ensureRestaurantWideScope(member: ActiveMembership, permissionKey: string): void {
  if (!member.isOwner && member.permissionScopes.get(permissionKey) !== "RESTAURANT") throw new Error("RESTAURANT_SCOPE_REQUIRED");
}

function ensureScopeCanGrant(member: ActiveMembership, permissionKey: string, scope: PermissionScope): void {
  if (member.isOwner) return;
  const ownScope = member.permissionScopes.get(permissionKey);
  if (!ownScope || scopeRank[scope] < scopeRank[ownScope]) throw new Error("SCOPE_ESCALATION");
}

function ensureCanAssignBranches(member: ActiveMembership, permissionKey: string, branchIds: string[]): void {
  if (member.isOwner) return;
  const scope = member.permissionScopes.get(permissionKey) ?? "RESTAURANT";
  if (scope === "RESTAURANT") return;
  if (scope === "OWNED") throw new Error("FORBIDDEN");
  const allowed = new Set(branchIdsForPermission(member, permissionKey) ?? []);
  if (branchIds.length === 0 || branchIds.some((id) => !allowed.has(id))) throw new Error("BRANCH_SCOPE_VIOLATION");
}

function targetBranches(target: Pick<RestaurantMember, "branchId"> & { branchAccess?: { branchId: string }[] }): string[] {
  return [...new Set([...(target.branchId ? [target.branchId] : []), ...(target.branchAccess ?? []).map((access) => access.branchId)])];
}

function ensureCanManageTarget(
  actor: ActiveMembership,
  permissionKey: string,
  target: Pick<RestaurantMember, "userId" | "branchId"> & { branchAccess?: { branchId: string }[] },
): void {
  if (actor.isOwner) return;
  const scope = actor.permissionScopes.get(permissionKey) ?? "RESTAURANT";
  if (scope === "RESTAURANT") return;
  if (scope === "OWNED") {
    if (target.userId !== actor.userId) throw new Error("FORBIDDEN");
    return;
  }
  const allowed = new Set(branchIdsForPermission(actor, permissionKey) ?? []);
  const branches = targetBranches(target);
  if (branches.length === 0 || branches.some((id) => !allowed.has(id))) throw new Error("BRANCH_SCOPE_VIOLATION");
}

async function getRoleForAssignment(restaurantId: string, roleId: string) {
  const role = await db.role.findFirst({
    where: { id: roleId, restaurantId },
    include: { permissions: { include: { permission: { select: { key: true } } } } },
  });
  if (!role || role.key === "owner") throw new Error("INVALID_ROLE");
  return role;
}

function ensureRoleCanBeAssigned(actor: ActiveMembership, role: {
  key: string;
  permissions: { permission: { key: string }; scope: PermissionScope }[];
}): void {
  if (actor.isOwner) return;
  for (const item of role.permissions) {
    const key = item.permission.key;
    if (!actor.permissions.has(key)) throw new Error("ROLE_ESCALATION");
    ensureScopeCanGrant(actor, key, item.scope);
  }
}

async function validateBranches(restaurantId: string, branchIds: string[]): Promise<string[]> {
  const uniqueIds = [...new Set(branchIds)];
  if (uniqueIds.length > 100) throw new Error("INVALID_BRANCH");
  if (uniqueIds.length === 0) return [];
  const branches = await db.branch.findMany({
    where: { restaurantId, id: { in: uniqueIds }, isActive: true },
    select: { id: true },
  });
  if (branches.length !== uniqueIds.length) throw new Error("INVALID_BRANCH");
  return uniqueIds;
}

async function assertTargetMember(actor: ActiveMembership, memberId: string, permissionKey: string) {
  const target = await db.restaurantMember.findFirst({
    where: { id: memberId, restaurantId: actor.restaurantId },
    include: {
      branchAccess: { select: { branchId: true } },
      roles: { include: { role: { select: { id: true, key: true } } } },
      user: { select: { id: true, email: true, name: true, phone: true, pendingEmail: true, status: true } },
    },
  });
  if (!target) throw new Error("MEMBER_NOT_FOUND");
  ensureCanManageTarget(actor, permissionKey, target);
  if (target.isOwner && !actor.isOwner) throw new Error("CANNOT_MANAGE_OWNER");
  return target;
}

async function createInvitation(actor: ActiveMembership, input: CreateStaffInput, locale: "ar" | "en"): Promise<StaffServiceResult> {
  ensurePermission(actor, "staff.invite");
  const branches = await validateBranches(actor.restaurantId, input.branchIds);
  ensureCanAssignBranches(actor, "staff.invite", branches);
  if (!branches.length && !actor.isOwner && actor.permissionScopes.get("staff.invite") === "BRANCH") throw new Error("BRANCH_REQUIRED");
  const role = await getRoleForAssignment(actor.restaurantId, input.roleId);
  ensureRoleCanBeAssigned(actor, role);

  const existingUser = await db.user.findUnique({ where: { email: input.email }, select: { id: true, status: true } });
  if (existingUser?.status === "DELETED" || existingUser?.status === "SUSPENDED") throw new Error("ACCOUNT_UNAVAILABLE");
  if (existingUser) {
    const currentMember = await db.restaurantMember.findFirst({ where: { restaurantId: actor.restaurantId, userId: existingUser.id } });
    if (currentMember) throw new Error("MEMBER_EXISTS");
  }

  const token = randomToken();
  const lockKey = `${actor.restaurantId}:${input.email}`;
  const invitation = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;
    const recent = await tx.staffInvitation.count({
      where: { restaurantId: actor.restaurantId, email: { equals: input.email, mode: "insensitive" }, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
    });
    if (recent >= 5) throw new Error("INVITE_RATE_LIMIT");
    const pending = await tx.staffInvitation.findFirst({
      where: { restaurantId: actor.restaurantId, email: { equals: input.email, mode: "insensitive" }, status: "PENDING" },
    });
    if (pending) {
      if (pending.expiresAt.getTime() > Date.now()) throw new Error("INVITE_ALREADY_PENDING");
      await tx.staffInvitation.update({ where: { id: pending.id }, data: { status: "EXPIRED" } });
    }
    return tx.staffInvitation.create({
      data: {
        restaurantId: actor.restaurantId,
        email: input.email,
        name: input.name,
        phone: input.phone ?? null,
        roleId: role.id,
        branchId: branches[0] ?? null,
        token: hashToken(token),
        invitedById: actor.userId,
        expiresAt: tokenExpiry(7 * 24),
        lastSentAt: new Date(),
        sendCount: 1,
        branchAccess: {
          create: branches.map((branchId) => ({ branch: { connect: { id: branchId } } })),
        },
      },
      include: { restaurant: { select: { name: true } }, role: { select: { name: true, nameEn: true } } },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  await logActivity({
    restaurantId: actor.restaurantId,
    branchId: branches[0] ?? null,
    actorId: actor.userId,
    action: "staff.invitation.created",
    entity: "StaffInvitation",
    entityId: invitation.id,
    newValue: { email: input.email, roleId: role.id, branchIds: branches, expiresAt: invitation.expiresAt.toISOString() },
  });

  const mail = await sendStaffInvitationEmail({
    email: input.email,
    token,
    restaurantName: invitation.restaurant.name,
    roleName: locale === "ar" ? invitation.role?.name ?? role.name : invitation.role?.nameEn ?? invitation.role?.name ?? role.name,
    locale,
  });
  return {
    ok: true,
    delivery: mail.delivery,
    url: mail.delivery === "sent" ? undefined : mail.url ?? undefined,
    message: mail.delivery === "sent"
      ? (locale === "ar" ? "تم إرسال الدعوة بالبريد." : "Invitation email sent.")
      : mail.url
        ? (locale === "ar" ? "الدعوة حُفظت لكن البريد غير متاح؛ انسخ الرابط وأرسله يدوياً." : "Invitation saved, but email delivery is unavailable; share the link manually.")
        : (locale === "ar" ? "الدعوة حُفظت لكن لم يُرسل البريد. أعد إعداد SMTP ورابط التطبيق ثم أعد إرسال الدعوة." : "Invitation saved, but no email was sent. Configure SMTP and the app URL, then resend."),
  };
}

async function createAccountAndMembership(actor: ActiveMembership, input: CreateStaffInput, locale: "ar" | "en"): Promise<StaffServiceResult> {
  ensurePermission(actor, "staff.invite");
  if (!input.password) throw new Error("PASSWORD_REQUIRED");
  const branches = await validateBranches(actor.restaurantId, input.branchIds);
  ensureCanAssignBranches(actor, "staff.invite", branches);
  if (!branches.length && !actor.isOwner && actor.permissionScopes.get("staff.invite") === "BRANCH") throw new Error("BRANCH_REQUIRED");
  const role = await getRoleForAssignment(actor.restaurantId, input.roleId);
  ensureRoleCanBeAssigned(actor, role);
  if (await db.user.findUnique({ where: { email: input.email }, select: { id: true } })) throw new Error("ACCOUNT_EXISTS_USE_INVITE");

  const passwordHash = await hashPassword(input.password);
  const user = await db.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: { name: input.name, email: input.email, phone: input.phone ?? null, passwordHash, status: "ACTIVE", locale },
    });
    const member = await tx.restaurantMember.create({
      data: {
        restaurantId: actor.restaurantId,
        userId: createdUser.id,
        branchId: branches[0] ?? null,
        status: "ACTIVE",
        invitedById: actor.userId,
        invitedAt: new Date(),
        joinedAt: new Date(),
      },
    });
    await tx.memberRole.create({ data: { memberId: member.id, roleId: role.id } });
    if (branches.length) await tx.memberBranchAccess.createMany({ data: branches.map((branchId) => ({ memberId: member.id, branchId })) });
    return createdUser;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  if (isEmailVerificationRequired()) {
    const token = randomToken();
    await db.emailVerificationToken.create({ data: { userId: user.id, tokenHash: hashToken(token), expiresAt: tokenExpiry(1) } });
    const delivery = await sendVerificationEmail(input.email, token, locale);
    if (delivery !== "sent") {
      await db.user.delete({ where: { id: user.id } }).catch(() => null);
      throw new Error("EMAIL_VERIFICATION_DELIVERY_FAILED");
    }
  }

  await logActivity({
    restaurantId: actor.restaurantId,
    branchId: branches[0] ?? null,
    actorId: actor.userId,
    action: "staff.member.created",
    entity: "RestaurantMember",
    entityId: user.id,
    newValue: { email: input.email, roleId: role.id, branchIds: branches },
  });
  return {
    ok: true,
    delivery: isEmailVerificationRequired() ? "sent" : undefined,
    message: isEmailVerificationRequired()
      ? (locale === "ar" ? "أُنشئ الحساب وأُرسلت رسالة تأكيد البريد." : "Account created; email verification was sent.")
      : (locale === "ar" ? "أُنشئ حساب الموظف بنجاح." : "Employee account created."),
  };
}

export async function createStaff(actor: ActiveMembership, input: CreateStaffInput, locale: "ar" | "en"): Promise<StaffServiceResult> {
  return input.mode === "invite" ? createInvitation(actor, input, locale) : createAccountAndMembership(actor, input, locale);
}

export async function updateStaff(actor: ActiveMembership, input: UpdateStaffInput, locale: "ar" | "en"): Promise<StaffServiceResult> {
  ensurePermission(actor, "staff.update");
  const target = await assertTargetMember(actor, input.memberId, "staff.update");
  if (target.userId === actor.userId && target.isOwner) throw new Error("CANNOT_EDIT_OWNER_PROFILE");
  const branches = await validateBranches(actor.restaurantId, input.branchIds);
  ensureCanAssignBranches(actor, "staff.update", branches);
  if (!branches.length && !actor.isOwner && actor.permissionScopes.get("staff.update") === "BRANCH") throw new Error("BRANCH_REQUIRED");
  const role = await getRoleForAssignment(actor.restaurantId, input.roleId);
  ensureRoleCanBeAssigned(actor, role);

  let emailChange: { token: string; email: string } | null = null;
  if (input.email !== target.user.email) {
    const existing = await db.user.findFirst({ where: { email: input.email, id: { not: target.userId } }, select: { id: true } });
    const pending = await db.user.findFirst({ where: { pendingEmail: input.email, id: { not: target.userId } }, select: { id: true } });
    if (existing || pending) throw new Error("EMAIL_IN_USE");
    const token = randomToken();
    emailChange = { token, email: input.email };
  }

  const oldValue = {
    name: target.user.name,
    email: target.user.email,
    pendingEmail: target.user.pendingEmail,
    phone: target.user.phone,
    branchIds: targetBranches(target),
    roleIds: target.roles.map((item) => item.roleId),
  };
  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: target.userId },
      data: { name: input.name, phone: input.phone ?? null, ...(emailChange ? { pendingEmail: emailChange.email } : {}) },
    });
    await tx.memberRole.deleteMany({ where: { memberId: target.id } });
    await tx.memberRole.create({ data: { memberId: target.id, roleId: role.id } });
    await tx.memberBranchAccess.deleteMany({ where: { memberId: target.id } });
    if (branches.length) await tx.memberBranchAccess.createMany({ data: branches.map((branchId) => ({ memberId: target.id, branchId })) });
    await tx.restaurantMember.update({ where: { id: target.id }, data: { branchId: branches[0] ?? null } });
    if (emailChange) {
      await tx.emailChangeToken.updateMany({ where: { userId: target.userId, usedAt: null }, data: { usedAt: new Date() } });
      await tx.emailChangeToken.create({
        data: { userId: target.userId, restaurantId: actor.restaurantId, newEmail: emailChange.email, tokenHash: hashToken(emailChange.token), expiresAt: tokenExpiry(1) },
      });
    }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  await logActivity({
    restaurantId: actor.restaurantId,
    branchId: branches[0] ?? null,
    actorId: actor.userId,
    action: "staff.member.updated",
    entity: "RestaurantMember",
    entityId: target.id,
    oldValue,
    newValue: { name: input.name, email: target.user.email, pendingEmail: emailChange?.email ?? target.user.pendingEmail, phone: input.phone ?? null, branchIds: branches, roleIds: [role.id] },
  });

  if (!emailChange) return { ok: true, message: locale === "ar" ? "حُدّثت بيانات الموظف." : "Employee details updated." };
  const mail = await sendEmployeeEmailChangeEmail({ email: emailChange.email, token: emailChange.token, restaurantName: actor.restaurant.name, locale });
  if (!mail.url) {
    await db.$transaction([
      db.emailChangeToken.updateMany({ where: { userId: target.userId, tokenHash: hashToken(emailChange.token), usedAt: null }, data: { usedAt: new Date() } }),
      db.user.updateMany({ where: { id: target.userId, pendingEmail: emailChange.email }, data: { pendingEmail: null } }),
    ]);
    return { ok: false, error: "APP_URL_REQUIRED", message: locale === "ar" ? "حُفظت بقية التغييرات، لكن لا يمكن تغيير البريد حتى إعداد رابط التطبيق العام." : "Other changes were saved, but email cannot be changed until the public app URL is configured." };
  }
  return {
    ok: true,
    delivery: mail.delivery,
    url: mail.delivery === "sent" ? undefined : mail.url,
    message: mail.delivery === "sent"
      ? (locale === "ar" ? "حُدّثت البيانات وأُرسلت رسالة تأكيد إلى البريد الجديد." : "Details updated and a confirmation email was sent to the new address.")
      : (locale === "ar" ? "حُفظ طلب تغيير البريد؛ لم يصل البريد، لذا شارك رابط التأكيد مع الموظف." : "Email change is pending; no email was delivered, so share the confirmation link with the employee."),
  };
}

export async function setStaffStatus(actor: ActiveMembership, memberId: string, status: "ACTIVE" | "SUSPENDED"): Promise<void> {
  ensurePermission(actor, "staff.update");
  const target = await assertTargetMember(actor, memberId, "staff.update");
  if (target.userId === actor.userId) throw new Error("CANNOT_CHANGE_OWN_STATUS");
  await db.restaurantMember.update({ where: { id: target.id }, data: { status } });
  await logActivity({
    restaurantId: actor.restaurantId,
    branchId: target.branchId,
    actorId: actor.userId,
    action: status === "ACTIVE" ? "staff.member.activated" : "staff.member.deactivated",
    entity: "RestaurantMember",
    entityId: target.id,
    oldValue: { status: target.status },
    newValue: { status },
  });
}

export async function deleteStaffMembership(actor: ActiveMembership, memberId: string): Promise<void> {
  ensurePermission(actor, "staff.delete");
  const target = await assertTargetMember(actor, memberId, "staff.delete");
  if (target.userId === actor.userId || target.isOwner) throw new Error("CANNOT_DELETE_MEMBER");
  await logActivity({
    restaurantId: actor.restaurantId,
    branchId: target.branchId,
    actorId: actor.userId,
    action: "staff.member.removed",
    entity: "RestaurantMember",
    entityId: target.id,
    oldValue: { email: target.user.email, name: target.user.name, status: target.status, roles: target.roles.map((item) => item.role.key) },
  });
  await db.restaurantMember.delete({ where: { id: target.id } });
}

export async function resendInvitation(actor: ActiveMembership, invitationId: string, locale: "ar" | "en"): Promise<StaffServiceResult> {
  ensurePermission(actor, "staff.invite");
  const invitation = await db.staffInvitation.findFirst({
    where: { id: invitationId, restaurantId: actor.restaurantId },
    include: { restaurant: { select: { name: true } }, role: { select: { id: true, key: true, name: true, nameEn: true, permissions: { include: { permission: { select: { key: true } } } } } }, branch: { select: { id: true, restaurantId: true } }, branchAccess: { select: { branchId: true } } },
  });
  if (!invitation || invitation.status === "ACCEPTED") throw new Error("INVITATION_NOT_FOUND");
  const invitationBranches = [...new Set([...invitation.branchAccess.map((item) => item.branchId), ...(invitation.branchId ? [invitation.branchId] : [])])];
  if (invitationBranches.length) ensureCanAssignBranches(actor, "staff.invite", invitationBranches);
  else if (!actor.isOwner && actor.permissionScopes.get("staff.invite") === "BRANCH") throw new Error("BRANCH_SCOPE_VIOLATION");
  if (!invitation.role || invitation.role.key === "owner") throw new Error("INVALID_ROLE");
  ensureRoleCanBeAssigned(actor, invitation.role);
  const existingUser = await db.user.findUnique({ where: { email: invitation.email }, select: { id: true } });
  if (existingUser && await db.restaurantMember.findFirst({ where: { restaurantId: actor.restaurantId, userId: existingUser.id } })) throw new Error("MEMBER_EXISTS");

  const token = randomToken();
  const updated = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "staff_invitations" WHERE "id" = ${invitation.id} FOR UPDATE`;
    const current = await tx.staffInvitation.findUnique({ where: { id: invitation.id } });
    if (!current || current.status === "ACCEPTED") throw new Error("INVITATION_NOT_FOUND");
    if (current.sendCount >= 5 || (current.lastSentAt && current.lastSentAt.getTime() > Date.now() - 60_000)) throw new Error("INVITE_RATE_LIMIT");
    return tx.staffInvitation.update({
      where: { id: current.id },
      data: { token: hashToken(token), status: "PENDING", expiresAt: tokenExpiry(7 * 24), lastSentAt: new Date(), sendCount: { increment: 1 } },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  await logActivity({ restaurantId: actor.restaurantId, branchId: invitation.branchId, actorId: actor.userId, action: "staff.invitation.resent", entity: "StaffInvitation", entityId: invitation.id, oldValue: { status: invitation.status }, newValue: { status: updated.status, sendCount: updated.sendCount } });
  const mail = await sendStaffInvitationEmail({
    email: invitation.email, token, restaurantName: invitation.restaurant.name,
    roleName: locale === "ar" ? invitation.role.name : invitation.role.nameEn ?? invitation.role.name, locale,
  });
  return {
    ok: true, delivery: mail.delivery, url: mail.delivery === "sent" ? undefined : mail.url ?? undefined,
    message: mail.delivery === "sent"
      ? (locale === "ar" ? "أُعيد إرسال الدعوة." : "Invitation resent.")
      : mail.url
        ? (locale === "ar" ? "لم يصل البريد؛ انسخ رابط الدعوة الجديد." : "Email was not delivered; copy the new invitation link.")
        : (locale === "ar" ? "لم يتوفر إرسال البريد أو رابط التطبيق." : "Email delivery and the app URL are not configured."),
  };
}

export async function revokeInvitation(actor: ActiveMembership, invitationId: string): Promise<void> {
  ensurePermission(actor, "staff.invite");
  const invitation = await db.staffInvitation.findFirst({ where: { id: invitationId, restaurantId: actor.restaurantId }, include: { branchAccess: { select: { branchId: true } } } });
  if (!invitation || invitation.status === "ACCEPTED") throw new Error("INVITATION_NOT_FOUND");
  const branchIds = [...new Set([...invitation.branchAccess.map((item) => item.branchId), ...(invitation.branchId ? [invitation.branchId] : [])])];
  if (branchIds.length) ensureCanAssignBranches(actor, "staff.invite", branchIds);
  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "staff_invitations" WHERE "id" = ${invitation.id} FOR UPDATE`;
    const current = await tx.staffInvitation.findUnique({ where: { id: invitation.id } });
    if (!current || current.status === "ACCEPTED") throw new Error("INVITATION_NOT_FOUND");
    await tx.staffInvitation.update({ where: { id: current.id }, data: { status: "REVOKED", token: hashToken(randomToken()) } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  await logActivity({ restaurantId: actor.restaurantId, branchId: invitation.branchId, actorId: actor.userId, action: "staff.invitation.revoked", entity: "StaffInvitation", entityId: invitation.id, oldValue: { status: invitation.status }, newValue: { status: "REVOKED" } });
}

export async function requestPasswordReset(actor: ActiveMembership, memberId: string, locale: "ar" | "en"): Promise<StaffServiceResult> {
  ensurePermission(actor, "staff.update");
  const target = await assertTargetMember(actor, memberId, "staff.update");
  if (target.user.status !== "ACTIVE") throw new Error("ACCOUNT_UNAVAILABLE");
  const recent = await db.passwordResetToken.count({ where: { userId: target.userId, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } } });
  if (recent >= 5) throw new Error("RESET_RATE_LIMIT");
  const token = randomToken();
  await db.$transaction(async (tx) => {
    await tx.passwordResetToken.updateMany({ where: { userId: target.userId, usedAt: null }, data: { usedAt: new Date() } });
    await tx.passwordResetToken.create({ data: { userId: target.userId, tokenHash: hashToken(token), expiresAt: tokenExpiry(1) } });
  });
  const mail = await sendStaffPasswordResetEmail({ email: target.user.email, token, restaurantName: actor.restaurant.name, locale });
  if (!mail.url) {
    await db.passwordResetToken.updateMany({ where: { userId: target.userId, tokenHash: hashToken(token), usedAt: null }, data: { usedAt: new Date() } });
    throw new Error("APP_URL_REQUIRED");
  }
  await logActivity({ restaurantId: actor.restaurantId, branchId: target.branchId, actorId: actor.userId, action: "staff.password_reset.requested", entity: "User", entityId: target.userId });
  return {
    ok: true, delivery: mail.delivery, url: mail.delivery === "sent" ? undefined : mail.url,
    message: mail.delivery === "sent"
      ? (locale === "ar" ? "أُرسل رابط إعادة تعيين كلمة المرور." : "Password reset link sent.")
      : (locale === "ar" ? "لم يصل البريد؛ شارك الرابط المؤقت مع الموظف." : "Email was not delivered; share the temporary link with the employee."),
  };
}

export async function saveRole(actor: ActiveMembership, input: SaveRoleInput): Promise<StaffServiceResult> {
  ensurePermission(actor, "staff.roles.manage");
  ensureRestaurantWideScope(actor, "staff.roles.manage");
  const uniquePermissions = [...new Map(input.permissions.map((item) => [item.key, item])).values()];
  for (const item of uniquePermissions) {
    if (!PERMISSION_KEYS.includes(item.key as (typeof PERMISSION_KEYS)[number])) throw new Error("INVALID_PERMISSION");
    ensureScopeCanGrant(actor, item.key, item.scope);
    if (!actor.isOwner && !actor.permissions.has(item.key)) throw new Error("ROLE_ESCALATION");
  }
  const role = input.roleId
    ? await db.role.findFirst({ where: { id: input.roleId, restaurantId: actor.restaurantId }, include: { permissions: { include: { permission: { select: { key: true } } } } } })
    : null;
  if (input.roleId && !role) throw new Error("ROLE_NOT_FOUND");
  if (role?.key === "owner") throw new Error("OWNER_ROLE_PROTECTED");
  const existingName = await db.role.findFirst({
    where: { restaurantId: actor.restaurantId, name: { equals: input.name, mode: "insensitive" }, id: role ? { not: role.id } : undefined },
    select: { id: true },
  });
  if (existingName) throw new Error("ROLE_NAME_EXISTS");

  const before = role ? role.permissions.map((item) => ({ key: item.permission.key, scope: item.scope })) : [];
  const saved = await db.$transaction(async (tx) => {
    const target = role
      ? await tx.role.update({ where: { id: role.id }, data: { ...(role.isSystem ? {} : { name: input.name, nameEn: input.nameEn || null, description: input.description || null }) } })
      : await tx.role.create({ data: { restaurantId: actor.restaurantId, key: `custom_${randomBytes(6).toString("hex")}`, name: input.name, nameEn: input.nameEn || null, description: input.description || null, isSystem: false, isDefault: false } });
    await tx.rolePermission.deleteMany({ where: { roleId: target.id } });
    if (uniquePermissions.length) {
      const permissionRows = await tx.permission.findMany({ where: { key: { in: uniquePermissions.map((item) => item.key) } }, select: { id: true, key: true } });
      const ids = new Map(permissionRows.map((item) => [item.key, item.id]));
      await tx.rolePermission.createMany({ data: uniquePermissions.map((item) => ({ roleId: target.id, permissionId: ids.get(item.key)!, scope: item.scope })) });
    }
    return target;
  });
  await logActivity({ restaurantId: actor.restaurantId, actorId: actor.userId, action: role ? "staff.role.updated" : "staff.role.created", entity: "Role", entityId: saved.id, oldValue: role ? { name: role.name, permissions: before } : undefined, newValue: { name: saved.name, permissions: uniquePermissions } });
  return { ok: true, message: role ? "ROLE_UPDATED" : "ROLE_CREATED" };
}

export async function deleteRole(actor: ActiveMembership, roleId: string): Promise<void> {
  ensurePermission(actor, "staff.roles.manage");
  ensureRestaurantWideScope(actor, "staff.roles.manage");
  const role = await db.role.findFirst({ where: { id: roleId, restaurantId: actor.restaurantId }, include: { _count: { select: { members: true } } } });
  if (!role) throw new Error("ROLE_NOT_FOUND");
  if (role.isSystem || role.isDefault || role.key === "owner") throw new Error("ROLE_PROTECTED");
  if (role._count.members) throw new Error("ROLE_IN_USE");
  await db.role.delete({ where: { id: role.id } });
  await logActivity({ restaurantId: actor.restaurantId, actorId: actor.userId, action: "staff.role.deleted", entity: "Role", entityId: role.id, oldValue: { name: role.name, key: role.key } });
}

export async function saveMemberOverrides(actor: ActiveMembership, memberId: string, overrides: MemberOverrideInput[]): Promise<void> {
  ensurePermission(actor, "staff.permissions.manage");
  const target = await assertTargetMember(actor, memberId, "staff.permissions.manage");
  if (target.userId === actor.userId) throw new Error("CANNOT_CHANGE_OWN_PERMISSIONS");
  const uniqueOverrides = [...new Map(overrides.map((item) => [item.key, item])).values()].filter((item) => item.effect !== "INHERIT");
  for (const item of uniqueOverrides) {
    if (!PERMISSION_KEYS.includes(item.key as (typeof PERMISSION_KEYS)[number])) throw new Error("INVALID_PERMISSION");
    if (item.effect === "ALLOW") {
      if (!actor.isOwner && !actor.permissions.has(item.key)) throw new Error("ROLE_ESCALATION");
      ensureScopeCanGrant(actor, item.key, item.scope);
    }
  }
  const permissionRows = await db.permission.findMany({ where: { key: { in: uniqueOverrides.map((item) => item.key) } }, select: { id: true, key: true } });
  const ids = new Map(permissionRows.map((item) => [item.key, item.id]));
  const previous = await db.memberPermission.findMany({ where: { memberId: target.id }, include: { permission: { select: { key: true } } } });
  await db.$transaction(async (tx) => {
    await tx.memberPermission.deleteMany({ where: { memberId: target.id } });
    if (uniqueOverrides.length) {
      await tx.memberPermission.createMany({
        data: uniqueOverrides.map((item) => ({ memberId: target.id, permissionId: ids.get(item.key)!, effect: item.effect as "ALLOW" | "DENY", scope: item.scope })),
      });
    }
  });
  await logActivity({
    restaurantId: actor.restaurantId,
    branchId: target.branchId,
    actorId: actor.userId,
    action: "staff.permissions.overrides_updated",
    entity: "RestaurantMember",
    entityId: target.id,
    oldValue: previous.map((item) => ({ key: item.permission.key, effect: item.effect, scope: item.scope })),
    newValue: uniqueOverrides,
  });
}

export async function acceptInvitation(input: { token: string; name?: string; password: string; locale: "ar" | "en" }): Promise<{ userId: string; restaurantSlug: string }> {
  const hashed = hashToken(input.token);
  const invitation = await db.staffInvitation.findUnique({
    where: { token: hashed },
    include: { restaurant: { select: { id: true, slug: true, name: true, deletedAt: true } }, role: { include: { permissions: { include: { permission: { select: { key: true } } } } } }, branch: { select: { id: true, restaurantId: true, isActive: true } }, branchAccess: { include: { branch: { select: { restaurantId: true, isActive: true } } } } },
  });
  if (!invitation || invitation.status !== "PENDING" || invitation.expiresAt.getTime() < Date.now() || invitation.restaurant.deletedAt) throw new Error("INVITATION_INVALID_OR_EXPIRED");
  if (!invitation.role || invitation.role.restaurantId !== invitation.restaurantId || invitation.role.key === "owner") throw new Error("INVITATION_INVALID_ROLE");
  if (invitation.branchId && (!invitation.branch || invitation.branch.restaurantId !== invitation.restaurantId || !invitation.branch.isActive)) throw new Error("INVITATION_INVALID_BRANCH");
  if (invitation.branchAccess.some((item) => item.branch.restaurantId !== invitation.restaurantId || !item.branch.isActive)) throw new Error("INVITATION_INVALID_BRANCH");

  const result = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "staff_invitations" WHERE "id" = ${invitation.id} FOR UPDATE`;
    const currentInvite = await tx.staffInvitation.findUnique({ where: { id: invitation.id } });
    if (!currentInvite || currentInvite.status !== "PENDING" || currentInvite.expiresAt.getTime() < Date.now()) throw new Error("INVITATION_INVALID_OR_EXPIRED");
    const invitationBranches = await tx.staffInvitationBranch.findMany({
      where: { invitationId: currentInvite.id },
      include: { branch: { select: { restaurantId: true, isActive: true } } },
    });
    const branchIds = [...new Set([...invitationBranches.map((item) => item.branchId), ...(currentInvite.branchId ? [currentInvite.branchId] : [])])];
    if (invitationBranches.some((item) => item.branch.restaurantId !== currentInvite.restaurantId || !item.branch.isActive)) throw new Error("INVITATION_INVALID_BRANCH");
    if (branchIds.length) {
      const validBranches = await tx.branch.count({ where: { id: { in: branchIds }, restaurantId: currentInvite.restaurantId, isActive: true } });
      if (validBranches !== branchIds.length) throw new Error("INVITATION_INVALID_BRANCH");
    }
    let user = await tx.user.findUnique({ where: { email: currentInvite.email } });
    if (user) {
      await tx.$queryRaw`SELECT "id" FROM "users" WHERE "id" = ${user.id} FOR UPDATE`;
      user = await tx.user.findUnique({ where: { id: user.id } });
      if (!user || user.status === "SUSPENDED" || user.status === "DELETED") throw new Error("ACCOUNT_UNAVAILABLE");
      if (user.passwordHash && !(await verifyPassword(input.password, user.passwordHash))) throw new Error("PASSWORD_INCORRECT");
    }
    if (user && await tx.restaurantMember.findFirst({ where: { restaurantId: currentInvite.restaurantId, userId: user.id } })) throw new Error("ALREADY_A_MEMBER");
    if (!user) {
      user = await tx.user.create({
        data: {
          email: currentInvite.email,
          name: input.name?.trim() || currentInvite.name || currentInvite.email.split("@")[0],
          phone: currentInvite.phone,
          passwordHash: await hashPassword(input.password),
          status: "ACTIVE",
          locale: input.locale,
          emailVerifiedAt: new Date(),
        },
      });
    } else {
      user = await tx.user.update({
        where: { id: user.id },
        data: {
          status: "ACTIVE",
          emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
          ...(user.passwordHash ? {} : { passwordHash: await hashPassword(input.password) }),
          ...(input.name?.trim() ? { name: input.name.trim() } : {}),
          ...(currentInvite.phone ? { phone: currentInvite.phone } : {}),
        },
      });
    }
    const member = await tx.restaurantMember.create({
      data: {
        restaurantId: currentInvite.restaurantId,
        userId: user.id,
        branchId: currentInvite.branchId ?? branchIds[0] ?? null,
        status: "ACTIVE",
        invitedById: currentInvite.invitedById,
        invitedAt: currentInvite.createdAt,
        joinedAt: new Date(),
      },
    });
    await tx.memberRole.create({ data: { memberId: member.id, roleId: currentInvite.roleId! } });
    if (branchIds.length) await tx.memberBranchAccess.createMany({ data: branchIds.map((branchId) => ({ memberId: member.id, branchId })) });
    const consumed = await tx.staffInvitation.updateMany({
      where: { id: currentInvite.id, status: "PENDING", expiresAt: { gt: new Date() } },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    });
    if (consumed.count !== 1) throw new Error("INVITATION_ALREADY_USED");
    return { userId: user.id, memberId: member.id, restaurantId: currentInvite.restaurantId, restaurantSlug: invitation.restaurant.slug, branchId: currentInvite.branchId ?? branchIds[0] ?? null, branchIds };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  await logActivity({ restaurantId: result.restaurantId, branchId: result.branchId, actorId: result.userId, action: "staff.invitation.accepted", entity: "RestaurantMember", entityId: result.memberId, newValue: { email: invitation.email, branchIds: result.branchIds } });
  return { userId: result.userId, restaurantSlug: result.restaurantSlug };
}

export async function confirmEmailChange(token: string): Promise<void> {
  const tokenHash = hashToken(token);
  const row = await db.emailChangeToken.findUnique({ where: { tokenHash }, include: { user: { select: { id: true, email: true, pendingEmail: true } }, restaurant: { select: { id: true } } } });
  if (!row || row.usedAt || row.expiresAt.getTime() < Date.now() || row.user.pendingEmail !== row.newEmail) throw new Error("EMAIL_CHANGE_INVALID_OR_EXPIRED");
  const oldEmail = row.user.email;
  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "email_change_tokens" WHERE "id" = ${row.id} FOR UPDATE`;
    const current = await tx.emailChangeToken.findUnique({ where: { id: row.id } });
    const user = await tx.user.findUnique({ where: { id: row.userId } });
    if (!current || current.usedAt || current.expiresAt.getTime() < Date.now() || !user || user.pendingEmail !== current.newEmail) throw new Error("EMAIL_CHANGE_INVALID_OR_EXPIRED");
    const collision = await tx.user.findFirst({ where: { email: current.newEmail, id: { not: user.id } }, select: { id: true } });
    if (collision) throw new Error("EMAIL_IN_USE");
    await tx.user.update({ where: { id: user.id }, data: { email: current.newEmail, pendingEmail: null, emailVerifiedAt: new Date() } });
    await tx.emailChangeToken.update({ where: { id: current.id }, data: { usedAt: new Date() } });
    await tx.emailChangeToken.updateMany({ where: { userId: user.id, id: { not: current.id }, usedAt: null }, data: { usedAt: new Date() } });
    await tx.session.deleteMany({ where: { userId: user.id } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  const memberships = await db.restaurantMember.findMany({ where: { userId: row.userId, status: "ACTIVE" }, select: { restaurantId: true, branchId: true } });
  const logs = memberships.map((member) => logActivity({
    restaurantId: member.restaurantId,
    branchId: member.branchId,
    actorId: row.userId,
    action: "staff.email.changed",
    entity: "User",
    entityId: row.userId,
    oldValue: { email: oldEmail },
    newValue: { email: row.newEmail },
  }));
  await Promise.all(logs);
}
