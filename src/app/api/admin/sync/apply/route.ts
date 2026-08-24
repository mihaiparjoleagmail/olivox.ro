import { NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { normalizeCookies } from "@/lib/mysnep";
import { importProduct, type ImportCandidate } from "@/lib/product-import";

const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "olivox2026!";

export const maxDuration = 300;
// Vezi nota din /api/admin/sync — importul de produse noi bate tot mysnep.
export const preferredRegion = "fra1";

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
      const fromSettings = normalizeCookies(JSON.parse(data.value)?.cookies);
      if (fromSettings) return fromSettings;
    } catch {}
  }
  return normalizeCookies(process.env.MYSNEP_COOKIES);
}

/**
 * Scoate din scanul salvat randurile care tocmai au fost rezolvate. Fara asta,
 * la o reincarcare a paginii reapareau produse deja importate — si importul lor
 * pica pe cheia duplicata de source_id.
 */
async function pruneSavedScan(applied: {
  priceIds: number[]; stockIds: number[]; missingIds: number[];
  newSkus: string[]; missingMode: "out_of_stock" | "delete";
}): Promise<void> {
  const { data } = await supabase.from("settings").select("value").eq("key", "mysnep_sync").maybeSingle();
  if (!data?.value) return;
  let scan: Record<string, unknown>;
  try { scan = JSON.parse(data.value); } catch { return; }

  const price = new Set(applied.priceIds);
  const stockSet = new Set(applied.stockIds);
  const missingSet = new Set(applied.missingIds);
  const skus = new Set(applied.newSkus);

  scan.priceChanges = ((scan.priceChanges as Array<{ id: number }>) || []).filter((c) => !price.has(c.id));
  scan.stockChanges = ((scan.stockChanges as Array<{ id: number }>) || []).filter((c) => !stockSet.has(c.id));
  scan.newProducts = ((scan.newProducts as Array<{ sku: string }>) || []).filter((n) => !skus.has(n.sku));
  const missingList = (scan.missingProducts as Array<{ id: number; alreadyOut?: boolean }>) || [];
  scan.missingProducts =
    applied.missingMode === "delete"
      ? missingList.filter((m) => !missingSet.has(m.id))
      : missingList.map((m) => (missingSet.has(m.id) ? { ...m, alreadyOut: true } : m));

  await supabase.from("settings").upsert({ key: "mysnep_sync", value: JSON.stringify(scan) }, { onConflict: "key" });
}

/**
 * Scrie doar ce a bifat utilizatorul. Raspunde NDJSON, pentru ca importul
 * produselor noi e lent (o pagina + imagine + PDF pe R2 pentru fiecare) si
 * trebuie sa se vada progresul.
 *
 *   prices  — actualizeaza pretul
 *   missing — implicit marcheaza indisponibil; sterge doar cu missingMode="delete"
 *   newOnes — import complet: continut de pe mysnep, imagini pe R2, meta din sablon
 */
export async function POST(request: Request) {
  if (!checkAuth(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const prices = Array.isArray(body?.prices) ? body.prices : [];
  const stock = Array.isArray(body?.stock) ? body.stock : [];
  const missing = Array.isArray(body?.missing) ? body.missing : [];
  const newOnes: ImportCandidate[] = Array.isArray(body?.newProducts) ? body.newProducts : [];
  const missingMode: "out_of_stock" | "delete" = body?.missingMode === "delete" ? "delete" : "out_of_stock";

  if (prices.length === 0 && stock.length === 0 && missing.length === 0 && newOnes.length === 0) {
    return NextResponse.json({ error: "Nu a fost selectat nimic de aplicat." }, { status: 400 });
  }

  const cookies = newOnes.length > 0 ? await getMysnepCookies() : "";
  if (newOnes.length > 0 && !cookies) {
    return NextResponse.json({ error: "Importul are nevoie de sesiunea mysnep. Adaug-o in Setari -> mysnep." }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const total = prices.length + stock.length + missing.length + newOnes.length;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (o: unknown) => {
        try { controller.enqueue(encoder.encode(JSON.stringify(o) + "\n")); } catch {}
      };

      let done = 0;
      const result = {
        pricesUpdated: 0,
        stockUpdated: 0,
        missingHandled: 0,
        newCreated: 0,
        alreadyThere: 0,
        warnings: [] as Array<{ name: string; warnings: string[] }>,
        failed: [] as Array<{ ref: string; error: string }>,
      };

      send({ type: "start", total });

      // Vezi nota din /api/admin/sync: fara un heartbeat, un import lent
      // (pagina + imagine + PDF pe R2) poate opri conexiunea la mijloc.
      const heartbeat = setInterval(() => send({ type: "heartbeat" }), 5000);

      try {
        for (const c of prices) {
          const id = Number(c?.id);
          const price = Number(c?.newPrice);
          if (Number.isFinite(id) && Number.isFinite(price) && price > 0) {
            const { error } = await supabase.from("products").update({ price }).eq("id", id);
            if (error) result.failed.push({ ref: `pret #${id}`, error: error.message });
            else result.pricesUpdated++;
          } else {
            result.failed.push({ ref: `pret #${c?.id}`, error: "date invalide" });
          }
          send({ type: "progress", done: ++done, total, stage: "preturi", label: c?.name || "" });
        }

        for (const st of stock) {
          const id = Number(st?.id);
          const to = st?.to === "out_of_stock" ? "out_of_stock" : "in_stock";
          if (Number.isFinite(id)) {
            const { error } = await supabase.from("products").update({ stock_status: to }).eq("id", id);
            if (error) result.failed.push({ ref: `stoc #${id}`, error: error.message });
            else result.stockUpdated++;
          }
          send({ type: "progress", done: ++done, total, stage: "stoc", label: st?.name || "" });
        }

        for (const m of missing) {
          const id = Number(m?.id);
          if (Number.isFinite(id)) {
            const { error } =
              missingMode === "delete"
                ? await supabase.from("products").delete().eq("id", id)
                : await supabase.from("products").update({ stock_status: "out_of_stock" }).eq("id", id);
            if (error) result.failed.push({ ref: `lipsa #${id}`, error: error.message });
            else result.missingHandled++;
          }
          send({ type: "progress", done: ++done, total, stage: "disparute", label: m?.name || "" });
        }

        for (const n of newOnes) {
          const outcome = await importProduct(n, cookies);
          if (outcome.ok) {
            result.newCreated++;
            if (outcome.warnings.length) result.warnings.push({ name: outcome.name, warnings: outcome.warnings });
          } else if (outcome.skipped) {
            // Era deja in catalog — nu e o eroare, doar nu mai e nimic de facut.
            result.alreadyThere++;
          } else {
            result.failed.push({ ref: `import ${outcome.sku}`, error: outcome.error || "necunoscut" });
          }
          send({ type: "progress", done: ++done, total, stage: "import", label: n.name });
        }

        await pruneSavedScan({
          priceIds: prices.map((c: { id: number }) => Number(c?.id)).filter(Boolean),
          stockIds: stock.map((c: { id: number }) => Number(c?.id)).filter(Boolean),
          missingIds: missing.map((m: { id: number }) => Number(m?.id)).filter(Boolean),
          newSkus: newOnes.map((n) => String(n.sku)),
          missingMode,
        });

        send({ type: "done", ...result });
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
