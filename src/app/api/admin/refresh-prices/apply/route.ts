import { NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";

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

/**
 * Scrie doar ce a bifat utilizatorul in previzualizare. Trei actiuni separate,
 * fiecare optionala:
 *
 *   prices  — actualizeaza pretul (valoarea exacta de la furnizor; site-ul o
 *             rotunjeste in sus la afisare, vezi src/lib/price.ts)
 *   missing — produse care nu mai apar in catalogul furnizorului. Implicit doar
 *             le marcam indisponibile: unele coduri sunt variante/kituri care
 *             nu apar in listari, iar stergerea ar rupe URL-uri indexate.
 *             Stergerea se face doar cu mode="delete", explicit.
 *   newOnes — produse noi, create ca schelet (nume, cod, pret, link, categorie).
 *             Descrierile si imaginile pe R2 raman de completat din editor.
 */
export async function POST(request: Request) {
  if (!checkAuth(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const prices = Array.isArray(body?.prices) ? body.prices : [];
  const missing = Array.isArray(body?.missing) ? body.missing : [];
  const newOnes = Array.isArray(body?.newProducts) ? body.newProducts : [];
  const missingMode: "out_of_stock" | "delete" = body?.missingMode === "delete" ? "delete" : "out_of_stock";

  if (prices.length === 0 && missing.length === 0 && newOnes.length === 0) {
    return NextResponse.json({ error: "Nu a fost selectat nimic de aplicat." }, { status: 400 });
  }

  const result = { pricesUpdated: 0, missingHandled: 0, newCreated: 0, failed: [] as Array<{ ref: string; error: string }> };

  for (const c of prices) {
    const id = Number(c?.id);
    const price = Number(c?.newPrice);
    if (!Number.isFinite(id) || !Number.isFinite(price) || price <= 0) {
      result.failed.push({ ref: `pret #${c?.id}`, error: "date invalide" });
      continue;
    }
    const { error } = await supabase.from("products").update({ price }).eq("id", id);
    if (error) result.failed.push({ ref: `pret #${id}`, error: error.message });
    else result.pricesUpdated++;
  }

  for (const m of missing) {
    const id = Number(m?.id);
    if (!Number.isFinite(id)) continue;
    const { error } =
      missingMode === "delete"
        ? await supabase.from("products").delete().eq("id", id)
        : await supabase.from("products").update({ stock_status: "out_of_stock" }).eq("id", id);
    if (error) result.failed.push({ ref: `lipsa #${id}`, error: error.message });
    else result.missingHandled++;
  }

  for (const n of newOnes) {
    const sku = String(n?.sku || "").trim();
    const name = String(n?.name || "").trim();
    if (!sku || !name) {
      result.failed.push({ ref: `nou ${sku || name || "?"}`, error: "lipseste codul sau numele" });
      continue;
    }
    // Slug unic: daca exista deja unul identic, lipim codul la coada.
    let slug = String(n?.slug || "").trim() || sku;
    const { data: clash } = await supabase.from("products").select("id").eq("slug", slug).maybeSingle();
    if (clash) slug = `${slug}-${sku}`;

    const { error } = await supabase.from("products").insert({
      woo_id: 0,
      name,
      slug,
      sku,
      price: Number(n?.price) || 0,
      currency: "RON",
      source_url: String(n?.url || ""),
      category_slugs: n?.category ? [String(n.category)] : [],
      stock_status: n?.available === false ? "out_of_stock" : "instock",
      image_url: "",
      r2_image_url: "",
      short_description: "",
      description: "",
      template: "generic",
      meta_title: "",
      meta_description: "",
      keywords: "",
      custom_fields: [],
      addon_group_ids: [],
    });
    if (error) result.failed.push({ ref: `nou ${sku}`, error: error.message });
    else result.newCreated++;
  }

  return NextResponse.json(result);
}
