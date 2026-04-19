import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { buildFeed, getAllStats, type FeedPlatform } from "@/lib/feed-builder";

const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "olivox2026!";

function checkAuth(request: Request): boolean {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Basic ")) {
    const decoded = atob(auth.slice(6));
    const [user, pass] = decoded.split(":");
    if (user === ADMIN_USER && pass === ADMIN_PASS) return true;
  }
  return false;
}

function checkCronSecret(request: Request): boolean {
  const url = new URL(request.url);
  const secret = url.searchParams.get("secret");
  return secret === (process.env.CRON_SECRET || "cron2024");
}

export async function GET(request: Request) {
  if (!checkAuth(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const stats = await getAllStats();
  return NextResponse.json({ stats });
}

export async function POST(request: Request) {
  const authorized = checkAuth(request) || checkCronSecret(request);
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const platforms: FeedPlatform[] = ["google", "facebook", "tiktok"];
  const results: Record<string, { items: number; skipped: number; generated_at: string } | { error: string }> = {};

  for (const p of platforms) {
    try {
      const { stats } = await buildFeed(p);
      results[p] = { items: stats.items, skipped: stats.skipped, generated_at: stats.generated_at };
      revalidatePath(`/feed/${p}.xml`);
    } catch (e) {
      results[p] = { error: String(e) };
    }
  }

  return NextResponse.json({ ok: true, results });
}
