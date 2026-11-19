"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BellRing, ChefHat, CirclePause, Clock3, Printer, RefreshCw, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { assignProductStationAction, createKitchenStationAction, delayKitchenTicketAction, markKitchenTicketReadyAction, startKitchenTicketAction, updateKitchenItemAction } from "@/app/actions/operations";

type Locale = "ar" | "en";
type Ticket = {
  id: string; ticketNumber: number; status: string; note: string | null; createdAt: string; startedAt: string | null;
  station: { id: string; name: string; type: string; color: string } | null;
  order: { id: string; orderNumber: number; type: string; status: string; createdAt: string; notes: string | null; table: { number: string; name: string | null } | null; items: { id: string; name: string; quantity: number; notes: string | null; status: string; orderItem: { modifiers: { groupName: string; name: string }[] } | null }[] };
};
type Station = { id: string; name: string; type: string; color: string };
type Product = { id: string; nameAr: string; nameEn: string | null; category: { nameAr: string } | null; defaultStationId: string | null };
const tx = (locale: Locale, ar: string, en: string) => locale === "ar" ? ar : en;
const typeLabel = (locale: Locale, type: string) => ({ DINE_IN: tx(locale, "داخل المطعم", "Dine-in"), PICKUP: tx(locale, "استلام", "Pickup"), DELIVERY: tx(locale, "توصيل", "Delivery") }[type] ?? type);

function useLiveRefresh() {
  const router = useRouter();
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const refresh = () => { setOnline(navigator.onLine); if (navigator.onLine) router.refresh(); };
    const timer = window.setInterval(() => { if (document.visibilityState === "visible" && navigator.onLine) router.refresh(); }, 7000);
    window.addEventListener("online", refresh);
    window.addEventListener("offline", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("online", refresh); window.removeEventListener("offline", refresh); };
  }, [router]);
  return online;
}

function elapsed(startedAt: string, now: number) {
  const seconds = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export function KitchenDisplay({ locale, restaurantName, tickets, stations, products, canManageStations, canManageTickets }: { locale: Locale; restaurantName: string; tickets: Ticket[]; stations: Station[]; products: Product[]; canManageStations: boolean; canManageTickets: boolean }) {
  const online = useLiveRefresh();
  const [now, setNow] = useState(Date.now());
  const [stationId, setStationId] = useState("all");
  const [delayId, setDelayId] = useState<string | null>(null);
  const [printTicketId, setPrintTicketId] = useState<string | null>(null);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  useEffect(() => { if (!printTicketId) return; const timer = window.setTimeout(() => window.print(), 100); const afterPrint = () => setPrintTicketId(null); window.addEventListener("afterprint", afterPrint); return () => { window.clearTimeout(timer); window.removeEventListener("afterprint", afterPrint); }; }, [printTicketId]);
  const filtered = useMemo(() => stationId === "all" ? tickets : tickets.filter((ticket) => ticket.station?.id === stationId), [tickets, stationId]);
  const columns = [
    { id: "QUEUED", title: tx(locale, "طلبات جديدة", "New orders"), tint: "border-sky-200 bg-sky-50/70 dark:border-sky-900 dark:bg-sky-950/30", icon: BellRing },
    { id: "PREPARING", title: tx(locale, "قيد التحضير", "Preparing"), tint: "border-amber-200 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/30", icon: ChefHat },
    { id: "READY", title: tx(locale, "جاهزة", "Ready"), tint: "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/30", icon: UtensilsCrossed },
  ];
  return <div className="space-y-6">
    {printTicketId && <style>{`@media print { body * { visibility: hidden !important; } .kds-ticket-print, .kds-ticket-print * { visibility: visible !important; } .kds-ticket-print { position: absolute !important; inset: 0 !important; width: 100% !important; border: 0 !important; box-shadow: none !important; color: #111827 !important; } }`}</style>}
    <section className="flex flex-wrap items-end justify-between gap-4 print:hidden">
      <div><div className="mb-2 inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-semibold"><span className={`size-2 rounded-full ${online ? "bg-emerald-500" : "bg-red-500"}`} />{online ? tx(locale, "متصل · مزامنة دورية", "Online · periodic refresh") : tx(locale, "غير متصل · ستتم المزامنة عند العودة", "Offline · will sync when reconnected")}</div><h1 className="text-3xl font-bold tracking-tight">{tx(locale, "شاشة المطبخ", "Kitchen display")}</h1><p className="mt-1 text-sm text-muted-foreground">{restaurantName} · {tx(locale, "تابع الطلبات ومحطات التحضير دون عرض البيانات المالية", "Track tickets and prep stations without financial data")}</p></div>
      <div className="flex flex-wrap items-center gap-2"><label className="sr-only" htmlFor="station-filter">{tx(locale, "محطة التحضير", "Prep station")}</label><select id="station-filter" value={stationId} onChange={(event) => setStationId(event.target.value)} className="h-11 min-w-48 rounded-xl border bg-background px-3 text-sm"><option value="all">{tx(locale, "كل المحطات", "All stations")}</option>{stations.map((station) => <option key={station.id} value={station.id}>{station.name}</option>)}</select><Button variant="outline" className="min-h-11" onClick={() => window.print()}><Printer className="size-4"/>{tx(locale, "طباعة الشاشة", "Print board")}</Button></div>
    </section>
    {!canManageTickets && <Card className="border-sky-200 bg-sky-50 p-3 text-sm dark:bg-sky-950/30">{tx(locale, "وضع العرض فقط: لا تملك صلاحية تحديث حالة التحضير.", "View-only mode: you cannot update preparation status.")}</Card>}
    {!stations.length && <Card className="border-amber-300 bg-amber-50 p-5 text-sm dark:bg-amber-950/30">{tx(locale, "لا توجد محطات تحضير نشطة. اطلب من مدير النظام إنشاء محطة قبل استقبال الطلبات.", "No active prep stations. Ask a manager to create a station before receiving tickets.")}</Card>}
    <div className="grid items-start gap-4 xl:grid-cols-3">
      {columns.map((column) => {
        const Icon = column.icon;
        const list = filtered.filter((ticket) => ticket.status === column.id || (column.id === "QUEUED" && ticket.status === "DELAYED"));
        return <section key={column.id} className={`min-h-[380px] rounded-2xl border p-3 sm:p-4 ${column.tint}`} aria-label={column.title}>
          <div className="mb-4 flex items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-lg font-bold"><Icon className="size-5"/>{column.title}</h2><span className="rounded-full bg-background px-3 py-1 text-sm font-bold tabular-nums">{list.length}</span></div>
          <div className="space-y-3">{list.map((ticket) => <Card key={ticket.id} className={`overflow-hidden border-0 bg-background shadow-md ${printTicketId === ticket.id ? "kds-ticket-print" : ""}`}>
            <div className="h-1.5" style={{ backgroundColor: ticket.station?.color ?? "#10b981" }} />
            <div className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><span className="text-2xl font-black tabular-nums">#{ticket.order.orderNumber}</span>{ticket.order.table && <span className="rounded-lg bg-muted px-2 py-1 text-sm font-bold">{tx(locale, "طاولة", "Table")} {ticket.order.table.number}</span>}</div><p className="mt-1 text-xs text-muted-foreground">{typeLabel(locale, ticket.order.type)} · {ticket.station?.name ?? tx(locale, "غير معينة", "Unassigned")}</p></div><div className="text-end"><span className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-bold tabular-nums ${now - new Date(ticket.createdAt).getTime() > 20 * 60 * 1000 ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200" : "bg-muted"}`}><Clock3 className="size-4"/>{elapsed(ticket.createdAt, now)}</span><p className="mt-1 text-[11px] text-muted-foreground">{new Date(ticket.createdAt).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}</p></div></div>
              {ticket.order.notes && <p className="rounded-xl border border-dashed p-2 text-sm">{tx(locale, "ملاحظة الطلب: ", "Order note: ")}{ticket.order.notes}</p>}
              {ticket.status === "DELAYED" && <p className="flex gap-2 rounded-xl bg-orange-100 p-2 text-sm text-orange-950 dark:bg-orange-950 dark:text-orange-100"><CirclePause className="size-4 shrink-0"/>{ticket.note}</p>}
              <ul className="divide-y rounded-xl border">{ticket.order.items.map((item) => <li key={item.id} className="p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-bold"><span className="me-2 inline-flex min-w-8 justify-center rounded-md bg-primary/10 px-2 py-1 text-primary">×{item.quantity}</span>{item.name}</p>{item.orderItem?.modifiers.length ? <p className="mt-1 ps-10 text-xs text-muted-foreground">{item.orderItem.modifiers.map((modifier) => modifier.name).join(" · ")}</p> : null}{item.notes && <p className="mt-1 ps-10 text-sm text-amber-700 dark:text-amber-300">{tx(locale, "ملاحظة: ", "Note: ")}{item.notes}</p>}</div><span className="shrink-0 rounded-md bg-muted px-2 py-1 text-[11px]">{item.status === "READY" ? tx(locale, "جاهز", "Ready") : item.status === "PREPARING" ? tx(locale, "يُحضّر", "Preparing") : tx(locale, "جديد", "New")}</span></div>
                {canManageTickets && ticket.status !== "READY" && item.status !== "READY" && <form action={updateKitchenItemAction} className="mt-2 ps-10"><input type="hidden" name="itemId" value={item.id}/><input type="hidden" name="status" value={item.status === "QUEUED" ? "PREPARING" : "READY"}/><Button size="sm" variant={item.status === "QUEUED" ? "outline" : "success"} className="min-h-10">{item.status === "QUEUED" ? tx(locale, "بدء الصنف", "Start item") : tx(locale, "إنهاء الصنف", "Mark item ready")}</Button></form>}
              </li>)}</ul>
              <div className="flex flex-wrap gap-2 print:hidden">
                {canManageTickets && (ticket.status === "QUEUED" || ticket.status === "DELAYED") && <form action={startKitchenTicketAction}><input type="hidden" name="ticketId" value={ticket.id}/><Button className="min-h-11" size="sm"><ChefHat className="size-4"/>{tx(locale, "بدء التحضير", "Start preparation")}</Button></form>}
                {canManageTickets && ticket.status !== "READY" && <form action={markKitchenTicketReadyAction}><input type="hidden" name="ticketId" value={ticket.id}/><Button className="min-h-11" size="sm" variant="success"><BellRing className="size-4"/>{tx(locale, "تحديد جاهز", "Mark ready")}</Button></form>}
                <Button className="min-h-11" size="sm" variant="outline" onClick={() => setPrintTicketId(ticket.id)}><Printer className="size-4"/>{tx(locale, "طباعة", "Print")}</Button>
                {canManageTickets && <Button className="min-h-11" size="sm" variant="ghost" onClick={() => setDelayId(delayId === ticket.id ? null : ticket.id)}><CirclePause className="size-4"/>{tx(locale, "تأجيل", "Delay")}</Button>}
              </div>
              {canManageTickets && delayId === ticket.id && <form action={delayKitchenTicketAction} className="flex gap-2 print:hidden"><input type="hidden" name="ticketId" value={ticket.id}/><Input name="reason" required minLength={2} maxLength={500} placeholder={tx(locale, "سبب التأجيل", "Reason for delay")}/><Button size="sm" variant="outline">{tx(locale, "حفظ السبب", "Save reason")}</Button></form>}
              <details className="text-xs text-muted-foreground"><summary className="cursor-pointer select-none font-semibold">{tx(locale, "تفاصيل الطلب", "Order details")}</summary><div className="mt-2 space-y-1"><p>{tx(locale, "وقت الإنشاء: ", "Received: ")}{new Date(ticket.order.createdAt).toLocaleString(locale)}</p><p>{tx(locale, "المحطة بدأت: ", "Station started: ")}{ticket.startedAt ? new Date(ticket.startedAt).toLocaleTimeString(locale) : tx(locale, "لم تبدأ", "Not started")}</p></div></details>
            </div>
          </Card>)}{!list.length && <div className="rounded-xl border border-dashed bg-background/70 p-8 text-center text-sm text-muted-foreground">{tx(locale, "لا توجد تذاكر هنا الآن", "No tickets here right now")}</div>}</div>
        </section>;
      })}
    </div>
    {canManageStations && <section className="print:hidden"><details className="rounded-2xl border bg-background"><summary className="cursor-pointer list-none p-5 font-bold"><span className="inline-flex items-center gap-2"><UtensilsCrossed className="size-5 text-primary"/>{tx(locale, "إدارة المحطات وتوجيه المنتجات", "Station & product routing")}</span><span className="ms-2 text-xs text-muted-foreground">{tx(locale, "إدارة الصلاحيات المطلوبة", "Station manager permission required")}</span></summary><div className="grid gap-6 border-t p-5 lg:grid-cols-[minmax(260px,0.8fr)_1.2fr]">
      <div><h3 className="mb-3 font-semibold">{tx(locale, "إضافة محطة", "Add a station")}</h3><form action={createKitchenStationAction} className="grid gap-3 sm:grid-cols-[1fr_3.5rem_1fr_auto]"><Input name="name" required minLength={2} maxLength={80} placeholder={tx(locale, "مثال: المطبخ الرئيسي", "e.g. Main kitchen")}/><input type="color" name="color" defaultValue="#0ea5e9" aria-label={tx(locale, "لون المحطة", "Station color")} className="h-10 w-14 rounded-lg border bg-background p-1"/><select name="type" className="h-10 rounded-xl border bg-background px-3 text-sm"><option value="KITCHEN">{tx(locale, "مطبخ", "Kitchen")}</option><option value="BAR">{tx(locale, "مشروبات", "Bar / Drinks")}</option><option value="GRILL">{tx(locale, "شواية", "Grill")}</option><option value="DESSERT">{tx(locale, "حلويات", "Dessert")}</option><option value="CUSTOM">{tx(locale, "مخصصة", "Custom")}</option></select><Button className="min-h-10"><RefreshCw className="size-4"/>{tx(locale, "إضافة", "Add")}</Button></form></div>
      <div><h3 className="mb-3 font-semibold">{tx(locale, "تعيين المحطة الافتراضية للمنتجات", "Assign product prep stations")}</h3><div className="max-h-80 space-y-2 overflow-auto rounded-xl border p-3">{products.map((product) => <form key={product.id} action={assignProductStationAction} className="flex flex-wrap items-center gap-2 border-b pb-2 last:border-0"><input type="hidden" name="productId" value={product.id}/><span className="min-w-36 flex-1 text-sm font-medium">{locale === "ar" ? product.nameAr : product.nameEn || product.nameAr}<span className="block text-xs text-muted-foreground">{product.category?.nameAr ?? "—"}</span></span><select name="stationId" defaultValue={product.defaultStationId ?? ""} className="h-10 min-w-40 rounded-lg border bg-background px-2 text-sm"><option value="">{tx(locale, "المطبخ الافتراضي", "Default kitchen")}</option>{stations.map((station) => <option key={station.id} value={station.id}>{station.name}</option>)}</select><Button size="sm" variant="outline" className="min-h-10">{tx(locale, "حفظ", "Save")}</Button></form>)}</div></div>
    </div></details></section>}
  </div>;
}
