import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  BadgeDollarSign,
  ChefHat,
  ClipboardList,
  Clock3,
  Grid2x2,
  Plus,
  ReceiptText,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { db } from "@/lib/db";
import { requireRestaurant } from "@/lib/auth/context";
import { getI18n } from "@/i18n";
import { formatMoney, formatNumber, toNumber } from "@/lib/money";
import { formatTime } from "@/lib/utils";
import { ORDER_STATUS, ORDER_TYPE, statusMeta } from "@/lib/status";
import { PageHeader, StatCard } from "@/components/ui/layout-blocks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SalesAreaChart, type SalesPoint } from "@/components/charts/sales-chart";

export const metadata: Metadata = { title: "نظرة عامة" };

function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default async function DashboardPage() {
  const membership = await requireRestaurant("orders.view");
  const { t, locale } = await getI18n();
  const { restaurantId, restaurant } = membership;
  const currency = restaurant.currency;

  const today = startOfDay();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const weekStart = new Date(today.getTime() - 6 * 86400000);

  const [todayOrders, monthOrders, tables, weekOrders, recentOrders, topItems] = await Promise.all([
    db.order.findMany({
      where: { restaurantId, createdAt: { gte: today } },
      select: { id: true, total: true, status: true, itemsCount: true },
    }),
    db.order.findMany({
      where: { restaurantId, createdAt: { gte: monthStart }, status: { notIn: ["CANCELLED", "REJECTED"] } },
      select: { total: true },
    }),
    db.table.findMany({ where: { restaurantId, isActive: true }, select: { status: true } }),
    db.order.findMany({
      where: { restaurantId, createdAt: { gte: weekStart }, status: { notIn: ["CANCELLED", "REJECTED"] } },
      select: { total: true, createdAt: true },
    }),
    db.order.findMany({
      where: { restaurantId },
      include: { table: { select: { number: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 7,
    }),
    db.orderItem.groupBy({
      by: ["productId"],
      where: { order: { restaurantId, status: { notIn: ["CANCELLED", "REJECTED"] } }, productId: { not: null } },
      _sum: { quantity: true, lineTotal: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
  ]);

  const validToday = todayOrders.filter((o) => !["CANCELLED", "REJECTED"].includes(o.status));
  const todaySales = validToday.reduce((acc, o) => acc + toNumber(o.total), 0);
  const avgOrder = validToday.length ? todaySales / validToday.length : 0;
  const monthSales = monthOrders.reduce((acc, o) => acc + toNumber(o.total), 0);
  const occupiedTables = tables.filter((tb) => tb.status === "OCCUPIED").length;
  const preparing = todayOrders.filter((o) => o.status === "PREPARING").length;
  const newOrders = todayOrders.filter((o) => o.status === "NEW").length;

  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today.getTime() - (6 - index) * 86400000);
    const label = new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", { weekday: "short" }).format(date);
    const dayOrders = weekOrders.filter((o) => startOfDay(o.createdAt).getTime() === date.getTime());
    return {
      label,
      sales: dayOrders.reduce((acc, o) => acc + toNumber(o.total), 0),
      orders: dayOrders.length,
    } satisfies SalesPoint;
  });

  const topProducts = await db.product.findMany({
    where: { id: { in: topItems.map((item) => item.productId!).filter(Boolean) } },
    select: { id: true, nameAr: true, nameEn: true, imageUrl: true, price: true },
  });
  const topProductsMap = new Map(topProducts.map((p) => [p.id, p]));

  return (
    <div>
      <PageHeader
        title={`${locale === "ar" ? "أهلاً" : "Welcome"}, ${membership.auth.user.name.split(" ")[0]}`}
        description={
          locale === "ar"
            ? "هذه نظرة سريعة على أداء مطعمك اليوم."
            : "Here's a quick look at how your restaurant is performing today."
        }
        breadcrumbs={[{ label: t("nav.main") }, { label: t("nav.overview") }]}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/app/orders/create">
                <Plus />
                {t("nav.newOrder")}
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/app/menu/products">
                <UtensilsCrossed />
                {locale === "ar" ? "إضافة منتج" : "Add product"}
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/app/reports/sales">
                <TrendingUp />
                {locale === "ar" ? "عرض التقارير" : "View reports"}
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={locale === "ar" ? "مبيعات اليوم" : "Today's sales"}
          value={formatMoney(todaySales, currency, locale)}
          icon={<BadgeDollarSign />}
          trend={{ value: 12.4 }}
          hint={locale === "ar" ? "مقارنة بالأمس" : "vs yesterday"}
        />
        <StatCard
          label={locale === "ar" ? "طلبات اليوم" : "Orders today"}
          value={formatNumber(todayOrders.length, locale)}
          icon={<ShoppingBag />}
          accent="sky"
          trend={{ value: 8.1 }}
          hint={locale === "ar" ? "مقارنة بالأمس" : "vs yesterday"}
        />
        <StatCard
          label={locale === "ar" ? "متوسط قيمة الطلب" : "Average order value"}
          value={formatMoney(avgOrder, currency, locale)}
          icon={<ReceiptText />}
          accent="violet"
          trend={{ value: 3.2 }}
          hint={locale === "ar" ? "آخر 30 يوم" : "Last 30 days"}
        />
        <StatCard
          label={locale === "ar" ? "الطاولات المشغولة" : "Occupied tables"}
          value={
            <span dir="ltr" className="inline-block">
              {formatNumber(occupiedTables, locale)} / {formatNumber(tables.length, locale)}
            </span>
          }
          icon={<Grid2x2 />}
          accent="amber"
          hint={locale === "ar" ? "من إجمالي الطاولات" : "of total tables"}
        />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <StatCard
          label={locale === "ar" ? "الطلبات الجديدة" : "New orders"}
          value={formatNumber(newOrders, locale)}
          icon={<ClipboardList />}
          accent="rose"
        />
        <StatCard
          label={locale === "ar" ? "قيد التحضير" : "Preparing"}
          value={formatNumber(preparing, locale)}
          icon={<ChefHat />}
          accent="amber"
        />
        <StatCard
          label={locale === "ar" ? "مبيعات الشهر" : "Monthly sales"}
          value={formatMoney(monthSales, currency, locale)}
          icon={<ArrowUpRight />}
          accent="primary"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border bg-card p-5 shadow-soft lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">{locale === "ar" ? "المبيعات خلال الأسبوع" : "Sales this week"}</h2>
              <p className="text-xs text-muted-foreground">
                {locale === "ar" ? "آخر 7 أيام" : "Last 7 days"}
              </p>
            </div>
            <Badge variant="success" className="gap-1">
              <TrendingUp className="size-3" />
              {formatMoney(days.reduce((a, d) => a + d.sales, 0), currency, locale)}
            </Badge>
          </div>
          <SalesAreaChart data={days} currency={currency} locale={locale} />
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">{locale === "ar" ? "الأكثر مبيعاً" : "Top products"}</h2>
            <Link href="/app/reports/products" className="text-xs font-medium text-primary hover:underline">
              {t("common.viewAll")}
            </Link>
          </div>
          <div className="space-y-3">
            {topItems.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">{t("common.noData")}</p>
            ) : (
              topItems.map((item, index) => {
                const product = item.productId ? topProductsMap.get(item.productId) : null;
                if (!product) return null;
                return (
                  <div key={product.id} className="flex items-center gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-muted text-[11px] font-bold text-muted-foreground">
                      {index + 1}
                    </span>
                    <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                      {product.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={product.imageUrl} alt="" className="size-full object-cover" />
                      ) : (
                        <UtensilsCrossed className="size-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{locale === "ar" ? product.nameAr : product.nameEn || product.nameAr}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatNumber(item._sum.quantity ?? 0, locale)} {locale === "ar" ? "طلب" : "sold"}
                      </p>
                    </div>
                    <span className="text-xs font-semibold tabular">
                      {formatMoney(item._sum.lineTotal ?? 0, currency, locale)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border bg-card shadow-soft">
        <div className="flex items-center justify-between border-b p-5">
          <div>
            <h2 className="text-base font-semibold">{locale === "ar" ? "آخر الطلبات" : "Recent orders"}</h2>
            <p className="text-xs text-muted-foreground">
              {locale === "ar" ? "أحدث الطلبات الواردة" : "Latest incoming orders"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/app/orders">
                {t("common.viewAll")}
                <ArrowUpRight className="size-3.5" />
              </Link>
            </Button>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("common.order")}</TableHead>
              <TableHead>{t("common.table")}</TableHead>
              <TableHead>{t("common.type")}</TableHead>
              <TableHead>{t("common.total")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead>{t("common.time")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  {t("common.noData")}
                </TableCell>
              </TableRow>
            ) : (
              recentOrders.map((order) => {
                const status = statusMeta(ORDER_STATUS, order.status, locale);
                const type = statusMeta(ORDER_TYPE, order.type, locale);
                return (
                  <TableRow key={order.id}>
                    <TableCell>
                      <Link href={`/app/orders/${order.id}`} className="font-semibold text-primary hover:underline" dir="ltr">
                        #{order.orderNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">
                      {order.table ? `${locale === "ar" ? "طاولة" : "Table"} ${order.table.number}` : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={type.variant}>{type.label}</Badge>
                    </TableCell>
                    <TableCell className="font-semibold tabular">
                      {formatMoney(order.total, order.currency, locale)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Clock3 className="size-3" />
                        {formatTime(order.createdAt, locale)}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
        <RefreshCw className="size-3" />
        {locale === "ar" ? "تُحدَّث البيانات تلقائياً عند كل زيارة" : "Data refreshes on every visit"}
      </p>
    </div>
  );
}
