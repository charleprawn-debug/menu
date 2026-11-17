"use client";

import { useActionState, useEffect, useRef } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, LoaderCircle, Send } from "lucide-react";
import { submitMarketingInquiry, type ContactActionState } from "@/app/actions/marketing";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const initialState: ContactActionState = {};

export function ContactForm({ locale, initialSubject }: { locale: string; initialSubject?: string }) {
  const ar = locale === "ar";
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(submitMarketingInquiry, initialState);
  const subjects = [
    { value: "general", label: ar ? "استفسار عام" : "General enquiry" },
    { value: "demo", label: ar ? "طلب عرض" : "Request a demo" },
    { value: "pricing", label: ar ? "سؤال عن الأسعار" : "Pricing question" },
    { value: "enterprise", label: ar ? "حل للمؤسسات" : "Enterprise enquiry" },
    { value: "support", label: ar ? "دعم فني" : "Technical support" },
  ];
  const defaultSubject = subjects.some((item) => item.value === initialSubject) ? initialSubject : "general";

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  const errors = state.fieldErrors ?? {};
  const fieldClass = (field: string) => cn(
    "mt-1.5 h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15",
    errors[field] && "border-red-500 focus:border-red-500 focus:ring-red-500/10"
  );
  const labelClass = "text-sm font-semibold";

  return (
    <div>
      {state.ok ? (
        <div role="status" className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-300/60 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-100">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
          <div><p className="font-semibold">{ar ? "تم استلام رسالتك" : "Your message has been received"}</p><p className="mt-1 text-xs leading-relaxed opacity-80">{ar ? "سُجّل استفسارك في النظام. شكراً لمشاركة احتياجك مع فريق DineFlow." : "Your enquiry has been recorded. Thank you for sharing your needs with the DineFlow team."}</p></div>
        </div>
      ) : null}
      {state.error ? <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/20 dark:text-red-300">{state.error}</p> : null}

      <form ref={formRef} action={action} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="contact-name">{ar ? "الاسم الكامل" : "Full name"} <span className="text-red-500">*</span></label>
            <input id="contact-name" name="name" required minLength={2} maxLength={120} autoComplete="name" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "contact-name-error" : undefined} className={fieldClass("name")} />
            {errors.name ? <p id="contact-name-error" className="mt-1 text-xs text-red-600">{errors.name}</p> : null}
          </div>
          <div>
            <label className={labelClass} htmlFor="contact-email">{ar ? "البريد الإلكتروني" : "Email address"} <span className="text-red-500">*</span></label>
            <input id="contact-email" name="email" type="email" required maxLength={254} autoComplete="email" dir="ltr" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "contact-email-error" : undefined} className={cn(fieldClass("email"), "text-left")} />
            {errors.email ? <p id="contact-email-error" className="mt-1 text-xs text-red-600">{errors.email}</p> : null}
          </div>
          <div>
            <label className={labelClass} htmlFor="contact-phone">{ar ? "رقم الهاتف" : "Phone number"} <span className="font-normal text-muted-foreground">({ar ? "اختياري" : "optional"})</span></label>
            <input id="contact-phone" name="phone" type="tel" maxLength={40} autoComplete="tel" dir="ltr" className={cn(fieldClass("phone"), "text-left")} aria-invalid={Boolean(errors.phone)} />
            {errors.phone ? <p className="mt-1 text-xs text-red-600">{errors.phone}</p> : null}
          </div>
          <div>
            <label className={labelClass} htmlFor="contact-restaurant">{ar ? "اسم المطعم أو المنشأة" : "Restaurant or business name"} <span className="font-normal text-muted-foreground">({ar ? "اختياري" : "optional"})</span></label>
            <input id="contact-restaurant" name="restaurantName" maxLength={160} autoComplete="organization" className={fieldClass("restaurantName")} aria-invalid={Boolean(errors.restaurantName)} />
            {errors.restaurantName ? <p className="mt-1 text-xs text-red-600">{errors.restaurantName}</p> : null}
          </div>
        </div>

        <div>
          <label className={labelClass} htmlFor="contact-subject">{ar ? "موضوع الرسالة" : "What is this about?"}</label>
          <select id="contact-subject" name="subject" defaultValue={defaultSubject} required className={fieldClass("subject")} aria-invalid={Boolean(errors.subject)}>
            {subjects.map((subject) => <option key={subject.value} value={subject.value}>{subject.label}</option>)}
          </select>
        </div>

        <div>
          <label className={labelClass} htmlFor="contact-message">{ar ? "رسالتك" : "Your message"} <span className="text-red-500">*</span></label>
          <textarea id="contact-message" name="message" required minLength={10} maxLength={5000} rows={6} aria-invalid={Boolean(errors.message)} aria-describedby={errors.message ? "contact-message-error" : "contact-message-hint"} className={cn("mt-1.5 w-full resize-y rounded-xl border bg-background px-3 py-2.5 text-sm leading-relaxed outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15", errors.message && "border-red-500")} />
          {errors.message ? <p id="contact-message-error" className="mt-1 text-xs text-red-600">{errors.message}</p> : <p id="contact-message-hint" className="mt-1 text-xs text-muted-foreground">{ar ? "10 أحرف على الأقل، وبحد أقصى 5000 حرف." : "At least 10 characters, up to 5,000."}</p>}
        </div>

        <div className="absolute -left-[10000px] size-px overflow-hidden" aria-hidden="true">
          <label htmlFor="contact-website">Website</label>
          <input id="contact-website" name="website" tabIndex={-1} autoComplete="off" />
        </div>

        <p className="text-xs leading-relaxed text-muted-foreground">{ar ? "بإرسال النموذج، تستخدم معلوماتك لمعالجة استفسارك وفق" : "By submitting, you agree that we may use your information to handle your enquiry under our"} <a href="/privacy" className="font-semibold text-primary underline underline-offset-2">{ar ? "سياسة الخصوصية" : "Privacy Policy"}</a>.</p>
        <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
          {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
          {pending ? (ar ? "جارٍ الإرسال…" : "Sending…") : (ar ? "إرسال الرسالة" : "Send message")}
          {!pending ? (ar ? <ArrowLeft className="size-4" /> : <ArrowRight className="size-4" />) : null}
        </Button>
      </form>
    </div>
  );
}
