import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireRestaurant } from "@/lib/auth/context";
import { Prisma } from "@prisma/client";
import { branchIdsForPermission, branchRelationsWhere, branchScopeWhere } from "@/lib/auth/scope";
import { getI18n } from "@/i18n";
import { TablesWorkspace } from "@/components/tables/tables-workspace";

export const metadata: Metadata = { title: "الطاولات والتشغيل | DineFlow" };

export default async function TablesPage({ params }: { params: Promise<{ tab?: string[] }> }) {
  const { tab } = await params; const m=await requireRestaurant("tables.view"); const {locale}=await getI18n(); const restaurantId=m.restaurantId; const activeTab=tab?.[0]??"overview";
  const scopedBranchIds=branchIdsForPermission(m,"tables.view");
  const tablesWhere:Prisma.TableWhereInput={restaurantId,...branchScopeWhere(m,"tables.view","branchId"),...(m.permissionScopes.get("tables.view")==="OWNED"?{id:{in:[]}}:{})};
  const tableAreaWhere=scopedBranchIds===null?{}:m.permissionScopes.get("tables.view")==="OWNED"?{tables:{some:{id:{in:[]}}}}:{tables:{some:{branchId:{in:scopedBranchIds}}}};
  const canViewQrs=m.isOwner||m.permissions.has("tables.qr.manage")||m.permissions.has("tables.view");
  const canViewSessions=m.isOwner||m.permissions.has("tables.sessions.manage")||m.permissions.has("tables.view");
  const canViewReservations=m.isOwner||m.permissions.has("reservations.view")||m.permissions.has("reservations.manage");
  const [tables,areas,qrs,sessions,reservations,branches,restaurantSettings]=await Promise.all([
    db.table.findMany({where:tablesWhere,orderBy:[{isActive:"desc"},{number:"asc"}],include:{area:{select:{id:true,name:true,color:true}},qrCodes:{where:{isActive:true},orderBy:{createdAt:"desc"},take:1},sessions:{where:{status:"OPEN"},orderBy:{openedAt:"desc"},take:1}}}),
    db.restaurantArea.findMany({where:{restaurantId,...tableAreaWhere},orderBy:{sortOrder:"asc"}}),
    canViewQrs?db.tableQrCode.findMany({where:{restaurantId,...branchRelationsWhere(m,["tables.view","tables.qr.manage"].filter((p)=>m.isOwner||m.permissions.has(p)),"table")},orderBy:{createdAt:"desc"},take:100,include:{table:{select:{number:true,name:true}}}}):Promise.resolve([]),
    canViewSessions?db.tableSession.findMany({where:{restaurantId,...branchRelationsWhere(m,["tables.view","tables.sessions.manage"].filter((p)=>m.isOwner||m.permissions.has(p)),"table")},orderBy:{openedAt:"desc"},take:100,include:{table:{select:{number:true,name:true}},orders:{select:{id:true,total:true,status:true}}}}):Promise.resolve([]),
    canViewReservations?db.reservation.findMany({where:{restaurantId,...branchRelationsWhere(m,["tables.view","reservations.view"].filter((p)=>m.isOwner||m.permissions.has(p)),"table")},orderBy:[{date:"asc"},{time:"asc"}],take:200,include:{table:{select:{number:true,name:true}}}}):Promise.resolve([]),
    db.branch.findMany({where:{restaurantId,isActive:true,...(scopedBranchIds===null?{}:{id:{in:scopedBranchIds}})},select:{id:true,name:true},orderBy:{isMain:"desc"}}),
    db.restaurant.findFirst({where:{id:restaurantId},select:{reservationSettings:true}}),
  ]);
  const serializedTables=tables.map(t=>({...t,createdAt:t.createdAt.toISOString(),updatedAt:t.updatedAt.toISOString(),qrCodes:t.qrCodes.map(q=>({...q,createdAt:q.createdAt.toISOString(),expiresAt:q.expiresAt?.toISOString()??null})),sessions:t.sessions.map(s=>({...s,openedAt:s.openedAt.toISOString(),closedAt:s.closedAt?.toISOString()??null,total:s.total.toString()}))}));
  const serializedQrs=qrs.map(q=>({...q,createdAt:q.createdAt.toISOString(),expiresAt:q.expiresAt?.toISOString()??null}));
  const serializedSessions=sessions.map(s=>({...s,openedAt:s.openedAt.toISOString(),closedAt:s.closedAt?.toISOString()??null,total:s.total.toString(),orders:s.orders.map(o=>({...o,total:o.total.toString()}))}));
  const serializedReservations=reservations.map(r=>({...r,date:r.date.toISOString(),createdAt:r.createdAt.toISOString(),updatedAt:r.updatedAt.toISOString()}));
  return <TablesWorkspace locale={locale} activeTab={activeTab} permissions={[...m.permissions]} isOwner={m.isOwner} restaurant={{slug:m.restaurant.slug,currency:m.restaurant.currency}} tables={serializedTables} areas={areas.map(a=>({...a,createdAt:a.createdAt.toISOString()}))} qrs={serializedQrs} sessions={serializedSessions} reservations={serializedReservations} branches={branches} reservationSettings={(restaurantSettings?.reservationSettings && typeof restaurantSettings.reservationSettings === "object" && !Array.isArray(restaurantSettings.reservationSettings) ? restaurantSettings.reservationSettings : {}) as Record<string, unknown>}/>;
}
