import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("بريد إلكتروني غير صالح"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
  next: z.string().optional(),
});

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "الاسم قصير جداً").max(120),
    email: z.string().trim().toLowerCase().email("بريد إلكتروني غير صالح"),
    phone: z.string().trim().max(30).optional().or(z.literal("")),
    password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل").max(200),
    confirmPassword: z.string(),
    terms: z.union([z.literal("on"), z.literal("true"), z.literal("1")]).optional(),
    planKey: z.string().trim().max(64).optional().or(z.literal("")),
    billingCycle: z.enum(["MONTHLY", "YEARLY"]).optional().default("MONTHLY"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "كلمتا المرور غير متطابقتين",
    path: ["confirmPassword"],
  })
  .refine((data) => !!data.terms, {
    message: "يجب الموافقة على الشروط",
    path: ["terms"],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("بريد إلكتروني غير صالح"),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(10),
    password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل").max(200),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "كلمتا المرور غير متطابقتين",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
