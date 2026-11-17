"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Check,
  ChevronsLeft,
  ChevronsRight,
  ExternalLink,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings,
  Sparkles,
  X,
} from "lucide-react";
import { Logo, LogoMark } from "@/components/brand/logo";
import { LocaleSwitcher } from "@/components/brand/locale-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { NavIcon } from "@/components/layout/icon";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage, Progress } from "@/components/ui/misc";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/controls";
import { useI18n } from "@/i18n/provider";
import { cn, initials, relativeTime } from "@/lib/utils";
import type { NavGroup } from "@/lib/navigation";
import { logoutAction } from "@/app/actions/auth";
import { markNotificationsReadAction, switchRestaurantAction } from "@/app/actions/restaurant";

export interface ShellRestaurant {
  name: string;
  slug: string;
  logoUrl: string | null;
  status: string;
  planName: string | null;
  trialEndsAt: string | null;
}

export interface ShellUser {
  name: string;
  email: string;
  avatarUrl: string | null;
  isPlatformAdmin: boolean;
}

export interface ShellNotification {
  id: string;
  title: string;
  body: string | null;
  createdAt: string;
  isRead: boolean;
}

interface AppShellProps {
  nav: NavGroup[];
  restaurant: ShellRestaurant;
  restaurants: { name: string; slug: string; logoUrl: string | null }[];
  user: ShellUser;
  counts: { orders: number; calls: number; reservations: number };
  notifications: ShellNotification[];
  unreadCount: number;
  canCreateOrder?: boolean;
  children: React.ReactNode;
}

export function AppShell({
  nav,
  restaurant,
  restaurants,
  user,
  counts,
  notifications,
  unreadCount,
  canCreateOrder = true,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { t, locale } = useI18n();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set(nav.map((group) => group.key)));

  const activeGroup = useMemo(() => {
    const group = nav.find((g) =>
      g.items.some((item) => pathname === item.href || (!item.exact && pathname.startsWith(`${item.href}/`)))
    );
    return group?.key;
  }, [nav, pathname]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const stored = localStorage.getItem("df_sidebar_collapsed");
    if (stored === "1") setCollapsed(true);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((value) => {
      localStorage.setItem("df_sidebar_collapsed", value ? "0" : "1");
      return !value;
    });
  };

  const isActive = (href: string, exact?: boolean) => {
    const clean = href.split("?")[0];
    if (exact) return pathname === clean;
    return pathname === clean || pathname.startsWith(`${clean}/`);
  };

  const trialDaysLeft = restaurant.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(restaurant.trialEndsAt).getTime() - Date.now()) / 86400000))
    : null;

  const flatNav = nav.flatMap((group) => group.items);
  const searchResults = query.trim()
    ? flatNav.filter((item) => t(item.labelKey).toLowerCase().includes(query.trim().toLowerCase()))
    : flatNav.slice(0, 8);

  const sidebarContent = (mobile = false) => (
    <div className="flex h-full flex-col">
      <div className={cn("flex h-16 items-center gap-2 border-b px-4", collapsed && !mobile && "justify-center px-2")}>
        <Link href="/app/dashboard" className="flex min-w-0 items-center gap-2.5">
          {collapsed && !mobile ? <LogoMark size={32} /> : <Logo textClassName="text-[17px]" />}
        </Link>
        {mobile ? (
          <button
            onClick={() => setMobileOpen(false)}
            className="ms-auto rounded-lg p-2 text-muted-foreground hover:bg-accent"
            aria-label={t("nav.closeMenu")}
          >
            <X className="size-5" />
          </button>
        ) : null}
      </div>

      {!collapsed || mobile ? (
        <div className="px-3 pt-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-2.5 rounded-xl border bg-muted/40 p-2 text-start transition-colors hover:bg-accent">
                <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary/10 text-xs font-bold text-primary">
                  {restaurant.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={restaurant.logoUrl} alt={restaurant.name} className="size-full object-cover" />
                  ) : (
                    initials(restaurant.name)
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{restaurant.name}</span>
                  <span className="block truncate text-[11px] text-muted-foreground" dir="ltr">
                    /{restaurant.slug}
                  </span>
                </span>
                <ChevronsLeft className="size-4 rotate-[-90deg] text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuLabel>{t("nav.switchRestaurant")}</DropdownMenuLabel>
              {restaurants.map((item) => (
                <form key={item.slug} action={switchRestaurantAction}>
                  <input type="hidden" name="slug" value={item.slug} />
                  <button
                    type="submit"
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-start text-sm hover:bg-accent"
                  >
                    <span className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-[10px] font-bold text-primary">
                      {initials(item.name)}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{item.name}</span>
                    {item.slug === restaurant.slug ? <Check className="size-4 text-primary" /> : null}
                  </button>
                </form>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={`/r/${restaurant.slug}`} target="_blank">
                  <ExternalLink />
                  {t("nav.viewSite")}
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : null}

      <nav className="flex-1 overflow-y-auto px-2.5 py-3 scrollbar-thin">
        {nav.map((group) => {
          const isOpen = openGroups.has(group.key);
          return (
            <div key={group.key} className="mb-1">
              {!collapsed || mobile ? (
                <button
                  onClick={() =>
                    setOpenGroups((prev) => {
                      const next = new Set(prev);
                      if (next.has(group.key)) next.delete(group.key);
                      else next.add(group.key);
                      return next;
                    })
                  }
                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 transition-colors hover:text-foreground"
                >
                  {t(group.labelKey)}
                  <ChevronsRight
                    className={cn("size-3 transition-transform", isOpen ? "rotate-90" : "rtl:rotate-180")}
                  />
                </button>
              ) : null}

              {(isOpen || (collapsed && !mobile)) && (
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const active = isActive(item.href, item.exact);
                    const badgeValue =
                      item.badge === "orders"
                        ? counts.orders
                        : item.badge === "calls"
                          ? counts.calls
                          : item.badge === "reservations"
                            ? counts.reservations
                            : 0;
                    return (
                      <Link
                        key={`${item.href}-${item.labelKey}`}
                        href={item.soon ? "#" : item.href}
                        aria-disabled={item.soon}
                        title={collapsed && !mobile ? t(item.labelKey) : undefined}
                        className={cn(
                          "group relative flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-medium transition-all",
                          active
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground",
                          item.soon && "cursor-not-allowed opacity-45 hover:bg-transparent hover:text-muted-foreground",
                          collapsed && !mobile && "justify-center px-2"
                        )}
                      >
                        {active ? (
                          <span className="absolute inset-y-1.5 start-0 w-[3px] rounded-full bg-primary" />
                        ) : null}
                        <NavIcon name={item.icon} className="size-[18px] shrink-0" />
                        {!collapsed || mobile ? (
                          <>
                            <span className="flex-1 truncate">{t(item.labelKey)}</span>
                            {item.soon ? (
                              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground">
                                {t("common.comingSoon")}
                              </span>
                            ) : badgeValue > 0 ? (
                              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                                {badgeValue > 99 ? "99+" : badgeValue}
                              </span>
                            ) : null}
                          </>
                        ) : badgeValue > 0 ? (
                          <span className="absolute end-1 top-1 size-1.5 rounded-full bg-primary" />
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="border-t p-3">
        {!collapsed || mobile ? (
          <div className="mb-3 rounded-xl border bg-gradient-to-br from-emerald-50 to-teal-50 p-3 dark:from-emerald-500/10 dark:to-teal-500/5">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <p className="text-xs font-bold">{restaurant.planName ?? "Free"}</p>
            </div>
            {trialDaysLeft !== null ? (
              <>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {locale === "ar" ? `متبقي ${trialDaysLeft} يوم في التجربة` : `${trialDaysLeft} days left in trial`}
                </p>
                <Progress value={Math.min(100, (trialDaysLeft / 14) * 100)} className="mt-2 h-1.5" />
              </>
            ) : null}
            <Button
              asChild
              size="sm"
              variant={trialDaysLeft !== null ? "default" : "outline"}
              className="mt-2.5 h-7 w-full text-[11px]"
            >
              <Link href="/app/subscription">
                {trialDaysLeft !== null
                  ? locale === "ar"
                    ? "ترقية الباقة"
                    : "Upgrade plan"
                  : locale === "ar"
                    ? "إدارة الاشتراك"
                    : "Manage subscription"}
              </Link>
            </Button>
          </div>
        ) : null}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex w-full items-center gap-2.5 rounded-xl p-1.5 text-start transition-colors hover:bg-accent",
                collapsed && !mobile && "justify-center"
              )}
            >
              <Avatar className="size-8">
                <AvatarImage src={user.avatarUrl ?? undefined} alt={user.name} />
                <AvatarFallback>{initials(user.name)}</AvatarFallback>
              </Avatar>
              {!collapsed || mobile ? (
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold">{user.name}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">{user.email}</span>
                </span>
              ) : null}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" className="w-60">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-semibold">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/app/settings">
                <Settings />
                {t("common.settings")}
              </Link>
            </DropdownMenuItem>
            {user.isPlatformAdmin ? (
              <DropdownMenuItem asChild>
                <Link href="/admin">
                  <Sparkles />
                  {t("admin.title")}
                </Link>
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            <form action={logoutAction}>
              <button
                type="submit"
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
              >
                <LogOut className="size-4" />
                {t("common.logout")}
              </button>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 start-0 z-30 hidden border-e bg-card transition-all duration-300 lg:block",
          collapsed ? "w-[76px]" : "w-[264px]"
        )}
      >
        {sidebarContent()}
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink-950/50 backdrop-blur-[2px]" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 start-0 w-[286px] border-e bg-card shadow-pop animate-fade-in">
            {sidebarContent(true)}
          </aside>
        </div>
      ) : null}

      <div className={cn("transition-all duration-300", collapsed ? "lg:ps-[76px]" : "lg:ps-[264px]")}>
        <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b glass px-4 md:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-xl p-2 text-muted-foreground hover:bg-accent lg:hidden"
            aria-label={t("nav.openMenu")}
          >
            <Menu className="size-5" />
          </button>

          <button
            onClick={() => setCommandOpen(true)}
            className="hidden h-9 w-full max-w-xs items-center gap-2 rounded-xl border bg-muted/40 px-3 text-sm text-muted-foreground transition-colors hover:bg-accent sm:flex"
          >
            <Search className="size-4" />
            <span className="flex-1 text-start">{t("nav.search")}</span>
            <kbd className="rounded border bg-card px-1.5 py-0.5 text-[10px] font-semibold" dir="ltr">
              ⌘K
            </kbd>
          </button>

          <div className="ms-auto flex items-center gap-1">
            {canCreateOrder ? (
              <Button asChild size="sm" className="me-1 hidden h-9 sm:inline-flex">
                <Link href="/app/orders/create">
                  <Plus />
                  {t("nav.newOrder")}
                </Link>
              </Button>
            ) : null}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="relative inline-flex size-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  aria-label={t("common.notifications")}
                >
                  <Bell className="size-[18px]" />
                  {unreadCount > 0 ? (
                    <span className="absolute end-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  ) : null}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 p-0">
                <div className="flex items-center justify-between border-b px-3 py-2.5">
                  <p className="text-sm font-semibold">{t("common.notifications")}</p>
                  {unreadCount > 0 ? (
                    <form action={markNotificationsReadAction}>
                      <button type="submit" className="text-[11px] font-medium text-primary hover:underline">
                        {locale === "ar" ? "تعليم الكل كمقروء" : "Mark all read"}
                      </button>
                    </form>
                  ) : null}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="px-3 py-8 text-center text-xs text-muted-foreground">{t("common.noData")}</p>
                  ) : (
                    notifications.map((item) => (
                      <div
                        key={item.id}
                        className={cn("border-b px-3 py-2.5 last:border-0", !item.isRead && "bg-primary/[0.04]")}
                      >
                        <p className="text-xs font-semibold">{item.title}</p>
                        {item.body ? <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{item.body}</p> : null}
                        <p className="mt-1 text-[10px] text-muted-foreground">{relativeTime(item.createdAt, locale)}</p>
                      </div>
                    ))
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <ThemeToggle />
            <LocaleSwitcher compact />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="ms-1 rounded-full ring-offset-background transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="size-8 border">
                    <AvatarImage src={user.avatarUrl ?? undefined} alt={user.name} />
                    <AvatarFallback>{initials(user.name)}</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <p className="text-sm font-semibold">{user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/app/settings">
                    <Settings />
                    {t("common.settings")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
                  >
                    <LogOut className="size-4" />
                    {t("common.logout")}
                  </button>
                </form>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] px-4 py-6 md:px-6 lg:px-8">{children}</main>
      </div>

      <Dialog open={commandOpen} onOpenChange={setCommandOpen}>
        <DialogContent hideClose className="top-[20%] max-w-xl translate-y-0 gap-0 p-0">
          <div className="flex items-center gap-2 border-b px-4">
            <Search className="size-4 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("nav.search")}
              className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <kbd className="rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground">ESC</kbd>
          </div>
          <div className="max-h-80 overflow-y-auto p-2">
            {searchResults.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{t("common.noData")}</p>
            ) : (
              searchResults.map((item) => (
                <button
                  key={`${item.href}-${item.labelKey}`}
                  onClick={() => {
                    setCommandOpen(false);
                    setQuery("");
                    router.push(item.href);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-start text-sm transition-colors hover:bg-accent"
                >
                  <NavIcon name={item.icon} className="size-4 text-muted-foreground" />
                  <span className="flex-1">{t(item.labelKey)}</span>
                  <span className="text-[10px] text-muted-foreground" dir="ltr">
                    {item.href}
                  </span>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
