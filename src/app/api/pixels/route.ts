import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "pixels")
    .single();

  if (!data) return NextResponse.json({});

  // Cache pe CDN: TrackingPixels o cere din browser pe fiecare pagina. 1h.
  const headers = { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" };
  try {
    return NextResponse.json(JSON.parse(data.value), { headers });
  } catch {
    return NextResponse.json({});
  }
}
