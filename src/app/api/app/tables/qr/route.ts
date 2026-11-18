import QRCode from "qrcode";
import JSZip from "jszip";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRestaurant } from "@/lib/auth/context";

export const dynamic = "force-dynamic";

async function getTarget(request: Request, qr: { targetUrl: string | null }, slug: string) {
  const origin=process.env.NEXT_PUBLIC_APP_URL||new URL(request.url).origin;
  return qr.targetUrl?.startsWith("http")?qr.targetUrl:`${origin.replace(/\/$/,"")}${qr.targetUrl||`/r/${slug}`}`;
}
async function png(target:string) { return QRCode.toBuffer(target,{type:"png",width:900,margin:2,errorCorrectionLevel:"M",color:{dark:"#0f172a",light:"#ffffff"}}); }

export async function GET(request: Request) {
  const m=await requireRestaurant("tables.qr.manage"); const url=new URL(request.url); const id=url.searchParams.get("id"); const ids=(url.searchParams.get("ids")||"").split(",").map(x=>x.trim()).filter(Boolean); const format=url.searchParams.get("format")||"png";
  const where={restaurantId:m.restaurantId,isActive:true,...(ids.length?{id:{in:ids}}:id?{id}:{})}; const qrs=await db.tableQrCode.findMany({where,orderBy:{createdAt:"desc"},take:100}); if(!qrs.length) return NextResponse.json({error:"NOT_FOUND"},{status:404});
  if(format==="zip" || ids.length>1){ const zip=new JSZip(); for(const qr of qrs){zip.file(`qr-${qr.code}.png`,await png(await getTarget(request,qr,m.restaurant.slug)));} const bytes=await zip.generateAsync({type:"uint8array",compression:"DEFLATE"}); return new NextResponse((new Uint8Array(bytes).buffer as ArrayBuffer),{headers:{"Content-Type":"application/zip","Content-Disposition":"attachment; filename=\"table-qrs.zip\""}}); }
  const qr=qrs[0]; const target=await getTarget(request,qr,m.restaurant.slug);
  if(format==="svg"){const svg=await QRCode.toString(target,{type:"svg",width:900,margin:2,errorCorrectionLevel:"M"}); return new NextResponse(svg,{headers:{"Content-Type":"image/svg+xml","Content-Disposition":`attachment; filename="qr-${qr.code}.svg"`}});}
  if(format==="pdf"){const image=await png(target); const doc=await PDFDocument.create(); const page=doc.addPage([595,750]); const font=await doc.embedFont(StandardFonts.Helvetica); const embedded=await doc.embedPng(image); page.drawText(qr.label||qr.type,{x:50,y:700,size:20,font,color:rgb(.06,.09,.16)}); page.drawText(target,{x:50,y:675,size:9,font,color:rgb(.3,.3,.3),maxWidth:490}); page.drawImage(embedded,{x:97,y:115,width:400,height:400}); const bytes=await doc.save(); return new NextResponse((new Uint8Array(bytes).buffer as ArrayBuffer),{headers:{"Content-Type":"application/pdf","Content-Disposition":`attachment; filename="qr-${qr.code}.pdf"`}}); }
  const bytes=await png(target); return new NextResponse((new Uint8Array(bytes).buffer as ArrayBuffer),{headers:{"Content-Type":"image/png","Content-Disposition":`attachment; filename="qr-${qr.code}.png"`}});
}
