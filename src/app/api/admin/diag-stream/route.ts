import { NextResponse } from "next/server";

/**
 * Ruta de diagnostic temporara — masoara exact cat timp lasa platforma Vercel
 * un raspuns NDJSON sa curga, fara nicio dependenta de mysnep. Se sterge dupa
 * ce se lamureste problema sincronizarii care se opreste mereu la ~16-18s.
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

export async function GET(request: Request) {
  if (!checkAuth(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const encoder = new TextEncoder();
  const start = Date.now();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => {
        try { controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n")); } catch {}
      };
      send({ type: "start", region: process.env.VERCEL_REGION || "unknown" });
      for (let i = 0; i < 90; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        send({ type: "tick", elapsedMs: Date.now() - start });
      }
      send({ type: "done", elapsedMs: Date.now() - start });
      controller.close();
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
