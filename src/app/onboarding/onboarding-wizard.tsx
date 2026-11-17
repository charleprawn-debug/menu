"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { AlertCircle, ArrowLeft, ArrowRight, Check, CheckCircle2, Clock3, Download, ImagePlus, Loader2, Palette, Printer, Rocket, Store, Upload, UtensilsCrossed, X } from "lucide-react";
import { saveOnboardingStep, uploadOnboardingMedia, removeOnboardingMedia, launchOnboardingRestaurant } from "@/app/actions/onboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/layout-blocks";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Day = { day: string; closed: boolean; open: string; close: string };
type Table = { id: string; name: string; number: string; token: string; url: string };
export type WizardInitialData = {
  restaurantId: string;
  slug: string;
  step: number;
  basics: { name: string; legalName: string; description: string; cuisineType: string; country: string; city: string; address: string; phone: string; email: string; currency: string; timezone: string; locale: string };
  theme: { primaryColor: string; secondaryColor: string; fontFamily: string; menuLayout: string };
  logoUrl: string | null;
  coverUrl: string | null;
  hasLogo: boolean;
  template: string;
  categoryAr: string;
  categoryEn: string;
  productAr: string;
  productEn: string;
  productDescription: string;
  price: string;
  tableCount: number;
  tablePrefix: string;
  seats: number;
  tables: Table[];
  services: { dineIn: boolean; pickup: boolean; delivery: boolean; waiterCall: boolean; paymentMethods: string[]; openingHours: Day[] };
  maxTables: number;
};
type Checklist = { basics: boolean; logo: boolean; menu: boolean; table: boolean; settings: boolean };
type Locale = "ar" | "en";

const t = (locale: Locale, ar: string, en: string) => locale === "ar" ? ar : en;
const stepNames = (locale: Locale) => [t(locale, "الأساسيات", "Basics"), t(locale, "الهوية", "Brand"), t(locale, "المنيو", "Menu"), t(locale, "الطاولات", "Tables"), t(locale, "التشغيل", "Operations"), t(locale, "الإطلاق", "Launch")];
const currencies = ["SAR", "AED", "USD", "EUR", "EGP", "JOD", "KWD", "QAR", "BHD", "OMR", "MAD", "TND", "DZD", "IQD", "TRY", "GBP"];
const timezoneOptions = ["Asia/Riyadh", "Asia/Dubai", "Asia/Amman", "Asia/Beirut", "Africa/Cairo", "Africa/Casablanca", "Europe/Istanbul", "Europe/London", "UTC"];
const dayNames: Record<string, [string, string]> = { sun: ["الأحد", "Sunday"], mon: ["الإثنين", "Monday"], tue: ["الثلاثاء", "Tuesday"], wed: ["الأربعاء", "Wednesday"], thu: ["الخميس", "Thursday"], fri: ["الجمعة", "Friday"], sat: ["السبت", "Saturday"] };
const paymentOptions = [
  ["CASH", "نقداً", "Cash"], ["CARD", "بطاقة", "Card"], ["ONLINE", "دفع إلكتروني", "Online payment"],
  ["WALLET", "محفظة رقمية", "Digital wallet"], ["BANK_TRANSFER", "تحويل بنكي", "Bank transfer"],
  ["PAY_AT_PICKUP", "الدفع عند الاستلام", "Pay at pickup"], ["PAY_ON_DELIVERY", "الدفع عند التوصيل", "Pay on delivery"],
] as const;
type MenuTemplate = "classic" | "modern" | "cafe" | "minimal";
const menuTemplateStyles: Record<MenuTemplate, { surface: string; accent: string; border: string; layout: "grid" | "list" | "editorial" }> = {
  classic: { surface: "#faf7f2", accent: "#9a3412", border: "#fed7aa", layout: "grid" },
  modern: { surface: "#eef2ff", accent: "#4f46e5", border: "#c7d2fe", layout: "editorial" },
  cafe: { surface: "#fef3c7", accent: "#92400e", border: "#fde68a", layout: "list" },
  minimal: { surface: "#f1f5f9", accent: "#334155", border: "#cbd5e1", layout: "grid" },
};
const safeHref = (value: string) => value.startsWith("/") ? value : "/";

function StepCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <section className="rounded-2xl border bg-card p-4 shadow-soft sm:p-7"><div className="mb-6"><h2 className="text-xl font-bold tracking-tight">{title}</h2><p className="mt-1.5 text-sm leading-6 text-muted-foreground">{description}</p></div>{children}</section>;
}

export function OnboardingWizard({ locale, dir, initial, initialChecklist }: { locale: Locale; dir: "rtl" | "ltr"; initial: WizardInitialData; initialChecklist: Checklist }) {
  const router = useRouter();
  const [step, setStep] = useState(initial.step);
  const [basics, setBasics] = useState(initial.basics);
  const [theme, setTheme] = useState(initial.theme);
  const [logoUrl, setLogoUrl] = useState(initial.logoUrl);
  const [coverUrl, setCoverUrl] = useState(initial.coverUrl);
  const [template, setTemplate] = useState(initial.template);
  const [categoryAr, setCategoryAr] = useState(initial.categoryAr);
  const [categoryEn, setCategoryEn] = useState(initial.categoryEn);
  const [productAr, setProductAr] = useState(initial.productAr);
  const [productEn, setProductEn] = useState(initial.productEn);
  const [productDescription, setProductDescription] = useState(initial.productDescription);
  const [price, setPrice] = useState(initial.price);
  const [tableCount, setTableCount] = useState(String(initial.tableCount));
  const [tablePrefix, setTablePrefix] = useState(initial.tablePrefix);
  const [seats, setSeats] = useState(String(initial.seats));
  const [tables, setTables] = useState(initial.tables);
  const [services, setServices] = useState(initial.services);
  const [checklist, setChecklist] = useState(initialChecklist);
  const [saving, setSaving] = useState(false);
  const [dirtySteps, setDirtySteps] = useState<Set<number>>(() => new Set());
  const [hasServerAck, setHasServerAck] = useState(false);
  const [uploading, setUploading] = useState<"logo" | "cover" | null>(null);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [qrImages, setQrImages] = useState<Record<string, string>>({});

  useEffect(() => setChecklist(initialChecklist), [initialChecklist]);
  useEffect(() => setTables(initial.tables), [initial.tables]);
  useEffect(() => {
    let cancelled = false;
    Promise.all(tables.filter((table) => table.token).map(async (table) => {
      try {
        const href = safeHref(table.url);
        const url = await QRCode.toDataURL(`${window.location.origin}${href}`, { width: 240, margin: 1, errorCorrectionLevel: "M" });
        return [table.id, url] as const;
      } catch {
        return [table.id, ""] as const;
      }
    })).then((items) => { if (!cancelled) setQrImages(Object.fromEntries(items)); });
    return () => { cancelled = true; };
  }, [tables]);

  const progress = useMemo(() => stepNames(locale), [locale]);
  const markDirty = (dirtyStep: number) => setDirtySteps((current) => new Set(current).add(dirtyStep));
  const markSaved = (savedStep: number) => {
    setDirtySteps((current) => { const next = new Set(current); next.delete(savedStep); return next; });
    setHasServerAck(true);
  };
  const updateBasics = (key: keyof typeof basics, value: string) => { markDirty(1); setBasics((current) => ({ ...current, [key]: value })); };
  const updateTheme = (key: keyof typeof theme, value: string) => { markDirty(2); setTheme((current) => ({ ...current, [key]: value })); };
  const updateService = (key: "dineIn" | "pickup" | "delivery" | "waiterCall", value: boolean) => { markDirty(5); setServices((current) => ({ ...current, [key]: value })); };

  async function refreshChecklist() {
    router.refresh();
  }

  async function submitStep(event: FormEvent<HTMLFormElement>, currentStep: number) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const intent = submitter instanceof HTMLButtonElement ? submitter.value : "draft";
    data.set("step", String(currentStep));
    data.set("intent", intent || "draft");
    setSaving(true); setError(""); setFieldErrors({});
    const result = await saveOnboardingStep(data);
    setSaving(false);
    if (!result.ok) { setError(result.error || t(locale, "تعذر حفظ التغييرات.", "We couldn't save your changes.")); setFieldErrors(result.fieldErrors || {}); return; }
    markSaved(currentStep);
    if (typeof result.step === "number") setStep(result.step);
    await refreshChecklist();
  }

  async function moveTo(target: number) {
    if (target === step) return;
    const formData = new FormData();
    formData.set("step", String(Math.min(step, 5)));
    formData.set("intent", "return");
    formData.set("targetStep", String(target));
    setSaving(true); setError("");
    const result = await saveOnboardingStep(formData);
    setSaving(false);
    if (!result.ok) { setError(result.error || t(locale, "تعذر تغيير الخطوة.", "Couldn't change step.")); return; }
    if (dirtySteps.size === 0) setHasServerAck(true);
    setStep(target);
    router.refresh();
  }

  async function handleMedia(event: ChangeEvent<HTMLInputElement>, kind: "logo" | "cover") {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const data = new FormData(); data.set("kind", kind); data.set("file", file);
    setUploading(kind); setError("");
    const result = await uploadOnboardingMedia(data);
    setUploading(null);
    if (!result.ok || !result.mediaUrl) { setError(result.error || t(locale, "تعذر رفع الصورة.", "Image upload failed.")); return; }
    if (dirtySteps.size === 0) setHasServerAck(true);
    if (kind === "logo") setLogoUrl(result.mediaUrl); else setCoverUrl(result.mediaUrl);
    await refreshChecklist();
  }

  async function removeMedia(kind: "logo" | "cover") {
    const data = new FormData(); data.set("kind", kind);
    setUploading(kind); setError("");
    const result = await removeOnboardingMedia(data);
    setUploading(null);
    if (!result.ok) { setError(result.error || t(locale, "تعذر إزالة الصورة.", "Couldn't remove the image.")); return; }
    if (dirtySteps.size === 0) setHasServerAck(true);
    if (kind === "logo") setLogoUrl(null); else setCoverUrl(null);
    await refreshChecklist();
  }

  async function launch() {
    setSaving(true); setError("");
    const data = new FormData(); data.set("confirmation", "launch");
    const result = await launchOnboardingRestaurant(data);
    setSaving(false);
    if (!result.ok) { setError(result.error || t(locale, "أكمل قائمة الإطلاق أولاً.", "Complete the launch checklist first.")); await refreshChecklist(); return; }
    router.push(result.destination || "/app/dashboard");
  }

  async function saveLaunchDraft() {
    const data = new FormData(); data.set("step", "6"); data.set("intent", "draft");
    setSaving(true); setError("");
    const result = await saveOnboardingStep(data);
    setSaving(false);
    if (!result.ok) { setError(result.error || t(locale, "تعذر حفظ المسودة.", "Couldn't save the draft.")); return; }
    if (dirtySteps.size === 0) setHasServerAck(true);
    setStep(6);
    router.refresh();
  }

  const checklistItems: [keyof Checklist, string][] = [
    ["basics", t(locale, "معلومات المطعم الأساسية مكتملة", "Required restaurant basics are complete")],
    ["logo", t(locale, "تم رفع شعار المطعم", "Restaurant logo uploaded")],
    ["menu", t(locale, "منيو يضم تصنيفاً ظاهراً ومنتجاً بسعر", "Menu has a visible category and priced product")],
    ["table", t(locale, "تم إنشاء طاولة ورمز QR خاص بها", "A table and its QR code are ready")],
    ["settings", t(locale, "تم حفظ خيارات الخدمة والدفع وساعات العمل", "Service, payment, and opening-hour settings are saved")],
  ];
  const activeMenuStyle = menuTemplateStyles[template as MenuTemplate] || menuTemplateStyles.classic;
  const previewCategory = locale === "ar" ? categoryAr || categoryEn : categoryEn || categoryAr;
  const previewProduct = locale === "ar" ? productAr || productEn : productEn || productAr;
  const numericPrice = Number(price);
  const previewPrice = Number.isFinite(numericPrice)
    ? new Intl.NumberFormat(locale, { style: "currency", currency: basics.currency, maximumFractionDigits: 2 }).format(numericPrice)
    : `${price} ${basics.currency}`;
  return (
    <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start">
      <aside className="space-y-4 lg:sticky lg:top-6">
        <div className="rounded-2xl border bg-card p-4 sm:p-5">
          <div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Store className="size-5" /></span><div className="min-w-0"><p className="truncate text-sm font-semibold">{basics.name || t(locale, "مطعمك الجديد", "Your new restaurant")}</p><p className="truncate text-xs text-muted-foreground" dir="ltr">/r/{initial.slug}</p></div></div>
          <div className="mt-5 flex items-center justify-between text-xs text-muted-foreground"><span>{t(locale, "التقدم", "Progress")}</span><span>{t(locale, "الخطوة {n} من 6", "Step {n} of 6").replace("{n}", String(step))}</span></div>
          <div className="mt-2 flex gap-1.5" aria-label={t(locale, "التقدم في الإعداد", "Setup progress")}>
            {progress.map((name, index) => <button key={name} type="button" aria-label={`${index + 1}. ${name}`} onClick={() => void moveTo(index + 1)} className={`h-1.5 flex-1 rounded-full transition-colors ${index + 1 <= step ? "bg-primary" : "bg-muted"}`} />)}
          </div>
        </div>
        <nav aria-label={t(locale, "خطوات إعداد المطعم", "Restaurant setup steps")} className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-1">
          {progress.map((name, index) => {
            const number = index + 1; const active = number === step; const done = number < step;
            return <button key={name} type="button" onClick={() => void moveTo(number)} disabled={saving} className={`flex min-h-11 items-center gap-2 rounded-xl border px-3 text-start text-xs font-medium transition-colors sm:text-sm ${active ? "border-primary/40 bg-primary/5 text-primary" : "border-transparent bg-card/60 text-muted-foreground hover:border-border hover:bg-card"}`}>
              <span className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] ${active ? "bg-primary text-primary-foreground" : done ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-muted"}`}>{done ? <Check className="size-3.5" /> : number}</span><span className="truncate">{name}</span>
            </button>;
          })}
        </nav>
        <div className="hidden rounded-xl border border-dashed bg-card/60 p-4 text-xs leading-5 text-muted-foreground lg:block">{t(locale, "يُحفظ إعدادك كمسودة. لن يتم تفعيل المطعم حتى تكتمل عناصر القائمة في الخطوة الأخيرة.", "Your setup is saved as a draft. The restaurant stays inactive until every final checklist item is complete.")}</div>
      </aside>

      <div className="min-w-0 space-y-4">
        {error ? <div role="alert" className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"><AlertCircle className="mt-0.5 size-4 shrink-0" />{error}</div> : null}

        {step === 1 && <StepCard title={t(locale, "معلومات مطعمك", "Restaurant details")} description={t(locale, "أخبر زبائنك عن مطعمك. ستظهر هذه المعلومات في صفحة المنيو العامة.", "Tell guests about your restaurant. These details appear on your public menu page.")}>
          <form onChange={() => markDirty(1)} onSubmit={(event) => void submitStep(event, 1)} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label={t(locale, "اسم المطعم", "Restaurant name")} htmlFor="name" required error={fieldErrors.name}><Input id="name" name="name" autoComplete="organization" value={basics.name} onChange={(event) => updateBasics("name", event.target.value)} placeholder={t(locale, "مطعم البيت الشامي", "Olive & Stone Kitchen")} required /></FormField>
              <FormField label={t(locale, "الاسم القانوني", "Legal name")} htmlFor="legalName" error={fieldErrors.legalName}><Input id="legalName" name="legalName" value={basics.legalName} onChange={(event) => updateBasics("legalName", event.target.value)} placeholder={t(locale, "اختياري", "Optional")} /></FormField>
            </div>
            <FormField label={t(locale, "نبذة عن المطعم", "Description")} htmlFor="description" error={fieldErrors.description}><Textarea id="description" name="description" rows={3} value={basics.description} onChange={(event) => updateBasics("description", event.target.value)} placeholder={t(locale, "اكتب نبذة قصيرة تظهر للزبائن...", "A short introduction shown to guests...")} /></FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label={t(locale, "نوع المطبخ", "Cuisine type")} htmlFor="cuisineType" required error={fieldErrors.cuisineType}><Input id="cuisineType" name="cuisineType" value={basics.cuisineType} onChange={(event) => updateBasics("cuisineType", event.target.value)} placeholder={t(locale, "شامي، إيطالي، مقهى...", "Levantine, Italian, café...")} required /></FormField>
              <FormField label={t(locale, "الدولة", "Country")} htmlFor="country" required error={fieldErrors.country}><Input id="country" name="country" value={basics.country} onChange={(event) => updateBasics("country", event.target.value)} placeholder={t(locale, "المملكة العربية السعودية", "Saudi Arabia")} required /></FormField>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label={t(locale, "المدينة", "City")} htmlFor="city" required error={fieldErrors.city}><Input id="city" name="city" value={basics.city} onChange={(event) => updateBasics("city", event.target.value)} placeholder={t(locale, "الرياض", "Riyadh")} required /></FormField>
              <FormField label={t(locale, "العنوان", "Address")} htmlFor="address" required error={fieldErrors.address}><Input id="address" name="address" value={basics.address} onChange={(event) => updateBasics("address", event.target.value)} placeholder={t(locale, "الحي، الشارع، المبنى", "District, street, building")} required /></FormField>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label={t(locale, "رقم الهاتف", "Phone number")} htmlFor="phone" required error={fieldErrors.phone}><Input id="phone" name="phone" type="tel" dir="ltr" value={basics.phone} onChange={(event) => updateBasics("phone", event.target.value)} placeholder="+966 11 000 0000" required /></FormField>
              <FormField label={t(locale, "البريد الإلكتروني", "Email address")} htmlFor="email" required error={fieldErrors.email}><Input id="email" name="email" type="email" dir="ltr" value={basics.email} onChange={(event) => updateBasics("email", event.target.value)} placeholder="hello@example.com" required /></FormField>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label={t(locale, "العملة", "Currency")} htmlFor="currency" required error={fieldErrors.currency}><Select value={basics.currency} onValueChange={(value) => updateBasics("currency", value)}><SelectTrigger id="currency"><SelectValue /></SelectTrigger><SelectContent>{currencies.map((currency) => <SelectItem key={currency} value={currency}>{currency}</SelectItem>)}</SelectContent></Select><input type="hidden" name="currency" value={basics.currency} /></FormField>
              <FormField label={t(locale, "المنطقة الزمنية", "Time zone")} htmlFor="timezone" required error={fieldErrors.timezone}><Select value={basics.timezone} onValueChange={(value) => updateBasics("timezone", value)}><SelectTrigger id="timezone"><SelectValue /></SelectTrigger><SelectContent>{timezoneOptions.map((zone) => <SelectItem key={zone} value={zone}>{zone}</SelectItem>)}</SelectContent></Select><input type="hidden" name="timezone" value={basics.timezone} /></FormField>
            </div>
            <FormField label={t(locale, "لغة المنيو الافتراضية", "Default menu language")} htmlFor="locale" required><Select value={basics.locale} onValueChange={(value) => updateBasics("locale", value)}><SelectTrigger id="locale"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ar">العربية</SelectItem><SelectItem value="en">English</SelectItem></SelectContent></Select><input type="hidden" name="locale" value={basics.locale} /></FormField>
            <div className="flex flex-col-reverse gap-2 border-t pt-5 sm:flex-row sm:items-center sm:justify-between"><Button type="submit" variant="outline" name="intent" value="draft" loading={saving}>{t(locale, "حفظ كمسودة", "Save draft")}</Button><Button type="submit" name="intent" value="continue" loading={saving}>{t(locale, "حفظ ومتابعة", "Save and continue")}<ArrowRight className={`size-4 ${dir === "rtl" ? "rotate-180" : ""}`} /></Button></div>
          </form>
        </StepCard>}

        {step === 2 && <StepCard title={t(locale, "هوية مطعمك", "Your restaurant's look")} description={t(locale, "أضف الشعار وصورة الغلاف، واختر ألواناً وتخطيطاً. شاهد معاينة فورية للمنيو.", "Add a logo and cover, choose your colors and layout, and preview the menu as you go.")}>
          <form onChange={() => markDirty(2)} onSubmit={(event) => void submitStep(event, 2)} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              {(["logo", "cover"] as const).map((kind) => {
                const imageUrl = kind === "logo" ? logoUrl : coverUrl;
                return <div key={kind} className="rounded-2xl border border-dashed p-4">
                  <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold">{kind === "logo" ? t(locale, "شعار المطعم", "Restaurant logo") : t(locale, "صورة الغلاف", "Cover image")}</p><p className="mt-1 text-xs text-muted-foreground">{kind === "logo" ? t(locale, "مطلوب للإطلاق · PNG/JPEG/WebP · حد 2MB", "Required for launch · PNG/JPEG/WebP · max 2 MB") : t(locale, "اختياري · PNG/JPEG/WebP · حد 2MB", "Optional · PNG/JPEG/WebP · max 2 MB")}</p></div><ImagePlus className="size-5 text-primary" /></div>
                  <div className={`mt-4 flex min-h-32 items-center justify-center overflow-hidden rounded-xl bg-muted/60 ${kind === "cover" ? "aspect-[2/1]" : ""}`}>
                    {imageUrl ? <img src={imageUrl} alt={kind === "logo" ? t(locale, "شعار المطعم", "Restaurant logo") : t(locale, "غلاف المطعم", "Restaurant cover")} className={`max-h-40 max-w-full object-contain ${kind === "logo" ? "size-28 rounded-full" : "w-full"}`} /> : <div className="text-center text-xs text-muted-foreground"><Upload className="mx-auto mb-2 size-5" />{t(locale, "لا توجد صورة بعد", "No image uploaded yet")}</div>}
                  </div>
                  <div className="mt-3 flex items-center gap-2"><label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90">{uploading === kind ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}{t(locale, "رفع صورة", "Upload image")}<input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={Boolean(uploading)} onChange={(event) => void handleMedia(event, kind)} /></label>{imageUrl ? <Button type="button" variant="outline" size="sm" onClick={() => void removeMedia(kind)} disabled={Boolean(uploading)}><X />{t(locale, "إزالة", "Remove")}</Button> : null}</div>
                </div>;
              })}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label={t(locale, "اللون الأساسي", "Primary color")} htmlFor="primaryColor"><div className="flex gap-2"><Input id="primaryColor" type="color" value={theme.primaryColor} onChange={(event) => updateTheme("primaryColor", event.target.value)} className="h-10 w-14 p-1" /><Input name="primaryColor" value={theme.primaryColor} onChange={(event) => updateTheme("primaryColor", event.target.value)} dir="ltr" /></div></FormField>
              <FormField label={t(locale, "اللون الثانوي", "Secondary color")} htmlFor="secondaryColor"><div className="flex gap-2"><Input id="secondaryColor" type="color" value={theme.secondaryColor} onChange={(event) => updateTheme("secondaryColor", event.target.value)} className="h-10 w-14 p-1" /><Input name="secondaryColor" value={theme.secondaryColor} onChange={(event) => updateTheme("secondaryColor", event.target.value)} dir="ltr" /></div></FormField>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label={t(locale, "الخط", "Font")} htmlFor="fontFamily"><Select value={theme.fontFamily} onValueChange={(value) => updateTheme("fontFamily", value)}><SelectTrigger id="fontFamily"><SelectValue /></SelectTrigger><SelectContent>{["IBM Plex Sans Arabic", "Cairo", "Tajawal", "Inter", "Noto Sans Arabic"].map((font) => <SelectItem key={font} value={font}>{font}</SelectItem>)}</SelectContent></Select><input type="hidden" name="fontFamily" value={theme.fontFamily} /></FormField>
              <FormField label={t(locale, "تخطيط المنيو", "Menu layout")} htmlFor="menuLayout"><Select value={theme.menuLayout} onValueChange={(value) => updateTheme("menuLayout", value)}><SelectTrigger id="menuLayout"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="grid">{t(locale, "شبكة بطاقات", "Card grid")}</SelectItem><SelectItem value="list">{t(locale, "قائمة", "List")}</SelectItem><SelectItem value="editorial">{t(locale, "تحريري", "Editorial")}</SelectItem></SelectContent></Select><input type="hidden" name="menuLayout" value={theme.menuLayout} /></FormField>
            </div>
            <div className="rounded-2xl border bg-muted/20 p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2 text-sm font-semibold"><Palette className="size-4 text-primary" />{t(locale, "معاينة بصرية", "Live visual preview")}</div><span className="text-[11px] text-muted-foreground">{t(locale, "معاينة فقط", "Preview only")}</span></div>
              <div className="mx-auto max-w-sm overflow-hidden rounded-2xl border bg-card shadow-soft" style={{ fontFamily: theme.fontFamily }}>
                <div className="h-24" style={{ background: coverUrl ? `linear-gradient(90deg, #0008, #0001), url(${coverUrl}) center/cover` : `linear-gradient(120deg, ${theme.primaryColor}, ${theme.secondaryColor})` }} />
                <div className="-mt-8 px-4 pb-4"><div className="flex size-16 items-center justify-center overflow-hidden rounded-2xl border-4 border-card bg-card text-lg font-bold text-primary shadow-sm">{logoUrl ? <img src={logoUrl} alt="" className="size-full object-cover" /> : <UtensilsCrossed className="size-7" style={{ color: theme.primaryColor }} />}</div><h3 className="mt-2 font-bold">{basics.name || t(locale, "اسم مطعمك", "Your restaurant name")}</h3><p className="text-xs text-muted-foreground">{basics.cuisineType || t(locale, "نوع المطبخ", "Cuisine type")} · {basics.city || t(locale, "المدينة", "City")}</p><div className={`mt-4 grid gap-2 ${theme.menuLayout === "list" ? "grid-cols-1" : "grid-cols-2"}`}><div className="rounded-xl border p-2.5"><span className="block h-12 rounded-lg bg-muted/60" /><span className="mt-2 block text-xs font-semibold">{t(locale, "طبق اليوم", "Today's favorite")}</span><span className="mt-1 text-[11px]" style={{ color: theme.primaryColor }}>18 {basics.currency}</span></div><div className="rounded-xl border p-2.5"><span className="block h-12 rounded-lg bg-muted/60" /><span className="mt-2 block text-xs font-semibold">{t(locale, "من المطبخ", "From the kitchen")}</span><span className="mt-1 text-[11px]" style={{ color: theme.primaryColor }}>24 {basics.currency}</span></div></div><div className="mt-3 rounded-lg py-2 text-center text-xs font-semibold text-white" style={{ background: theme.primaryColor }}>{t(locale, "تصفّح المنيو", "Explore menu")}</div></div>
              </div>
            </div>
            <div className="flex flex-col-reverse gap-2 border-t pt-5 sm:flex-row sm:justify-between"><Button type="submit" variant="outline" name="intent" value="back" loading={saving}>{dir === "rtl" ? <ArrowRight /> : <ArrowLeft />}{t(locale, "السابق", "Back")}</Button><div className="flex flex-col gap-2 sm:flex-row"><Button type="submit" variant="outline" name="intent" value="draft" loading={saving}>{t(locale, "حفظ كمسودة", "Save draft")}</Button><Button type="submit" name="intent" value="continue" loading={saving}>{t(locale, "حفظ ومتابعة", "Save and continue")}<ArrowRight className={dir === "rtl" ? "rotate-180" : ""} /></Button></div></div>
          </form>
        </StepCard>}

        {step === 3 && <StepCard title={t(locale, "ابدأ بمنيو حقيقي", "Start with a real menu")} description={t(locale, "اختر مظهراً أولياً، ثم أضف تصنيفاً ومنتجاً بسعر. الحفظ المتكرر يحدّث هذه العناصر بدلاً من تكرارها.", "Choose a starter style, then add a category and a priced product. Re-saving updates these items rather than duplicating them.")}>
          <form onChange={() => markDirty(3)} onSubmit={(event) => void submitStep(event, 3)} className="space-y-5">
            <FormField label={t(locale, "قالب المنيو", "Menu starter template")} htmlFor="template"><div className="grid gap-2 sm:grid-cols-4">{([["classic", t(locale, "كلاسيكي", "Classic")], ["modern", t(locale, "عصري", "Modern")], ["cafe", t(locale, "مقهى", "Café")], ["minimal", t(locale, "بسيط", "Minimal")]] as const).map(([value, label]) => <button key={value} type="button" onClick={() => { setTemplate(value); markDirty(3); }} className={`rounded-xl border p-3 text-start transition-all ${template === value ? "border-primary ring-2 ring-primary/15" : "hover:border-primary/40"}`}><span className="mb-2 block h-12 rounded-lg" style={{ background: menuTemplateStyles[value].surface }}><span className="mx-auto mt-3 block h-1 w-1/2 rounded bg-current opacity-20" /></span><span className="text-sm font-semibold">{label}</span></button>)}</div><input type="hidden" name="template" value={template} /></FormField>
            <div className="grid gap-4 sm:grid-cols-2"><FormField label={t(locale, "اسم التصنيف بالعربية", "Category name in Arabic")} htmlFor="categoryAr" required error={fieldErrors.categoryAr}><Input id="categoryAr" name="categoryAr" value={categoryAr} onChange={(event) => setCategoryAr(event.target.value)} required /></FormField><FormField label={t(locale, "اسم التصنيف بالإنجليزية", "Category name in English")} htmlFor="categoryEn"><Input id="categoryEn" name="categoryEn" value={categoryEn} onChange={(event) => setCategoryEn(event.target.value)} /></FormField></div>
            <div className="rounded-2xl border bg-muted/20 p-4 sm:p-5"><div className="mb-4 flex items-center gap-2 text-sm font-semibold"><UtensilsCrossed className="size-4 text-primary" />{t(locale, "أول منتج في المنيو", "Your first menu item")}</div><div className="grid gap-4 sm:grid-cols-2"><FormField label={t(locale, "اسم المنتج بالعربية", "Product name in Arabic")} htmlFor="productAr" required error={fieldErrors.productAr}><Input id="productAr" name="productAr" value={productAr} onChange={(event) => setProductAr(event.target.value)} required /></FormField><FormField label={t(locale, "اسم المنتج بالإنجليزية", "Product name in English")} htmlFor="productEn"><Input id="productEn" name="productEn" value={productEn} onChange={(event) => setProductEn(event.target.value)} /></FormField></div><div className="mt-4 grid gap-4 sm:grid-cols-2"><FormField label={t(locale, "وصف مختصر", "Short description")} htmlFor="productDescription"><Input id="productDescription" name="productDescription" value={productDescription} onChange={(event) => setProductDescription(event.target.value)} placeholder={t(locale, "اختياري", "Optional")} /></FormField><FormField label={t(locale, "السعر", "Price")} htmlFor="price" required error={fieldErrors.price}><div className="flex gap-2"><Input id="price" name="price" type="number" min="0" step="0.01" dir="ltr" value={price} onChange={(event) => setPrice(event.target.value)} required /><span className="flex h-10 items-center rounded-xl border bg-card px-3 text-sm text-muted-foreground">{basics.currency}</span></div></FormField></div></div>
            <section aria-label={t(locale, "معاينة المنيو", "Menu preview")} className="rounded-2xl border p-4 sm:p-5" style={{ backgroundColor: activeMenuStyle.surface, borderColor: activeMenuStyle.border, fontFamily: theme.fontFamily }}>
              <div className="mb-3 flex items-center justify-between gap-3"><h3 className="text-sm font-bold" style={{ color: activeMenuStyle.accent }}>{t(locale, "معاينة المنيو", "Menu preview")}</h3><span className="text-[10px] text-muted-foreground">{t(locale, "معاينة فقط · لا تشمل إرسال الطلبات", "Preview only · customer ordering is not included")}</span></div>
              <div className={`rounded-xl border bg-white/80 p-4 shadow-sm ${activeMenuStyle.layout === "editorial" ? "border-s-4" : ""}`} style={{ borderColor: activeMenuStyle.border }} dir={dir}>
                <div className="mb-3 flex items-center justify-between gap-3"><div><p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{t(locale, "التصنيف", "Category")}</p><h4 className="mt-0.5 text-base font-bold">{previewCategory || t(locale, "اسم التصنيف", "Category name")}</h4></div><span className="rounded-full px-2.5 py-1 text-[10px] font-semibold text-white" style={{ backgroundColor: activeMenuStyle.accent }}>{t(locale, "صنف واحد", "1 item")}</span></div>
                <article className={`flex gap-3 rounded-xl border p-3 ${activeMenuStyle.layout === "list" ? "items-center" : "items-start"}`} style={{ borderColor: activeMenuStyle.border, backgroundColor: activeMenuStyle.surface }}>
                  <span className="flex size-14 shrink-0 items-center justify-center rounded-lg text-white" style={{ backgroundColor: activeMenuStyle.accent }}><UtensilsCrossed className="size-5" /></span>
                  <div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><h5 className="text-sm font-semibold">{previewProduct || t(locale, "اسم المنتج", "Product name")}</h5><span className="shrink-0 text-sm font-bold" style={{ color: activeMenuStyle.accent }}>{previewPrice}</span></div>{productDescription ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{productDescription}</p> : null}</div>
                </article>
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground">{t(locale, "تعرض هذه المعاينة بيانات المنيو الحالية وتُحفظ هيئة القالب عند حفظ الخطوة.", "This preview uses the current menu values; the template presentation is persisted when you save this step.")}</p>
            </section>
            <div className="flex flex-col-reverse gap-2 border-t pt-5 sm:flex-row sm:justify-between"><Button type="submit" variant="outline" name="intent" value="back" loading={saving}>{dir === "rtl" ? <ArrowRight /> : <ArrowLeft />}{t(locale, "السابق", "Back")}</Button><div className="flex flex-col gap-2 sm:flex-row"><Button type="submit" variant="outline" name="intent" value="draft" loading={saving}>{t(locale, "حفظ كمسودة", "Save draft")}</Button><Button type="submit" name="intent" value="continue" loading={saving}>{t(locale, "حفظ ومتابعة", "Save and continue")}<ArrowRight className={dir === "rtl" ? "rotate-180" : ""} /></Button></div></div>
          </form>
        </StepCard>}

        {step === 4 && <StepCard title={t(locale, "جهّز طاولاتك", "Set up your tables")} description={t(locale, "سننشئ الطاولات الناقصة فقط، ونصدر رمز QR عشوائياً وآمناً لكل طاولة. يمكنك طباعة الرموز أو تنزيلها.", "We create only missing tables and generate a secure random QR token for each. Print or download the codes when ready.")}>
          <form onChange={() => markDirty(4)} onSubmit={(event) => void submitStep(event, 4)} className="space-y-5">
            {initial.maxTables !== -1 ? <div className="rounded-xl border bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">{t(locale, `خطة المطعم تسمح حتى ${initial.maxTables} طاولة.`, `Your plan allows up to ${initial.maxTables} tables.`)}</div> : <div className="rounded-xl border bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">{t(locale, "لا يوجد حد أقصى للطاولات في خطتك.", "Your plan has no table limit.")}</div>}
            <div className="grid gap-4 sm:grid-cols-3"><FormField label={t(locale, "عدد الطاولات", "Number of tables")} htmlFor="count" required error={fieldErrors.count}><Input id="count" name="count" type="number" min="1" max={initial.maxTables === -1 ? 500 : Math.min(500, initial.maxTables)} dir="ltr" value={tableCount} onChange={(event) => setTableCount(event.target.value)} required /></FormField><FormField label={t(locale, "نمط التسمية", "Table name prefix")} htmlFor="prefix" required error={fieldErrors.prefix}><Input id="prefix" name="prefix" value={tablePrefix} onChange={(event) => setTablePrefix(event.target.value)} required /></FormField><FormField label={t(locale, "المقاعد لكل طاولة", "Seats per table")} htmlFor="seats" required error={fieldErrors.seats}><Input id="seats" name="seats" type="number" min="1" max="30" dir="ltr" value={seats} onChange={(event) => setSeats(event.target.value)} required /></FormField></div>
            <div className="rounded-xl border border-dashed p-4 text-sm leading-6 text-muted-foreground">{t(locale, "كل رمز يفتح منيو مطعمك مع معرّف الطاولة. لا يوجد إرسال طلبات أو معالجة دفع مباشرة من هذه الرموز في هذه الخطوة.", "Each code opens your restaurant menu with a table identifier. QR order submission and payment processing are not enabled by this setup step.")}</div>
            {tables.length ? <div className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">{t(locale, "الطاولات ورموز QR", "Tables and QR codes")} <span className="text-muted-foreground">({tables.length})</span></h3><Button type="button" variant="outline" size="sm" onClick={() => window.print()}><Printer />{t(locale, "طباعة الرموز", "Print codes")}</Button></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{tables.map((table) => <div key={table.id} className="qr-print-card flex items-center gap-3 rounded-xl border bg-card p-3"><div className="flex size-24 shrink-0 items-center justify-center rounded-lg bg-white p-1">{qrImages[table.id] ? <img src={qrImages[table.id]} alt={t(locale, `رمز QR للطاولة ${table.name}`, `QR code for table ${table.name}`)} className="size-full" /> : <Loader2 className="size-5 animate-spin text-muted-foreground" />}</div><div className="min-w-0"><p className="truncate text-sm font-semibold">{table.name}</p><p className="mt-1 text-[11px] text-muted-foreground">{t(locale, "رابط القائمة", "Menu link")}</p><a className="block truncate text-xs text-primary underline" href={safeHref(table.url)} target="_blank" rel="noreferrer" dir="ltr">{safeHref(table.url)}</a>{qrImages[table.id] ? <a href={qrImages[table.id]} download={`dineflow-table-${table.number}-qr.png`} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary"><Download className="size-3.5" />{t(locale, "تنزيل QR", "Download QR")}</a> : null}</div></div>)}</div></div> : <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">{t(locale, "لم تُنشأ طاولات بعد. احفظ هذه الخطوة لإنشاء الطاولات ورموزها.", "No tables yet. Save this step to create your tables and QR codes.")}</div>}
            <div className="flex flex-col-reverse gap-2 border-t pt-5 sm:flex-row sm:justify-between"><Button type="submit" variant="outline" name="intent" value="back" loading={saving}>{dir === "rtl" ? <ArrowRight /> : <ArrowLeft />}{t(locale, "السابق", "Back")}</Button><div className="flex flex-col gap-2 sm:flex-row"><Button type="submit" variant="outline" name="intent" value="draft" loading={saving}>{t(locale, "حفظ كمسودة", "Save draft")}</Button><Button type="submit" name="intent" value="continue" loading={saving}>{t(locale, "حفظ ومتابعة", "Save and continue")}<ArrowRight className={dir === "rtl" ? "rotate-180" : ""} /></Button></div></div>
          </form>
        </StepCard>}

        {step === 5 && <StepCard title={t(locale, "إعدادات التشغيل", "Service settings")} description={t(locale, "حدد ما يقدمه مطعمك، طرق الدفع التي تقبلها، وأوقات العمل الأسبوعية. هذه إعدادات فقط وليست معالجة دفع مباشرة.", "Choose the services you offer, accepted payment methods, and weekly hours. These are settings only—not payment processing.")}>
          <form onChange={() => markDirty(5)} onSubmit={(event) => void submitStep(event, 5)} className="space-y-6">
            <div><h3 className="mb-3 text-sm font-semibold">{t(locale, "الخدمات", "Services")}</h3><div className="grid gap-2 sm:grid-cols-2">{([["dineIn", t(locale, "تناول داخل المطعم", "Dine-in")], ["pickup", t(locale, "استلام من المطعم", "Pickup")], ["delivery", t(locale, "توصيل", "Delivery")], ["waiterCall", t(locale, "طلب المساعدة من النادل", "Waiter call")]] as const).map(([key, label]) => <label key={key} className="flex cursor-pointer items-center gap-3 rounded-xl border bg-card px-3 py-3 text-sm"><input type="checkbox" checked={services[key]} onChange={(event) => updateService(key, event.target.checked)} className="size-4 accent-primary" />{label}</label>)}</div></div>
            <div><h3 className="mb-3 text-sm font-semibold">{t(locale, "طرق الدفع المقبولة", "Accepted payment methods")}</h3><p className="mb-3 text-xs text-muted-foreground">{t(locale, "تُحفظ كتفضيلات فقط؛ لا يتم تحصيل أي مدفوعات هنا.", "Saved as preferences only; no payments are charged here.")}</p><div className="grid gap-2 sm:grid-cols-2">{paymentOptions.map(([key, ar, en]) => <label key={key} className="flex cursor-pointer items-center gap-3 rounded-xl border bg-card px-3 py-3 text-sm"><input type="checkbox" checked={services.paymentMethods.includes(key)} onChange={(event) => setServices((current) => ({ ...current, paymentMethods: event.target.checked ? [...current.paymentMethods, key] : current.paymentMethods.filter((method) => method !== key) }))} className="size-4 accent-primary" />{t(locale, ar, en)}</label>)}</div></div>
            <div><div className="mb-3 flex items-center gap-2"><Clock3 className="size-4 text-primary" /><h3 className="text-sm font-semibold">{t(locale, "ساعات العمل", "Opening hours")}</h3></div><div className="space-y-2">{services.openingHours.map((item, index) => <div key={item.day} className="grid grid-cols-[minmax(84px,1fr)_auto_minmax(92px,1fr)_minmax(92px,1fr)] items-center gap-2 rounded-xl border bg-card px-3 py-2"><span className="text-xs font-medium sm:text-sm">{t(locale, dayNames[item.day]?.[0] || item.day, dayNames[item.day]?.[1] || item.day)}</span><label className="flex items-center gap-1 text-[10px] text-muted-foreground sm:text-xs"><input type="checkbox" checked={item.closed} onChange={(event) => setServices((current) => ({ ...current, openingHours: current.openingHours.map((day, i) => i === index ? { ...day, closed: event.target.checked } : day) }))} className="size-3.5 accent-primary" />{t(locale, "مغلق", "Closed")}</label><Input aria-label={t(locale, `وقت فتح ${dayNames[item.day]?.[0]}`, `${dayNames[item.day]?.[1]} opens`)} type="time" value={item.open} disabled={item.closed} onChange={(event) => setServices((current) => ({ ...current, openingHours: current.openingHours.map((day, i) => i === index ? { ...day, open: event.target.value } : day) }))} className="h-9 px-2 text-xs" /><Input aria-label={t(locale, `وقت إغلاق ${dayNames[item.day]?.[0]}`, `${dayNames[item.day]?.[1]} closes`)} type="time" value={item.close} disabled={item.closed} onChange={(event) => setServices((current) => ({ ...current, openingHours: current.openingHours.map((day, i) => i === index ? { ...day, close: event.target.value } : day) }))} className="h-9 px-2 text-xs" /></div>)}</div></div>
            <div className="flex flex-col-reverse gap-2 border-t pt-5 sm:flex-row sm:justify-between"><Button type="submit" variant="outline" name="intent" value="back" loading={saving}>{dir === "rtl" ? <ArrowRight /> : <ArrowLeft />}{t(locale, "السابق", "Back")}</Button><div className="flex flex-col gap-2 sm:flex-row"><Button type="submit" variant="outline" name="intent" value="draft" loading={saving}>{t(locale, "حفظ كمسودة", "Save draft")}</Button><Button type="submit" name="intent" value="continue" loading={saving}>{t(locale, "حفظ ومتابعة", "Save and continue")}<ArrowRight className={dir === "rtl" ? "rotate-180" : ""} /></Button></div></div>
            <input type="hidden" name="settings" value={JSON.stringify(services)} />
          </form>
        </StepCard>}

        {step === 6 && <StepCard title={t(locale, "جاهزون للإطلاق؟", "Ready to launch?")} description={t(locale, "تحقق من جميع العناصر. سنفعّل المطعم والمنيو الرئيسي فقط بعد التحقق من كل شيء على الخادم.", "Review every item. The restaurant and its default menu are activated only after the server verifies everything.")}>
          <div className="space-y-3">{checklistItems.map(([key, label]) => <div key={key} className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${checklist[key] ? "border-emerald-500/25 bg-emerald-500/5" : "bg-card"}`}><span className={`flex size-8 shrink-0 items-center justify-center rounded-full ${checklist[key] ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground"}`}>{checklist[key] ? <CheckCircle2 className="size-4" /> : <span className="size-2 rounded-full bg-current" />}</span><span className={`text-sm ${checklist[key] ? "font-medium" : "text-muted-foreground"}`}>{label}</span><span className="ms-auto text-xs font-semibold">{checklist[key] ? t(locale, "مكتمل", "Complete") : t(locale, "قيد الانتظار", "Pending")}</span></div>)}</div>
          <div className="mt-6 rounded-xl border border-dashed bg-muted/20 p-4 text-xs leading-5 text-muted-foreground">{t(locale, "الرموز تفتح صفحة المنيو للطاولة. إرسال الطلبات عبر QR ومعالجة المدفوعات غير مفعّلين ضمن هذا الإعداد.", "QR codes open the table menu. QR order submission and payment processing are not enabled by this setup.")}</div>
          <div className="mt-6 flex flex-col-reverse gap-2 border-t pt-5 sm:flex-row sm:items-center sm:justify-between"><Button type="button" variant="outline" onClick={() => void moveTo(5)} disabled={saving}>{dir === "rtl" ? <ArrowRight /> : <ArrowLeft />}{t(locale, "العودة للإعدادات", "Back to settings")}</Button><div className="flex flex-col gap-2 sm:flex-row"><Button type="button" variant="outline" onClick={() => void saveLaunchDraft()} loading={saving}>{t(locale, "حفظ كمسودة", "Save draft")}</Button><Button type="button" size="lg" loading={saving} disabled={Object.values(checklist).some((value) => !value)} onClick={() => void launch()}><Rocket />{t(locale, "إطلاق المطعم", "Launch restaurant")}</Button></div></div>
        </StepCard>}

        <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-muted-foreground"><span>{t(locale, "معرّف المطعم", "Restaurant URL")} <span className="font-semibold text-foreground" dir="ltr">/r/{initial.slug}</span></span>{saving ? <span className="inline-flex items-center gap-1"><Loader2 className="size-3 animate-spin" />{t(locale, "جارٍ الحفظ…", "Saving…")}</span> : dirtySteps.size > 0 ? <span>{t(locale, "تغييرات غير محفوظة · اختر حفظ المسودة أو حفظ ومتابعة", "Unsaved changes · choose Save draft or Save and continue")}</span> : hasServerAck ? <span>{t(locale, "تم تأكيد الحفظ على الخادم", "Saved on the server")}</span> : <span>{t(locale, "اختر حفظ المسودة أو حفظ ومتابعة لحفظ التغييرات", "Choose Save draft or Save and continue to save your changes")}</span>}</div>
      </div>
      <style jsx global>{`@media print { body * { visibility: hidden !important; } .qr-print-card, .qr-print-card * { visibility: visible !important; } .qr-print-card { break-inside: avoid; border: 1px solid #888 !important; box-shadow: none !important; } }`}</style>
    </div>
  );
}
