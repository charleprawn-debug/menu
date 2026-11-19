import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Inbox, Mail, MessageSquareText, Store } from "lucide-react";
import { requirePlatformAdmin } from "@/lib/auth/context";
import { markInquiryReviewed } from "@/app/actions/marketing";
import { db } from "@/lib/db";
import { getI18n } from "@/i18n";
import { PageHeader } from "@/components/ui/layout-blocks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Contact inquiries",
  robots: { index: false, follow: false },
};

const subjects: Record<string, { ar: string; en: string }> = {
  general: { ar: "استفسار عام", en: "General enquiry" },
  demo: { ar: "طلب عرض", en: "Demo request" },
  pricing: { ar: "الأسعار", en: "Pricing" },
  enterprise: { ar: "المؤسسات", en: "Enterprise" },
  support: { ar: "الدعم", en: "Support" },
};

export default async function ContactInquiriesPage() {
  const platform = await requirePlatformAdmin(["support.view", "marketing.view"]);
  const { locale } = await getI18n();
  const ar = locale === "ar";
  const canViewSupport = platform.platformCapabilities.has("support.view");
  const canViewMarketing = platform.platformCapabilities.has("marketing.view");
  const inquiryWhere = canViewSupport && canViewMarketing
    ? {}
    : canViewSupport
      ? { subject: "support" }
      : { subject: { not: "support" } };
  const inquiries = await db.marketingInquiry.findMany({
    where: inquiryWhere,
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const newCount = inquiries.filter((item) => item.status === "NEW").length;
  const dateFormatter = new Intl.DateTimeFormat(ar ? "ar" : "en", { dateStyle: "medium", timeStyle: "short" });

  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      <PageHeader
        title={ar ? (canViewSupport && !canViewMarketing ? "استفسارات الدعم" : "استفسارات الموقع") : (canViewSupport && !canViewMarketing ? "Support inquiries" : "Website inquiries")}
        description={ar ? `رسائل نموذج التواصل — ${newCount} جديدة ضمن آخر ${inquiries.length} رسالة.` : `${newCount} new messages in the latest ${inquiries.length} contact submissions.`}
        actions={<Button asChild variant="outline" size="sm"><Link href="/admin">{ar ? "العودة للمنصة" : "Back to admin"}</Link></Button>}
      />
      {inquiries.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card p-12 text-center">
          <Inbox className="mx-auto size-8 text-muted-foreground" />
          <h2 className="mt-3 font-semibold">{ar ? "لا توجد رسائل بعد" : "No messages yet"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{ar ? "ستظهر هنا الرسائل المرسلة من صفحة التواصل." : "Messages submitted from the contact page will appear here."}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {inquiries.map((inquiry) => (
            <article key={inquiry.id} className="rounded-2xl border bg-card p-5 shadow-soft">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-bold">{inquiry.name}</h2>
                    <Badge variant={inquiry.status === "NEW" ? "default" : "muted"}>{inquiry.status === "NEW" ? (ar ? "جديدة" : "New") : inquiry.status === "REVIEWED" ? (ar ? "تمت المراجعة" : "Reviewed") : inquiry.status}</Badge>
                    <Badge variant="outline">{subjects[inquiry.subject]?.[locale] ?? inquiry.subject}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{dateFormatter.format(inquiry.createdAt)}</p>
                </div>
                <a href={`mailto:${encodeURIComponent(inquiry.email)}`} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/5">
                  <Mail className="size-3.5" /> {inquiry.email}
                </a>
              </div>
              {inquiry.status === "NEW" && (inquiry.subject === "support" ? platform.platformCapabilities.has("support.manage") : platform.platformCapabilities.has("marketing.manage")) ? (
                <form action={markInquiryReviewed} className="mt-3">
                  <input type="hidden" name="id" value={inquiry.id} />
                  <Button type="submit" size="sm" variant="ghost">{ar ? "وضع علامة تمت المراجعة" : "Mark as reviewed"}<ArrowRight className="size-3.5 rtl:rotate-180" /></Button>
                </form>
              ) : null}
              <div className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                {inquiry.restaurantName ? <p className="inline-flex items-center gap-1.5"><Store className="size-3.5" />{inquiry.restaurantName}</p> : null}
                {inquiry.phone ? <p>{ar ? "الهاتف:" : "Phone:"} <span dir="ltr">{inquiry.phone}</span></p> : null}
              </div>
              <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-muted/35 p-4 text-sm leading-relaxed">
                <MessageSquareText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <p className="whitespace-pre-wrap break-words">{inquiry.message}</p>
              </div>
            </article>
          ))}
          {inquiries.length === 100 ? <p className="py-3 text-center text-xs text-muted-foreground">{ar ? "يُعرض أحدث 100 استفسار. ستُضاف أدوات البحث والفرز في إدارة المنصة." : "Showing the latest 100 enquiries. Search and filtering are part of the platform-admin build."}</p> : null}
        </div>
      )}
    </main>
  );
}
