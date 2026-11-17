"use client";

import { useActionState } from "react";
import { AlertCircle, ArrowLeft, Rocket, Store } from "lucide-react";
import { saveRestaurantBasics, type OnboardingState } from "@/app/actions/onboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/layout-blocks";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const initialState: OnboardingState = {};

const CURRENCIES = ["SAR", "AED", "USD", "EUR", "EGP", "JOD", "KWD", "QAR", "BHD", "OMR", "MAD", "TND", "DZD", "IQD", "TRY"];

export function QuickStartForm({
  initial,
}: {
  initial: { name: string; cuisineType: string; city: string; phone: string; currency: string; timezone: string };
}) {
  const [state, formAction, pending] = useActionState(saveRestaurantBasics, initialState);

  return (
    <form action={formAction} className="space-y-5">
      {state.error ? (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {state.error}
        </div>
      ) : null}

      <FormField label="اسم المطعم" htmlFor="name" required error={state.fieldErrors?.name}>
        <Input id="name" name="name" defaultValue={initial.name} leading={<Store />} placeholder="مطعم البيت الشامي" required />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="نوع النشاط" htmlFor="cuisineType">
          <Input id="cuisineType" name="cuisineType" defaultValue={initial.cuisineType} placeholder="مطبخ شامي / مقهى / مشاوي" />
        </FormField>
        <FormField label="المدينة" htmlFor="city">
          <Input id="city" name="city" defaultValue={initial.city} placeholder="الرياض" />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="رقم الهاتف" htmlFor="phone">
          <Input id="phone" name="phone" defaultValue={initial.phone} dir="ltr" placeholder="+966 11 000 0000" />
        </FormField>
        <FormField label="العملة" htmlFor="currency">
          <Select name="currency" defaultValue={initial.currency}>
            <SelectTrigger id="currency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((currency) => (
                <SelectItem key={currency} value={currency}>
                  {currency}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </div>

      <FormField label="المنطقة الزمنية" htmlFor="timezone" hint="تستخدم في التقارير وأوقات العمل">
        <Select name="timezone" defaultValue={initial.timezone}>
          <SelectTrigger id="timezone">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["Asia/Riyadh", "Asia/Dubai", "Asia/Amman", "Asia/Beirut", "Africa/Cairo", "Europe/Istanbul", "UTC"].map((zone) => (
              <SelectItem key={zone} value={zone}>
                {zone}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <div className="flex flex-col-reverse gap-2 border-t pt-5 sm:flex-row sm:justify-between">
        <Button type="submit" name="intent" value="draft" variant="outline" disabled={pending}>
          حفظ كمسودة
        </Button>
        <Button type="submit" name="intent" value="launch" loading={pending}>
          <Rocket />
          حفظ ومتابعة
          <ArrowLeft className="size-4 rtl:rotate-180" />
        </Button>
      </div>
    </form>
  );
}
