import { z } from "zod";

const emailSchema = z.string().trim().email().max(254).transform((value) => value.toLowerCase());
const nameSchema = z.string().trim().min(2).max(100);
const phoneSchema = z.string().trim().max(40).optional().transform((value) => value || undefined);
const idSchema = z.string().trim().min(1).max(100);

export const createStaffSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  roleId: idSchema,
  branchIds: z.array(idSchema).max(100),
  mode: z.enum(["invite", "create"]),
  password: z.string().max(128).optional(),
  confirmPassword: z.string().max(128).optional(),
}).superRefine((data, context) => {
  if (data.mode === "create") {
    if (!data.password || data.password.length < 8) {
      context.addIssue({ code: "custom", path: ["password"], message: "استخدم كلمة مرور لا تقل عن 8 أحرف" });
    }
    if (data.password !== data.confirmPassword) {
      context.addIssue({ code: "custom", path: ["confirmPassword"], message: "كلمتا المرور غير متطابقتين" });
    }
  }
});

export const updateStaffSchema = z.object({
  memberId: idSchema,
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  roleId: idSchema,
  branchIds: z.array(idSchema).max(100),
});

export const rolePermissionSchema = z.object({
  key: idSchema,
  scope: z.enum(["RESTAURANT", "BRANCH", "OWNED"]),
});

export const saveRoleSchema = z.object({
  roleId: z.string().max(100).optional(),
  name: nameSchema,
  nameEn: z.string().trim().max(100).optional(),
  description: z.string().trim().max(500).optional(),
  permissions: z.array(rolePermissionSchema).max(200),
});

export const memberOverrideSchema = z.object({
  key: idSchema,
  effect: z.enum(["ALLOW", "DENY", "INHERIT"]),
  scope: z.enum(["RESTAURANT", "BRANCH", "OWNED"]),
});

export const acceptInvitationSchema = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{40,64}$/),
  name: nameSchema.optional(),
  password: z.string().min(8).max(128),
  confirmPassword: z.string().min(8).max(128),
}).refine((data) => data.password === data.confirmPassword, {
  path: ["confirmPassword"], message: "كلمتا المرور غير متطابقتين",
});

export const emailChangeSchema = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{40,64}$/),
});
