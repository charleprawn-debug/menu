import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRightLeft,
  BadgeCheck,
  CalendarClock,
  Check,
  CreditCard,
  FileText,
  HardDrive,
  Package,
  Printer,
  ReceiptText,
  Store,
  Users,
  Utensils,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";
import { requireRestaurant } from "@/lib/auth/context";
import { db } from "@/lib/db";
import { formatMoney, formatNumber } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { getI18n } from "@/i18n";
import {
  cancelScheduledPlanChangeAction,
  cancelSubscriptionAtPeriodEndAction,
  changeSubscriptionPlanAction,
  resumeSubscriptionAction,
} from "@/app/actions/subscription";

export const metadata: Metadata = { title: "Subscription | DineFlow" };

type Locale = "ar" | "en";
const tr = (locale: Locale, en: string, ar: string) => locale === "ar" ? ar : en;
const dateFormat = (date: Date | null | undefined, locale: Locale) => formatDate(date, locale);
const planLimit = (value: number | null, locale: Locale, enUnit: string, arUnit: string) =>
  value === null || value === -1
    ? tr(locale, `Unlimited ${enUnit}`, `غير محدود ${arUnit}`)
    : `${formatNumber(value, locale)} ${locale === "ar" ? arUnit : enUnit}`;

const notices: Record<string, [string, string]> = {
  "invalid-selection": ["Choose an active plan and a valid billing cycle.", "اختر باقة فعّالة ودورة فوترة صحيحة."],
  "cancellation-scheduled": ["Your cancellation request is recorded for period end. Local subscriptions are processed by the protected lifecycle job; provider-linked subscriptions follow verified provider events.", "تم تسجيل طلب الإلغاء لنهاية الفترة. تُعالج الاشتراكات المحلية عبر مهمة دورة الحياة المحمية، وتتبع الاشتراكات المرتبطة بمزود أحداثاً موثقة منه."],
  "trial-plan-updated": ["Your trial plan and billing cycle were updated. No charge was made.", "تم تحديث باقة التجربة ودورة الفوترة. لم يتم تحصيل أي مبلغ."],
  "subscription-not-active": ["This subscription cannot be changed right now.", "لا يمكن تغيير هذا الاشتراك حالياً."],
  "same-plan": ["That plan and billing cycle are already selected.", "هذه الباقة ودورة الفوترة محددتان بالفعل."],
  "change-already-scheduled": ["A plan change is already scheduled. Cancel it before choosing another.", "يوجد تغيير باقة مجدول بالفعل. ألغِه قبل اختيار تغيير آخر."],
  "plan-change-scheduled": ["Your plan-change request is recorded for the current period end. Local requests are not activated without verified provider confirmation.", "تم تسجيل طلب تغيير الباقة لنهاية الفترة الحالية. لا تُفعّل الطلبات المحلية دون تأكيد موثوق من مزود الدفع."],
  "plan-change-cancelled": ["The scheduled plan change was cancelled.", "تم إلغاء تغيير الباقة المجدول."],
  "renewal-resumed": ["The cancellation request was cleared. Current access and billing status are unchanged.", "تم إلغاء طلب الإلغاء. لم تتغير صلاحية الوصول أو حالة الفوترة الحالية."],
  "billing-unavailable": ["Billing actions are unavailable until an approved provider adapter is enabled.", "إجراءات الفوترة غير متاحة حتى تفعيل تكامل مزود دفع معتمد."],
};

function statusText(status: string, locale: Locale) {
  const labels: Record<string, [string, string]> = {
    TRIALING: ["Trial", "تجربة"], ACTIVE: ["Active", "نشط"], PAST_DUE: ["Past due", "متأخر السداد"],
    PAUSED: ["Paused", "متوقف مؤقتاً"], CANCELLED: ["Cancelled", "ملغى"], EXPIRED: ["Expired", "منتهي"],
    DRAFT: ["Draft", "مسودة"], ISSUED: ["Issued", "صادرة"], PARTIALLY_PAID: ["Partially paid", "مدفوعة جزئياً"],
    PAID: ["Paid", "مدفوعة"], VOID: ["Void", "ملغاة"], REFUNDED: ["Refunded", "مستردة"],
  };
  const label = labels[status];
  return label ? tr(locale, label[0], label[1]) : status;
}

export default async function SubscriptionPage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const [membership, { locale }, params] = await Promise.all([
    requireRestaurant(),
    getI18n(),
    searchParams,
  ]);
  if (!membership.isOwner && !membership.permissions.has("subscription.view") && !membership.permissions.has("subscription.manage")) {
    redirect("/app/forbidden");
  }
  const restaurantId = membership.restaurantId;
  const ar = locale === "ar";
  const canManage = membership.isOwner || membership.permissions.has("subscription.manage");
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [subscription, plans, usage, invoices] = await Promise.all([
    db.subscription.findFirst({
      where: { restaurantId, restaurant: { deletedAt: null } },
      include: {
        plan: { include: { features: { where: { enabled: true, feature: { isActive: true } }, include: { feature: true } } } },
        planChanges: {
          where: { status: { in: ["SCHEDULED", "AWAITING_PROVIDER", "PENDING_PROVIDER"] } },
          include: { fromPlan: true, toPlan: true },
          orderBy: { effectiveAt: "asc" },
          take: 1,
        },
      },
    }),
    db.plan.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { monthlyPrice: "asc" }],
      include: { features: { where: { enabled: true, feature: { isActive: true } }, include: { feature: true } } },
    }),
    Promise.all([
      db.restaurantMember.count({ where: { restaurantId, status: "ACTIVE" } }),
      db.branch.count({ where: { restaurantId, isActive: true } }),
      db.product.count({ where: { restaurantId, deletedAt: null } }),
      db.table.count({ where: { restaurantId, isActive: true } }),
      db.order.count({ where: { restaurantId, createdAt: { gte: monthStart } } }),
      db.restaurantMedia.aggregate({ where: { restaurantId }, _sum: { sizeBytes: true } }),
    ]),
    db.subscriptionInvoice.findMany({
      where: { subscription: { restaurantId } },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
  ]);
  const [staffCount, branchCount, productCount, tableCount, orderCount, storageAgg] = usage;
  const storageMb = (storageAgg._sum.sizeBytes ?? 0) / (1024 * 1024);
  const scheduledChange = subscription?.planChanges[0];
  const notice = params.notice ? notices[params.notice] : undefined;

  const usageItems = subscription ? [
    { label: tr(locale, "Team members", "أعضاء الفريق"), count: staffCount, limit: subscription.plan.maxStaff, icon: Users },
    { label: tr(locale, "Branches", "الفروع"), count: branchCount, limit: subscription.plan.maxBranches, icon: Store },
    { label: tr(locale, "Products", "المنتجات"), count: productCount, limit: subscription.plan.maxProducts, icon: Package },
    { label: tr(locale, "Tables", "الطاولات"), count: tableCount, limit: subscription.plan.maxTables, icon: Utensils },
    { label: tr(locale, "Orders this month", "طلبات هذا الشهر"), count: orderCount, limit: subscription.plan.maxOrdersPerMonth, icon: ReceiptText },
    { label: tr(locale, "Media storage", "مساحة تخزين الوسائط"), count: storageMb, limit: subscription.plan.storageMb, icon: HardDrive, storage: true },
  ] : [];

  return (
    <div className="space-y-5 pb-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">DineFlow</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">{tr(locale, "Subscription", "الاشتراك")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{tr(locale, "Manage your plan, billing cycle, usage and invoices.", "إدارة الباقة ودورة الفوترة والاستخدام والفواتير.")}</p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-xl border bg-card px-3 py-2 text-xs text-muted-foreground">
          <CreditCard className="size-4 text-primary" />
          {tr(locale, "Checkout and portal are unavailable until an approved provider adapter is enabled.", "الدفع وبوابة العميل غير متاحين حتى تفعيل تكامل مزود دفع معتمد.")}
        </div>
      </header>

      {notice && <div role="status" className="flex gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm text-primary">
        <BadgeCheck className="mt-0.5 size-4 shrink-0" />{tr(locale, notice[0], notice[1])}
      </div>}

      {!subscription ? (
        <section className="rounded-2xl border bg-card p-6 text-center shadow-soft">
          <AlertCircle className="mx-auto size-8 text-muted-foreground" />
          <h2 className="mt-3 font-semibold">{tr(locale, "No subscription is attached to this restaurant", "لا يوجد اشتراك مرتبط بهذا المطعم")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{tr(locale, "Contact your restaurant owner to review available plans.", "تواصل مع مالك المطعم لمراجعة الباقات المتاحة.")}</p>
        </section>
      ) : (
        <>
          <section className="grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
            <div className="relative overflow-hidden rounded-2xl border bg-card p-5 shadow-soft sm:p-6">
              <div className="pointer-events-none absolute -end-8 -top-12 size-44 rounded-full bg-primary/5 blur-2xl" />
              <div className="relative flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-bold">{ar ? subscription.plan.name : subscription.plan.nameEn || subscription.plan.name}</h2>
                    <Badge variant={subscription.status === "ACTIVE" ? "success" : subscription.status === "TRIALING" ? "warning" : "secondary"}>
                      {statusText(subscription.status, locale)}
                    </Badge>
                    {subscription.cancelAtPeriodEnd && <Badge variant="destructive">{tr(locale, "Cancellation requested", "طلب الإلغاء مسجّل")}</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{ar ? subscription.plan.description : subscription.plan.descriptionEn || subscription.plan.description}</p>
                </div>
                <div className="text-start sm:text-end">
                  <p className="text-xs text-muted-foreground">{tr(locale, "Current billing price", "سعر الفوترة الحالي")}</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums" dir="ltr">
                    {formatMoney(subscription.billingCycle === "YEARLY" ? subscription.plan.yearlyPrice : subscription.plan.monthlyPrice, subscription.plan.currency, locale)}
                  </p>
                  <p className="text-xs text-muted-foreground">{tr(locale, subscription.billingCycle === "YEARLY" ? "per year" : "per month", subscription.billingCycle === "YEARLY" ? "سنوياً" : "شهرياً")}</p>
                </div>
              </div>
              <div className="relative mt-5 grid gap-3 border-t pt-4 text-sm sm:grid-cols-3">
                <div><p className="text-xs text-muted-foreground">{tr(locale, "Period starts", "بداية الفترة")}</p><p className="mt-1 font-medium">{dateFormat(subscription.currentPeriodStart, locale)}</p></div>
                <div><p className="text-xs text-muted-foreground">{tr(locale, "Period ends", "نهاية الفترة")}</p><p className="mt-1 font-medium">{dateFormat(subscription.currentPeriodEnd, locale)}</p></div>
                <div><p className="text-xs text-muted-foreground">{tr(locale, "Trial ends", "نهاية الفترة التجريبية")}</p><p className="mt-1 font-medium">{subscription.trialEndsAt ? dateFormat(subscription.trialEndsAt, locale) : "—"}</p></div>
              </div>
              <div className="relative mt-4 rounded-xl border border-amber-300/50 bg-amber-50/70 p-3 text-xs leading-5 text-amber-950 dark:bg-amber-950/20 dark:text-amber-100">
                <div className="flex gap-2"><AlertCircle className="mt-0.5 size-4 shrink-0" /><p>{tr(locale, "Checkout, customer portal and automatic renewal are unavailable until a provider adapter is registered and enabled. Invoices are records only; no payment is taken here.", "الدفع وبوابة العميل والتجديد التلقائي غير متاحة حتى تسجيل تكامل مزود وتفعيله. الفواتير سجلات فقط؛ لا يتم تحصيل أي دفعة هنا.")}</p></div>
              </div>
            </div>

            <div className="rounded-2xl border bg-card p-5 shadow-soft">
              <div className="flex items-center gap-2"><CalendarClock className="size-4 text-primary" /><h2 className="font-semibold">{tr(locale, "Renewal controls", "إعدادات التجديد")}</h2></div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {subscription.cancelAtPeriodEnd
                  ? tr(locale, "Cancellation is recorded for period end. Local subscriptions are finalized by the protected lifecycle job; provider-linked subscriptions follow verified provider events.", "تم تسجيل الإلغاء لنهاية الفترة. تُنهى الاشتراكات المحلية عبر مهمة دورة الحياة المحمية، وتتبع الاشتراكات المرتبطة بمزود أحداثاً موثقة منه.")
                  : tr(locale, "You can record a cancellation request for period end. It does not issue a refund or collect a payment; local lifecycle processing is timestamp-based.", "يمكنك تسجيل طلب إلغاء لنهاية الفترة. لا ينتج عنه استرداد أو تحصيل؛ وتعتمد معالجة الاشتراك المحلي على التواريخ.")}
              </p>
              {canManage && <div className="mt-4 flex flex-wrap gap-2">
                {subscription.cancelAtPeriodEnd ? (
                  <form action={resumeSubscriptionAction}><Button type="submit" variant="outline" size="sm">{tr(locale, "Keep subscription active", "الإبقاء على الاشتراك فعالاً")}</Button></form>
                ) : subscription.status === "ACTIVE" || subscription.status === "TRIALING" ? (
                  <form action={cancelSubscriptionAtPeriodEndAction}><Button type="submit" variant="outline" size="sm">{tr(locale, "Cancel at period end", "الإلغاء في نهاية الفترة")}</Button></form>
                ) : null}
              </div>}
              {canManage && <p className="mt-3 text-xs text-muted-foreground">{tr(locale, "No renewal invoice or charge is created automatically.", "لا تُنشأ فاتورة تجديد أو عملية تحصيل تلقائياً.")}</p>}
            </div>
          </section>

          <section className="rounded-2xl border bg-card p-5 shadow-soft sm:p-6">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div><h2 className="font-semibold">{tr(locale, "Current usage", "الاستخدام الحالي")}</h2><p className="mt-1 text-xs text-muted-foreground">{tr(locale, "Measured against the current plan. Orders are counted from the start of this calendar month.", "مقاس وفق الباقة الحالية. تُحتسب الطلبات منذ بداية هذا الشهر الميلادي.")}</p></div>
              <span className="rounded-lg bg-muted px-2 py-1 text-[11px] text-muted-foreground">{tr(locale, "Plan limits", "حدود الباقة")}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {usageItems.map(({ label, count, limit, icon: Icon, storage }) => {
                const currentLimit = limit === -1 ? null : limit;
                const progress = currentLimit === null ? 0 : Math.min(100, currentLimit === 0 ? (count > 0 ? 100 : 0) : count / currentLimit * 100);
                const shownCount = storage ? `${formatNumber(Number(count.toFixed(1)), locale)} MB` : formatNumber(count, locale);
                const shownLimit = currentLimit === null ? tr(locale, "No set limit", "بلا حد محدد") : storage ? `${formatNumber(currentLimit, locale)} MB` : formatNumber(currentLimit, locale);
                return <div key={label} className="rounded-xl border bg-background/60 p-3.5">
                  <div className="flex items-center justify-between gap-2"><span className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground"><Icon className="size-4" />{label}</span><span className="text-sm font-semibold tabular-nums">{shownCount}<span className="font-normal text-muted-foreground"> / {shownLimit}</span></span></div>
                  {currentLimit !== null && <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} /></div>}
                </div>;
              })}
            </div>
          </section>

          {scheduledChange && <section className="flex flex-col gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3"><ArrowRightLeft className="mt-0.5 size-5 shrink-0 text-primary" /><div>
              <h2 className="text-sm font-semibold">{scheduledChange.status === "PENDING_PROVIDER" ? tr(locale, "Provider synchronization pending", "مزامنة مزود الدفع معلّقة") : tr(locale, "Plan change scheduled", "تغيير الباقة مجدول")}</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{tr(locale, `Request to change from ${scheduledChange.fromPlan.nameEn || scheduledChange.fromPlan.name} to ${scheduledChange.toPlan.nameEn || scheduledChange.toPlan.name} recorded for ${dateFormat(scheduledChange.effectiveAt, locale)}. ${scheduledChange.status === "PENDING_PROVIDER" ? "The request is saved safely; the current plan remains active. Retry synchronization or cancel the request." : scheduledChange.status === "AWAITING_PROVIDER" ? "It remains pending verified provider confirmation; the current plan is unchanged." : "No local paid-plan activation occurs automatically."}`, `تم تسجيل طلب التغيير من ${scheduledChange.fromPlan.name} إلى ${scheduledChange.toPlan.name} بتاريخ ${dateFormat(scheduledChange.effectiveAt, locale)}. ${scheduledChange.status === "PENDING_PROVIDER" ? "حُفظ الطلب بأمان؛ وتبقى الباقة الحالية فعالة. أعد محاولة المزامنة أو ألغِ الطلب." : scheduledChange.status === "AWAITING_PROVIDER" ? "ما زال بانتظار تأكيد موثوق من مزود الدفع؛ ولم تتغير الباقة الحالية." : "لا يتم تفعيل باقة مدفوعة محلياً تلقائياً."}`)}</p>
            </div></div>
            {canManage && scheduledChange.status === "PENDING_PROVIDER" && <form action={changeSubscriptionPlanAction}>
              <input type="hidden" name="planId" value={scheduledChange.toPlanId} />
              <input type="hidden" name="billingCycle" value={scheduledChange.billingCycle} />
              <Button type="submit" variant="outline" size="sm">{tr(locale, "Retry provider sync", "إعادة محاولة المزامنة")}</Button>
            </form>}
            {canManage && <form action={cancelScheduledPlanChangeAction}><Button type="submit" variant="outline" size="sm">{tr(locale, "Cancel scheduled change", "إلغاء التغيير المجدول")}</Button></form>}
          </section>}

          {canManage && !scheduledChange && (subscription.status === "TRIALING" || subscription.status === "ACTIVE") && !subscription.cancelAtPeriodEnd && <section className="rounded-2xl border bg-card p-5 shadow-soft sm:p-6">
            <div className="mb-4 flex items-start gap-3"><div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><ArrowRightLeft className="size-4" /></div><div><h2 className="font-semibold">{tr(locale, "Change plan", "تغيير الباقة")}</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">{subscription.status === "TRIALING" ? tr(locale, "During a local trial, the selected plan and billing cycle take effect immediately with no charge.", "أثناء التجربة المحلية، تسري الباقة ودورة الفوترة المحددتان فوراً دون تحصيل مبلغ.") : tr(locale, "For an active subscription, the request is recorded for the end of the current period. No proration, early charge or automatic local paid-plan activation occurs.", "للاشتراك النشط، يُسجّل الطلب لنهاية الفترة الحالية. لا يوجد احتساب نسبي أو تحصيل مبكر أو تفعيل تلقائي محلي لباقة مدفوعة.")}</p></div></div>
            <form action={changeSubscriptionPlanAction} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px_auto] sm:items-end">
              <label className="grid gap-1.5 text-xs font-medium">{tr(locale, "Available plan", "الباقة المتاحة")}
                <select name="planId" required defaultValue={subscription.planId} className="h-10 rounded-xl border border-input bg-background px-3 text-sm">
                  {plans.map((plan) => <option key={plan.id} value={plan.id}>{ar ? plan.name : plan.nameEn || plan.name}</option>)}
                </select>
              </label>
              <label className="grid gap-1.5 text-xs font-medium">{tr(locale, "Billing cycle", "دورة الفوترة")}
                <select name="billingCycle" required defaultValue={subscription.billingCycle} className="h-10 rounded-xl border border-input bg-background px-3 text-sm">
                  <option value="MONTHLY">{tr(locale, "Monthly", "شهري")}</option><option value="YEARLY">{tr(locale, "Yearly", "سنوي")}</option>
                </select>
              </label>
              <Button type="submit" className="w-full sm:w-auto">{tr(locale, "Confirm plan-change request", "تأكيد طلب تغيير الباقة")}</Button>
            </form>
          </section>}
        </>
      )}

      <section className="rounded-2xl border bg-card p-5 shadow-soft sm:p-6">
        <div className="mb-4 flex items-end justify-between gap-3"><div><h2 className="font-semibold">{tr(locale, "Available plans", "الباقات المتاحة")}</h2><p className="mt-1 text-xs text-muted-foreground">{tr(locale, "Configured active plans and their included features.", "الباقات الفعّالة المُعدة والميزات المشمولة فيها.")}</p></div><Badge variant="secondary">{formatNumber(plans.length, locale)} {tr(locale, "plans", "باقات")}</Badge></div>
        {plans.length === 0 ? <p className="py-5 text-center text-sm text-muted-foreground">{tr(locale, "No active plans are configured.", "لا توجد باقات فعّالة مُعدة.")}</p> : <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent = subscription?.planId === plan.id;
            return <article key={plan.id} className={`rounded-2xl border p-4 ${isCurrent ? "border-primary/40 bg-primary/[0.025]" : "bg-background/50"}`}>
              <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{ar ? plan.name : plan.nameEn || plan.name}</h3><p className="mt-1 text-xs text-muted-foreground">{ar ? plan.description : plan.descriptionEn || plan.description}</p></div>{isCurrent && <Badge variant="success">{tr(locale, "Current", "الحالية")}</Badge>}</div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-muted/60 p-3"><p className="text-[11px] text-muted-foreground">{tr(locale, "Monthly", "شهري")}</p><p className="mt-1 text-sm font-bold" dir="ltr">{formatMoney(plan.monthlyPrice, plan.currency, locale)}</p></div>
                <div className="rounded-xl bg-muted/60 p-3"><p className="text-[11px] text-muted-foreground">{tr(locale, "Yearly", "سنوي")}</p><p className="mt-1 text-sm font-bold" dir="ltr">{formatMoney(plan.yearlyPrice, plan.currency, locale)}</p></div>
              </div>
              <div className="mt-4 border-t pt-3"><p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{tr(locale, "Included features", "الميزات المشمولة")}</p>
                {plan.features.length === 0 ? <p className="text-xs text-muted-foreground">{tr(locale, "No included features listed.", "لا توجد ميزات مدرجة.")}</p> : <ul className="grid gap-2 sm:grid-cols-2">{plan.features.map((item) => <li key={item.featureId} className="flex items-start gap-2 text-xs"><Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600" /><span>{ar ? item.feature.nameAr : item.feature.nameEn}{item.limitValue !== null && <span className="ms-1 text-muted-foreground">· {formatNumber(item.limitValue, locale)}</span>}</span></li>)}</ul>}
              </div>
              <p className="mt-3 border-t pt-3 text-[11px] text-muted-foreground">{planLimit(plan.maxStaff, locale, "team members", "أعضاء فريق")} · {planLimit(plan.maxBranches, locale, "branches", "فروع")} · {planLimit(plan.maxProducts, locale, "products", "منتجات")} · {planLimit(plan.maxTables, locale, "tables", "طاولات")}{plan.maxOrdersPerMonth === null || plan.maxOrdersPerMonth === -1 ? "" : ` · ${planLimit(plan.maxOrdersPerMonth, locale, "orders/month", "طلب/شهر")}`} · {planLimit(plan.storageMb, locale, "MB media", "ميغابايت وسائط")}</p>
            </article>;
          })}
        </div>}
      </section>

      <section className="overflow-hidden rounded-2xl border bg-card shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5"><div className="flex items-center gap-2"><FileText className="size-4 text-primary" /><div><h2 className="font-semibold">{tr(locale, "Invoices", "الفواتير")}</h2><p className="mt-1 text-xs text-muted-foreground">{tr(locale, "Issued subscription invoices and their billing periods.", "فواتير الاشتراك الصادرة وفترات الفوترة الخاصة بها.")}</p></div></div><span className="text-xs text-muted-foreground">{tr(locale, "Most recent", "الأحدث")}: {formatNumber(invoices.length, locale)}</span></div>
        {invoices.length === 0 ? <div className="p-8 text-center"><ReceiptText className="mx-auto size-7 text-muted-foreground/60" /><p className="mt-2 text-sm text-muted-foreground">{tr(locale, "No invoices yet.", "لا توجد فواتير بعد.")}</p></div> : <div className="divide-y">
          {invoices.map((invoice) => <div key={invoice.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs font-semibold" dir="ltr">{invoice.providerInvoiceNumber || invoice.number}</span><Badge variant={invoice.status === "PAID" ? "success" : invoice.status === "ISSUED" ? "warning" : "secondary"}>{statusText(invoice.status, locale)}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{tr(locale, "Issued", "تاريخ الإصدار")} {dateFormat(invoice.createdAt, locale)} · {dateFormat(invoice.periodStart, locale)} – {dateFormat(invoice.periodEnd, locale)}</p></div>
            <div className="flex items-center justify-between gap-3 sm:justify-end"><span className="text-sm font-bold tabular-nums" dir="ltr">{formatMoney(invoice.amount, invoice.currency, locale)}</span><Button asChild size="sm" variant="outline"><Link href={`/app/subscription/invoices/${invoice.id}`}><Printer />{tr(locale, "View / print", "عرض / طباعة")}</Link></Button></div>
          </div>)}
        </div>}
      </section>
      <p className="flex items-center justify-center gap-2 px-2 text-center text-[11px] text-muted-foreground"><CreditCard className="size-3.5" />{tr(locale, "No payment is marked successful or collected through this page.", "لا يتم تسجيل أي دفعة كناجحة أو تحصيلها من خلال هذه الصفحة.")}</p>
    </div>
  );
}
