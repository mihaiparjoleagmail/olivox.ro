import { NextResponse } from "next/server";
import { getSiteConfig } from "@/lib/site-config";

export async function GET() {
  const config = await getSiteConfig();
  // Don't expose admin email and email from to public
  const { emailAdmin, emailFrom, ...publicConfig } = config;
  // Cache pe CDN: AnnouncementBar o cere din browser pe fiecare pagina. 2 min,
  // ca un pret/mesaj schimbat in admin sa apara repede.
  return NextResponse.json(publicConfig, {
    headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600" },
  });
}
