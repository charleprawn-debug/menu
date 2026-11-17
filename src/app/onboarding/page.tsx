import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth/session";
import { ensureDraftRestaurant } from "@/lib/services/restaurant";
import { Logo } from "@/components/brand/logo";
import { LocaleSwitcher } from "@/components/brand/locale-switcher";
import { QuickStartForm } from "./quick-start-form";

export const metadata: Metadata = { title: "إعداد المطعم" };

export default async function OnboardingPage() {
  const auth = await getAuth();
  if (!auth) redirect("/login");
  if (auth.user.isPlatformAdmin) redirect("/admin");

  const restaurant = await ensureDraftRestaurant(auth.user.id);
  if (restaurant.onboardingCompletedAt && restaurant.status === "ACTIVE") {
    redirect("/app/dashboard");
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="flex h-16 items-center justify-between border-b px-5 md:px-8">
        <Logo />
        <LocaleSwitcher compact />
      </header>

      <div className="mx-auto max-w-3xl px-5 py-10 md:py-14">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">الخطوة 1 من 6</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">لنبدأ بمعلومات مطعمك</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            هذه البيانات تظهر للزبائن في صفحة المنيو. يمكنك تغييرها لاحقاً من الإعدادات.
          </p>
          <div className="mx-auto mt-5 flex max-w-xs gap-1.5">
            {Array.from({ length: 6 }).map((_, index) => (
              <span
                key={index}
                className={`h-1.5 flex-1 rounded-full ${index === 0 ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-soft md:p-8">
          <QuickStartForm
            initial={{
              name: restaurant.name,
              cuisineType: restaurant.cuisineType ?? "",
              city: restaurant.city ?? "",
              phone: restaurant.phone ?? "",
              currency: restaurant.currency,
              timezone: restaurant.timezone,
            }}
          />
        </div>

        <p className="mt-5 text-center text-[11px] text-muted-foreground">
          سيتم إنشاء معرّف رابط خاص بمطعمك:{" "}
          <span className="font-semibold text-foreground" dir="ltr">
            /r/{restaurant.slug}
          </span>
        </p>
      </div>
    </div>
  );
}
