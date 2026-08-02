/**
 * Repara meta_description-urile taiate la mijlocul propozitiei.
 *
 * Generatorul vechi lua textul produsului, il taia brutal la N caractere si
 * lipea "Livrare 3-5 zile lucratoare in Romania." direct dupa fragment:
 *   "Tribux Blue este un supliment alimentar din L-Citrulline si Acetil
 *    carnitina, cu extracte de Tribulus terrestris, Livrare 3-5 zile..."
 *
 * Aici textul fiecarui produs e taiat la ultima *propozitie completa* care
 * incape, iar randul de livrare se adauga doar daca mai e loc. Textul ramane
 * al produsului — se schimba doar locul taieturii.
 *
 * Nu atinge produsele scrise de mana (cele fara sablonul "Livrare 3-5 zile").
 *
 * Ruleaza:
 *   npx tsx scripts/rebuild-product-meta-desc.ts --dry
 *   npx tsx scripts/rebuild-product-meta-desc.ts
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const envFile = resolve(process.cwd(), ".env.local");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);
const DRY = process.argv.includes("--dry");

const MAX = 158;
const DELIVERY = " Livrare in 3-5 zile lucratoare.";
const TEMPLATE_MARK = /Livrare 3-5 zile lucratoare in Romania\./;

// Cateva descrieri sursa lipsesc sau au titlul lipit de corp in HTML-ul importat.
const SOURCE_OVERRIDE: Record<string, string> = {
  "incalzitor-de-gat-easeline-m":
    "Incalzitor de gat EaseLine, marimea M, din tesatura elastica cu fir functional. Se poarta local, pe zona cefei si a gatului.",
};

function plain(html: string | null): string {
  return (html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&[a-z]+;/g, " ")
    // "IMPURITĂȚICremă" -> "IMPURITĂȚI Cremă": titlu all-caps lipit de paragraf.
    .replace(/([A-ZĂÂÎȘȚ]{2,})([A-ZĂÂÎȘȚ][a-zăâîșț])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}

// Sparge in propozitii, tratand si abrevierile de tip "1,5 l." rezonabil.
function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=[A-ZĂÂÎȘȚ0-9])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function build(source: string): string | null {
  const clean = source.replace(/\s*Livrare 3-5 zile lucratoare in Romania\.?\s*$/, "").trim();
  if (!clean) return null;

  const parts = sentences(clean);
  let out = "";

  for (const s of parts) {
    const next = out ? `${out} ${s}` : s;
    if (next.length > MAX) break;
    out = next;
  }

  // Nicio propozitie intreaga nu incape: taie la ultima virgula, altfel la cuvant.
  if (!out) {
    const first = parts[0] || clean;
    const cut = first.slice(0, MAX - 1);
    const comma = cut.lastIndexOf(", ");
    const space = cut.lastIndexOf(" ");
    const at = comma > MAX * 0.55 ? comma : space;
    out = (at > 0 ? cut.slice(0, at) : cut).replace(/[,;:\-—\s]+$/, "") + "…";
  }

  if (!/[.!?…]$/.test(out)) out += ".";

  if (out.length + DELIVERY.length <= MAX) out += DELIVERY;

  return out.length >= 60 ? out : null;
}

async function main() {
  const { data: products, error } = await supabase
    .from("products")
    .select("name, slug, meta_description, short_description, description")
    .limit(1000);
  if (error || !products) {
    console.error("Nu am putut citi produsele:", error?.message);
    process.exit(1);
  }

  const targets = products.filter((p) => TEMPLATE_MARK.test(p.meta_description || ""));
  console.log(`Produse cu sablonul vechi: ${targets.length} din ${products.length}`);

  const proposed = new Map<string, string>();
  const skipped: string[] = [];

  for (const p of targets) {
    const source =
      SOURCE_OVERRIDE[p.slug] || plain(p.short_description) || plain(p.description) || plain(p.name);
    const built = build(source);
    if (!built) {
      skipped.push(p.slug);
      continue;
    }
    proposed.set(p.slug, built);
  }

  // Unicitate pe starea finala a intregului tabel.
  const seen = new Map<string, string>();
  const collisions: string[] = [];
  for (const p of products) {
    const v = proposed.get(p.slug) ?? p.meta_description ?? "";
    if (!v) continue;
    if (seen.has(v)) {
      // Dezambiguizeaza cu numele produsului, daca incape.
      const label = p.name.trim();
      const candidate = `${label}: ${v}`.slice(0, MAX);
      if (proposed.has(p.slug) && !seen.has(candidate)) {
        proposed.set(p.slug, candidate);
        seen.set(candidate, p.slug);
        continue;
      }
      collisions.push(`${p.slug} <-> ${seen.get(v)}`);
      continue;
    }
    seen.set(v, p.slug);
  }

  const tooLong = [...proposed.entries()].filter(([, v]) => v.length > 160);
  if (collisions.length || tooLong.length) {
    console.error("VALIDARE ESUATA — nu am scris nimic:");
    collisions.slice(0, 10).forEach((c) => console.error("  duplicat:", c));
    tooLong.slice(0, 10).forEach(([s, v]) => console.error(`  prea lung: ${s} (${v.length})`));
    process.exit(1);
  }

  const lens = [...proposed.values()].map((v) => v.length);
  console.log(
    `De rescris: ${proposed.size} | sarite (fara text sursa): ${skipped.length} | ` +
      `lungime medie: ${Math.round(lens.reduce((a, b) => a + b, 0) / lens.length)} caractere`
  );
  console.log("--- esantion ---");
  [...proposed.entries()].slice(0, 8).forEach(([s, v]) => console.log(`  (${v.length}) ${s}\n      ${v}`));
  if (skipped.length) console.log("  fara text sursa:", skipped.join(", "));

  if (DRY) return console.log("\n--dry: nu s-a scris nimic.");

  let ok = 0;
  for (const [slug, v] of proposed) {
    const { error: upErr } = await supabase
      .from("products")
      .update({ meta_description: v })
      .eq("slug", slug);
    if (upErr) {
      console.error(`  [FAIL] ${slug}: ${upErr.message}`);
      continue;
    }
    ok++;
  }
  console.log(`\nActualizate: ${ok}/${proposed.size} produse.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
