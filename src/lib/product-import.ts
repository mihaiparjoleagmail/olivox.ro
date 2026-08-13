/**
 * Importul unui produs nou de pe mysnep, cu acelasi set de campuri pe care il
 * au produsele existente. Reface, in cod, procedura din scripts/scrape-mysnep.ts
 * (continut) + scripts/fill-product-meta.ts (meta din sablon), ca sa poata rula
 * din admin, nu doar de pe calculator.
 *
 * Ce completeaza:
 *   - continut de pe mysnep: descriere, short, ingrediente, mod de utilizare,
 *     avertismente, certificari, cantitate, puncte, disponibilitate
 *   - imaginea si fisa tehnica PDF, urcate pe R2 (raman si URL-urile originale)
 *   - meta_title / meta_description / keywords din sablon
 *
 * Ce NU face: nu rescrie produse existente. Importul e doar pentru produse noi.
 */
import { supabaseAdmin as supabase } from "./supabase-admin";
import { fetchProductDetails } from "./mysnep";
import { uploadToR2 } from "./r2";
import { cleanContentHtml, cleanContentText } from "./html-clean";

/** Acelasi slugify ca in scripts/scrape-mysnep.ts, ca URL-urile sa fie in acelasi stil. */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(" ")
    .map((w) => (w.length > 2 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

const CATEGORY_LABELS: Record<string, string> = {
  "uleiuri-esentiale": "Uleiuri esentiale",
  "controlul-greutatii": "Controlul greutatii",
  "nevoi-specifice": "Nevoi specifice",
  "linia-real": "Linia Real",
  "promotii-si-kit-uri": "Promotii si kituri",
};

/**
 * meta_title / meta_description / keywords din sablon — regula din
 * scripts/fill-product-meta.ts: titlu <= 70 caractere, descriere <= 158, taiata
 * la ultimul cuvant intreg, cu randul de livrare adaugat doar daca mai incape.
 */
export function buildMeta(
  name: string,
  shortDescription: string,
  categorySlug: string
): { meta_title: string; meta_description: string; keywords: string } {
  const catLabel = CATEGORY_LABELS[categorySlug] || titleCase((categorySlug || "").replace(/-/g, " "));
  const cleanName = titleCase(name);

  let meta_title = catLabel ? `${cleanName} — ${catLabel} | olivox.ro` : `${cleanName} | olivox.ro`;
  if (meta_title.length > 70) meta_title = `${cleanName} | olivox.ro`.slice(0, 70);

  const TAIL = " Livrare 3-5 zile lucratoare in Romania.";
  const base = (shortDescription || `${name}, produs Snep din gama ${catLabel || "Snep"}.`).trim();
  let meta_description: string;
  if (base.length + TAIL.length <= 158) {
    meta_description = base + TAIL;
  } else {
    meta_description = base.slice(0, 158).replace(/\s+\S*$/, "").replace(/[,;:]$/, "") + ".";
  }

  const words = name
    .toLowerCase()
    .split(/[^a-z0-9ăâîșț]+/i)
    .filter((w) => w.length > 2);
  const keywords = [...new Set([...words, catLabel.toLowerCase(), "snep", "olivox"])]
    .filter(Boolean)
    .join(", ");

  return { meta_title, meta_description, keywords };
}

/** Urca un fisier extern pe R2. Nereusita nu opreste importul. */
async function mirrorToR2(url: string, fileName: string): Promise<string> {
  if (!url) return "";
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return "";
    const buf = Buffer.from(await res.arrayBuffer());
    const type = res.headers.get("content-type") || "application/octet-stream";
    return await uploadToR2(buf, fileName, type);
  } catch {
    return "";
  }
}

export interface ImportCandidate {
  sku: string;
  name: string;
  url: string;
  price?: number | null;
  category?: string;
  /** Din listarea furnizorului; null cand nu scrie nimic acolo. */
  available?: boolean | null;
}

export interface ImportOutcome {
  sku: string;
  name: string;
  ok: boolean;
  productId?: number;
  /** Ce nu s-a putut completa, ca sa se stie unde e nevoie de interventie. */
  warnings: string[];
  error?: string;
}

/**
 * Ordinea surselor pentru stoc: intai ce spune listarea (de incredere), apoi
 * pagina de produs, iar daca niciuna nu spune nimic — pe stoc.
 */
function stockStatusFor(fromListing?: boolean | null, fromPage?: boolean | null): string {
  if (fromListing === false) return "out_of_stock";
  if (fromListing === true) return "in_stock";
  if (fromPage === false) return "out_of_stock";
  return "in_stock";
}

/** Slug liber: daca exista deja unul identic, lipim codul la coada. */
async function uniqueSlug(base: string, sku: string): Promise<string> {
  const slug = base || sku;
  const { data } = await supabase.from("products").select("id").eq("slug", slug).maybeSingle();
  return data ? `${slug}-${sku}` : slug;
}

/**
 * Insert care supravietuieste diferentelor de schema: daca Supabase raspunde ca
 * o coloana nu exista, o scoatem si reincercam, in loc sa pierdem tot importul.
 */
async function insertTolerant(
  payload: Record<string, unknown>,
  warnings: string[]
): Promise<{ data: { id: number } | null; error: string | null }> {
  let body = { ...payload };
  for (let attempt = 0; attempt < 8; attempt++) {
    const { data, error } = await supabase.from("products").insert(body).select("id").single();
    if (!error) return { data, error: null };
    if (error.code !== "PGRST204" && error.code !== "42703") return { data: null, error: error.message };
    const missing = /'([^']+)' column/.exec(error.message)?.[1];
    if (!missing || !(missing in body)) return { data: null, error: error.message };
    warnings.push(`coloana ${missing} nu exista in tabela — sarita`);
    const { [missing]: _drop, ...rest } = body;
    void _drop;
    body = rest;
  }
  return { data: null, error: "prea multe coloane lipsa in tabela products" };
}

export async function importProduct(
  candidate: ImportCandidate,
  cookies: string
): Promise<ImportOutcome> {
  const warnings: string[] = [];
  const name = candidate.name.trim();
  const sku = candidate.sku.trim();

  if (!name || !sku) {
    return { sku, name, ok: false, warnings, error: "lipseste numele sau codul" };
  }

  const fetched = await fetchProductDetails(candidate.url, cookies);
  if (!fetched.ok || !fetched.details) {
    return { sku, name, ok: false, warnings, error: `pagina produsului: ${fetched.reason}` };
  }
  const d = fetched.details;

  if (!d.description) warnings.push("fara descriere pe mysnep");
  if (!d.imageUrl) warnings.push("fara imagine pe mysnep");

  const slug = await uniqueSlug(slugify(name), sku);
  const category = candidate.category || "";

  // Imaginea si fisa tehnica se oglindesc pe R2, ca sa nu depindem de mysnep.
  const r2Image = d.imageUrl ? await mirrorToR2(d.imageUrl, `products/${slug}.jpg`) : "";
  if (d.imageUrl && !r2Image) warnings.push("imaginea nu a putut fi urcata pe R2");
  const r2Datasheet = d.datasheetUrl ? await mirrorToR2(d.datasheetUrl, `datasheets/${slug}.pdf`) : "";

  const meta = buildMeta(name, d.shortDescription, category);
  const price = candidate.price ?? d.price ?? 0;

  // Doar coloanele care exista in tabela `products`. woo_id / template /
  // custom_fields / addon_group_ids apar in alte locuri din admin, dar nu sunt
  // coloane reale — un insert cu ele pica tot.
  const payload: Record<string, unknown> = {
      name,
      slug,
      sku: d.sku || sku,
      source_url: candidate.url,
      source_id: /-([A-Z]\d+)\.html$/i.exec(candidate.url)?.[1] || "",
      price,
      currency: "RON",
      old_price: null,
      quantity: d.quantity || null,
      points: d.points ?? 0,
      // Disponibilitatea vine din listare (candidate), unde furnizorul chiar o
      // scrie. Pagina de produs NU contine marcajul "disponibil", deci acolo
      // citirea da null — iar `!null` facea ca tot ce se importa sa intre
      // "indisponibil". Necunoscut inseamna pe stoc, nu invers.
      stock_status: stockStatusFor(candidate.available, d.available),
      image_url: d.imageUrl,
      r2_image_url: r2Image || d.imageUrl,
      gallery: [],
      description: cleanContentHtml(d.description),
      short_description: cleanContentText(d.shortDescription),
      ingredients: cleanContentHtml(d.ingredients) || null,
      usage_info: cleanContentHtml(d.usageInfo) || null,
      warnings: cleanContentHtml(d.warnings) || null,
      certifications: cleanContentHtml(d.certifications) || null,
      datasheet_url: d.datasheetUrl,
      datasheet_r2_url: r2Datasheet,
      category_slugs: category ? [category] : [],
      variants: [],
      sort_order: 0,
      imported_at: new Date().toISOString(),
      ...meta,
  };

  const { data, error } = await insertTolerant(payload, warnings);
  if (error || !data) return { sku, name, ok: false, warnings, error: error || "insert fara rezultat" };
  if (!category) warnings.push("fara categorie — alege una din editor");

  return { sku, name, ok: true, productId: data.id, warnings };
}
