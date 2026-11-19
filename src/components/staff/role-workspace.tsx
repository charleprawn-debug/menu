"use client";

import { useActionState, useState } from "react";
import { deleteRoleAction, saveRoleAction, type StaffActionState } from "@/app/actions/staff";

export interface PermissionCatalogItem {
  key: string; group: string; labelAr: string; labelEn: string; description?: string | null; isSensitive: boolean;
}
export interface RolePermissionItem { key: string; scope: "RESTAURANT" | "BRANCH" | "OWNED" }
export interface RoleWorkspaceItem {
  id: string; key: string; name: string; nameEn: string | null; description: string | null;
  isSystem: boolean; isDefault: boolean; memberCount: number; permissions: RolePermissionItem[];
}

const scopeLabels = {
  ar: { RESTAURANT: "المطعم بالكامل", BRANCH: "الفروع المسموحة", OWNED: "الموارد المسندة/المملوكة" },
  en: { RESTAURANT: "Whole restaurant", BRANCH: "Assigned branches", OWNED: "Owned/assigned resources" },
};

function RoleEditor(props: {
  locale: string; role: RoleWorkspaceItem | null; canManage: boolean; catalog: PermissionCatalogItem[];
  initialName?: string; initialNameEn?: string; initialDescription?: string;
  initialPermissions?: RolePermissionItem[];
}) {
  const ar = props.locale === "ar";
  const [name, setName] = useState(props.initialName ?? props.role?.name ?? "");
  const [nameEn, setNameEn] = useState(props.initialNameEn ?? props.role?.nameEn ?? "");
  const [description, setDescription] = useState(props.initialDescription ?? props.role?.description ?? "");
  const [permissionMap, setPermissionMap] = useState<Record<string, RolePermissionItem["scope"]>>(
    Object.fromEntries((props.role?.permissions ?? props.initialPermissions ?? []).map((item) => [item.key, item.scope])),
  );
  const [state, action, pending] = useActionState(saveRoleAction, {} as StaffActionState);
  const groups = [...new Set(props.catalog.map((item) => item.group))];
  const selectedPermissions = Object.entries(permissionMap).map(([key, scope]) => ({ key, scope }));
  const updatePermission = (item: PermissionCatalogItem, checked: boolean) => setPermissionMap((old) => {
    const next = { ...old };
    if (checked) next[item.key] = next[item.key] ?? "RESTAURANT";
    else delete next[item.key];
    return next;
  });
  const selectAll = () => setPermissionMap(Object.fromEntries(props.catalog.map((item) => [item.key, permissionMap[item.key] ?? "RESTAURANT"])));
  const clearAll = () => setPermissionMap({});
  return <section className="rounded-2xl border bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">{props.role ? (ar ? props.role.name : props.role.nameEn ?? props.role.name) : (ar ? "دور جديد / نسخة مخصصة" : "New / cloned role")}</h2><p className="mt-1 text-sm text-slate-500">{props.role?.isSystem ? (ar ? "دور افتراضي محمي من الحذف وتغيير الاسم؛ يمكن نسخُه وتخصيص النسخة." : "Default role: its name and deletion are protected. Copy it to customize.") : (ar ? "اختر أقل مجموعة صلاحيات ونطاق مناسب للمسؤولية." : "Grant only the permissions and scope required by the job.")}</p></div>{props.role ? <div className="text-xs text-slate-500">{props.role.memberCount} {ar ? "عضو مرتبط" : "assigned members"}</div> : null}</div>
    <form action={action} className="mt-5 space-y-5">
      <input type="hidden" name="roleId" value={props.role?.id ?? ""} />
      <input type="hidden" name="permissions" value={JSON.stringify(selectedPermissions)} />
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1 text-sm">{ar ? "اسم الدور (عربي)" : "Role name"}<input name="name" required minLength={2} maxLength={100} value={name} onChange={(event) => setName(event.target.value)} readOnly={!!props.role?.isSystem} className="rounded-lg border px-3 py-2 read-only:bg-slate-100" /></label>
        <label className="grid gap-1 text-sm">{ar ? "اسم الدور (إنجليزي)" : "English name"}<input name="nameEn" maxLength={100} value={nameEn} onChange={(event) => setNameEn(event.target.value)} readOnly={!!props.role?.isSystem} className="rounded-lg border px-3 py-2 read-only:bg-slate-100" /></label>
        <label className="grid gap-1 text-sm md:col-span-2">{ar ? "الوصف" : "Description"}<textarea name="description" maxLength={500} value={description} onChange={(event) => setDescription(event.target.value)} readOnly={!!props.role?.isSystem} className="min-h-20 rounded-lg border px-3 py-2 read-only:bg-slate-100" /></label>
      </div>
      <div className="flex flex-wrap gap-2">{props.canManage ? <><button type="button" onClick={selectAll} className="rounded-md border px-3 py-1.5 text-sm">{ar ? "تحديد الكل" : "Select all"}</button><button type="button" onClick={clearAll} className="rounded-md border px-3 py-1.5 text-sm">{ar ? "إلغاء تحديد الكل" : "Clear all"}</button></> : null}</div>
      {groups.map((group) => <section key={group} className="overflow-hidden rounded-xl border">
        <h3 className="bg-slate-50 px-4 py-2 font-semibold">{group}</h3>
        <div className="divide-y">{props.catalog.filter((item) => item.group === group).map((item) => <div key={item.key} className="grid gap-3 p-3 md:grid-cols-[minmax(220px,1fr)_220px] md:items-center">
          <label className="flex items-start gap-3"><input className="mt-1" type="checkbox" checked={!!permissionMap[item.key]} onChange={(event) => updatePermission(item, event.target.checked)} disabled={!props.canManage} /><span><span className="font-medium">{ar ? item.labelAr : item.labelEn}</span>{item.isSensitive ? <span className="ms-2 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] text-rose-800">{ar ? "حساسة" : "Sensitive"}</span> : null}<span className="block text-xs text-slate-500">{item.key}{item.description ? ` · ${item.description}` : ""}</span></span></label>
          {permissionMap[item.key] ? <select value={permissionMap[item.key]} disabled={!props.canManage} onChange={(event) => setPermissionMap((old) => ({ ...old, [item.key]: event.target.value as RolePermissionItem["scope"] }))} className="rounded-lg border px-2 py-1.5 text-sm">{(["RESTAURANT", "BRANCH", "OWNED"] as const).map((scope) => <option key={scope} value={scope}>{scopeLabels[ar ? "ar" : "en"][scope]}</option>)}</select> : <span className="text-xs text-slate-400">{ar ? "لا توجد صلاحية" : "Not granted"}</span>}
        </div>)}</div>
      </section>)}
      <div className="flex flex-wrap items-center gap-3">{props.canManage ? <button disabled={pending} className="rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white disabled:opacity-50">{pending ? (ar ? "جارٍ الحفظ…" : "Saving…") : (ar ? "حفظ الدور والصلاحيات" : "Save role and permissions")}</button> : <p className="text-sm text-slate-600">{ar ? "عرض فقط؛ يلزم staff.roles.manage للتعديل." : "Read-only; staff.roles.manage is required to edit."}</p>}</div>
    </form>
    {props.role && !props.role.isSystem && props.canManage ? <form action={deleteRoleAction} onSubmit={(event) => { if (!window.confirm(ar ? "حذف الدور نهائياً؟ لا يمكن حذف دور مرتبط بأعضاء." : "Delete this role? Roles assigned to members cannot be deleted.")) event.preventDefault(); }} className="mt-3"><input type="hidden" name="roleId" value={props.role.id} /><button className="rounded-lg border border-rose-200 px-4 py-2 text-sm text-rose-700">{ar ? "حذف الدور" : "Delete role"}</button></form> : null}
    {state.error || state.message ? <p className={`mt-3 rounded-lg p-3 text-sm ${state.error ? "bg-rose-50 text-rose-800" : "bg-emerald-50 text-emerald-800"}`} role={state.error ? "alert" : "status"}>{state.error ?? state.message}</p> : null}
  </section>;
}

export function RolesWorkspace(props: { locale: string; roles: RoleWorkspaceItem[]; catalog: PermissionCatalogItem[]; canManage: boolean }) {
  const ar = props.locale === "ar";
  const [selectedId, setSelectedId] = useState(props.roles[0]?.id ?? "");
  const [cloneFrom, setCloneFrom] = useState<RoleWorkspaceItem | null>(null);
  const selected = cloneFrom ?? props.roles.find((role) => role.id === selectedId) ?? null;
  const chooseRole = (id: string) => { setCloneFrom(null); setSelectedId(id); };
  const createNew = () => { setCloneFrom(null); setSelectedId(""); };
  const cloneRole = (role: RoleWorkspaceItem) => { setCloneFrom(role); setSelectedId(""); };
  return <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
    <aside className="space-y-3 rounded-2xl border bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><h2 className="font-semibold">{ar ? "الأدوار" : "Roles"}</h2>{props.canManage ? <button type="button" onClick={createNew} className="rounded-md bg-slate-900 px-2.5 py-1.5 text-xs text-white">{ar ? "جديد" : "New"}</button> : null}</div><div className="max-h-[70vh] space-y-1 overflow-auto">{props.roles.map((role) => <button type="button" key={role.id} onClick={() => chooseRole(role.id)} className={`w-full rounded-lg px-3 py-2 text-start ${selectedId === role.id && !cloneFrom ? "bg-emerald-50 text-emerald-900" : "hover:bg-slate-50"}`}><span className="block text-sm font-medium">{ar ? role.name : role.nameEn ?? role.name}</span><span className="text-xs text-slate-500">{role.isSystem ? (ar ? "افتراضي" : "Default") : (ar ? "مخصص" : "Custom")} · {role.memberCount}</span></button>)}</div></aside>
    <div className="space-y-4">{selected ? <div className="flex justify-end"><button type="button" disabled={!props.canManage} onClick={() => cloneRole(selected)} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50">{ar ? "نسخ الدور إلى دور مخصص" : "Copy as custom role"}</button></div> : null}<RoleEditor key={`${selected?.id ?? "new"}:${cloneFrom?.id ?? ""}`} locale={props.locale} role={cloneFrom ? null : selected} canManage={props.canManage} catalog={props.catalog} initialName={cloneFrom ? `${cloneFrom.name} (${ar ? "نسخة" : "copy"})` : undefined} initialNameEn={cloneFrom ? `${cloneFrom.nameEn ?? cloneFrom.name} copy` : undefined} initialDescription={cloneFrom?.description ?? undefined} initialPermissions={cloneFrom?.permissions} />{cloneFrom ? <div className="hidden" aria-hidden="true" /> : null}</div>
  </div>;
}

export function PermissionOverview(props: { locale: string; roles: RoleWorkspaceItem[]; catalog: PermissionCatalogItem[] }) {
  const ar = props.locale === "ar";
  return <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm"><table className="min-w-full border-collapse text-sm"><thead className="sticky top-0 bg-slate-50"><tr><th className="sticky start-0 z-10 min-w-64 border-b bg-slate-50 p-3 text-start">{ar ? "الصلاحية" : "Permission"}</th>{props.roles.map((role) => <th key={role.id} className="min-w-36 border-b p-3 text-center">{ar ? role.name : role.nameEn ?? role.name}</th>)}</tr></thead><tbody>{props.catalog.map((permission) => <tr key={permission.key} className="border-b last:border-0"><th className="sticky start-0 bg-white p-3 text-start font-medium">{ar ? permission.labelAr : permission.labelEn}<span className="block text-[10px] font-normal text-slate-500">{permission.key}</span></th>{props.roles.map((role) => { const grant = role.permissions.find((item) => item.key === permission.key); return <td key={`${role.id}:${permission.key}`} className="p-3 text-center">{grant ? <span className="inline-flex flex-col rounded-lg bg-emerald-50 px-2 py-1 text-xs text-emerald-900"><span>✓</span><span>{scopeLabels[ar ? "ar" : "en"][grant.scope]}</span></span> : <span className="text-slate-300">—</span>}</td>; })}</tr>)}</tbody></table></div>;
}
