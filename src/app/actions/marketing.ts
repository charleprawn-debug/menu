"use server";

import { createHmac } from "crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requirePlatformAdmin } from "@/lib/auth/context";
import { db } from "@/lib/db";
import { getLocale } from "@/i18n";
import { marketingInquirySchema } from "@/lib/validations/marketing";

export interface ContactActionState {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function submitMarketingInquiry(
  _previous: ContactActionState,
  formData: FormData
): Promise<ContactActionState> {
  const locale = await getLocale();
  const genericError = locale === "ar" ? "تعذّر حفظ الرسالة. حاول مرة أخرى بعد قليل." : "We couldn't save your message. Please try again shortly.";
  const submittedWebsite = formData.get("website");
  if (typeof submittedWebsite === "string" && submittedWebsite.trim()) return { ok: true };

  const parsed = marketingInquirySchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || "",
    restaurantName: formData.get("restaurantName") || "",
    subject: formData.get("subject"),
    message: formData.get("message"),
    website: submittedWebsite || "",
  });

  if (!parsed.success) {
    const labels = locale === "ar"
      ? { name: "أدخل اسماً صحيحاً من حرفين على الأقل.", email: "أدخل بريداً إلكترونياً صحيحاً.", phone: "تحقق من رقم الهاتف.", restaurantName: "اسم المطعم طويل جداً.", subject: "اختر موضوع الرسالة.", message: "اكتب رسالة من 10 أحرف على الأقل وبحد أقصى 5000 حرف." }
      : { name: "Enter a valid name of at least two characters.", email: "Enter a valid email address.", phone: "Check the phone number.", restaurantName: "The business name is too long.", subject: "Choose an enquiry topic.", message: "Enter a message between 10 and 5,000 characters." };
    const fieldErrors = Object.fromEntries(
      Object.entries(parsed.error.flatten().fieldErrors).filter(([, errors]) => errors?.length).map(([key]) => [key, labels[key as keyof typeof labels] ?? ""])
    );
    return { error: locale === "ar" ? "تحقق من الحقول المعلّمة ثم أعد الإرسال." : "Please check the marked fields and submit again.", fieldErrors };
  }

  const email = parsed.data.email.toLowerCase();
  try {
    const requestHeaders = await headers();
    const forwardedFor = requestHeaders.get("x-forwarded-for")?.split(",").map((part) => part.trim()).filter(Boolean);
    const sourceIp = requestHeaders.get("cf-connecting-ip") || requestHeaders.get("x-real-ip") || forwardedFor?.[0] || null;
    const hmacKey = process.env.AUTH_SECRET || process.env.SESSION_SECRET || process.env.DATABASE_URL || "dineflow-contact-rate-limit";
    const sourceIpHash = sourceIp ? createHmac("sha256", hmacKey).update(sourceIp).digest("hex") : null;
    const emailHash = createHmac("sha256", hmacKey).update(email).digest("hex");
    const lockKeys = [
      ...(sourceIpHash ? [`marketing:ip:${sourceIpHash}`] : []),
      `marketing:email:${emailHash}`,
    ].sort();

    const outcome = await db.$transaction(async (tx) => {
      // Transaction-scoped advisory locks make each count-and-insert sequence atomic
      // across concurrent requests, without persisting raw IP addresses or extra buckets.
      for (const key of lockKeys) {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${key})) IS NULL AS locked`;
      }

      const now = new Date();
      if (sourceIpHash) {
        const recentIpRequests = await tx.marketingInquiry.count({
          where: { sourceIpHash, createdAt: { gte: new Date(now.getTime() - 15 * 60 * 1000) } },
        });
        if (recentIpRequests >= 5) return "ip-limited" as const;
      }

      const recentEmailRequests = await tx.marketingInquiry.count({
        where: { email, createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
      });
      if (recentEmailRequests >= 5) return "email-limited" as const;

      const recentDuplicate = await tx.marketingInquiry.findFirst({
        where: { email, createdAt: { gte: new Date(now.getTime() - 2 * 60 * 1000) } },
        select: { id: true },
      });
      if (recentDuplicate) return "duplicate" as const;

      await tx.marketingInquiry.create({
        data: {
          name: parsed.data.name,
          email,
          phone: parsed.data.phone || null,
          restaurantName: parsed.data.restaurantName || null,
          subject: parsed.data.subject,
          message: parsed.data.message,
          source: "contact-page",
          sourceIpHash,
        },
      });
      return "saved" as const;
    }, { maxWait: 5000, timeout: 10000 });

    if (outcome === "ip-limited") {
      return { error: locale === "ar" ? "وصلت إلى الحد المؤقت للإرسال. حاول مرة أخرى بعد قليل." : "You've reached the temporary submission limit. Please try again later." };
    }
    if (outcome === "email-limited") {
      return { error: locale === "ar" ? "وصلت إلى الحد اليومي لهذا البريد الإلكتروني." : "This email address has reached its daily submission limit." };
    }
    return { ok: true };
  } catch (error) {
    console.error("[marketing] Failed to save a contact inquiry", error);
    return { error: genericError };
  }
}

export async function markInquiryReviewed(formData: FormData): Promise<void> {
  await requirePlatformAdmin();
  const id = formData.get("id");
  if (typeof id !== "string" || id.length < 1 || id.length > 100) return;
  await db.marketingInquiry.update({ where: { id }, data: { status: "REVIEWED" } });
  revalidatePath("/admin/inquiries");
}
