import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireRestaurant } from "@/lib/auth/context";
import { branchIdsForPermission } from "@/lib/auth/scope";
import { buildStaffActivityWhere, parseDateFilter } from "@/lib/services/staff-activity";
import { getLocale } from "@/i18n";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 50;
function param(value: string | string[] | undefined): string { return typeof value === "string" ? value : ""; }
function jsonText(value: Prisma.JsonValue | null): string { return value === null ? "—" : JSON.stringify(value, null, 2); }

export default async function StaffActivityPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const member = await requireRestaurant("staff.activity.view");
  const locale = await getLocale();
  const params = await searchParams;
  const actorId = param(params?.actor).slice(0, 100);
  const branchId = param(params?.branch).slice(0, 100);
  const actionFilter = param(params?.action).trim().slice(0, 100);
  const entity = param(params?.entity).trim().slice(0, 100);
  const q = param(params?.q).trim().slice(0, 160);
  const from = parseDateFilter(param(params?.from) || undefined);
  const to = parseDateFilter(param(params?.to) || undefined, true);
  const page = Math.max(1, Math.min(10_000, Number.parseInt(param(params?.page) || "1", 10) || 1));
  const where = buildStaffActivityWhere(member, { actorId: actorId || undefined, branchId: branchId || undefined, action: actionFilter || undefined, entity: entity || undefined, q: q || undefined, from, toExclusive: to });
  const baseWhere = buildStaffActivityWhere(member);
  const visibleBranches = branchIdsForPermission(member, "staff.activity.view");
  const branchWhere: Prisma.BranchWhereInput = {
    restaurantId: member.restaurantId,
    isActive: true,
    ...(visibleBranches && !member.isOwner ? { id: { in: visibleBranches } } : {}),
  };
  const [entries, total, branches, actorRefs] = await Promise.all([
    db.staffActivityLog.findMany({
      where,
      include: { actor: { select: { id: true, name: true, email: true } }, branch: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.staffActivityLog.count({ where }),
    db.branch.findMany({ where: branchWhere, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.staffActivityLog.findMany({ where: { ...baseWhere, actorId: { not: null } }, distinct: ["actorId"], select: { actorId: true }, take: 250 }),
  ]);
  const actorIds = actorRefs.map((item) => item.actorId).filter((id): id is string => !!id);
  const actors = actorIds.length ? await db.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true, email: true }, orderBy: { name: "asc" } }) : [];
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const ar = locale === "ar";
  const dateFormatter = new Intl.DateTimeFormat(ar ? "ar" : "en", { dateStyle: "medium", timeStyle: "short", timeZone: member.restaurant.timezone || "UTC" });
  const paramsForLink = new URLSearchParams();
  for (const [key, value] of Object.entries({ actor: actorId, branch: branchId, action: actionFilter, entity, q, from: param(params?.from), to: param(params?.to) })) if (value) paramsForLink.set(key, value);
  const exportHref = `/api/staff/activity/export${paramsForLink.size ? `?${paramsForLink.toString()}` : ""}`;
  const pageHref = (nextPage: number) => {
    const next = new URLSearchParams(paramsForLink);
    next.set("page", String(nextPage));
    return `/app/staff/activity?${next.toString()}`;
  };

  return <main className="space-y-6 p-4 md:p-8" dir={ar ? "rtl" : "ltr"}>
    <header className="flex flex-wrap items-end justify-between gap-3"><div><a className="text-sm text-emerald-700 underline" href="/app/staff">{ar ? "العودة إلى الموظفين" : "Back to employees"}</a><h1 className="mt-2 text-3xl font-bold">{ar ? "سجل النشاط" : "Activity log"}</h1><p className="mt-2 text-sm text-slate-600">{ar ? "سجل تدقيق خاص بهذا المطعم فقط. قد تُحجب القيم الحساسة تلقائياً." : "Tenant-scoped audit history. Sensitive values are redacted automatically."}</p></div><a href={exportHref} className="rounded-lg border px-4 py-2 text-sm font-medium">{ar ? "تصدير CSV (حتى 5000)" : "Export CSV (up to 5,000)"}</a></header>
    <form method="get" className="grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
      <label className="grid gap-1 text-xs">{ar ? "بحث عام" : "Search"}<input name="q" defaultValue={q} className="rounded-lg border px-3 py-2 text-sm" placeholder={ar ? "إجراء، مورد، وصف، موظف" : "Action, entity, description, employee"} /></label>
      <label className="grid gap-1 text-xs">{ar ? "الموظف" : "Employee"}<select name="actor" defaultValue={actorId} className="rounded-lg border px-3 py-2 text-sm"><option value="">{ar ? "الكل" : "All"}</option>{actors.map((actor) => <option key={actor.id} value={actor.id}>{actor.name || actor.email} · {actor.email}</option>)}</select></label>
      <label className="grid gap-1 text-xs">{ar ? "الفرع" : "Branch"}<select name="branch" defaultValue={branchId} className="rounded-lg border px-3 py-2 text-sm"><option value="">{ar ? "كل الفروع المتاحة" : "All accessible branches"}</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
      <label className="grid gap-1 text-xs">{ar ? "نوع الإجراء" : "Action"}<input name="action" defaultValue={actionFilter} className="rounded-lg border px-3 py-2 text-sm" placeholder="menu.product.updated" /></label>
      <label className="grid gap-1 text-xs">{ar ? "نوع العنصر" : "Entity"}<input name="entity" defaultValue={entity} className="rounded-lg border px-3 py-2 text-sm" placeholder="Product / Order" /></label>
      <label className="grid gap-1 text-xs">{ar ? "من تاريخ" : "From"}<input type="date" name="from" defaultValue={param(params?.from)} className="rounded-lg border px-3 py-2 text-sm" /></label>
      <label className="grid gap-1 text-xs">{ar ? "إلى تاريخ" : "To"}<input type="date" name="to" defaultValue={param(params?.to)} className="rounded-lg border px-3 py-2 text-sm" /></label>
      <button className="self-end rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">{ar ? "تطبيق الفلاتر" : "Apply filters"}</button>
    </form>
    <p className="text-sm text-slate-500">{total.toLocaleString(ar ? "ar" : "en")} {ar ? "سجل مطابق" : "matching entries"} · {ar ? `الصفحة ${page} من ${pages}` : `Page ${page} of ${pages}`}</p>
    {entries.length ? <section className="space-y-3">{entries.map((entry) => <article key={entry.id} className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">{entry.action}</h2><p className="mt-1 text-sm text-slate-600">{entry.entity}{entry.entityId ? ` · ${entry.entityId}` : ""}{entry.branch ? ` · ${entry.branch.name}` : ""}</p><p className="mt-1 text-xs text-slate-500">{entry.actor?.name || entry.actor?.email || (ar ? "النظام" : "System")} · {dateFormatter.format(entry.createdAt)}</p>{entry.description ? <p className="mt-2 text-sm">{entry.description}</p> : null}</div></div>
      {entry.oldValue !== null || entry.newValue !== null ? <details className="mt-3 rounded-lg bg-slate-50 p-3"><summary className="cursor-pointer text-sm font-medium">{ar ? "تفاصيل التغيير — قبل / بعد" : "Change details — before / after"}</summary><div className="mt-3 grid gap-3 lg:grid-cols-2">{entry.oldValue !== null ? <div><h3 className="text-xs font-semibold text-slate-600">{ar ? "القيمة القديمة" : "Old value"}</h3><pre className="mt-1 max-h-80 overflow-auto whitespace-pre-wrap break-all rounded bg-white p-3 text-xs">{jsonText(entry.oldValue)}</pre></div> : null}{entry.newValue !== null ? <div><h3 className="text-xs font-semibold text-slate-600">{ar ? "القيمة الجديدة" : "New value"}</h3><pre className="mt-1 max-h-80 overflow-auto whitespace-pre-wrap break-all rounded bg-white p-3 text-xs">{jsonText(entry.newValue)}</pre></div> : null}</div></details> : null}
    </article>)}</section> : <div className="rounded-xl border border-dashed bg-white p-10 text-center text-sm text-slate-500">{ar ? "لا توجد أحداث مطابقة للفلاتر." : "No matching activity."}</div>}
    <nav className="flex justify-between"><a aria-disabled={page <= 1} className={`rounded-lg border px-3 py-2 text-sm ${page <= 1 ? "pointer-events-none opacity-40" : ""}`} href={pageHref(Math.max(1, page - 1))}>{ar ? "السابق" : "Previous"}</a><a aria-disabled={page >= pages} className={`rounded-lg border px-3 py-2 text-sm ${page >= pages ? "pointer-events-none opacity-40" : ""}`} href={pageHref(Math.min(pages, page + 1))}>{ar ? "التالي" : "Next"}</a></nav>
  </main>;
}
