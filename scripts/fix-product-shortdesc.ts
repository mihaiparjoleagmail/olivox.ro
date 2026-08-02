/**
 * Ultimele campuri SEO ramase duplicate la produse:
 *   - 34 de short_description identice pe 15 grupuri de variante
 *   - 10 keywords identice pe 5 grupuri
 *
 * short_description e text vizibil (apare sub titlul produsului si serveste ca
 * rezerva pentru meta description), deci e scris de mana, nu generat.
 *
 * Ruleaza:
 *   npx tsx scripts/fix-product-shortdesc.ts --dry
 *   npx tsx scripts/fix-product-shortdesc.ts
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
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
const DRY = process.argv.includes("--dry");

const SHORT: Record<string, string> = {
  realcomplex:
    "RealComplex la plic, 30 x 8 g. Papadie, mesteacan si anghinare, alaturi de magneziu, calciu, potasiu, fier bisglicinat si vitaminele C si D.",
  "realcomplex-tab":
    "RealComplex TAB, 120 de comprimate de 800 mg. Aceleasi extracte si minerale ca la plic, cu dozare flexibila intre 2 si 6 comprimate pe zi.",

  "batoane-cu-gust-de-banan-i-ciocolat":
    "Baton Snep cu gust de banana si ciocolata, ambalat individual, ca gustare intre mese.",
  "batoane-cu-gust-de-alune-de-padure-i-ciocolat":
    "Baton Snep cu gust de alune de padure si ciocolata, ambalat individual, ca gustare intre mese.",
  "batoane-cu-gust-de-cocos-si-ciocolat":
    "Baton Snep cu gust de cocos si ciocolata, ambalat individual, ca gustare intre mese.",
  "batoane-cu-gust-de-crem-i-biscuite":
    "Baton Snep cu gust de crema si biscuite, ambalat individual, ca gustare intre mese.",

  "nat-box":
    "NAT BOX: cleansing balm, pink mousse si candy scrub din gama skincare coreana Made in Italy, in cutia standard.",
  "nat-special-gift-box":
    "NAT Special Gift Box: aceleasi trei produse NAT, in ambalajul cadou dedicat, pregatit pentru daruit.",

  "plus-vegan-cacao":
    "Plus Vegan Cacao, 1000 g. Inlocuitor de masa cu proteina vegetala din soia, fibre, vitamine si minerale, de amestecat cu 250 ml lapte.",
  "plus-vegan-cacao-30-plicuri":
    "Plus Vegan Cacao la plic, 30 x 26 g. Aceeasi formula ca la borcan, portionata pentru birou si deplasari.",
  "plus-cacao-i-capsuni-vegane":
    "Plus vegan cu cacao si capsuni. Varianta cu nota de fructe a inlocuitorului de masa, cu acelasi aport de proteina vegetala si fibre.",
  "plus-cappuccino-1000g":
    "Plus Cappuccino, 1000 g. Varianta cu gust de cappuccino a inlocuitorului de masa Snep, pentru cine prefera nota de cafea.",

  realvita:
    "RealVita la plic, 30 x 10 ml. Complex de vitamine in forma lichida, cu laptisor de matca si L-carnitina, pentru metabolismul energetic normal.",
  "realvita-comprimate":
    "RealVita comprimate. Acelasi complex de vitamine, in forma solida — mai usor de luat la serviciu sau in calatorie.",

  "cafea-in-pod-de-hartie-de-orez-cu-ganoderma":
    "Cafea Snep in pod de hartie de orez, cu extract de ganoderma. Pod biodegradabil, compatibil cu aparatele ESE de 44 mm.",
  "cafea-in-pod-de-hartie-de-orez-cu-oleuropeina":
    "Cafea Snep in pod de hartie de orez, cu oleuropeina din frunze de maslin. Acelasi format de pod, cu alt extract.",

  "thegrave-mix":
    "The Mix la vrac. Amestec italienesc de ceai, cu dozare libera, pentru infuzii calde sau reci.",
  "thegrave-mix-plicuri":
    "The Mix la plic. Acelasi amestec de ceai, portionat pentru o cana — practic la birou si pe drum.",

  "realfibre-plicuri":
    "RealFibre la plic, 30 x 4,01 g. Inulina, fibre din mar si FOS, portionate pentru o doza pe zi, fara cantarire.",
  "realfibre-comprimates":
    "RealFibre comprimate, 120 x 700 mg. Aceleasi fibre prebiotice plus 80 mg spirulina, pentru cine nu vrea sa dizolve pudra.",

  start:
    "Snep Start. Formula pentru aportul nutritional dinaintea efortului, gandita ca punct de plecare al rutinei sportive.",
  "kit-sport-for-all":
    "Kit Sport for All. Produsele de baza Snep pentru antrenament si recuperare, reunite intr-un singur pachet.",

  "travel-set":
    "Travel Set: 6 sticle de 100 ml pentru transferul produselor preferate. Volum acceptat la bordul avionului.",
  "travel-set-spray":
    "Travel Set Spray: aceleasi 6 recipiente de 100 ml, cu pulverizator, pentru lotiuni si tonice.",

  "moringa-capsule":
    "Moringa in capsule. Extract uscat din frunze si pudra de seminte, in doza fixa, fara gustul de planta.",
  "powder-lipfilizat-moringa":
    "Moringa pudra liofilizata. Aceeasi planta in forma pulbere, de dizolvat in apa sau smoothie, cu dozare libera.",

  kalosnep:
    "KaloSnep la plic, 34 x 12 ml. Curcuma, emblica, berberis si guarana, in forma lichida. Contine cofeina.",
  "kalosnep-capsule":
    "KaloSnep capsule, 120 x 545 mg. Aceleasi extracte principale, fara guarana — deci fara cofeina. Doza de 4 capsule pe zi.",

  night:
    "NIGHT la flacon. Formula cu L-arginina, L-citrulina, taurina si vitamine, pentru rutina de seara.",
  "night-plicuri":
    "NIGHT la plic. Aceeasi formula, portionata in pliculete, pentru dozare exacta si pentru calatorii.",

  "filtrare-prin-osmoz-invers-hydropurareg":
    "Sistem HydroPura de filtrare a apei prin osmoza inversa si hidrogenare, in varianta standard.",
  "filtrare-prin-osmoz-invers-hydropurareg-5-year-warranty":
    "Sistem HydroPura de osmoza inversa si hidrogenare, in varianta cu garantie extinsa la 5 ani.",

  pink: "Plasture PINK, la bucata. Calmare naturala in timpul menstruatiei, aplicat local pe piele curata.",
  "pink-10x": "Plasture PINK, cutie de 10 bucati. Aceeasi varianta, cu rezerva pentru mai multe cicluri.",
};

const KEYWORDS: Record<string, string> = {
  morinda: "morinda, nevoi specifice, olivox, snep, romania, supliment natural",
  "morinda-piugrave":
    "morinda piu, morinda plus, nevoi specifice, olivox, snep, romania, supliment natural",
  "sticla-hydropura": "sticla hydropura, sticla apa, hydropura, olivox, snep, romania",
  "sticl-de-sticl-hydropurareg":
    "sticla de sticla hydropura, recipient sticla, hydropura, olivox, snep, romania",
  "catalog-general-a5-esp-2024":
    "catalog general a5, editie spaniola 2024, promotii, kit-uri, olivox, snep, romania",
  "catalog-general-a5-esp-2024-x3":
    "catalog general a5 set 3 bucati, editie spaniola 2024, promotii, kit-uri, olivox, snep",
  "olivox-6-sticle-de-1-litru":
    "olivox 6 sticle, olivox 6 litri, nevoi specifice, snep, romania, supliment natural",
  "olivox-40-2-sticle-de-1-litru":
    "olivox 40, olivox 2 sticle, maslin curcuma rozmarin, nevoi specifice, snep, romania",
  "spray-transparent-pentru-protectie-solara-spf-25":
    "spray transparent spf 25, protectie solara medie, olivox, snep, romania",
  "spray-transparent-pentru-protectie-solara-spf-50":
    "spray transparent spf 50, protectie solara ridicata, olivox, snep, romania",
};

async function main() {
  const { data: products, error } = await supabase
    .from("products")
    .select("slug, short_description, keywords")
    .limit(1000);
  if (error || !products) {
    console.error("Nu am putut citi produsele:", error?.message);
    process.exit(1);
  }

  const updates = new Map<string, Record<string, string>>();
  const add = (slug: string, patch: Record<string, string>) =>
    updates.set(slug, { ...(updates.get(slug) || {}), ...patch });

  for (const [slug, v] of Object.entries(SHORT)) {
    if (!products.some((p) => p.slug === slug)) {
      console.error("  [!] slug inexistent:", slug);
      continue;
    }
    add(slug, { short_description: v });
  }
  for (const [slug, v] of Object.entries(KEYWORDS)) {
    if (!products.some((p) => p.slug === slug)) {
      console.error("  [!] slug inexistent:", slug);
      continue;
    }
    add(slug, { keywords: v });
  }

  // Validare pe starea finala a intregului tabel.
  const problems: string[] = [];
  for (const field of ["short_description", "keywords"] as const) {
    const seen = new Map<string, string>();
    for (const p of products) {
      const v = (updates.get(p.slug)?.[field] ?? p[field] ?? "").trim();
      if (!v) continue;
      if (seen.has(v)) problems.push(`${field}: ${p.slug} inca duplicat cu ${seen.get(v)}`);
      seen.set(v, p.slug);
    }
  }

  if (problems.length) {
    console.error(`VALIDARE ESUATA (${problems.length}) — nu am scris nimic:`);
    problems.slice(0, 20).forEach((x) => console.error("  -", x));
    process.exit(1);
  }

  console.log(
    `Validare OK. De actualizat: ${updates.size} produse ` +
      `(${Object.keys(SHORT).length} short_description, ${Object.keys(KEYWORDS).length} keywords).`
  );
  if (DRY) {
    console.log("--dry: nu s-a scris nimic.");
    return;
  }

  let ok = 0;
  for (const [slug, patch] of updates) {
    const { error: upErr } = await supabase.from("products").update(patch).eq("slug", slug);
    if (upErr) {
      console.error(`  [FAIL] ${slug}: ${upErr.message}`);
      continue;
    }
    ok++;
  }
  console.log(`Actualizate: ${ok}/${updates.size} produse.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
