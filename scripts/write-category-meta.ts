/**
 * Hand-written meta_title + meta_description for every product category.
 *
 * Replaces the algorithmic template ("<Nume> Snep originale, fabricate in
 * Italia. <fragment taiat>. Livrare 3-5 zile lucratoare in Romania.") which was
 * technically unique but read like boilerplate, and in 4 cases ended
 * mid-sentence on a dangling em dash.
 *
 * Each entry is written from the actual contents of that category — named
 * products, counts, formats — so no two share a structure.
 *
 * Run:
 *   npx tsx scripts/write-category-meta.ts          # verifica si scrie
 *   npx tsx scripts/write-category-meta.ts --dry    # doar verifica
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

const META: Record<string, { title: string; description: string }> = {
  alimente: {
    title: "Alimente functionale Snep: batoane si snack proteic",
    description:
      "Batoane cu cereale Snack Plus si snack-uri proteice Snep in trei arome: branza, barbeque si ierburi aromatice. Gustari cu profil nutritional echilibrat.",
  },
  aloe: {
    title: "Aloe Vera Snep: sucuri, Aloe 100 Bio si glucozamina",
    description:
      "Sucuri de Aloe Vera Snep: ce inseamna aloina sub 10 ppm si gel fara epidermida, diferenta dintre cele 4 variante, doze si pastrare dupa deschidere.",
  },
  "bio-effective": {
    title: "BioEffective Snep: curatenie, gradina si compost",
    description:
      "Solutii pe baza de microorganisme pentru casa, gradina si compost: BioEffective Home, Garden si Compost, plus pulverizatoare pentru aplicare.",
  },
  "bio-molecule": {
    title: "Bio Molecule EaseLine: textile functionale Snep",
    description:
      "Maiouri, leggings, pants, genunchiere si fete de perna EaseLine, tesute cu un fir care reflecta caldura corpului. Textile functionale purtate zi si noapte.",
  },
  cafea: {
    title: "Cafea cu Ganoderma Snep: capsule, poduri, solubile",
    description:
      "Cafea italiana cu extract de ganoderma sau oleuropeina: capsule compatibile Nespresso si Lavazza, poduri din hartie de orez, moka si variante solubile.",
  },
  ceaiuri: {
    title: "Ceaiuri Snep: The Mix si The Peach, plic sau vrac",
    description:
      "Amestecuri italienesti de ceai Snep: The Mix la plic sau vrac si The Peach cu aroma de piersica. Bauturi calde pentru hidratarea de peste zi.",
  },
  choco: {
    title: "Choco Snep: ciocolata Moon, Cup si Block",
    description:
      "Ciocolata Snep in trei formate: Snep Choco Moon, Choco Cup si Choco Block. Gustari dulci cu ingrediente functionale, pentru pauzele scurte.",
  },
  "controlul-greutatii": {
    title: "Controlul greutatii Snep: shake-uri, batoane, snack",
    description:
      "Shake-uri Plus in variante vegane, batoane cu cocos, banana sau alune de padure si snack-uri Crockis. Produse de sustinere intr-o dieta hipocalorica.",
  },
  corp: {
    title: "Ingrijire corp Snep: gel de dus, creme, igiena orala",
    description:
      "29 de produse pentru corp: geluri de dus, creme hidratante si anticelulitice, scrub, deodorante, sapun intim si igiena orala cu periuta din bambus.",
  },
  fata: {
    title: "Ingrijire fata Snep: seruri, creme si masti",
    description:
      "34 de produse pentru ten: liniile Reinature si SnepLumax, seruri pentru contur de ochi, creme de zi si de noapte, masti peel-off si lapte demachiant.",
  },
  hydropura: {
    title: "HydroPura Snep: osmoza inversa, sticle si filtre",
    description:
      "Sisteme de filtrare a apei prin osmoza inversa HydroPura, disponibile si cu garantie de 5 ani, plus sticle, filtre de schimb si contor de hidrogen.",
  },
  "linia-real": {
    title: "Linia Real Snep: RealComplex, RealVita, RealFibre",
    description:
      "RealComplex cu papadie, mesteacan si minerale, RealVita cu vitamine din grupul B, RealFibre cu fibre prebiotice si Vitup. La plic, pudra sau comprimate.",
  },
  makeup: {
    title: "MakeUp Snep: fond de ten, farduri, mascara, creioane",
    description:
      "19 produse de machiaj Snep: fond de ten fluid si Pro Dual, farduri HD si sidefate, mascara waterproof, creioane de ochi si buze, primer si gloss fixator.",
  },
  "necesitatile-energetice": {
    title: "Energie si tonus Snep: Total Energy, BCAA, Tribux",
    description:
      "Total Energy la capsule sau drink, aminoacizi BCAA si Tribux Blue. Formule Snep pentru zilele lungi si pentru sustinerea efortului fizic si mental.",
  },
  "nevoi-specifice": {
    title: "Nevoi specifice Snep: Olivox, KaloSnep, Burner",
    description:
      "Cea mai larga categorie Snep, 41 de produse: Olivox si familia oli-, KaloSnep, Burner, colagen marin, Q10, Super-Cal si formule pentru somn si imunitate.",
  },
  oil: {
    title: "Uleiuri de masaj Snep: Muscolease, Exvasi, Mandorle",
    description:
      "Uleiuri pentru masaj si ingrijire: Muscolease pentru muschi, Exvasi, Top Finger si Mandorle Dolci din migdale dulci. Disponibile si impreuna, la kit.",
  },
  "omega-si-perle": {
    title: "Omega 3 Snep: perle, krill si ulei de germeni",
    description:
      "Omega 3 si Omega Tris in perle, Snep Krill din ulei de krill si Cuore di Grano cu ulei de germeni de grau. Acizi grasi esentiali pentru aportul zilnic.",
  },
  par: {
    title: "Ingrijirea parului Snep: SnepLumina si Trico-Salus",
    description:
      "Doua linii cu scopuri diferite: SnepLumina pentru stralucire si hidratare, Trico-Salus pentru scalp cu matreata, sebum sau rarire. Plus linia Snep Ice.",
  },
  "parfum-de-camera": {
    title: "Parfum de camera Snep: colectia toscana, 250 ml",
    description:
      "Parfumuri de camera inspirate din Toscana: Giardino di Boboli, Porto Azzurro, Colline Senesi, Prato Fiorito si Fiesole, plus betisoare din bambus.",
  },
  "parfumuri-inspirate": {
    title: "Parfumuri inspirate Snep: note Aventus si Alien",
    description:
      "Doua parfumuri Snep construite in jurul unor note celebre: 101, inspirat de Aventus, si 201, inspirat de Alien. Alternativa accesibila la parfumurile de nisa.",
  },
  programe: {
    title: "Programe Snep: Fit9, Real Detox si Starting Point",
    description:
      "Pachete care combina mai multe produse Snep: Fit9 in variante cacao sau vanilie, Real Detox, Kit Kalo Sprint, Starting Point si programele Basic si Strong.",
  },
  "promotii-si-kit-uri": {
    title: "Promotii si kit-uri Snep: cadouri si accesorii",
    description:
      "Kit-uri cadou, shakere, termosuri, agende, tricouri si accesorii Snep, plus cataloagele de produse. Utile pentru distribuitori si pentru cadouri tematice.",
  },
  "protectie-solara": {
    title: "Protectie solara Snep: SPF 50, spray si after sun",
    description:
      "Creme si spray-uri cu SPF 25 si 50, stick transparent pentru zone sensibile, activator de bronzare si after sun hidratant. Plus kit si geanta frigorifica.",
  },
  proteina: {
    title: "Proteina vegana Snep: orez si lupin, doua arome",
    description:
      "Proteine vegetale din orez si lupin, in varianta cacao sau portocale cu zmeura. Alternativa fara lactate pentru aportul de proteina de dupa antrenament.",
  },
  pur: {
    title: "Linia Pur Snep: ciuperci, vitamina C, quercetina",
    description:
      "Extracte titrate Snep: reishi, shiitake, maitake, agaricus si cordyceps, plus moringa, maca, quercetina si vitamina C. In capsule sau pulbere liofilizata.",
  },
  sport: {
    title: "Sport Snep: creatina, batoane proteice si hidratare",
    description:
      "Creatina, Athletive, Hydra, Powerfect si Revelop, batoane proteice si energizante, plus Brain si Start. Linia Snep pentru antrenament si recuperare.",
  },
  suplimente: {
    title: "Suplimente Snep: Venere si EcDefense",
    description:
      "Doua formule dedicate din catalogul Snep: Venere, pentru echilibrul feminin, si EcDefense, pentru sustinerea apararii naturale a organismului.",
  },
  "uleiuri-esentiale": {
    title: "Uleiuri esentiale Snep: 14 variante pure",
    description:
      "Paisprezece uleiuri esentiale Snep: lavanda Monte Bianco, arbore de ceai, eucalipt, menta, rozmarin, origan, cimbru rosu, lamaie, mandarina si ienupar.",
  },
};

const TITLE_MAX = 60;
const DESC_MIN = 110;
const DESC_MAX = 160;

async function main() {
  const { data: categories, error } = await supabase
    .from("product_categories")
    .select("slug, name, meta_title, meta_description");

  if (error || !categories) {
    console.error("Nu am putut citi categoriile:", error?.message);
    process.exit(1);
  }

  // 1. Validare inainte de a scrie ceva.
  const problems: string[] = [];
  const seenTitles = new Map<string, string>();
  const seenDescs = new Map<string, string>();

  for (const cat of categories) {
    const m = META[cat.slug];
    if (!m) {
      problems.push(`${cat.slug}: lipseste din META (categorie noua?)`);
      continue;
    }
    if (m.title.length > TITLE_MAX) {
      problems.push(`${cat.slug}: meta_title ${m.title.length} caractere (max ${TITLE_MAX})`);
    }
    if (m.description.length > DESC_MAX || m.description.length < DESC_MIN) {
      problems.push(
        `${cat.slug}: meta_description ${m.description.length} caractere (${DESC_MIN}-${DESC_MAX})`
      );
    }
    if (seenTitles.has(m.title)) {
      problems.push(`${cat.slug}: meta_title identic cu ${seenTitles.get(m.title)}`);
    }
    if (seenDescs.has(m.description)) {
      problems.push(`${cat.slug}: meta_description identica cu ${seenDescs.get(m.description)}`);
    }
    seenTitles.set(m.title, cat.slug);
    seenDescs.set(m.description, cat.slug);
  }

  for (const slug of Object.keys(META)) {
    if (!categories.some((c) => c.slug === slug)) {
      problems.push(`META contine "${slug}", care nu exista in baza de date`);
    }
  }

  if (problems.length) {
    console.error("VALIDARE ESUATA — nu am scris nimic:");
    problems.forEach((p) => console.error("  -", p));
    process.exit(1);
  }

  console.log(`Validare OK: ${categories.length} categorii, titluri si descrieri unice, in limite.`);
  if (DRY) {
    for (const cat of categories.sort((a, b) => a.slug.localeCompare(b.slug))) {
      const m = META[cat.slug];
      console.log(`\n${cat.slug}`);
      console.log(`  T(${m.title.length}) ${m.title}`);
      console.log(`  D(${m.description.length}) ${m.description}`);
    }
    console.log("\n--dry: nu s-a scris nimic.");
    return;
  }

  // 2. Scriere.
  let updated = 0;
  for (const cat of categories) {
    const m = META[cat.slug];
    const { error: upErr } = await supabase
      .from("product_categories")
      .update({ meta_title: m.title, meta_description: m.description })
      .eq("slug", cat.slug);
    if (upErr) {
      console.error(`  [FAIL] ${cat.slug}: ${upErr.message}`);
      continue;
    }
    updated++;
  }
  console.log(`Actualizate: ${updated}/${categories.length} categorii.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
