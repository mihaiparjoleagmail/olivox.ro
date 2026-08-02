/**
 * Ultimele resturi lasate de generatorul vechi de meta:
 *
 *   - 9 meta_description taiate la mijlocul propozitiei, cu "Livrare 3-5 zile
 *     lucratoare in Romania." lipit direct dupa fragment ("Inspirat din notele
 *     lui Livrare 3-5 zile...").
 *   - 3 description identice intre variante ale aceluiasi produs.
 *
 * Ruleaza:
 *   npx tsx scripts/fix-broken-meta.ts --dry
 *   npx tsx scripts/fix-broken-meta.ts
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

const META_DESC: Record<string, string> = {
  "detox-zkit-vegan-cacao-cocos":
    "Detox Z-Kit vegan: Plus Z cacao si cocos, Burner, maca, Aloe 100 Bio, RealComplex, KaloSnep si shaker, reunite intr-un singur pachet Snep.",
  "fit9-detox-vegan-cacao-aloe-piersic":
    "Fit9 Detox cu Plus vegan cacao 1000 g, RealFibre la plic, Total Energy capsule, Burner si trei sticle de Aloe Piersica. Program complet Snep.",
  "kit-suncare":
    "Kit Suncare Snep: produsele din linia de protectie solara reunite intr-un pachet, pentru intreaga perioada de plaja. Textura nelipicioasa.",
  "201-inspirat-de-notele-lui-alien":
    "Parfum Snep 201, 50 ml, construit in jurul notelor din Alien. Alternativa accesibila, cu aceeasi directie olfactiva florala si intensa.",
  "101-inspirat-de-notele-lui-aventus":
    "Parfum Snep 101, 50 ml, inspirat de Aventus: lamaie, bergamota si piper roz la varf, ananas si iasomie in mijloc, mesteacan si cedru la baza.",
  "cup-snep":
    "Cupa Snep pentru Long Coffee, din gama de accesorii a brandului. Utila acasa, la birou sau ca mic cadou tematic.",
  "the-leader-book":
    "The Leader Book: notepad A4 cu logo Snep, pentru notite si planificare. Accesoriu din gama dedicata distribuitorilor.",
  deolatte:
    "Deolatte roll-on, 40 ml: formula cremoasa cu extract organic de galbenele, amidon de orez, ulei de canepa si de bumbac, cu complex de salvie.",
  "reinature-box":
    "Reinature Box: serul, crema, stickul, picaturile si spray-ul din gama Reinature, gandite pentru pielea cu impuritati, intr-un singur pachet.",
};

const DESCRIPTIONS: Record<string, string> = {
  "filtrare-prin-osmoz-invers-hydropurareg":
    "<p><strong>HydroPura — viitorul apei, acum.</strong> Masina cu sistem de osmoza inversa si hidrogenare, pentru filtrarea apei la punctul de consum. Aceasta este varianta standard a sistemului, cu garantia obisnuita a producatorului.</p>",
  "filtrare-prin-osmoz-invers-hydropurareg-5-year-warranty":
    "<p><strong>HydroPura — viitorul apei, acum.</strong> Masina cu sistem de osmoza inversa si hidrogenare, in varianta cu <strong>garantie extinsa la 5 ani</strong>. Filtrarea este identica cu a modelului standard; difera doar acoperirea garantiei.</p>",
  "thegrave-mix":
    "<p>The Mix este amestecul de ceai al gamei Snep, disponibil aici <strong>la vrac</strong>, cu dozare libera in functie de cat de intensa vrei infuzia. Se bea cald sau rece, cu gheata. Dezintoxicarea organismului are efecte si asupra metabolismului si a retentiei de apa.</p>",
  "thegrave-mix-plicuri":
    "<p>Acelasi amestec The Mix, aici <strong>portionat la plic</strong>, pentru o cana. Varianta practica pentru birou sau pentru drum, fara cantar si fara strecuratoare. Dezintoxicarea organismului are efecte si asupra metabolismului si a retentiei de apa.</p>",
  pink: "<p>Plasture PINK — calmare naturala in timpul menstruatiei. Plasture dermoactiv, se aplica local pe piele curata si uscata. Aceasta este varianta <strong>la bucata</strong>, pentru cine vrea sa il incerce intai.</p>",
  "pink-10x":
    "<p>Plasture PINK — calmare naturala in timpul menstruatiei. Plasture dermoactiv, se aplica local pe piele curata si uscata. Aceasta este <strong>cutia de 10 bucati</strong>, pentru cine il foloseste in fiecare luna.</p>",
};

async function main() {
  const { data: products, error } = await supabase
    .from("products")
    .select("slug, meta_description, description")
    .limit(1000);
  if (error || !products) {
    console.error("Nu am putut citi produsele:", error?.message);
    process.exit(1);
  }

  const updates = new Map<string, Record<string, string>>();
  const add = (slug: string, patch: Record<string, string>) =>
    updates.set(slug, { ...(updates.get(slug) || {}), ...patch });

  for (const [slug, v] of Object.entries(META_DESC)) {
    if (!products.some((p) => p.slug === slug)) { console.error("  [!] inexistent:", slug); continue; }
    add(slug, { meta_description: v });
  }
  for (const [slug, v] of Object.entries(DESCRIPTIONS)) {
    if (!products.some((p) => p.slug === slug)) { console.error("  [!] inexistent:", slug); continue; }
    add(slug, { description: v });
  }

  const problems: string[] = [];
  for (const field of ["meta_description", "description"] as const) {
    const seen = new Map<string, string>();
    for (const p of products) {
      const v = (updates.get(p.slug)?.[field] ?? p[field] ?? "").trim();
      if (!v) continue;
      if (seen.has(v)) problems.push(`${field}: ${p.slug} duplicat cu ${seen.get(v)}`);
      seen.set(v, p.slug);
    }
  }
  for (const [slug, patch] of updates) {
    const md = patch.meta_description;
    if (md && (md.length < 70 || md.length > 160)) {
      problems.push(`${slug}: meta_description ${md.length} caractere (70-160)`);
    }
  }

  if (problems.length) {
    console.error(`VALIDARE ESUATA (${problems.length}) — nu am scris nimic:`);
    problems.slice(0, 20).forEach((x) => console.error("  -", x));
    process.exit(1);
  }

  console.log(
    `Validare OK. De actualizat: ${updates.size} produse ` +
      `(${Object.keys(META_DESC).length} meta_description reparate, ${Object.keys(DESCRIPTIONS).length} description diferentiate).`
  );
  if (DRY) return console.log("--dry: nu s-a scris nimic.");

  let ok = 0;
  for (const [slug, patch] of updates) {
    const { error: upErr } = await supabase.from("products").update(patch).eq("slug", slug);
    if (upErr) { console.error(`  [FAIL] ${slug}: ${upErr.message}`); continue; }
    ok++;
  }
  console.log(`Actualizate: ${ok}/${updates.size} produse.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
