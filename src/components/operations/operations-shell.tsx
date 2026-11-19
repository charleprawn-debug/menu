import Link from "next/link";
import { ChefHat, HandPlatter, MonitorSmartphone, Store } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

type Locale = "ar" | "en";

const destinations = [
  { href: "/kitchen", icon: ChefHat, label: { ar: "المطبخ", en: "Kitchen" }, permission: "kitchen.view" },
  { href: "/waiter", icon: HandPlatter, label: { ar: "النادل", en: "Waiter" }, permission: "waiter.use" },
  { href: "/pos", icon: MonitorSmartphone, label: { ar: "نقطة البيع", en: "POS" }, permission: "pos.use" },
];

export function OperationsShell({
  children,
  locale,
  restaurantName,
  activePath,
  permissions,
  isOwner,
}: {
  children: React.ReactNode;
  locale: Locale;
  restaurantName: string;
  activePath: string;
  permissions: string[];
  isOwner: boolean;
}) {
  const isArabic = locale === "ar";
  const allowed = (permission: string) => isOwner || permissions.includes(permission);
  return (
    <div className="min-h-screen bg-muted/40" dir={isArabic ? "rtl" : "ltr"}>
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur print:hidden">
        <div className="mx-auto flex min-h-16 max-w-[1680px] flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-6">
          <div className="flex items-center gap-4">
            <Link href="/app/dashboard" aria-label="DineFlow dashboard" className="shrink-0"><Logo className="h-7 w-auto" /></Link>
            <span className="hidden h-7 w-px bg-border sm:block" />
            <div className="flex items-center gap-2 text-sm font-semibold"><Store className="size-4 text-primary"/><span className="max-w-44 truncate">{restaurantName}</span></div>
          </div>
          <nav className="flex items-center gap-1" aria-label={isArabic ? "مساحات التشغيل" : "Operations workspaces"}>
            {destinations.filter((item) => allowed(item.permission)).map((item) => {
              const Icon = item.icon;
              const active = item.href === activePath;
              return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={cn("inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors", active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground")}><Icon className="size-4"/><span className="hidden sm:inline">{item.label[locale]}</span></Link>;
            })}
          </nav>
          <Link href="/app/dashboard" className="hidden text-sm text-muted-foreground hover:text-foreground md:inline-flex">{isArabic ? "لوحة التحكم" : "Dashboard"}</Link>
        </div>
      </header>
      <main className="mx-auto max-w-[1680px] px-3 py-5 sm:px-6 sm:py-7">{children}</main>
    </div>
  );
}
