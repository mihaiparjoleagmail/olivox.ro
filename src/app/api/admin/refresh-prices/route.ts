import { NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { fetchSupplierPrice, fetchSupplierCatalog, normalizeCookies, type SupplierProduct } from "@/lib/mysnep";
import { displayPrice } from "@/lib/price";

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

interface ProductRow {
  id: number;
  name: string;
  sku: string | null;
  price: number | null;
  source_url: string | null;
  category_slugs: string[] | null;
  stock_status: string | null;
}

/**
 * GET ?url=... — diagnostic pe o singura pagina de produs. Arata toate cifrele
 * de pret gasite si pe care a ales-o parserul.
 */
export async function GET(request: Request) {
  if (!checkAuth(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  let target = searchParams.get("url");
  const id = searchParams.get("id");
  if (!target && id) {
    const { data } = await supabase.from("products").select("source_url").eq("id", Number(id)).maybeSingle();
    target = data?.source_url || null;
  }
  if (!target) return NextResponse.json({ error: "Lipseste url sau id" }, { status: 400 });

  const cookies = await getMysnepCookies();
  if (!cookies) {
    return NextResponse.json({ error: "Nu exista cookie de sesiune mysnep. Adauga-l in Setari -> mysnep." }, { status: 400 });
  }

  const result = await fetchSupplierPrice(target, cookies);
  return NextResponse.json({ url: target, ...result });
}

/**
 * Deduce ce categorie de-a noastra corespunde fiecarei categorii mysnep,
 * numarand cum sunt incadrate produsele pe care le avem deja. Asa produsele noi
 * importate ajung singure in categoria potrivita, fara tabel scris de mana.
 */
function buildCategoryMap(
  ours: ProductRow[],
  supplier: Map<string, SupplierProduct>
): Record<string, string> {
  const votes: Record<string, Record<string, number>> = {};
  for (const p of ours) {
    if (!p.sku) continue;
    const sup = supplier.get(String(p.sku));
    if (!sup) continue;
    for (const slug of p.category_slugs || []) {
      votes[sup.category] ||= {};
      votes[sup.category][slug] = (votes[sup.category][slug] || 0) + 1;
    }
  }
  const map: Record<string, string> = {};
  for (const [mysnepCat, tally] of Object.entries(votes)) {
    const best = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
    if (best) map[mysnepCat] = best[0];
  }
  return map;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}

/**
 * POST — citeste catalogul furnizorului din paginile de categorie si il compara
 * cu al nostru. NU scrie nimic; scrierea se face din /apply, dupa confirmare.
 *
 * Raspuns NDJSON, ca bara de progres sa se miste in timp real.
 */
export async function POST(request: Request) {
  if (!checkAuth(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cookies = await getMysnepCookies();
  if (!cookies) {
    return NextResponse.json({ error: "Nu exista cookie de sesiune mysnep. Adauga PHPSESSID in Setari -> mysnep." }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => {
        try { controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n")); } catch {}
      };

      try {
        send({ type: "start", label: "Se citeste catalogul furnizorului..." });

        const { products: supplier, expired } = await fetchSupplierCatalog(cookies, (pages, _t, label) => {
          send({ type: "progress", stage: "catalog", pages, label });
        });

        if (expired) {
          send({
            type: "error",
            error: "Sesiunea mysnep a expirat — paginile se incarca fara preturi. Pune un PHPSESSID nou in Setari -> mysnep.",
          });
          controller.close();
          return;
        }
        if (supplier.size === 0) {
          send({ type: "error", error: "Nu s-a citit niciun produs de pe mysnep. Verifica sesiunea." });
          controller.close();
          return;
        }

        send({ type: "progress", stage: "compare", pages: 0, label: `${supplier.size} produse citite — se compara cu catalogul nostru` });

        const { data, error } = await supabase
          .from("products")
          .select("id, name, sku, price, source_url, category_slugs, stock_status")
          .order("name");
        if (error) throw error;
        const ours = (data || []) as ProductRow[];
        const oursBySku = new Map(ours.filter((p) => p.sku).map((p) => [String(p.sku), p]));

        const categoryMap = buildCategoryMap(ours, supplier);

        const priceChanges: Array<{
          id: number; name: string; sku: string;
          oldDisplay: number; newDisplay: number; newPrice: number;
        }> = [];
        const newProducts: Array<{
          sku: string; name: string; url: string; price: number | null;
          slug: string; category: string; available: boolean;
        }> = [];
        const missingProducts: Array<{
          id: number; name: string; sku: string | null; price: number | null;
          alreadyOut: boolean; renamedTo?: string | null;
        }> = [];
        let unchanged = 0;

        for (const sup of supplier.values()) {
          const mine = oursBySku.get(sup.sku);
          if (!mine) {
            newProducts.push({
              sku: sup.sku,
              name: sup.name,
              url: sup.url,
              price: sup.price,
              slug: slugify(sup.name),
              category: categoryMap[sup.category] || "",
              available: sup.available,
            });
            continue;
          }
          if (sup.price == null) continue;
          const oldDisplay = displayPrice(mine.price);
          const newDisplay = displayPrice(sup.price);
          if (newDisplay !== oldDisplay) {
            priceChanges.push({ id: mine.id, name: mine.name, sku: sup.sku, oldDisplay, newDisplay, newPrice: sup.price });
          } else {
            unchanged++;
          }
        }

        // Furnizorul redenumeste coduri (4000236K -> 4000236, 4071100X -> 4071100).
        // Fara verificarea asta, acelasi produs apare si ca "disparut", si ca "nou",
        // iar utilizatorul l-ar sterge ca sa il reimporte imediat.
        const baseCode = (sku: string) => sku.replace(/[A-Za-z]+$/, "");
        const newBySku = new Map(newProducts.map((n) => [n.sku, n]));

        for (const p of ours) {
          if (!p.sku || supplier.has(String(p.sku))) continue;
          const base = baseCode(String(p.sku));
          const renamedTo = base !== String(p.sku) && newBySku.has(base) ? base : null;
          missingProducts.push({
            id: p.id,
            name: p.name,
            sku: p.sku,
            price: p.price,
            alreadyOut: p.stock_status === "out_of_stock",
            renamedTo,
          });
        }

        priceChanges.sort((a, b) => a.name.localeCompare(b.name, "ro"));
        newProducts.sort((a, b) => a.name.localeCompare(b.name, "ro"));
        missingProducts.sort((a, b) => a.name.localeCompare(b.name, "ro"));

        send({
          type: "done",
          supplierTotal: supplier.size,
          ourTotal: ours.length,
          unchanged,
          priceChanges,
          newProducts,
          missingProducts,
        });
      } catch (e) {
        send({ type: "error", error: e instanceof Error ? e.message : String(e) });
      } finally {
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
