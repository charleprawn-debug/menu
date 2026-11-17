import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id)) return new NextResponse(null, { status: 404 });
  const media = await db.restaurantMedia.findFirst({
    where: { id, isPublic: true },
    select: { data: true, contentType: true, sizeBytes: true },
  });
  if (!media) return new NextResponse(null, { status: 404 });

  return new NextResponse(new Uint8Array(media.data), {
    status: 200,
    headers: {
      "Content-Type": media.contentType,
      "Content-Length": String(media.sizeBytes),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
