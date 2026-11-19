import { NextRequest } from "next/server";
import { requireRestaurant } from "@/lib/auth/context";
import { db } from "@/lib/db";
import { buildStaffActivityWhere, staffActivityFiltersFromParams } from "@/lib/services/staff-activity";

export const dynamic = "force-dynamic";

function cell(value: unknown): string {
  let text = value === null || value === undefined ? "" : typeof value === "string" ? value : JSON.stringify(value);
  if (/^[\s]*[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""').replace(/[\r\n]+/g, " ")}"`;
}

export async function GET(request: NextRequest) {
  const member = await requireRestaurant("staff.activity.view");
  const filters = staffActivityFiltersFromParams(request.nextUrl.searchParams);
  const rows = await db.staffActivityLog.findMany({
    where: buildStaffActivityWhere(member, filters),
    include: { actor: { select: { name: true, email: true } }, branch: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 5000,
  });
  const header = ["created_at", "actor", "email", "branch", "action", "entity", "entity_id", "description", "old_value", "new_value"];
  const body = rows.map((row) => [
    row.createdAt.toISOString(), row.actor?.name ?? "", row.actor?.email ?? "", row.branch?.name ?? "",
    row.action, row.entity, row.entityId ?? "", row.description ?? "", row.oldValue, row.newValue,
  ].map(cell).join(","));
  const csv = `\uFEFF${[header.map(cell).join(","), ...body].join("\r\n")}`;
  const filename = `staff-activity-${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
