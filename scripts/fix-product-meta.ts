/**
 * Repara defectele concrete de SEO la nivel de produs:
 *
 *   A. 61 de produse impart 22 de meta_description identice (variante ale
 *      aceluiasi produs: format, aroma, gramaj). Fiecare primeste un text
 *      propriu, scris de mana, care numeste exact ce il diferentiaza.
 *   B. 74 de meta_title depasesc 60 de caractere si erau deja taiate urat de
 *      generator ("... | oli"). Reconstruite sub limita, la granita de cuvant.
 *   C. 29 de produse (merch: tricouri, caciuli, cataloage) nu au nici
 *      short_description, nici description. Primesc un text factual scurt.
 *
 * Ruleaza:
 *   npx tsx scripts/fix-product-meta.ts --dry    # doar verifica
 *   npx tsx scripts/fix-product-meta.ts          # scrie
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
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE env vars");
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
const DRY = process.argv.includes("--dry");

// ─── A. meta_description unice pentru produsele care le aveau duplicate ──────
const DESCRIPTIONS: Record<string, string> = {
  // Uleiuri esentiale — acelasi text generic pe 7 produse
  "rozmarin-ulei-esential":
    "Ulei esential de rozmarin Snep, pur, pentru difuzor si aromaterapie. Nota erbacee si tonica, folosita traditional pentru senzatia de prospetime.",
  "menta-ulei-esential":
    "Ulei esential de menta Snep, pur, cu nota racoritoare intensa. Se foloseste in difuzor sau diluat in ulei purtator, in aromaterapie si masaj.",
  "lamaie-ulei-esential":
    "Ulei esential de lamaie Snep, obtinut din coaja, cu nota citrica vie. Potrivit pentru difuzor si pentru amestecuri de curatenie naturala.",
  "sage-ulei-esential":
    "Ulei esential de salvie Snep, cu nota erbacee calda si patrunzatoare. Se foloseste diluat, in difuzor sau in amestecuri pentru masaj.",
  "origan-ulei-esential":
    "Ulei esential de origan Snep, pur, cu nota puternic aromatica. Unul dintre cele mai concentrate din gama — se dilueaza intotdeauna inainte de folosire.",
  "eucalipt-ulei-esential":
    "Ulei esential de eucalipt Snep, cu nota proaspata si patrunzatoare. Folosit traditional in difuzor, mai ales in sezonul rece.",
  "isop-ulei-esential":
    "Ulei esential de isop Snep, o nota mai putin obisnuita in aromaterapie, erbacee si dulceaga. Se foloseste diluat, in cantitati mici.",

  // Programe — toate aveau textul-eroare "Puncte Volum: STARTING"
  "real-detox":
    "Program Real Detox de la Snep: pachet structurat care reuneste produsele liniei Real intr-o schema de urmat conform pliantului inclus.",
  "program-strong":
    "Program Strong Snep: pachet intermediar de produse pentru cine vrea o schema mai sustinuta decat cea de baza, cu pliant de utilizare inclus.",
  "kit-kalo-sprint":
    "Kit Kalo Sprint: pachetul Snep construit in jurul liniei Kalo, cu Kalogel si produsele care il insotesc intr-o schema de scurta durata.",
  "program-extra-strong":
    "Program Extra Strong Snep: cel mai amplu pachet din gama de programe, pentru cine urmeaza o schema completa pe o perioada mai lunga.",
  "starting-point":
    "Starting Point: pachetul Snep de intrare, gandit pentru primul contact cu gama — produse de baza si pliant cu modul de utilizare.",
  "program-basic":
    "Program Basic Snep: pachetul de pornire cu produsele esentiale ale gamei, intr-o schema simpla, potrivita pentru inceput.",
  "kit-de-picioare":
    "Kit de picioare Snep: produsele pentru ingrijirea picioarelor, reunite intr-un singur pachet, cu instructiuni de folosire incluse.",

  // Plus — inlocuitori de masa
  "plus-vegan-cacao":
    "Plus Vegan Cacao Snep, 1000 g: inlocuitor de masa cu proteina vegetala din soia, fibre, vitamine si minerale. Se prepara cu 250 ml lapte.",
  "plus-vegan-cacao-30-plicuri":
    "Plus Vegan Cacao la plic: aceeasi formula ca varianta de 1000 g, portionata in 30 de plicuri de 26 g. Practic pentru birou si deplasari.",
  "plus-cacao-i-capsuni-vegane":
    "Plus vegan cu cacao si capsuni: varianta cu gust de fructe a inlocuitorului de masa Snep, cu proteina vegetala, fibre, vitamine si minerale.",
  "plus-cappuccino-1000g":
    "Plus Cappuccino 1000 g: varianta cu gust de cappuccino a inlocuitorului de masa Snep, pentru cine prefera nota de cafea dimineata.",

  // Batoane
  "batoane-cu-gust-de-alune-de-padure-i-ciocolat":
    "Batoane Snep cu gust de alune de padure si ciocolata, pentru gustarea dintre mese. Portionate individual, usor de purtat in geanta.",
  "batoane-cu-gust-de-cocos-si-ciocolat":
    "Batoane Snep cu gust de cocos si ciocolata: varianta tropicala din gama de gustari portionate pentru controlul greutatii.",
  "batoane-cu-gust-de-banan-i-ciocolat":
    "Batoane Snep cu gust de banana si ciocolata, o gustare dulce si portionata, gandita ca alternativa la snack-urile obisnuite.",
  "batoane-cu-gust-de-crem-i-biscuite":
    "Batoane Snep cu gust de crema si biscuite, pentru pofta de dulce de la mijlocul zilei. Ambalate individual, cu portie fixa.",

  // EaseLine — textile
  "fa-de-pern-easeline":
    "Fata de perna EaseLine, tesuta cu firul care reflecta caldura corpului. Singura piesa din gama folosita in timpul somnului, fara sa fie purtata.",
  "genunchiera-easeline-s-m":
    "Genunchiera EaseLine, marimea S/M, din tesatura elastica cu fir functional. Se poarta local, pe genunchi, sub imbracaminte.",
  "earfa-de-easeline":
    "Esarfa EaseLine din tesatura cu fir functional, pentru zona gatului si a cefei. Se poarta ca accesoriu obisnuit, zi sau seara.",
  "maiou-femeie-easeline-s":
    "Maiou EaseLine pentru femei, marimea S, talie M/L, din tesatura foarte elastica cu fir functional. Se poarta direct pe piele.",
  "pants-easeline-brbat-m":
    "Pantaloni EaseLine pentru barbati, marimea M, din tesatura elastica cu fir functional. Se poarta ca strat de baza, sub imbracaminte.",

  // RealFibre
  realfibre:
    "RealFibre pudra, 120 g: inulina, fibre din mar si FOS, cu aroma de ananas. Doza de 4 g pe zi, cu dozare graduala. Vegan si fara gluten.",
  "realfibre-plicuri":
    "RealFibre la plic: 30 de pliculete de 4,01 g cu aceeasi formula prebiotica, portionata. Comod in deplasare, fara cantarire.",
  "realfibre-comprimates":
    "RealFibre comprimate: 120 de comprimate de 700 mg cu inulina, fibre din mar, FOS si 80 mg spirulina. Pentru cine nu vrea sa dizolve pudra.",

  // The
  "thegrave-mix":
    "The Mix Snep la vrac: amestec italienesc de ceai pentru infuzii calde sau reci, cu dozare libera in functie de intensitatea dorita.",
  "thegrave-mix-plicuri":
    "The Mix Snep la plic: acelasi amestec de ceai, portionat pentru o cana. Varianta practica pentru birou sau pentru drum.",
  "thegrave-peach":
    "The Peach Snep: amestecul de ceai cu aroma de piersica, pentru cine prefera o nota fructata. Se bea cald sau rece, cu gheata.",

  // RealComplex
  realcomplex:
    "RealComplex la plic, 30 x 8 g: papadie, mesteacan si anghinare, cu magneziu, calciu, potasiu, fier bisglicinat si vitaminele C si D.",
  "realcomplex-tab":
    "RealComplex TAB: 120 de comprimate de 800 mg cu aceleasi extracte si minerale, in doza flexibila de 2 pana la 6 comprimate pe zi.",

  // Aloe drink 7 fructe
  "aloe-drink-7-fructe":
    "Aloe Drink 7 Fructe, flacon de 1 litru: gel de aloe cu acai, goji, mangustan, noni, ceai verde si afine. Doza de 20 ml, o data sau de doua ori pe zi.",
  "aloe-drink-7-fructe-200ml-6-sticle":
    "Aloe Drink 7 Fructe la set de 6 sticle de 200 ml: aceeasi formula, portionata pentru drum si pentru cine nu vrea flaconul mare deschis mult timp.",

  // NAT
  "nat-box":
    "NAT BOX: cele trei produse din gama skincare coreana Made in Italy — cleansing balm, pink mousse si candy scrub — intr-o singura cutie.",
  "nat-special-gift-box":
    "NAT Special Gift Box: aceeasi gama NAT, in ambalajul cadou dedicat. Varianta pentru cand produsele merg direct spre altcineva.",

  // Sport start
  start:
    "Snep Start: formula pentru aportul nutritional dinaintea efortului, gandita ca punct de plecare al rutinei sportive.",
  "kit-sport-for-all":
    "Kit Sport for All: pachetul Snep care reuneste produsele de baza pentru antrenament si recuperare, intr-o singura comanda.",

  // KaloSnep
  kalosnep:
    "KaloSnep la plic: 34 de pliculete de 12 ml cu curcuma, emblica, berberis si guarana. Contine cofeina. Se ia inainte de mesele principale.",
  "kalosnep-capsule":
    "KaloSnep capsule: 120 de capsule de 545 mg cu 570 mg curcuminoizi si 291 mg berberina la 4 capsule. Fara guarana, deci fara cofeina.",

  // Snep Ice
  "snep-ice-sampon-anti-galben":
    "Snep Ice sampon anti-galben, cu pigment ultra violet si extract de lavanda. Pentru par blond natural, decolorat, alb sau argintiu.",
  "snep-ice-masc-anti-galben":
    "Snep Ice masca anti-galben: pasul de dupa sampon, cu acelasi pigment violet, aplicata pe lungimi pentru neutralizarea reflexelor calde.",

  // Moringa
  "moringa-capsule":
    "Moringa Snep in capsule: extract uscat din frunze si pudra de seminte, in doza fixa. Varianta comoda, fara gust de planta.",
  "powder-lipfilizat-moringa":
    "Moringa Snep pudra liofilizata: aceeasi planta in forma pulbere, de dizolvat in apa sau smoothie, cu dozare libera.",

  // RealVita
  realvita:
    "RealVita la plic, 30 x 10 ml: vitaminele C, B1, B2, B3, B5, B6, B9, B12 si biotina, cu laptisor de matca si L-carnitina, in forma lichida.",
  "realvita-comprimate":
    "RealVita comprimate: acelasi complex de vitamine pentru metabolismul energetic normal, in forma solida, mai usor de luat in deplasare.",

  // Cafea pod
  "cafea-in-pod-de-hartie-de-orez-cu-ganoderma":
    "Cafea Snep in pod de hartie de orez, cu extract de ganoderma. Pod biodegradabil, compatibil cu aparatele ESE 44 mm.",
  "cafea-in-pod-de-hartie-de-orez-cu-oleuropeina":
    "Cafea Snep in pod de hartie de orez, cu oleuropeina din frunze de maslin. Aceeasi cafea, cu extractul din familia Olivox in loc de ganoderma.",

  // Night
  night:
    "Night Snep la flacon: formula cu L-arginina, L-citrulina, taurina si vitamine, gandita pentru rutina de seara.",
  "night-plicuri":
    "Night Snep la plic: aceeasi formula portionata in pliculete, pentru dozare exacta si pentru cine calatoreste des.",

  // Travel set
  "travel-set":
    "Travel Set Snep: 6 sticle de 100 ml pentru a-ti transfera produsele preferate. Volum acceptat la bordul avionului.",
  "travel-set-spray":
    "Travel Set Spray Snep: aceleasi 6 recipiente de 100 ml, in varianta cu pulverizator, pentru lotiuni si tonice.",

  // Kit-uri cafea
  "kit-promo-ese-44-pod-cafea-cu-oleuropeina":
    "Kit promo ESE 44: pachetul in care platesti cafeaua cu oleuropeina si primesti aparatul compatibil pod-uri de 44 mm.",
  "promoie-aparat-2espresso-cafea-cu-ganoderma-compatibile-cu-nespresso":
    "Promotie aparat 2Espresso: aparatul compatibil Nespresso impreuna cu capsulele de cafea cu ganoderma, intr-un singur pachet.",

  // HydroPura
  "filtrare-prin-osmoz-invers-hydropurareg":
    "HydroPura: sistem de filtrare a apei prin osmoza inversa, pentru instalare la punctul de consum. Varianta standard, cu garantie obisnuita.",
  "filtrare-prin-osmoz-invers-hydropurareg-5-year-warranty":
    "HydroPura cu garantie de 5 ani: acelasi sistem de osmoza inversa, in varianta cu acoperire extinsa. Diferenta este garantia, nu filtrarea.",

  // Pink
  pink: "Plasture PINK Snep: varianta la bucata, pentru calmare naturala. Se aplica local, pe piele curata si uscata.",
  "pink-10x":
    "Plasture PINK Snep, pachet de 10 bucati: aceeasi varianta, la cutie, pentru cine il foloseste periodic si vrea rezerva.",
};

// ─── C. produse fara niciun text (merch) ────────────────────────────────────
const MERCH: Record<string, string> = {
  "tricou-snep-femeie-roie-l": "Tricou Snep pentru femei, culoare rosie, marimea L. Articol de merchandise din gama de accesorii Snep.",
  "tricou-snep-femei-negru-m": "Tricou Snep pentru femei, culoare neagra, marimea M. Articol de merchandise din gama de accesorii Snep.",
  "tricou-snep-brbai-rou-s": "Tricou Snep pentru barbati, culoare rosie, marimea S. Articol de merchandise din gama de accesorii Snep.",
  "tricou-snep-brbai-negru-s": "Tricou Snep pentru barbati, culoare neagra, marimea S. Articol de merchandise din gama de accesorii Snep.",
  "snep-slimfit-pentru-femei-t-thirt-s": "Tricou Snep slim fit pentru femei, marimea S, croiala mulata pe corp.",
  "snep-slimfit-brbai-t-thirt-s": "Tricou Snep slim fit pentru barbati, marimea S, croiala mulata pe corp.",
  "cciul-de-iarn-neagr": "Caciula de iarna Snep, culoare neagra, model simplu, tricotat.",
  "cciul-de-iarn-roie": "Caciula de iarna Snep, culoare rosie, model simplu, tricotat.",
  "cciul-de-iarn-neagr-cu-pompon": "Caciula de iarna Snep, culoare neagra, cu pompon.",
  "fular-snep": "Fular Snep tricotat, accesoriu de iarna din gama de merchandise.",
  "snep-agenda": "Agenda Snep pentru planificarea activitatii, utila distribuitorilor.",
  "termos-snep": "Termos Snep pentru bauturi calde sau reci, din gama de accesorii.",
  "termos-snep-sport11": "Termos Snep Sport, 500 ml, pentru sala si deplasari.",
  "pochette-suncare": "Pochette Suncare: husa Snep pentru transportul produselor de protectie solara.",
  "geant-frigorific-suncare": "Geanta frigorifica Suncare: pastreaza produsele de plaja la temperatura potrivita.",
  "plac-de-silicon-pentru-valiz": "Placa de silicon Snep pentru valiza, folosita la protejarea produselor in bagaj.",
  "catalog-general-a4-rom-eng-2024": "Catalog general Snep 2024, format A4, editie romana si engleza.",
  "catalog-general-a4-itaeng-2024": "Catalog general Snep 2024, format A4, editie italiana si engleza.",
  "catalog-general-a5-esp-2024": "Catalog general Snep 2024, format A5, editie in limba spaniola.",
  "catalog-general-a5-esp-2024-x3": "Catalog general Snep 2024, format A5, editie spaniola, set de 3 bucati.",
  "catalog-general-a5-ita-2025": "Catalog general Snep 2025, format A5, editie in limba italiana.",
  "catalog-general-a5-x10-ita-2025": "Catalog general Snep 2025, format A5, editie italiana, set de 10 bucati.",
  "catalog-general-a5-eng-2025": "Catalog general Snep 2025, format A5, editie in limba engleza.",
  "catalog-general-a5-rou-2025": "Catalog general Snep 2025, format A5, editie in limba romana.",
  "catalog-de-produse-a5-fra-2025": "Catalog de produse Snep 2025, format A5, editie in limba franceza.",
  "rezervati-costa-atat-costa-rou": "Brosura Snep „Costa atat cat costa”, editie in limba romana.",
  "rezervati-costa-atat-costa-eng": "Brosura Snep „Costa atat cat costa”, editie in limba engleza.",
  "rezervati-costa-atat-costa-ita": "Brosura Snep „Costa atat cat costa”, editie in limba italiana.",
  "rezervati-costa-atat-costa-esp": "Brosura Snep „Costa atat cat costa”, editie in limba spaniola.",
};

// ─── B. scurtare deterministica a titlurilor prea lungi ─────────────────────
const TITLE_MAX = 60;
const SUFFIX = " | olivox.ro";

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(" ")
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function shortenTitle(productName: string): string {
  const name = titleCase(productName.replace(/\s+/g, " ").trim());
  if ((name + SUFFIX).length <= TITLE_MAX) return name + SUFFIX;
  if (name.length <= TITLE_MAX) return name;
  const cut = name.slice(0, TITLE_MAX);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > TITLE_MAX * 0.6 ? cut.slice(0, lastSpace) : cut).trim();
}

async function main() {
  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, slug, meta_title, meta_description, short_description, description")
    .limit(1000);

  if (error || !products) {
    console.error("Nu am putut citi produsele:", error?.message);
    process.exit(1);
  }

  const updates = new Map<string, Record<string, string>>();
  const add = (slug: string, patch: Record<string, string>) => {
    updates.set(slug, { ...(updates.get(slug) || {}), ...patch });
  };

  // A
  for (const [slug, desc] of Object.entries(DESCRIPTIONS)) {
    if (!products.some((p) => p.slug === slug)) {
      console.error(`  [!] slug inexistent in DB: ${slug}`);
      continue;
    }
    add(slug, { meta_description: desc });
  }

  // B
  let longFixed = 0;
  for (const p of products) {
    if ((p.meta_title || "").length <= TITLE_MAX) continue;
    add(p.slug, { meta_title: shortenTitle(p.name) });
    longFixed++;
  }

  // C
  for (const [slug, text] of Object.entries(MERCH)) {
    if (!products.some((p) => p.slug === slug)) {
      console.error(`  [!] slug merch inexistent: ${slug}`);
      continue;
    }
    add(slug, { short_description: text, description: `<p>${text}</p>` });
  }

  // ─── Validare pe starea finala a intregului tabel ──────────────────────
  const finalDesc = new Map<string, string>();
  const finalTitle = new Map<string, string>();
  const problems: string[] = [];

  for (const p of products) {
    const patch = updates.get(p.slug) || {};
    const md = patch.meta_description ?? p.meta_description ?? "";
    const mt = patch.meta_title ?? p.meta_title ?? "";

    if (md) {
      if (md.length > 160) problems.push(`${p.slug}: meta_description ${md.length} caractere`);
      if (finalDesc.has(md)) problems.push(`${p.slug}: meta_description inca duplicata cu ${finalDesc.get(md)}`);
      finalDesc.set(md, p.slug);
    }
    if (mt) {
      if (mt.length > TITLE_MAX) problems.push(`${p.slug}: meta_title ${mt.length} caractere`);
      if (finalTitle.has(mt)) problems.push(`${p.slug}: meta_title duplicat cu ${finalTitle.get(mt)}`);
      finalTitle.set(mt, p.slug);
    }
  }

  if (problems.length) {
    console.error(`VALIDARE ESUATA (${problems.length}) — nu am scris nimic:`);
    problems.slice(0, 25).forEach((x) => console.error("  -", x));
    process.exit(1);
  }

  console.log(
    `Validare OK. De actualizat: ${updates.size} produse ` +
      `(${Object.keys(DESCRIPTIONS).length} descrieri unice, ${longFixed} titluri scurtate, ${Object.keys(MERCH).length} merch fara text).`
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
