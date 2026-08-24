import { NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { fetchSupplierPrice, fetchSupplierCatalog, normalizeCookies, normalizeName, type SupplierProduct } from "@/lib/mysnep";
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
  slug: string;
  sku: string | null;
  price: number | null;
  source_url: string | null;
  category_slugs: string[] | null;
  stock_status: string | null;
}

/** Cheia sub care se pastreaza ultimul rezultat de scanare. */
const SYNC_KEY = "mysnep_sync";

async function loadLastScan(): Promise<unknown | null> {
  const { data } = await supabase.from("settings").select("value").eq("key", SYNC_KEY).maybeSingle();
  if (!data?.value) return null;
  try { return JSON.parse(data.value); } catch { return null; }
}

async function saveScan(result: unknown): Promise<void> {
  await supabase.from("settings").upsert({ key: SYNC_KEY, value: JSON.stringify(result) }, { onConflict: "key" });
}

/**
 * GET fara parametri — ultimul rezultat de scanare, ca pagina sa il arate fara
 * sa mai bata mysnep. GET ?url=... — diagnostic pe o singura pagina de produs.
 */
export async function GET(request: Request) {
  if (!checkAuth(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  let target = searchParams.get("url");
  const id = searchParams.get("id");

  if (!target && !id) {
    return NextResponse.json({ scan: await loadLastScan() });
  }
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
  match: (p: ProductRow) => SupplierProduct | null
): Record<string, string> {
  const votes: Record<string, Record<string, number>> = {};
  for (const p of ours) {
    // Aceeasi potrivire ca la comparatie (nume, apoi cod). Cautarea directa
    // dupa cod in harta furnizorului nu mai merge: cheia ei include si numele,
    // ca sa incapa variantele de marime cu acelasi cod.
    const sup = match(p);
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

/**
 * Codul nostru e "40" + linia + numarul articolului (ex: 4000371, 4072206).
 * Pe unele categorii mysnep afiseaza doar partea de dupa "40" in listare.
 * Nu atingem codurile care nu urmeaza tiparul (deja scurte, gen 90050).
 */
function stripLinePrefix(sku: string): string | null {
  const base = sku.replace(/[A-Za-z]+$/, "");
  if (!/^\d+$/.test(base)) return null;
  return base.length > 5 && base.startsWith("40") ? base.slice(2) : null;
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

      // Vercel taie conexiunea intre edge si functie daca nu trimitem nimic
      // o vreme (functia ruleaza in iad1, mysnep e in Italia — un singur
      // fetch mai lent decat pragul de inactivitate era destul sa opreasca
      // streamul la mijloc, fara eroare, chiar daca functia continua sa lucreze).
      const heartbeat = setInterval(() => send({ type: "heartbeat" }), 5000);

      try {
        send({ type: "start", label: "Se citeste catalogul furnizorului..." });

        const { products: supplier, expired, partial, failures } = await fetchSupplierCatalog(cookies, (pages, _t, label) => {
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
          .select("id, name, slug, sku, price, source_url, category_slugs, stock_status")
          .order("name");
        if (error) throw error;
        const ours = (data || []) as ProductRow[];

        /*
         * Potrivirea produs-la-produs nu se poate face doar pe cod. La textilele
         * EaseLine furnizorul foloseste acelasi cod pentru toate marimile
         * ("GENUNCHIERA ... - L" si "- XXL" au amandoua 4000506) si le distinge
         * prin nume, in timp ce la noi codurile au sufix de marime (4000506MLP).
         * Deci: intai pe nume (unic si la ei, si la noi), apoi pe cod exact.
         */
        const supplierByName = new Map<string, SupplierProduct>();
        const supplierBySku = new Map<string, SupplierProduct[]>();
        for (const sup of supplier.values()) {
          const n = normalizeName(sup.name);
          if (!supplierByName.has(n)) supplierByName.set(n, sup);
          const list = supplierBySku.get(sup.sku) || [];
          list.push(sup);
          supplierBySku.set(sup.sku, list);
        }

        const matchOurs = (p: ProductRow): SupplierProduct | null => {
          const byName = supplierByName.get(normalizeName(p.name));
          if (byName) return byName;
          if (!p.sku) return null;
          // Cod exact, dar doar cand la furnizor codul e al unui singur produs —
          // altfel am lega un produs de-al nostru de o marime aleatoare.
          const sku = String(p.sku);
          const exact = supplierBySku.get(sku);
          if (exact && exact.length === 1) return exact[0];
          // Pe multe categorii (aloe, uleiuri esentiale, ingrijire corp...) mysnep
          // afiseaza in listare codul fara prefixul nostru de linie "40"
          // (Cod: 00371 in loc de 4000371) — verificat manual pe pagina de produs
          // ("Codice prodotto : 00371"). Numele nici nu ajuta acolo, fiindca sunt
          // linii netraduse in romana pe mysnep. Incercam si varianta scurtata,
          // tot doar cand e unica la furnizor.
          const short = stripLinePrefix(sku);
          if (short) {
            const shortMatch = supplierBySku.get(short);
            if (shortMatch && shortMatch.length === 1) return shortMatch[0];
          }
          return null;
        };

        const matchedSupplier = new Set<string>();
        const categoryMap = buildCategoryMap(ours, matchOurs);

        const priceChanges: Array<{
          id: number; name: string; sku: string; url: string; slug: string; category: string;
          oldDisplay: number; newDisplay: number; newPrice: number;
        }> = [];
        const newProducts: Array<{
          sku: string; name: string; url: string; price: number | null;
          slug: string; category: string; available: boolean | null;
        }> = [];
        const missingProducts: Array<{
          id: number; name: string; sku: string | null; price: number | null;
          alreadyOut: boolean; renamedTo?: string | null; renamedUrl?: string | null;
          // slug + categoria, ca pagina sa poata face link catre produsul de pe site
          slug: string; category: string;
        }> = [];
        // Stocul nu se sincroniza deloc: produse aduse in aprilie ramaneau
        // "indisponibil" desi furnizorul le are pe stoc.
        const stockChanges: Array<{
          id: number; name: string; sku: string; url: string; slug: string; category: string;
          from: string; to: string;
        }> = [];
        let unchanged = 0;

        for (const p of ours) {
          const sup = matchOurs(p);
          if (!sup) continue;
          matchedSupplier.add(`${sup.sku}::${normalizeName(sup.name)}`);
          const slug = p.slug;
          const category = (p.category_slugs || [])[0] || "";

          if (sup.available !== null) {
            const want = sup.available ? "in_stock" : "out_of_stock";
            const have = p.stock_status === "out_of_stock" ? "out_of_stock" : "in_stock";
            if (want !== have) {
              stockChanges.push({ id: p.id, name: p.name, sku: String(p.sku || sup.sku), url: sup.url, slug, category, from: have, to: want });
            }
          }

          if (sup.price == null) continue;
          const oldDisplay = displayPrice(p.price);
          const newDisplay = displayPrice(sup.price);
          if (newDisplay !== oldDisplay) {
            priceChanges.push({ id: p.id, name: p.name, sku: String(p.sku || sup.sku), url: sup.url, slug, category, oldDisplay, newDisplay, newPrice: sup.price });
          } else {
            unchanged++;
          }
        }

        // Ce a ramas nepotrivit la furnizor = produse pe care nu le avem.
        for (const [key, sup] of supplier.entries()) {
          if (matchedSupplier.has(key)) continue;
          {
            newProducts.push({
              sku: sup.sku,
              name: sup.name,
              url: sup.url,
              price: sup.price,
              slug: slugify(sup.name),
              category: categoryMap[sup.category] || "",
              available: sup.available,
            });
          }
        }

        // Furnizorul redenumeste coduri (4000236K -> 4000236, 4071100X -> 4071100).
        // Fara verificarea asta, acelasi produs apare si ca "disparut", si ca "nou",
        // iar utilizatorul l-ar sterge ca sa il reimporte imediat.
        const baseCode = (sku: string) => sku.replace(/[A-Za-z]+$/, "");
        const newBySku = new Map(newProducts.map((n) => [n.sku, n]));

        // Daca vreo pagina de listare n-a raspuns, nu cunoastem tot catalogul,
        // deci nu putem spune despre niciun produs ca a disparut de la furnizor.
        for (const p of ours) {
          if (partial) break;
          if (matchOurs(p)) continue;
          const base = baseCode(String(p.sku));
          const renamed = base !== String(p.sku) ? newBySku.get(base) : undefined;
          missingProducts.push({
            id: p.id,
            name: p.name,
            sku: p.sku,
            price: p.price,
            alreadyOut: p.stock_status === "out_of_stock",
            renamedTo: renamed ? renamed.sku : null,
            renamedUrl: renamed ? renamed.url : null,
            slug: p.slug,
            category: (p.category_slugs || [])[0] || "",
          });
        }

        stockChanges.sort((a, b) => a.name.localeCompare(b.name, "ro"));
        priceChanges.sort((a, b) => a.name.localeCompare(b.name, "ro"));
        newProducts.sort((a, b) => a.name.localeCompare(b.name, "ro"));
        missingProducts.sort((a, b) => a.name.localeCompare(b.name, "ro"));

        const result = {
          scannedAt: new Date().toISOString(),
          partial,
          failures,
          supplierTotal: supplier.size,
          ourTotal: ours.length,
          unchanged,
          priceChanges,
          stockChanges,
          newProducts,
          missingProducts,
        };
        // Se salveaza ca sa nu fie nevoie de rescanare cand treci de la preturi
        // la "ce e nou" sau cand redeschizi pagina.
        await saveScan(result);
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
