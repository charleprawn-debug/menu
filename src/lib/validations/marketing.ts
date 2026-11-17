import { z } from "zod";

export const marketingInquirySchema = z.object({
  name: z.string().trim().min(2, "أدخل اسماً لا يقل عن حرفين").max(120),
  email: z.string().trim().email("أدخل بريداً إلكترونياً صحيحاً").max(254),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  restaurantName: z.string().trim().max(160).optional().or(z.literal("")),
  subject: z.enum(["general", "demo", "pricing", "enterprise", "support"]),
  message: z.string().trim().min(10, "اكتب رسالة من 10 أحرف على الأقل").max(5000),
  website: z.string().max(200).optional(),
});

export type MarketingInquiryInput = z.infer<typeof marketingInquirySchema>;
