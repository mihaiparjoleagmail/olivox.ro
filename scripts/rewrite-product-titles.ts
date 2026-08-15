/**
 * Rescrie `meta_title` pentru toate produsele, in noul tipar.
 *
 * Vechi:  `Realcomplex — Linia Real | olivox.ro`
 * Nou:    `RealComplex Snep`   (+ ` — pret 114 lei` adaugat la randare)
 *
 * De ce (date Search Console, 16 iul – 12 aug 2026):
 * - sufixul `| olivox.ro` era in 347 din 363 de titluri si punea peste 20 de
 *   pagini sa concureze pe cautarea „olivox"; brandul propriu statea pe poz. 12,5
 * - numele intern de categorie („Linia Real", „Nevoi Specifice") nu inseamna
 *   nimic intr-un rezultat Google si manca 15-20 de caractere
 * - „Snep" aparea in 38 de titluri, desi lumea cauta „<produs> snep"
 * - „pret" aparea in ZERO titluri, desi e in zeci de cautari reale
 *
 * Pretul NU se scrie aici — il compune `buildProductTitle` la randare, ca sa nu
 * ramana in urma dupa reactualizarea preturilor din mysnep.
 *
 * Usage:
 *   npx tsx scripts/rewrite-product-titles.ts            # dry-run, arata tot
 *   npx tsx scripts/rewrite-product-titles.ts --diff     # doar ce se schimba
 *   npx tsx scripts/rewrite-product-titles.ts --apply    # scrie in DB
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const envFile = resolve(process.cwd(), ".env.local");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

const APPLY = process.argv.includes("--apply");
const DIFF_ONLY = process.argv.includes("--diff");

/** Lungimea maxima a etichetei, ca `— pret XXXX lei` sa incapa sub 60. */
const MAX_LABEL = 44;

/**
 * Romana foloseste sentence case, nu Title Case englezesc: „Crema de noapte
 * pentru fata", nu „Cremă de Noapte pentru Față". Deci se scrie cu majuscula
 * doar primul cuvant, plus ce e in FIXED (marci, acronime, nume proprii).
 */

// Scrieri fixe: acronime, marci si nume proprii pe care titlul automat le-ar strica.
const FIXED: Record<string, string> = {
  olivox: "Olivox", realcomplex: "RealComplex", realfibre: "RealFibre",
  realvita: "RealVita", kalosnep: "KaloSnep", kalogel: "KaloGel",
  sneplumina: "SnepLumina", sneplumax: "SnepLumax", snep: "Snep",
  "intelli-g": "Intelli-G", "extra-d": "Extra-D", "heri-c": "Heri-C",
  "cordy-c": "Cordy-C", "auri-c": "Auri-C", "l&z": "L&Z", "am-pm": "AM-PM",
  bcaa: "BCAA", q10: "Q10", spf: "SPF", hd: "HD", uv: "UV", tab: "TAB",
  pm: "PM", am: "AM", ml: "ml", gr: "g", g: "g", kg: "kg", lt: "L", l: "L",
  bio: "Bio", zkit: "ZKit", fit9: "Fit9", "trico": "Trico", salus: "Salus",
  xfetta: "Xfetta", oliprox: "Oliprox", "olivessel": "Olivessel",
  olimind: "Olimind", ergovir: "Ergovir", cystoben: "Cystoben",
  ecdefense: "EcDefense", superelease: "SuperElease", crockis: "Crockis",
  venere: "Venere", morinda: "Morinda", moringa: "Moringa", maca: "Maca",
  reishi: "Reishi", agaricus: "Agaricus", maitake: "Maitake",
  shiitake: "Shiitake", quercetina: "Quercetina", ganoderma: "Ganoderma",
  oleuropeina: "Oleuropeina", nespresso: "Nespresso", lavazza: "Lavazza",
  aloe: "Aloe", omega: "Omega", tris: "Tris", krill: "Krill",
  hydropura: "Hydropura", easeline: "EaseLine", reinature: "ReiNature",
  choco: "Choco", nat: "NAT", deva: "Deva", hermes: "Hermes", vimana: "Vimana",
  sabana: "Sabana", master: "Master", orygen: "Orygen", belove: "Belove",
  fanfresh: "FanFresh", fanpaste: "FanPaste", deolatte: "Deolatte",
  deoacqua: "DeoAcqua", "thè": "Thè", the: "Thè", vitup: "VitUp",
  brain: "Brain", hydra: "Hydra", start: "Start", powerfect: "Powerfect",
  athletive: "Athletive", upgrate: "Upgrate", revelop: "Revelop",
  creatin: "Creatin", "tribux": "Tribux", blue: "Blue", night: "Night",
  buonanotte: "Buonanotte", tatapros: "TataPros", redris: "Redris",
  glucosamina: "Glucosamina", alkalyne: "Alkalyne", burner: "Burner",
  collagen: "Collagen", marine: "Marine", vegan: "Vegan", plus: "Plus",
  detox: "Detox", protine: "Protine", eyelift: "EyeLift", liplift: "LipLift",
  elixir: "Elixir", aqua: "Aqua", cream: "Cream", herpax: "Herpax",
  epsom: "Epsom", vera: "Vera", silver: "Silver", gold: "Gold", ice: "Ice",
  box: "Box", kit: "Kit", pro: "Pro", mix: "Mix", bar: "Bar", cup: "Cup",
  moon: "Moon", block: "Block", peach: "Peach", mood: "Mood", up: "Up",
  "black": "Black", garlic: "Garlic", "vitamina": "Vitamina", c: "C", d: "D",
  // Linia de parfum de camera: nume proprii italienesti, nu cuvinte comune.
  monte: "Monte", bianco: "Bianco", lavender: "Lavender", colline: "Colline",
  senesi: "Senesi", prato: "Prato", fiorito: "Fiorito", porto: "Porto",
  azzurro: "Azzurro", fiesole: "Fiesole", giardino: "Giardino", boboli: "Boboli",
  estate: "Estate", forte: "Forte", mandorle: "Mandorle", dolci: "Dolci",
  muscolease: "Muscolease", exvasi: "Exvasi", "top": "Top", finger: "Finger",
  // Denumiri comerciale in engleza care raman cu majuscula.
  weekly: "Weekly", dream: "Dream", beauty: "Beauty", ready: "Ready",
  summer: "Summer", light: "Light", silhouette: "Silhouette",
  draining: "Draining", system: "System", refill: "refill", promo: "promo",
  leader: "Leader", grande: "Grande", capsule: "capsule", door: "Door",
  shaker: "Shaker", protein: "Protein", complete: "Complete", base: "Base",
  cell: "Cell", office: "Office", granite: "Granite", gray: "Gray",
  pearl: "Pearl", shadow: "Shadow", blacks: "Blacks", medium: "Medium",
  cleansing: "Cleansing", milk: "Milk", mask: "Mask", stick: "Stick",
  spray: "Spray", drop: "Drop", serum: "Serum", tanning: "Tanning",
  sun: "Sun", after: "After", bronze: "Bronze", prepare: "Prepare",
  suncare: "Suncare", pochette: "Pochette", geant: "Geant", energy: "Energy",
  boost: "Boost", total: "Total", sport: "Sport", all: "all", for: "for",
  starting: "Starting", point: "Point", real: "Real", program: "Program",
  strong: "Strong", extra: "Extra", basic: "Basic", vision: "Vision",
  special: "Special", gift: "Gift", trio: "Trio", sincera: "Sincera",
  candy: "Candy", scrub: "scrub", mousse: "Mousse", pink: "Pink",
  balm: "Balm", ageless: "Ageless", herbs: "Herbs", barbeque: "Barbeque",
  snack: "Snack", crockies: "Crockies", moka: "Moka", orzo: "Orzo",
  ginseng: "Ginseng", cappuccino: "Cappuccino", mokaccino: "Mokaccino",
  solubil: "solubil", soluble: "Soluble", pod: "pod", nomame: "nomame",
};

/** Numele produsului, curatat: majuscule normalizate, separatori uniformi. */
function cleanName(raw: string): string {
  // Importul din mysnep a lasat spatii insecabile (U+00A0) in nume — „COLLAGEN
  // alternative" era un singur cuvant la split(" "), deci nu se potrivea nimic
  // din FIXED. Se normalizeaza intai orice fel de spatiu.
  let s = (raw || "").replace(/[     ]/g, " ").trim();

  // Separator uniform: „ - " devine „ ", „+" ramane, virgulele raman.
  s = s.replace(/\s*[-–—]\s+/g, " ").replace(/\s{2,}/g, " ");
  // „1000g" -> „1000 g", ca sa se poata potrivi unitatea in FIXED.
  s = s.replace(/(\d)\s*(g|gr|ml|lt|kg)\b/gi, "$1 $2");

  const words = s.split(" ").filter(Boolean);

  return words
    .map((w, i) => {
      const bare = w.replace(/[.,;:!?()]/g, "");
      const key = bare.toLowerCase();

      if (FIXED[key]) return w.replace(bare, FIXED[key]);
      // Coduri si masuri (N07, 5K, 500ml) raman cum sunt.
      if (/\d/.test(bare)) return w;

      const lower = w.toLocaleLowerCase("ro");
      if (i === 0) return lower.charAt(0).toLocaleUpperCase("ro") + lower.slice(1);
      return lower;
    })
    .join(" ")
    // Marimile de la textile raman majuscule: „...EaseLine l" -> „...EaseLine L".
    .replace(/\s(xxl|xl|xs|[sml])$/i, (m) => m.toUpperCase());
}

/**
 * Etichete scrise de mana, acolo unde regula automata nu e destul: produse cu
 * volum mare de cautare sau nume prea lungi ca sa incapa cu pret cu tot.
 */
const OVERRIDES: Record<string, string> = {
  // Cele cu cel mai mare volum in GSC — merita formularea cea mai curata.
  "realcomplex": "RealComplex Snep, 30 plicuri",
  "realcomplex-tab": "RealComplex TAB Snep, 120 comprimate",
  "realfibre": "RealFibre Snep, pudra prebiotica",
  "realfibre-plicuri": "RealFibre Snep, 30 plicuri",
  "realfibre-comprimates": "RealFibre Snep, 120 comprimate",
  "olivox-40-2-sticle-de-1-litru": "Olivox 40 Snep, 2 sticle de 1 litru",
  "olivox-6-sticle-de-1-litru": "Olivox Snep, 6 sticle de 1 litru",
  "olivox-2x60-capsule": "Olivox Snep capsule, 2 x 60",
  "kalosnep": "KaloSnep, forma lichida",
  "kalosnep-capsule": "KaloSnep capsule, 120 buc",
  "burner": "Burner Snep, control al greutatii",
  "aloe-100-bio": "Aloe 100 Bio Snep, suc pur",
  "marine-collagen": "Marine Collagen Snep",
  "realvita": "RealVita Snep, multivitamine",
  "omega-3": "Omega 3 Snep",

  // Sampoane Trico Salus: numele complet nu incape cu pret cu tot.
  "trico-salus-solution-sampon-spalare-frecventa": "Sampon Trico Salus, spalare frecventa",
  "trico-salus-solution-sampon-anti-caderea-parului": "Sampon Trico Salus anti-cadere",
  "trico-salus-solution-sampon-pentru-par-gras": "Sampon Trico Salus, par gras",
  "trico-salus-solution-sampon-pentru-par-cu-matreata": "Sampon Trico Salus antimatreata",
  "trico-salus-solution-scrub-purificator-efect-detox": "Scrub Trico Salus, efect detox",
  "trico-salus-solution-loiune-redensifant": "Lotiune Trico Salus redensificanta",
  "sneplumina-sampon-hidratant-efect-de-matase": "Sampon SnepLumina hidratant",
  "sneplumina-masc-hidratant-efect-de-mtase": "Masca SnepLumina hidratanta",
  "sneplumina-ulei-de-argan-pt-netezirea-firelor": "Ulei de argan SnepLumina",
  "snep-ice-sampon-anti-galben": "Sampon Snep Ice anti-galben",
  "snep-ice-masc-anti-galben": "Masca Snep Ice anti-galben",
  "snep-ice-balsam-leave-in-anti-frizz": "Balsam Snep Ice anti-frizz",

  // Cafea: numele lungi se scurteaza la ce cauta lumea.
  "cafea-moka-cu-ganoderma": "Cafea Moka cu Ganoderma Snep",
  "cafea-solubil-special-cu-ganoderma": "Cafea solubila cu Ganoderma Snep",
  "capsule-de-cafea-cu-ganoderma-compatibile-cu-nespresso": "Capsule cafea Ganoderma, Nespresso",
  "capsule-de-cafea-cu-oleuropein-compatibile-cu-nespresso": "Capsule cafea oleuropeina, Nespresso",
  "capsule-de-cafea-cu-ganoderma-compatibile-cu-lavazza-a-modo-mio": "Capsule cafea Ganoderma, Lavazza",
  "capsule-de-cafea-cu-ganoderma-compatibile-cu-lavazza-point": "Capsule cafea Ganoderma, Lavazza Point",
  "cafea-in-pod-de-hartie-de-orez-cu-ganoderma": "Cafea pod hartie de orez, Ganoderma",
  "cafea-in-pod-de-hartie-de-orez-cu-oleuropeina": "Cafea pod hartie de orez, oleuropeina",

  // Cosmetice cu nume lungi.
  "crem-pentru-fa-de-zi-biostimulatoare": "Crema de zi biostimulatoare Snep",
  "crem-de-noapte-pentru-fa-anti-age": "Crema de noapte anti-age Snep",
  "ser-anti-imbatranire-fata-si-d-collet": "Ser anti-imbatranire fata si decolteu",
  "lapte-demachiant-ph-neutr-cleansing-milk": "Lapte demachiant pH neutru Snep",
  "gold-mask-masc-de-aur-peel-off": "Gold Mask Snep, masca peel-off",
  "crema-de-fata-ageless-el-ea-cu-protectie-solara": "Crema Ageless Snep cu SPF",
  "ser-pt-conturul-ochilor-i-buzelor": "Ser contur ochi si buze Snep",
  "crem-gel-aftershave-cu-efect-de-calmare": "Crema-gel aftershave calmanta Snep",
  "crem-de-corp-hidratant": "Crema de corp hidratanta Snep",
  "crem-anticelulitic-adipozitate": "Crema anticelulitica Snep",
  "scrub-corp-pentru-netezire": "Scrub de corp Snep",
  "balsam-de-pr-restructurant": "Balsam de par restructurant Snep",
  "lotiune-impotriva-caderii-parului": "Lotiune anti-cadere par Snep",
  "gel-de-du": "Gel de dus Snep",
  "gel-de-du-reductor-250ml": "Gel de dus reductor Snep, 250 ml",
  "fanfresh-past-de-dini": "FanFresh, pasta de dinti Snep",
  "periu-de-dini-din-bambus": "Periuta de dinti din bambus Snep",
  "belove-spun-intim": "Belove, sapun intim Snep",
  "sincera-trio-msti-de-fata": "Sincera Trio, masti de fata Snep",

  // Protectie solara.
  "spray-transparent-pentru-protectie-solara-spf-50": "Spray protectie solara SPF 50 Snep",
  "spray-transparent-pentru-protectie-solara-spf-25": "Spray protectie solara SPF 25 Snep",
  "crem-de-protecie-solar-pentru-fa-i-decolteu-spf-50": "Crema solara fata si decolteu SPF 50",
  "stick-transparent-pentru-zone-sensibile-fata-corp-spf-50": "Stick solar zone sensibile SPF 50",
  "tanning-pro-spray-activator-pentru-bronzare": "Tanning Pro, spray activator bronz",
  "after-sun-crem-de-corp-dup-plaj-iluminatoare-hidratant": "After Sun, crema de corp Snep",
  "gel-de-dus-si-sampon-reparator-dupa-plaja": "Gel de dus si sampon dupa plaja",
  "masc-reparatoare-dup-plaj": "Masca reparatoare dupa plaja Snep",
  "ulei-pentru-protectia-parului-impotriva-razelor-solare": "Ulei protectie solara pentru par",

  // Ceaiuri si programe cu nume mancate de diacritice.
  "thegrave-mix": "Ceai The Mix Snep",
  "thegrave-mix-plicuri": "Ceai The Mix Snep, plicuri",
  "thegrave-peach": "Ceai The Peach Snep",
  "morinda-piugrave": "Morinda Piu Snep",
  "detox-zkit-vegan-cacao-cocos": "Detox ZKit vegan, cacao si cocos",
  "cciul-de-iarn-neagr": "Caciula de iarna Snep, neagra",

  // Altele cu nume ilizibil.
  "brri-snep-costiquellochecosti-cu-diverse-culori": "Bratari Snep, diverse culori",
  "kit-de-igien-bunal": "Kit de igiena bucala Snep",
  "protine-gust-de-ierburi-aromatice": "Protine Snep, ierburi aromatice",
  "snack-plus-batoane-snack-cu-cereale": "Snack Plus Snep, batoane cu cereale",
  "promoie-aparat-2espresso-cafea-cu-ganoderma-compatibile-cu-nespresso": "Aparat espresso + cafea Ganoderma",
  "kit-promo-ese-44-pod-cafea-cu-oleuropeina": "Kit 44 poduri cafea cu oleuropeina",
  "filtrare-prin-osmoz-invers-hydropurareg-5-year-warranty": "Hydropura, osmoza inversa",
  "kit-mandorle-dolci-top-finger-muscolease-exvasi": "Kit ulei de masaj Snep, 4 produse",
  "kit-de-servicii-de-cafea-100pz": "Kit servire cafea Snep, 100 buc",
  "powder-lipfilizat-moringa": "Moringa Snep, pudra liofilizata",
  "vegan-lupine-protein-orange-i-raspberry": "Proteina vegana Snep, portocale-zmeura",
  "cacao-de-protein-de-rice-i-lupine-vegan": "Proteina vegana Snep, cacao",
  "plus-cacao-i-capsuni-vegane": "Plus vegan Snep, cacao si capsuni",
  "l-z-lactoferina-zinc": "L&Z Snep, lactoferina si zinc",
  "olimind-1-lt": "Olimind Snep, 1 litru",
  "oligravever": "Oliver Snep",

  // Nume prea lungi ca sa incapa impreuna cu pretul.
  "beisoare-din-bambus-odorizant-camer-250ml": "Betisoare parfumate Snep, 250 ml",
  "agitator-mare-cu-praf-i-suport-pentru-capsule": "Agitator mare Snep cu suport capsule",
  "batoane-cu-gust-de-alune-de-padure-si-ciocolata-promo-3x": "Batoane Snep alune si ciocolata, 3X",
  "batoane-cu-gust-de-cocos-si-ciocolata-promo-3x": "Batoane Snep cocos si ciocolata, 3X",
  "batoane-cu-gust-de-banana-si-ciocolata-promo-3x": "Batoane Snep banana si ciocolata, 3X",
  "batoane-cu-gust-de-crema-si-biscuite-promo-3x": "Batoane Snep crema si biscuite, 3X",
  "crema-de-noapte-pentru-fata-anti-age-refill": "Crema de noapte anti-age Snep, refill",
  "crema-pentru-fata-de-zi-biostimulatoare-refill": "Crema de zi biostimulatoare, refill",
  "detox-zkit-fara-zahar-vanilie-vegan-cocos": "Detox ZKit Snep, vanilie si cocos",
  "ser-anti-imbatranire-fata-si-decollete-refill": "Ser anti-imbatranire Snep, refill",
};

/** Adauga „Snep" daca marca nu apare deja in eticheta. */
function withBrand(label: string): string {
  return /snep/i.test(label) ? label : `${label} Snep`;
}

function buildLabel(slug: string, name: string): string {
  const override = OVERRIDES[slug];
  if (override) return override;
  return withBrand(cleanName(name));
}

async function main() {
  const { data, error } = await supabase
    .from("products")
    .select("id, slug, name, price, meta_title")
    .order("id");

  if (error) {
    console.error("Nu pot citi produsele:", error.message);
    process.exit(1);
  }

  const rows = data || [];
  const updates: { id: number; slug: string; before: string; after: string }[] = [];
  const tooLong: string[] = [];

  for (const p of rows) {
    const label = buildLabel(p.slug, p.name);
    if (label.length > MAX_LABEL) tooLong.push(`${p.slug} (${label.length}) ${label}`);
    if (label !== (p.meta_title || "")) {
      updates.push({ id: p.id, slug: p.slug, before: p.meta_title || "", after: label });
    }
  }

  // Etichetele trebuie sa ramana unice — doua produse cu acelasi titlu inseamna
  // exact canibalizarea pe care o reparam.
  const seen = new Map<string, string>();
  const dupes: string[] = [];
  for (const p of rows) {
    const label = buildLabel(p.slug, p.name);
    const prev = seen.get(label.toLowerCase());
    if (prev) dupes.push(`"${label}" — ${prev} + ${p.slug}`);
    else seen.set(label.toLowerCase(), p.slug);
  }

  if (!DIFF_ONLY) {
    for (const p of rows) {
      const label = buildLabel(p.slug, p.name);
      // Aceeasi compunere ca `buildProductTitle`, ca previzualizarea sa arate
      // exact titlul care ajunge in <title>, taiat inclusiv.
      const price = Math.ceil(Number(p.price) || 0);
      const suffix = price > 0 ? ` — pret ${price} lei` : "";
      const room = 60 - suffix.length;
      const shown = (label.length <= room
        ? label
        : label.slice(0, label.slice(0, room).lastIndexOf(" "))) + suffix;
      console.log(`${String(shown.length).padStart(2)}  ${shown}`);
    }
  } else {
    for (const u of updates) console.log(`- ${u.before}\n+ ${u.after}\n`);
  }

  console.log(`\n${rows.length} produse · ${updates.length} de modificat`);

  if (tooLong.length) {
    console.log(`\n⚠ ${tooLong.length} etichete peste ${MAX_LABEL} caractere (se vor taia la randare):`);
    for (const t of tooLong) console.log("   " + t);
  }
  if (dupes.length) {
    console.log(`\n✖ ${dupes.length} etichete duplicate — se opreste, adauga-le in OVERRIDES:`);
    for (const d of dupes) console.log("   " + d);
    process.exit(1);
  }

  if (!APPLY) {
    console.log("\nDry-run. Ruleaza cu --apply ca sa scrii in baza de date.");
    return;
  }

  let done = 0;
  for (const u of updates) {
    const { error: upErr } = await supabase
      .from("products")
      .update({ meta_title: u.after })
      .eq("id", u.id);
    if (upErr) {
      console.error(`Esec pe ${u.slug}:`, upErr.message);
      process.exit(1);
    }
    done++;
    if (done % 50 === 0) console.log(`  ${done}/${updates.length}`);
  }
  console.log(`\nGata: ${done} titluri scrise.`);
}

main();
