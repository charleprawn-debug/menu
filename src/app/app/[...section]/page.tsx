import Link from "next/link";
import { Construction, LayoutDashboard } from "lucide-react";
import { requireRestaurant } from "@/lib/auth/context";
import { getI18n } from "@/i18n";
import { Button } from "@/components/ui/button";

export default async function PlaceholderPage({ params }: { params: Promise<{ section: string[] }> }) {
  const { section } = await params;
  await requireRestaurant();
  const { locale } = await getI18n();
  const path = `/${section.join("/")}`;

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="mb-5 flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Construction className="size-8" />
      </div>
      <h1 className="text-2xl font-bold">{locale === "ar" ? "هذه الصفحة قيد البناء" : "This page is under construction"}</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        {locale === "ar"
          ? "نحن نبني المشروع خطوة بخطوة. هذه الصفحة ستكتمل في خطوة قادمة من خطة التنفيذ."
          : "We're building the project step by step. This page will be completed in an upcoming phase."}
      </p>
      <code className="mt-3 rounded-lg bg-muted px-2 py-1 text-xs text-muted-foreground" dir="ltr">
        {path}
      </code>
      <Button asChild className="mt-6">
        <Link href="/app/dashboard">
          <LayoutDashboard />
          {locale === "ar" ? "العودة للوحة التحكم" : "Back to dashboard"}
        </Link>
      </Button>
    </div>
  );
}
