import { NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { normalizeCookies } from "@/lib/mysnep";

/**
 * Ruta de diagnostic temporara — testeaza DOAR categoria promozionali-e-kit
 * (cea care se blocheaza mereu in sincronizarea reala), fara nicio alta
 * cerere inainte. Daca se blocheaza si asa, e ceva specific paginii/rutei
 * de la mysnep sub Vercel; daca merge, e vorba de acumulare dupa ~44 cereri.
 */
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "olivox2026!";

export const maxDuration = 300;

function checkAuth(request: Request): boolean {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Basic ")) return false;
  const decoded = atob(auth.slice(6));
  const [user, pass] = decoded.split(":");
  return user === ADMIN_USER && pass === ADMIN_PASS;
}

async function getMysnepCookies(): Promise<string> {
  const { data } = await supabase.from("settings").select("value").eq("key", "mysnep").maybeSingle();
  if (data?.value) {
    try {
      const parsed = JSON.parse(data.value);
      const fromSettings = normalizeCookies(parsed?.cookies);
      if (fromSettings) return fromSettings;
    } catch {}
  }
  return normalizeCookies(process.env.MYSNEP_COOKIES);
}

export async function GET(request: Request) {
  if (!checkAuth(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cookies = await getMysnepCookies();
  const encoder = new TextEncoder();
  const start = Date.now();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => {
        try { controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n")); } catch {}
      };
      const heartbeat = setInterval(() => send({ type: "heartbeat", elapsedMs: Date.now() - start }), 2000);
      try {
        send({ type: "start", region: process.env.VERCEL_REGION || "unknown", cookiePresent: !!cookies });
        for (const page of [1, 2, 3]) {
          const url = `https://www.mysnep.com/promozionali-e-kit-AC4.html${page > 1 ? `?pag=${page}` : ""}`;
          const t0 = Date.now();
          try {
            const res = await fetch(url, {
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36",
                "Accept-Language": "ro-RO,ro;q=0.9,it;q=0.8",
                Connection: "close",
                ...(cookies ? { Cookie: cookies } : {}),
              },
              cache: "no-store",
              signal: AbortSignal.timeout(20000),
            });
            const html = await res.text();
            send({ type: "page-done", page, status: res.status, bodyLength: html.length, ms: Date.now() - t0 });
          } catch (e) {
            send({ type: "page-error", page, error: e instanceof Error ? e.message : String(e), ms: Date.now() - t0 });
          }
        }
        send({ type: "done", elapsedMs: Date.now() - start });
      } catch (e) {
        send({ type: "error", error: e instanceof Error ? e.message : String(e) });
      } finally {
        clearInterval(heartbeat);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
