import QRCode from "qrcode";
import { NextResponse } from "next/server";
import { requireRestaurant } from "@/lib/auth/context";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const membership = await requireRestaurant("menu.view");
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug") || membership.restaurant.slug;
  if (slug !== membership.restaurant.slug && !membership.isOwner) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const origin = process.env.NEXT_PUBLIC_APP_URL || url.origin;
  const target = `${origin.replace(/\/$/, "")}/r/${encodeURIComponent(slug)}`;
  const buffer = await QRCode.toBuffer(target, { type: "png", width: 1024, margin: 2, errorCorrectionLevel: "M", color: { dark: "#0f172a", light: "#ffffff" } });
  return new NextResponse(new Uint8Array(buffer), { headers: { "Content-Type": "image/png", "Content-Disposition": `attachment; filename="menu-qr-${slug}.png"`, "Cache-Control": "no-store" } });
}
