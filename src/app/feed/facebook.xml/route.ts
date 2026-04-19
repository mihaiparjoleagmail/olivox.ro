import { NextResponse } from "next/server";
import { buildFeed } from "@/lib/feed-builder";

export const revalidate = 86400;

export async function GET() {
  const { xml } = await buildFeed("facebook");
  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
