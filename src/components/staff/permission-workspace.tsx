"use client";

import { useActionState, useState } from "react";
import { saveMemberOverridesAction, type StaffActionState } from "@/app/actions/staff";
import { PermissionOverview, type PermissionCatalogItem, type RoleWorkspaceItem } from "@/components/staff/role-workspace";

interface MemberOption { id: string; name: string; email: string }
interface Override { key: string; effect: "ALLOW" | "DENY"; scope: "RESTAURANT" | "BRANCH" | "OWNED" }
const scopes = ["RESTAURANT", "BRANCH", "OWNED"] as const;

export function PermissionWorkspace(props: {
  locale: string; roles: RoleWorkspaceItem[]; catalog: PermissionCatalogItem[]; members: MemberOption[];
  selectedMember: MemberOption | null; overrides: Override[]; canManageOverrides: boolean;
}) {
  const ar = props.locale === "ar";
  const [selection, setSelection] = useState<Record<string, { effect: "INHERIT" | "ALLOW" | "DENY"; scope: Override["scope"] }>>(
    Object.fromEntries(props.catalog.map((item) => {
      const existing = props.overrides.find((override) => override.key === item.key);
      return [item.key, { effect: existing?.effect ?? "INHERIT", scope: existing?.scope ?? "RESTAURANT" }];
    })),
  );
  const [state, action, pending] = useActionState(saveMemberOverridesAction, {} as StaffActionState);
  const overrides = Object.entries(selection).map(([key, value]) => ({ key, ...value }));
  return <div className="space-y-6">
    <section className="rounded-xl border bg-white p-4"><h2 className="font-semibold">{ar ? "مصفوفة الأدوار" : "Role permission matrix"}</h2><p className="mt-1 text-sm text-slate-500">{ar ? "توضح الصلاحيات الموروثة ونطاقها؛ تظل الحراسة الخادمية المرجع النهائي." : "Shows inherited grants and scope; server-side authorization remains authoritative."}</p><div className="mt-4"><PermissionOverview locale={props.locale} roles={props.roles} catalog={props.catalog} /></div></section>
    {props.canManageOverrides ? <section className="rounded-xl border bg-white p-4">
      <h2 className="font-semibold">{ar ? "استثناءات عضو محدد" : "Member-specific overrides"}</h2>
      <p className="mt-1 text-sm text-slate-500">{ar ? "ALLOW يضيف صلاحية، DENY يمنع صلاحية موروثة، وINHERIT يزيل الاستثناء. لا يمكنك تعديل استثناءاتك أنت." : "ALLOW grants, DENY blocks an inherited grant, and INHERIT removes the override. You cannot change your own overrides."}</p>
      <form method="get" className="mt-4 flex flex-wrap gap-2"><select name="member" defaultValue={props.selectedMember?.id ?? ""} className="min-w-64 rounded-lg border px-3 py-2"><option value="">{ar ? "اختر موظفاً" : "Select an employee"}</option>{props.members.map((member) => <option key={member.id} value={member.id}>{member.name} · {member.email}</option>)}</select><button className="rounded-lg bg-slate-900 px-4 py-2 text-white">{ar ? "تحميل" : "Load"}</button></form>
      {props.selectedMember ? <form action={action} className="mt-5 space-y-4"><input type="hidden" name="memberId" value={props.selectedMember.id} /><input type="hidden" name="overrides" value={JSON.stringify(overrides)} />
        <div className="space-y-2">{props.catalog.map((permission) => <div key={permission.key} className="grid gap-2 rounded-lg border p-3 md:grid-cols-[minmax(200px,1fr)_150px_220px] md:items-center"><div><p className="font-medium">{ar ? permission.labelAr : permission.labelEn}{permission.isSensitive ? <span className="ms-2 text-xs text-rose-700">{ar ? "حساسة" : "Sensitive"}</span> : null}</p><code className="text-[10px] text-slate-500">{permission.key}</code></div><select value={selection[permission.key]?.effect ?? "INHERIT"} onChange={(event) => setSelection((old) => ({ ...old, [permission.key]: { ...old[permission.key], effect: event.target.value as "INHERIT" | "ALLOW" | "DENY" } }))} className="rounded-lg border px-2 py-1.5"><option value="INHERIT">{ar ? "موروثة" : "Inherit"}</option><option value="ALLOW">ALLOW</option><option value="DENY">DENY</option></select><select disabled={selection[permission.key]?.effect !== "ALLOW"} value={selection[permission.key]?.scope ?? "RESTAURANT"} onChange={(event) => setSelection((old) => ({ ...old, [permission.key]: { ...old[permission.key], scope: event.target.value as Override["scope"] } }))} className="rounded-lg border px-2 py-1.5">{scopes.map((scope) => <option key={scope} value={scope}>{scope === "RESTAURANT" ? (ar ? "المطعم بالكامل" : "Whole restaurant") : scope === "BRANCH" ? (ar ? "الفروع المسموحة" : "Assigned branches") : (ar ? "الموارد المسندة" : "Owned/assigned")}</option>)}</select></div>)}</div>
        <button disabled={pending} className="rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white disabled:opacity-50">{pending ? (ar ? "جارٍ الحفظ…" : "Saving…") : (ar ? "حفظ استثناءات العضو" : "Save member overrides")}</button>
        {state.error || state.message ? <p className={`rounded-lg p-3 text-sm ${state.error ? "bg-rose-50 text-rose-800" : "bg-emerald-50 text-emerald-800"}`} role={state.error ? "alert" : "status"}>{state.error ?? state.message}</p> : null}
      </form> : null}
    </section> : null}
  </div>;
}
