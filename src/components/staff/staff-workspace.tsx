"use client";

import { useActionState, useState } from "react";
import {
  createStaffAction,
  deleteStaffMembershipAction,
  requestPasswordResetAction,
  resendInvitationAction,
  revokeInvitationAction,
  setStaffStatusAction,
  updateStaffAction,
  type StaffActionState,
} from "@/app/actions/staff";

export interface StaffBranchOption { id: string; name: string }
export interface StaffRoleOption { id: string; key: string; name: string; nameEn: string | null }
export interface StaffMemberRow {
  id: string; userId: string; name: string; email: string; pendingEmail: string | null; phone: string;
  status: string; accountStatus: string; isOwner: boolean; branchId: string | null; branchName: string | null;
  branchAccess: StaffBranchOption[]; roles: StaffRoleOption[]; lastLoginAt: string | null; createdAt: string;
}
export interface StaffInvitationRow {
  id: string; email: string; name: string; status: string; expiresAt: string; sendCount: number;
  roleName: string; branchNames: string[];
}

function dateLabel(value: string | null, locale: string) {
  if (!value) return locale === "ar" ? "لم يسجل دخولاً بعد" : "Never signed in";
  return new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function BranchChecks({ branches, selected = [], locale }: { branches: StaffBranchOption[]; selected?: string[]; locale: string }) {
  if (!branches.length) return <p className="text-sm text-amber-700">{locale === "ar" ? "لا توجد فروع متاحة لنطاقك الحالي." : "No branches are available in your current scope."}</p>;
  return <div className="flex flex-wrap gap-2">
    {branches.map((branch) => <label key={branch.id} className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm">
      <input type="checkbox" name="branchIds" value={branch.id} defaultChecked={selected.includes(branch.id)} />{branch.name}
    </label>)}
  </div>;
}

function Result({ state, locale }: { state: StaffActionState; locale: string }) {
  if (!state.error && !state.message) return null;
  return <div className={`mt-3 rounded-lg p-3 text-sm ${state.error ? "bg-rose-50 text-rose-800" : "bg-emerald-50 text-emerald-800"}`} role={state.error ? "alert" : "status"}>
    {state.error ?? state.message}
    {state.url ? <div className="mt-2 break-all"><a className="font-semibold underline" href={state.url} target="_blank" rel="noreferrer">{locale === "ar" ? "فتح الرابط المؤقت" : "Open the temporary link"}</a><p className="mt-1 text-xs">{locale === "ar" ? "هذا الرابط سري ولمرة واحدة؛ أرسله فقط إلى الموظف المعني." : "This is a secret single-use link; share it only with the intended employee."}</p></div> : null}
  </div>;
}

function CreateStaffForm({ locale, roles, branches, canInvite }: { locale: string; roles: StaffRoleOption[]; branches: StaffBranchOption[]; canInvite: boolean }) {
  const [mode, setMode] = useState<"invite" | "create">("invite");
  const [state, action, pending] = useActionState(createStaffAction, {} as StaffActionState);
  if (!canInvite) return null;
  return <section className="rounded-2xl border bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-lg font-semibold">{locale === "ar" ? "إضافة موظف" : "Add employee"}</h2><p className="mt-1 text-sm text-slate-500">{locale === "ar" ? "يمكن دعوة حساب موجود أو جديد، أو إنشاء حساب بكلمة مرور مباشرة." : "Invite an existing/new account, or create an account with a password."}</p></div>
      <div className="flex rounded-lg bg-slate-100 p-1 text-sm">
        <button type="button" onClick={() => setMode("invite")} className={`rounded-md px-3 py-1.5 ${mode === "invite" ? "bg-white shadow" : "text-slate-600"}`}>{locale === "ar" ? "دعوة" : "Invite"}</button>
        <button type="button" onClick={() => setMode("create")} className={`rounded-md px-3 py-1.5 ${mode === "create" ? "bg-white shadow" : "text-slate-600"}`}>{locale === "ar" ? "إنشاء مباشر" : "Direct create"}</button>
      </div>
    </div>
    <form action={action} className="mt-5 grid gap-4 md:grid-cols-2">
      <input type="hidden" name="mode" value={mode} />
      <label className="grid gap-1 text-sm">{locale === "ar" ? "الاسم" : "Name"}<input name="name" required minLength={2} maxLength={100} className="rounded-lg border px-3 py-2" /></label>
      <label className="grid gap-1 text-sm">{locale === "ar" ? "البريد الإلكتروني" : "Email"}<input name="email" required type="email" maxLength={254} className="rounded-lg border px-3 py-2" /></label>
      <label className="grid gap-1 text-sm">{locale === "ar" ? "الهاتف" : "Phone"}<input name="phone" type="tel" maxLength={40} className="rounded-lg border px-3 py-2" /></label>
      <label className="grid gap-1 text-sm">{locale === "ar" ? "الدور" : "Role"}<select name="roleId" required className="rounded-lg border px-3 py-2"><option value="">{locale === "ar" ? "اختر دوراً" : "Select a role"}</option>{roles.map((role) => <option key={role.id} value={role.id}>{locale === "ar" ? role.name : role.nameEn ?? role.name}</option>)}</select></label>
      {mode === "create" ? <>
        <label className="grid gap-1 text-sm">{locale === "ar" ? "كلمة المرور (8 أحرف على الأقل)" : "Password (at least 8 characters)"}<input name="password" required minLength={8} maxLength={128} type="password" autoComplete="new-password" className="rounded-lg border px-3 py-2" /></label>
        <label className="grid gap-1 text-sm">{locale === "ar" ? "تأكيد كلمة المرور" : "Confirm password"}<input name="confirmPassword" required minLength={8} maxLength={128} type="password" autoComplete="new-password" className="rounded-lg border px-3 py-2" /></label>
      </> : null}
      <fieldset className="grid gap-2 md:col-span-2"><legend className="mb-2 text-sm font-medium">{locale === "ar" ? "الوصول إلى الفروع" : "Branch access"}</legend><p className="text-xs text-slate-500">{locale === "ar" ? "اختر فرعاً واحداً أو أكثر. ترك الاختيار فارغاً يمنح وصولاً على مستوى المطعم، ولا يقبله نطاق مدير الفرع." : "Select one or more branches. Leaving this empty grants restaurant-wide access; branch-scoped managers cannot submit an empty selection."}</p><BranchChecks branches={branches} locale={locale} /></fieldset>
      {mode === "create" ? <p className="text-xs text-slate-500 md:col-span-2">{locale === "ar" ? "إذا كان البريد مرتبطاً بحساب قائم، استخدم الدعوة بدلاً من إنشاء حساب مكرر. يبقى الحساب عالمياً، والعضوية هنا خاصة بهذا المطعم." : "If the email already belongs to an account, use an invitation instead of duplicating the account. This membership is restaurant-specific."}</p> : null}
      <div className="md:col-span-2"><button disabled={pending} className="rounded-lg bg-emerald-700 px-4 py-2 font-medium text-white disabled:opacity-50">{pending ? (locale === "ar" ? "جارٍ الحفظ…" : "Saving…") : mode === "invite" ? (locale === "ar" ? "إنشاء الدعوة" : "Create invitation") : (locale === "ar" ? "إنشاء الحساب" : "Create account")}</button><Result state={state} locale={locale} /></div>
    </form>
  </section>;
}

function ResetPasswordForm({ memberId, locale }: { memberId: string; locale: string }) {
  const [state, action, pending] = useActionState(requestPasswordResetAction, {} as StaffActionState);
  return <form action={action} className="mt-2">
    <input type="hidden" name="memberId" value={memberId} />
    <button disabled={pending} className="rounded-md border px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50">{locale === "ar" ? "إرسال رابط إعادة تعيين كلمة المرور" : "Send password reset link"}</button>
    <Result state={state} locale={locale} />
  </form>;
}

function EditMemberForm({ member, roles, branches, locale }: { member: StaffMemberRow; roles: StaffRoleOption[]; branches: StaffBranchOption[]; locale: string }) {
  const [state, action, pending] = useActionState(updateStaffAction, {} as StaffActionState);
  const roleId = member.roles[0]?.id ?? "";
  return <details className="mt-4 rounded-xl bg-slate-50 p-4">
    <summary className="cursor-pointer text-sm font-semibold">{locale === "ar" ? "تعديل الموظف والفروع والدور" : "Edit employee, branches and role"}</summary>
    <form action={action} className="mt-4 grid gap-3 md:grid-cols-2">
      <input type="hidden" name="memberId" value={member.id} />
      <label className="grid gap-1 text-sm">{locale === "ar" ? "الاسم" : "Name"}<input name="name" required defaultValue={member.name} className="rounded-lg border px-3 py-2" /></label>
      <label className="grid gap-1 text-sm">{locale === "ar" ? "بريد الدخول" : "Sign-in email"}<input name="email" required type="email" defaultValue={member.email} className="rounded-lg border px-3 py-2" /></label>
      <label className="grid gap-1 text-sm">{locale === "ar" ? "الهاتف" : "Phone"}<input name="phone" type="tel" defaultValue={member.phone} className="rounded-lg border px-3 py-2" /></label>
      <label className="grid gap-1 text-sm">{locale === "ar" ? "الدور" : "Role"}<select name="roleId" required defaultValue={roleId} className="rounded-lg border px-3 py-2">{roles.map((role) => <option key={role.id} value={role.id}>{locale === "ar" ? role.name : role.nameEn ?? role.name}</option>)}</select></label>
      <p className="text-xs text-amber-800 md:col-span-2">{locale === "ar" ? "الاسم والهاتف والبريد يخصون حساب الدخول العالمي ويؤثر تغييرهما على عضويات المستخدم في المطاعم الأخرى. تغيير البريد لا يُفعّل إلا بعد تأكيده من عنوانه الجديد." : "Name, phone and email belong to the global sign-in account. An email change is applied only after confirmation at the new address."}</p>
      {member.pendingEmail ? <p className="text-xs text-amber-800 md:col-span-2">{locale === "ar" ? `تغيير بريد معلّق: ${member.pendingEmail}` : `Pending email change: ${member.pendingEmail}`}</p> : null}
      <fieldset className="grid gap-2 md:col-span-2"><legend className="mb-2 text-sm font-medium">{locale === "ar" ? "الفروع المسموحة" : "Allowed branches"}</legend><BranchChecks branches={branches} selected={member.branchAccess.map((branch) => branch.id)} locale={locale} /></fieldset>
      <div className="md:col-span-2"><button disabled={pending || member.isOwner} className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white disabled:opacity-50">{locale === "ar" ? "حفظ التعديل" : "Save changes"}</button><Result state={state} locale={locale} /></div>
    </form>
  </details>;
}

function InviteActions({ invite, locale }: { invite: StaffInvitationRow; locale: string }) {
  const [state, action, pending] = useActionState(resendInvitationAction, {} as StaffActionState);
  return <div className="mt-3 flex flex-wrap items-start gap-2">
    <form action={action}><input type="hidden" name="invitationId" value={invite.id} /><button disabled={pending || invite.sendCount >= 5} className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50">{locale === "ar" ? "إعادة إرسال / تدوير الرابط" : "Resend / rotate link"}</button></form>
    <form action={revokeInvitationAction}><input type="hidden" name="invitationId" value={invite.id} /><button className="rounded-md border border-rose-200 px-3 py-1.5 text-sm text-rose-700">{locale === "ar" ? "إلغاء الدعوة" : "Revoke invitation"}</button></form>
    {state.error || state.message ? <div className="w-full"><Result state={state} locale={locale} /></div> : null}
  </div>;
}

export function StaffWorkspace(props: {
  locale: string; members: StaffMemberRow[]; invitations: StaffInvitationRow[]; roles: StaffRoleOption[]; createBranches: StaffBranchOption[]; updateBranches: StaffBranchOption[];
  canInvite: boolean; canUpdate: boolean; canDelete: boolean; canManagePermissions: boolean;
  canViewActivity: boolean;
}) {
  const ar = props.locale === "ar";
  const [statusNotice] = useState("");
  return <div className="space-y-6">
    {props.canInvite ? <CreateStaffForm locale={props.locale} roles={props.roles} branches={props.createBranches} canInvite={props.canInvite} /> : null}
    {statusNotice ? <p className="rounded-lg bg-emerald-50 p-3 text-emerald-800">{statusNotice}</p> : null}
    <section className="space-y-3">
      <div className="flex items-end justify-between"><div><h2 className="text-xl font-semibold">{ar ? "العضويات" : "Memberships"}</h2><p className="text-sm text-slate-500">{props.members.length} {ar ? "موظف" : "employees"}</p></div></div>
      {props.members.length ? props.members.map((member) => <article key={member.id} className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-[240px] flex-1">
            <div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-semibold text-slate-900">{member.name || member.email}</h3><span className={`rounded-full px-2.5 py-1 text-xs ${member.status === "ACTIVE" ? "bg-emerald-100 text-emerald-800" : member.status === "INVITED" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"}`}>{member.status}</span>{member.isOwner ? <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs text-indigo-800">{ar ? "المالك" : "Owner"}</span> : null}</div>
            <p className="mt-1 text-sm text-slate-600">{member.email}{member.phone ? ` · ${member.phone}` : ""}</p>
            {member.pendingEmail ? <p className="mt-1 text-sm text-amber-700">{ar ? `البريد الجديد بانتظار التأكيد: ${member.pendingEmail}` : `New email awaiting confirmation: ${member.pendingEmail}`}</p> : null}
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600"><span className="rounded-full bg-slate-100 px-2 py-1">{member.roles.map((role) => ar ? role.name : role.nameEn ?? role.name).join(" · ") || (ar ? "بلا دور" : "No role")}</span>{member.branchAccess.map((branch) => <span key={branch.id} className="rounded-full bg-blue-50 px-2 py-1 text-blue-800">{branch.name}</span>)}</div>
            <p className="mt-2 text-xs text-slate-500">{ar ? "آخر دخول:" : "Last sign-in:"} {dateLabel(member.lastLoginAt, props.locale)} · {ar ? "حالة الحساب العالمي:" : "Global account:"} {member.accountStatus}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {props.canUpdate && !member.isOwner ? <>
              <form action={setStaffStatusAction}><input type="hidden" name="memberId" value={member.id} /><input type="hidden" name="status" value={member.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE"} /><button className="rounded-md border px-3 py-1.5 text-sm">{member.status === "ACTIVE" ? (ar ? "تعطيل العضوية" : "Deactivate") : (ar ? "تفعيل العضوية" : "Activate")}</button></form>
            </> : null}
            {props.canManagePermissions && !member.isOwner ? <a href={`/app/staff/permissions?member=${encodeURIComponent(member.id)}`} className="rounded-md border px-3 py-1.5 text-sm">{ar ? "استثناءات الصلاحيات" : "Permission overrides"}</a> : null}
            {props.canViewActivity ? <a href={`/app/staff/activity?actor=${encodeURIComponent(member.userId)}`} className="rounded-md border px-3 py-1.5 text-sm">{ar ? "نشاط الموظف" : "Employee activity"}</a> : null}
            {props.canDelete && !member.isOwner ? <form action={deleteStaffMembershipAction} onSubmit={(event) => { if (!window.confirm(ar ? "سيحذف هذا عضوية الموظف من المطعم فقط، ولن يحذف حساب الدخول العالمي. متابعة؟" : "This removes only the restaurant membership, not the global account. Continue?")) event.preventDefault(); }}><input type="hidden" name="memberId" value={member.id} /><button className="rounded-md border border-rose-200 px-3 py-1.5 text-sm text-rose-700">{ar ? "حذف العضوية" : "Remove membership"}</button></form> : null}
          </div>
        </div>
        {props.canUpdate && !member.isOwner ? <><EditMemberForm member={member} roles={props.roles} branches={props.updateBranches} locale={props.locale} /><ResetPasswordForm memberId={member.id} locale={props.locale} /></> : null}
      </article>) : <div className="rounded-2xl border border-dashed bg-white p-8 text-center text-sm text-slate-500">{ar ? "لا يوجد موظفون ضمن نطاقك حالياً." : "No employees are currently within your scope."}</div>}
    </section>
    {props.invitations.length ? <section className="space-y-3"><h2 className="text-xl font-semibold">{ar ? "الدعوات المفتوحة والمنتهية" : "Open and expired invitations"}</h2>{props.invitations.map((invite) => <article key={invite.id} className="rounded-xl border bg-white p-4"><div className="flex flex-wrap justify-between gap-2"><div><p className="font-medium">{invite.name || invite.email}</p><p className="text-sm text-slate-600">{invite.email} · {invite.roleName}{invite.branchNames.length ? ` · ${invite.branchNames.join(", ")}` : (ar ? " · جميع الفروع" : " · All branches")}</p><p className="mt-1 text-xs text-slate-500">{invite.status} · {ar ? "ينتهي:" : "Expires:"} {dateLabel(invite.expiresAt, props.locale)} · {ar ? "إرسالات:" : "Sends:"} {invite.sendCount}/5</p></div></div>{props.canInvite ? <InviteActions invite={invite} locale={props.locale} /> : null}</article>)}</section> : null}
  </div>;
}
