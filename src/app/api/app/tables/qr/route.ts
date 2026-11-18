import QRCode from "qrcode";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRestaurant } from "@/lib/auth/context";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const m=await requireRestaurant("tables.qr.manage"); const id=new URL(request.url).searchParams.get("id"); if(!id) return NextResponse.json({error:"MISSING_ID"},{status:400});
  const qr=await db.tableQrCode.findFirst({where:{id,restaurantId:m.restaurantId,isActive:true}}); if(!qr) return NextResponse.json({error:"NOT_FOUND"},{status:404});
  const origin=process.env.NEXT_PUBLIC_APP_URL||new URL(request.url).origin; const target=qr.targetUrl?.startsWith("http")?qr.targetUrl:`${origin.replace(/\/$/,"")}${qr.targetUrl||`/r/${m.restaurant.slug}`}`;
  const buffer=await QRCode.toBuffer(target,{type:"png",width:1024,margin:2,errorCorrectionLevel:"M",color:{dark:"#0f172a",light:"#ffffff"}});
  return new NextResponse(new Uint8Array(buffer),{headers:{"Content-Type":"image/png","Content-Disposition":`attachment; filename="qr-${qr.code}.png"`,"Cache-Control":"no-store"}});
}
