/**
 * meta_description scrise de mana, produs cu produs, grupate pe categorie.
 *
 * Inlocuieste textele reconstruite automat de `rebuild-product-meta-desc.ts`
 * (care doar mutau taietura la ultima propozitie intreaga). Se completeaza pe
 * loturi; scriptul e idempotent, se poate rula ori de cate ori se adauga un lot.
 *
 * Reguli respectate la scriere:
 *   - 70-158 caractere, unice pe tot catalogul
 *   - suplimentele: formulari permise ("contribuie la", "asociat traditional
 *     cu"), fara claim-uri de tratare/vindecare
 *   - cosmeticele: efecte asupra aspectului, nu terapeutice
 *   - textilele EaseLine: descrise ca textile functionale, fara claim medical
 *
 * Ruleaza:
 *   npx tsx scripts/write-product-meta.ts --dry
 *   npx tsx scripts/write-product-meta.ts
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

const META: Record<string, string> = {
  // ─── controlul-greutatii ────────────────────────────────────────────────
  crockis:
    "Crockis: gustarea crocanta Snep pentru zilele in care urmaresti aportul caloric. Portie fixa, de luat cu tine intre mese.",

  // ─── necesitatile-energetice ───────────────────────────────────────────
  "total-energy-drink":
    "Total Energy Drink: bautura Snep cu maca, damiana, ganoderma si guarana. Varianta lichida a formulei pentru zilele lungi.",

  // ─── proteina ──────────────────────────────────────────────────────────
  "vegan-lupine-protein-orange-i-raspberry":
    "Proteina vegana din lupin, 750 g, cu aroma de portocale si zmeura. Proteinele contribuie la cresterea si mentinerea masei musculare.",
  "cacao-de-protein-de-rice-i-lupine-vegan":
    "Proteina vegana din orez si lupin, 750 g, cu gust de cacao. Se dizolva usor in bauturi reci, fara lactate si fara proteina din zer.",

  // ─── linia-real ────────────────────────────────────────────────────────
  "realvita-kids":
    "RealVita Kids: jeleuri cu multivitamine pentru copii, din linia Real a Snep. Forma pe care o accepta si cei mai pretentiosi.",
  vitup:
    "VitUp: formula Snep pentru energie si vitalitate zilnica, din linia Real. Alternativa la RealVita pentru rutina de dimineata.",

  // ─── oil ───────────────────────────────────────────────────────────────
  muscolease:
    "Muscolease, 50 ml: ulei de masaj cu arnica montana si gheara diavolului, in concentratie ridicata. Pentru zona cervicala si musculatura.",
  exvasi:
    "Exvasi, 50 ml: ulei de masaj cu arnica, centella asiatica, ginkgo biloba si castan salbatic. Pentru senzatia de picioare usoare.",
  "kit-mandorle-dolci-top-finger-muscolease-exvasi":
    "Kitul complet de uleiuri Snep: Mandorle Dolci, Top Finger, Muscolease si Exvasi, reunite intr-un singur pachet, la pret de set.",

  // ─── choco ─────────────────────────────────────────────────────────────
  "snep-choco-moon":
    "Choco Moon, 10 portii: tableta de ciocolata cu melatonina, passiflora, griffonia si ganoderma. Melatonina contribuie la reducerea timpului de adormire.",
  "choco-cup":
    "Choco Cup: ciocolata calda Snep cu ganoderma lucidum, la pahar. Varianta rapida, de preparat direct in cana.",
  "choco-block":
    "Choco Block: tableta de ciocolata Snep pentru pofta de dulce, gandita sa dea senzatia de satietate fara exces caloric.",

  // ─── bio-effective ─────────────────────────────────────────────────────
  "bioeffective-pulverizator":
    "Pulverizator cu presiune de 1,5 litri pentru solutiile BioEffective. Accesoriul de aplicare al gamei, vandut separat.",
  "pulverizator-bioeffective-5-buc":
    "Set de 5 pulverizatoare cu presiune de 1,5 litri pentru solutiile BioEffective. Varianta la pachet, pentru utilizare pe suprafete mari.",
  "bioeffective-compost":
    "BioEffective Compost, 1000 g: activator pentru procesele de compostare si stabilizare a reziduurilor organice din gradina.",

  // ─── aloe ──────────────────────────────────────────────────────────────
  "aloe-piersica-drink":
    "Aloe & Piersica Drink, 1 litru: gel de aloe 98% cu aroma de piersica. Doza de 20 ml, o data sau de doua ori pe zi, diluata in apa.",
  "aloe-100-bio":
    "Aloe 100 Bio, 1 litru: aloe vera pura din agricultura ecologica, cu aloina sub 10 ppm. Se tine la frigider dupa deschidere.",
  "aloe-glucozamin":
    "Aloe + Glucozamina, 1 litru: aloe vera cu sulfat de glucozamina 500 mg, MSM 200 mg si vitamina C. Doza de 40 ml pe zi, la masa.",

  // ─── programe ──────────────────────────────────────────────────────────
  "fit9-detox-vanilie-aloe-piersic-aloe-bio-100":
    "Fit9 Detox vanilie: pachetul cu Plus vanilie, Aloe Piersica si Aloe 100 Bio, plus produsele care completeaza programul.",
  "fit9-vegan-cacao-plicuri-aloe-bio-100":
    "Fit9 vegan cacao la plic, cu doua sticle de Aloe 100 Bio. Varianta portionata a programului, pentru cine e des pe drum.",
  "fit9-vegan-cacao-plicuri-aloe-piersic":
    "Fit9 vegan cacao la plic, cu doua sticle de Aloe Piersica. Aceeasi structura de program, cu aloe aromata in locul celei pure.",

  // ─── bio-molecule ──────────────────────────────────────────────────────
  "incalzitor-de-gat-easeline-m":
    "Incalzitor de gat EaseLine, marimea M: textil elastic tesut cu fir functional, purtat pe zona cefei si a gatului.",
  "pants-easeline-femeie-s":
    "Pantaloni EaseLine pentru femei, marimea S (talie S/M/L), din tesatura foarte elastica cu fir functional. Se poarta ca strat de baza.",
  "leggings-easeline-xs":
    "Leggings EaseLine, marimea XS, din tesatura foarte elastica cu fir functional. Talie disponibila de la XS pana la XL.",
  "tricou-brbai-easeline-m":
    "Tricou EaseLine pentru barbati, marimea M (talie L/XL), din tesatura elastica cu fir functional, purtat direct pe piele.",

  // ─── alimente ──────────────────────────────────────────────────────────
  "protine-gust-de-ierburi-aromatice":
    "Chipsuri proteice Snep din leguminoase, cu ierburi aromatice. Gustare sarata cu profil nutritional mai bun decat al chipsurilor clasice.",
  "protine-aroma-de-branza":
    "Chipsuri proteice Snep din leguminoase, cu aroma de branza. Varianta cea mai gustoasa din cele trei, pentru gustarea de dupa-amiaza.",
  "protine-gust-barbeque":
    "Chipsuri proteice Snep din leguminoase, cu gust de barbeque. Nota afumata, pentru cine prefera gustarile condimentate.",
  "snack-plus-batoane-snack-cu-cereale":
    "Snack Plus: batoane de cereale Snep, crocante si cu aport caloric redus, gandite pentru pofta de gustare dintre mese.",

  // ─── omega-si-perle ────────────────────────────────────────────────────
  "omega-3":
    "Omega 3 Snep in perle: acizi grasi esentiali pentru cine nu mananca peste gras de doua ori pe saptamana. Aport zilnic constant.",
  "omega-tris":
    "Omega Tris: acizi grasi Omega 3 completati cu GLA si CLA. Formula Snep mai larga decat un Omega 3 clasic, tot in perle.",
  "snep-krill":
    "Snep Krill: ulei de krill din crustacee de plancton, o sursa de acizi grasi diferita de uleiul de peste clasic.",
  "cuore-di-grano":
    "Cuore di Grano: perle cu ulei de germeni de grau, bogat in vitamina E, acizi grasi polinesaturati si octacosanol.",

  // ─── hydropura ─────────────────────────────────────────────────────────
  "sticl-de-sticl-hydropurareg":
    "Sticla HydroPura de 75 cl din sticla frantuzeasca extra-alba, clasa A, certificata CEE si 100% reciclabila. Pentru masa.",
  "sticla-hydropura":
    "Flacon HydroPura de 500 ml din Tritan, material rezistent si usor. Varianta de purtat cu tine, nu cea de masa.",
  "filtru-de-inlocuire-hydropura":
    "Filtru de schimb HydroPura. Se inlocuieste la 5.000-6.000 de litri si cel putin o data pe an, sau dupa 20 de zile de nefolosire.",
  "kit-hydropurareg":
    "Kit HydroPura: cutie Snep pentru cinci sticle, cu 50 de brosuri de prezentare incluse. Gandit pentru distribuitori.",
  "contor-de-hidrogen":
    "Contor de hidrogen HydroPura: verifica in cateva secunde nivelul de hidrogen din apa produsa de sistem.",

  // ─── uleiuri-esentiale ─────────────────────────────────────────────────
  "portocala-amara-ulei-esential":
    "Ulei esential de portocala amara Snep, 10 ml. Nota citrica mai profunda si mai amaruie decat a portocalei dulci.",
  "mandarin-uleiu-esential":
    "Ulei esential de mandarina Snep, 10 ml. Cea mai blanda nota citrica din gama, potrivita si pentru difuzorul din dormitor.",
  "cimbru-rosu-ulei-esential":
    "Ulei esential de cimbru rosu Snep, 10 ml. Nota erbacee puternica; se dilueaza intotdeauna inainte de aplicare.",
  "monte-bianco-lavender-ulei-esential":
    "Ulei esential de lavanda Mont Blanc, 10 ml. Lavanda de altitudine, cea mai studiata planta din aromaterapie.",
  "arbor-de-ceai-ulei-esential":
    "Ulei esential de arbore de ceai (tea tree) Snep, 10 ml. Nota medicinala caracteristica, folosita diluat.",

  // ─── sport ─────────────────────────────────────────────────────────────
  "energy-boost":
    "Energy Boost: maltodextrina cu D-glucoza, fructoza, BCAA, carnitina, beta-alanina si cofeina. Pentru efortul de lunga durata.",
  upgrate:
    "Upgrate: formula Snep de dupa antrenament, pentru refacerea rezervelor de glicogen si limitarea catabolismului proteic.",
  "protein-bar":
    "Protein Bar Snep: baton proteic cu ciocolata cu lapte, aroma de crema de vanilie si biscuiti. Gustarea de dupa sala.",
  creatin:
    "Creatina monohidrat pura Sport 11. Creatina creste performanta fizica in serii succesive de exercitii scurte, de intensitate mare.",
  powerfect:
    "Powerfect: formula pre-antrenament cu BCAA, beta-alanina, taurina si carbohidrati, pentru efortul anaerob si exploziv.",
  athletive:
    "Athletive: formula pre-antrenament pentru efort aerob, cu doza de carbohidrati calibrata pentru sporturile de anduranta.",
  revelop:
    "Revelop: proteine cu eliberare lenta, dezvoltate de Snep cu Wepa Science pentru faza de refacere din timpul noptii.",

  // ─── pur ───────────────────────────────────────────────────────────────
  "quercetina-max":
    "Quercetina Max: 60 de capsule de 500 mg cu quercetina, flavonoid din familia polifenolilor, in forma concentrata.",
  shiitake:
    "Shiitake Snep: 180 de capsule de 500 mg cu extract din ciuperca shiitake, asociata traditional cu apararea naturala a organismului.",
  "reishi-90-capsule":
    "Reishi (Ganoderma lucidum): 90 de capsule de 500 mg. Ciuperca de castan si stejar, folosita de secole in traditia asiatica.",
  maitake:
    "Maitake Snep: 180 de capsule de 500 mg cu extract de maitake, una dintre ciupercile clasice ale fitoterapiei orientale.",
  agaricus:
    "Agaricus Snep: 180 de capsule de 500 mg, asociat traditional cu apararea naturala si cu metabolismul carbohidratilor.",
  "auri-c":
    "Auri-C: 180 de capsule de 550 mg cu extract de Auricularia si macese, sursa naturala de vitamina C si antioxidanti.",
  "cordy-c":
    "Cordy-C: 180 de capsule de 550 mg cu extract de Cordyceps si macese, asociate traditional cu tonusul si tractul respirator.",

  // ─── protectie-solara ──────────────────────────────────────────────────
  "stick-transparent-pentru-zone-sensibile-fata-corp-spf-50":
    "Stick transparent SPF 50+, 6 ml, pentru zonele sensibile de pe fata si corp: nas, urechi, cicatrici, buze. Spectru larg.",
  "after-sun-crem-de-corp-dup-plaj-iluminatoare-hidratant":
    "After Sun, 150 ml: crema de corp cu Q10, acid alfa lipoic, acid hialuronic, aloe, nalba si musetel, pentru dupa plaja.",
  "tanning-pro-spray-activator-pentru-bronzare":
    "Tanning Pro, 200 ml: spray activator de bronzare cu efect racoritor, aplicat inainte si in timpul expunerii la soare.",
  "bronze-prepare":
    "Bronze Prepare: 60 de capsule de 550 mg, de luat inainte de sezonul de plaja, pentru pregatirea pielii pentru expunere.",
  "spray-transparent-pentru-protectie-solara-spf-25":
    "Spray transparent SPF 25, 150 ml: protectie medie cu spectru larg, fara urme albe. Pentru pielea deja obisnuita cu soarele.",
  "spray-transparent-pentru-protectie-solara-spf-50":
    "Spray transparent SPF 50+, 150 ml: protectie foarte ridicata cu spectru larg, in format usor de reaplicat pe plaja.",
  "crem-de-protecie-solar-pentru-fa-i-decolteu-spf-50":
    "Crema solara Age Repair SPF 50+, 50 ml, pentru fata si decolteu. Protectie foarte ridicata pe zonele care se vad primele.",

  // ─── cafea ─────────────────────────────────────────────────────────────
  "soluble-cappuccino-cu-ganoderma":
    "Cappuccino solubil Snep cu ganoderma: gust de ciocolata si cafea, de preparat direct in cana, oricand ai nevoie de o pauza.",
  "capsule-de-cafea-cu-oleuropein-compatibile-cu-nespresso":
    "Capsule compatibile Nespresso cu cafea 100% arabica si oleuropeina din frunze de maslin. Alternativa la varianta cu ganoderma.",
  "capsule-de-cafea-cu-ganoderma-compatibile-cu-lavazza-point":
    "60 de capsule compatibile Lavazza Point: arabica 100% cu ganoderma lucidum, aroma intensa si continut scazut de cofeina.",
  "capsule-de-cafea-cu-ganoderma-compatibile-cu-nespresso":
    "75 de capsule compatibile Nespresso: arabica 100% cu extract de ganoderma lucidum, gust delicat si cofeina redusa.",
  "ginseng-solubil-cu-extrat-de-ganoderma":
    "Ginseng solubil Snep cu cafea si extract de ganoderma. Nota dulce-condimentata, diferita de cafeaua clasica.",
  "cafea-moka-cu-ganoderma":
    "Cafea macinata pentru espressor, arabica cu ganoderma lucidum. Corpolenta si aromata, prajita dupa reguli traditionale.",
  "capsule-de-cafea-cu-ganoderma-compatibile-cu-lavazza-a-modo-mio":
    "60 de capsule compatibile Lavazza A Modo Mio: arabica 100% imbogatita cu ganoderma lucidum, cu cofeina redusa.",
  "orzo-solubil-cu-extract-de-ganoderma":
    "Orz solubil cu ganoderma: 30 de plicuri de 4 g, fara cofeina. Alternativa la cafea pentru seara sau pentru cei sensibili.",

  // ─── parfum-de-camera ──────────────────────────────────────────────────
  "giardino-di-boboli-250ml":
    "Giardino di Boboli, 250 ml: odorizant de camera cu betisoare, parfum oriental. Din colectia toscana Snep.",
  "porto-azzurro-250ml":
    "Porto Azzurro, 250 ml: odorizant cu betisoare, parfum de briza marii. Nota cea mai proaspata din colectie.",
  "prato-fiorito-250ml":
    "Prato Fiorito, 250 ml: odorizant cu betisoare, nota florala de pajiste inflorita. Discret, potrivit pentru dormitor.",
  "fiesole-250ml":
    "Fiesole, 250 ml: odorizant cu betisoare, parfum de lemn de santal si piersica. Nota calda, lemnoasa si fructata.",
  "castelli-in-chianti-250ml":
    "Castelli in Chianti, 250 ml: odorizant cu betisoare, nota Rosu Nobil. Parfumul cel mai profund din colectia toscana.",
  "estate-al-forte-250ml":
    "Estate al Forte, 250 ml: odorizant cu betisoare, parfum de smochin si mosc. Nota de vara mediteraneana.",
  "beisoare-din-bambus-odorizant-camer-250ml":
    "Betisoare din bambus pentru odorizantele de camera Snep, 250 ml. Rezerva de difuzare, pentru cand se uzeaza cele vechi.",
  "colline-senesi-250ml":
    "Colline Senesi, 250 ml: odorizant cu betisoare, nota de seminte de in. Cel mai sobru parfum din colectie.",
  "limonaia-dei-medici-3-lt":
    "Limonaia dei Medici, 3 litri: odorizant cu betisoare, parfum de citrice de Sicilia. Formatul mare, pentru spatii ample.",

  // ─── makeup ────────────────────────────────────────────────────────────
  shimmer:
    "Shimmer: pudra iluminatoare Snep, aplicata in cateva atingeri pe punctele inalte ale fetei. Pasul final al machiajului.",
  "matt-lip-n-1-electric-brown":
    "Matt Lip nr. 1 Electric Brown: ruj mat cu vitamine si agenti hidratanti, din gama de 9 nuante opace, cu tinuta lunga.",
  "cover-5k-n-1":
    "Cover 5K nr. 1, 8 ml: anticearcan cu acoperire ridicata pentru pungi, cearcane, linii fine si imperfectiuni. Efect iluminator.",
  "get-ready":
    "Get Ready: 50 de servetele matifiante care absorb excesul de sebum. Se tamponeaza pe zonele lucioase, fara sa strice machiajul.",
  "matt-shadow-n-1-coal":
    "Matt Shadow nr. 1 Coal: fard compact cu pigment mineral concentrat. Se aplica uscat sau umezit, pentru efect smokey eyes.",
  "lip-pencil-n01-garnet":
    "Lip Pencil nr. 01 Garnet: creion de buze cu elastomeri naturali, fluid si rezistent. Incalzit, poate fi folosit ca ruj.",
  "eye-liner":
    "Eye Liner Snep cu varf de silicon si formula mata deja diluata. Traseaza linii fine, iar emulsia previne craparea.",
  "mascara-water-proof":
    "Mascara waterproof, 10 ml, cu rasini naturale. Rezista la apa de mare si la piscina, pentru machiajul de vacanta.",
  "eye-pencil-n07-raisin-brown":
    "Eye Pencil nr. 07 Raisin Brown: creion de ochi cu elastomeri naturali, rezistent la temperatura si cu tinuta lunga.",
  "pro-dual-foundation-n-1-desert-sand":
    "Pro-Dual Foundation nr. 1 Desert Sand: fond compact pentru ten gras. Uscat da finish mat si fin, umezit devine mai acoperitor.",
  "hd-shadow-n-1-timberwolf":
    "HD Shadow nr. 1 Timberwolf: fard ultrametalic cu efect iridescent, de la mat la intens perlat, in functie de aplicare.",
  "glow-primer-light-rose-silver":
    "Glow Primer Light Rose Silver, 15 ml: crema iluminatoare cu puncte de lumina, pentru fata si decolteu, sub machiaj.",
  "fluid-hd-n-1-light-taupe":
    "Fluid HD nr. 1 Light Taupe: fondul de ten din varful gamei Snep, potrivit tuturor tipurilor de ten si mai ales dupa 35 de ani.",
  "natural-silicon-primer":
    "Natural Silicon Primer, 15 ml: baza transparenta cu polisiliciu, care uniformizeaza tenul si minimizeaza ridurile fine.",
  "lip-fixer-gloss-transparent":
    "Lip Fixer Gloss transparent, 8 ml: luciu de buze cu finish radiant, purtat singur sau peste ruj, pentru volum si confort.",
  "extreme-lip-waterproof-n-1-shiny-pink":
    "Extreme Lip Waterproof nr. 1 Shiny Pink: ruj lichid crema, rezistent, pentru cine nu vrea sa il retuseze toata ziua.",
  "eyebrow-pencil-n08-quincy":
    "Eyebrow Pencil nr. 08 Quincy: creion de sprancene cu elastomeri naturali, rezistent la temperatura si cu tinuta lunga.",

  // ─── par ───────────────────────────────────────────────────────────────
  "trico-salus-solution-loiune-redensifant":
    "Lotiune redensifianta Trico-Salus, 100 ml, fara clatire. Se aplica zilnic in cicluri de 8 saptamani, cu o luna de pauza intre ele.",
  "kit-anti-caderea-parului":
    "Kit anti-caderea parului: samponul Trico-Salus impreuna cu produsele care il completeaza, la pachet.",
  "trico-salus-solution-scrub-purificator-efect-detox":
    "Scrub purificator Trico-Salus, 100 ml, cu microgranule, glutation si oleuropeina. Se foloseste de 1-2 ori pe saptamana.",
  "snep-ice-special-gift-box":
    "Snep Ice Special Gift Box: tratamentul complet anti-galben cu pigment violet, in ambalajul cadou, pentru par blond si decolorat.",
  "balsam-de-pr-restructurant":
    "Balsam restructurant, 200 ml, cu gel de aloe bio si germeni de grau. Masca cu clatire pentru parul care si-a pierdut elasticitatea.",
  "trico-salus-solution-sampon-spalare-frecventa":
    "Sampon Trico-Salus pentru spalare frecventa, 250 ml, cu aloe si galbenele. Samponul de alternanta din toate protocoalele liniei.",
  "sneplumina-box":
    "SnepLumina BOX: samponul, masca si uleiul de argan ale liniei, la pachet. Mai ieftin decat cele trei cumparate separat.",
  "trico-salus-solution-sampon-pentru-par-gras":
    "Sampon Trico-Salus pentru par gras, 250 ml, cu castan salbatic, citrice, cofeina, niacinamida si gluconat de zinc.",
  "sneplumina-ulei-de-argan-pt-netezirea-firelor":
    "Ulei SnepLumina, 100 ml: serum de finisare cu argan, colagen si matase, pentru varfuri despicate si efect anti-frizz.",
  "trico-salus-solution-sampon-anti-caderea-parului":
    "Sampon Trico-Salus anti-cadere, 250 ml, cu extract de mesteacan si urzica. Actiune adjuvanta pentru parul cu tendinta de rarire.",
  "lotiune-impotriva-caderii-parului":
    "Lotiune cosmetica, 50 ml, pentru scalpul cu cadere excesiva, descuamare sau exces de sebum. Se aplica direct pe scalp.",
  "trico-salus-solution-sampon-pentru-par-cu-matreata":
    "Sampon Trico-Salus pentru matreata, 250 ml, cu piroctone olamine, eucalipt, rozmarin si mentol. Senzatie de racoare la aplicare.",
  "sneplumina-sampon-hidratant-efect-de-matase":
    "Sampon SnepLumina, 500 ml, cu ulei de argan biocertificat, colagen si matase hidrolizata. Curata delicat toate tipurile de par.",
  "ulei-pentru-protectia-parului-impotriva-razelor-solare":
    "Ulei de protectie a parului, 150 ml: bariera impotriva soarelui, sarii, clorului si vantului, cu parfum de vara.",
  deva:
    "Deva, 50 ml: parfum de par cu extracte de urzica, nalba, quercia marina si coada calului. Improspateaza intre spalari.",
  "snep-ice-box":
    "Snep Ice BOX: sampon si masca anti-galben, balsam bifazic, manusi si instructiuni. Tratamentul complet pentru blond.",
  "sneplumina-masc-hidratant-efect-de-mtase":
    "Masca SnepLumina, 500 ml, cu argan, colagen si matase. Se aplica doar pe lungimi si varfuri, 3-5 sau 10-15 minute.",
  "masc-reparatoare-dup-plaj":
    "Masca reparatoare dupa plaja, 200 ml, pentru parul stresat de soare, sare, clor si nisip. Reda catifelarea si pieptanarea usoara.",

  // ─── fata ──────────────────────────────────────────────────────────────
  "ser-pt-conturul-ochilor-i-buzelor":
    "Ser pentru conturul ochilor si buzelor, 30 ml, cu textura delicata si finish matasos. Pentru zonele cu pielea cea mai subtire.",
  "reinature-drop":
    "Reinature Drop, 50 ml: aloe vera, apa de Rosa Damascena si Centifolia, cu brusture si papaya. Exfoliant bland si calmant.",
  "ser-anti-imbatranire-fata-si-d-collet":
    "Ser anti-imbatranire pentru fata si decolteu, 30 ml, cu ganoderma lucidum, acid hialuronic, gluconolactona si luminescine.",
  "aqua-30-spray":
    "Aqua 3.0 Spray, 150 ml: acid hialuronic si oligoelemente in format de pulverizare, potrivit pentru toate tipurile de ten.",
  "reinature-cream":
    "Reinature Cream, 50 ml: crema de fata cu ulei de bumbac, otet balsamic si lemn dulce, pentru tenul cu imperfectiuni.",
  "reinature-stick":
    "Reinature Stick, 15 ml: gel cu aloe vera si turmeric, cu aplicare punctuala pe zonele cu imperfectiuni. Hidratant si calmant.",
  "crema-de-fata-ageless-el-ea-cu-protectie-solara":
    "Crema Ageless cu protectie solara, 50 ml, pentru el si ea. Textura lejera, non-grasa, cu actiune hidratanta si de iluminare.",
  "cream-30":
    "Cream 3.0, 50 ml: crema anti-imbatranire cu efect de lifting, din linia 3.0 a Snep. Se foloseste dimineata si seara.",
  "nat-1-cleansing-balm":
    "NAT 1 Cleansing Balm, 100 ml: unt demachiant cu uleiuri hranitoare. Primul pas al rutinei coreene in trei etape.",
  "dream-vision":
    "Dream Vision: dispozitiv de masaj pentru zona ochilor, cu vibratii de frecventa inalta, comprese calde si lumina rosie.",
  "30-special-gift-box":
    "3.0 Special Gift Box: produsele liniei 3.0 reunite in cutia cadou — serul, crema si tratamentele pentru ochi si buze.",
  "nat-3-candy-scrub":
    "NAT 3 Candy Scrub, 100 ml: exfoliant bland cu zahar alb si aloe vera. Al treilea pas al rutinei NAT, de 1-2 ori pe saptamana.",
  "sneplumax-crema-de-fata":
    "SnepLumax crema de fata, 50 ml, cu mucina de melc. Se foloseste si ziua, si noaptea, pe tenul curatat in prealabil.",
  "elixir-30":
    "Elixir 3.0, 30 ml: ser cu acid hialuronic in trei greutati moleculare si exopolizaharid din microalge. Pentru orice tip de ten.",
  "crem-gel-aftershave-cu-efect-de-calmare":
    "Crema-gel aftershave, 50 ml, non-grasa, pentru calmarea rosetii dupa barbierit. Lasa pielea moale si hidratata.",
  "reinature-special-gift-box":
    "Reinature Special Gift Box: intreaga gama Reinature pentru tenul cu imperfectiuni, reunita in cutia cadou dedicata.",
  "crem-pentru-fa-de-zi-biostimulatoare":
    "Crema de zi biostimulatoare, 50 ml: hidratanta, cu efect de iluminare si absorbtie rapida. Merge si ca baza de machiaj.",
  "liplift-30":
    "LipLift 3.0, 15 ml: balsam de buze cu efect de umplere, cu acid hialuronic, colagen si elastina. Aroma delicata de cirese.",
  "sneplumax-crema-de-ochi":
    "SnepLumax crema de ochi, 15 ml, cu mucina de melc. Formula dedicata conturului, mai usoara decat crema de fata.",
  "sincera-trio-msti-de-fata":
    "Sincera Trio: trei masti de fata intr-o cutie — carbune pentru purificare, ceai verde pentru hidratare si una revitalizanta.",
  "gold-mask-masc-de-aur-peel-off":
    "Gold Mask, 100 ml: masca peel-off care indeparteaza celulele superficiale si impuritatile, redand luminozitate tenului.",
  "lapte-demachiant-ph-neutr-cleansing-milk":
    "Lapte demachiant cu pH neutru, 250 ml, cu apa de trandafiri de Damasc si ulei de migdale. Demachiaza fara sa usuce.",
  "reinature-serum":
    "Reinature Serum, 30 ml, cu acid salicilic, otet balsamic si strugurele ursului bio. Echilibreaza sebumul si ilumineaza.",
  "nat-2-pink-mousse":
    "NAT 2 Pink Mousse, 150 ml: spuma demachianta cu aloe vera si musetel. Al doilea pas al rutinei, dupa cleansing balm.",
  "reinature-spray":
    "Reinature Spray, 150 ml: tonic de fata pentru tenul cu imperfectiuni, aplicat dupa demachiere si inainte de ser.",
  "beauty-dream-face":
    "Beauty Dream Face, 100 ml: emulsie matasoasa si usoara care uniformizeaza tenul si atenueaza aspectul ridurilor.",
  "sneplumax-special-gift-box":
    "SnepLumax Special Gift Box: crema de fata, crema de ochi si serul cu mucina de melc, reunite in cutia cadou.",
  "crem-de-noapte-pentru-fa-anti-age":
    "Crema de noapte anti-age, 50 ml, cu procent ridicat de extract de reishi. Pentru tenul obosit, ridat sau lipsit de tonus.",

  // ─── corp ──────────────────────────────────────────────────────────────
  sabana:
    "Sabana, 500 ml: sapun lichid de maini cu uleiuri esentiale de tea tree, roinita si cimbru alb. Curata fara sa usuce.",
  fanpaste:
    "FanPaste, 100 g: pasta de dinti cu ingrediente 100% de origine vegetala si minerala, cu efect de albire si astringent.",
  master:
    "Master, 65 ml: gel-ser multifunctional, concentrat de ingrediente active cu proprietati revigorante, calmante si balsamice.",
  "aloe-box":
    "Aloe Box: produsele cosmetice Snep pe baza de aloe pentru corp, reunite intr-un singur pachet, la pret de set.",
  "periu-de-dini-din-bambus":
    "Periuta de dinti din bambus: maner si ambalaj 100% compostabile si biodegradabile. Alternativa la periutele din plastic.",
  vimana:
    "Vimana, 100 ml: crema de maini cu ulei de argan, unt de karite si extract de ovaz bio. Pentru maini uscate si aspre.",
  "belove-spun-intim":
    "Belove, 250 ml: sapun intim cu tensioactivi delicati care respecta pH-ul pielii, cu suc de aloe vera si acid hialuronic.",
  "gel-de-du":
    "Gel de dus, 500 ml, cu apa activa din bambus, ulei esential si extract de portocale dulci. Delicat pentru uzul zilnic.",
  "fanfresh-past-de-dini":
    "FanFresh, 75 ml: pasta de dinti tip gel cu silice si carbune vegetal, in sinergie cu uleiuri esentiale. Efect de iluminare.",
  "new-beauty-dream-pro":
    "New Beauty Dream Pro: dispozitiv de ingrijire a pielii cu tehnologie termica prin radiofrecventa, pentru uz acasa.",
  hermes:
    "Hermes, 100 ml: crema de picioare cu mix de uleiuri esentiale, pentru efect de improspatare si piele catifelata.",
  "cell-up":
    "Cell-Up: bandaje cosmetice cu efect drenant, pentru ingrijirea zonelor cu celulita si adipozitati localizate.",
  deoacqua:
    "DeoAcqua, 100 ml: apa aromatica deodoranta Snep, cu extracte vegetale, fara saruri de aluminiu si fara alcool.",
  "aloe-special-gift-box":
    "Aloe Special Gift Box: cosmeticele Snep pe baza de aloe — gel, spray si crema — reunite in cutia cadou dedicata.",
  "gel-aloe":
    "Gel Aloe, 200 ml: gel cu suc de aloe vera bio, extract de ganoderma si galbenele. Potrivit si pentru pielea delicata.",
  "beauty-dream-body":
    "Beauty Dream Body, 200 ml: crema de corp cu principii vegetale, pentru tonifiere si aspectul zonelor cu celulita.",
  "kit-de-igien-bunal":
    "Kit de igiena orala Snep: pastele FanPaste si FanFresh, apa de gura Orygen si periuta din bambus, la pachet.",
  orygen:
    "Orygen, 250 ml: apa de gura cu aloe vera si hialuronat de sodiu, cu extracte de galbenele, nalba si uleiuri esentiale.",
  "epsom-cream":
    "Epsom Cream, 200 ml: crema de corp cu ingrediente vegetale, pentru ingrijirea cosmetica a zonelor cu imperfectiuni.",
  "vera-cream":
    "Vera Cream, 200 ml: crema hidratanta si calmanta cu amidon de ovaz, pentru piele moale si catifelata.",
  "aloe-silver-spray":
    "Aloe Silver Spray, 150 ml: spray cu suc de aloe bio, ganoderma si musetel, pentru hidratare rapida, inclusiv pe pielea delicata.",
  "crem-de-corp-hidratant":
    "Crema de corp hidratanta, 200 ml, cu absorbtie rapida. Ideala dupa baie, potrivita pentru toate tipurile de piele.",
  "scrub-corp-pentru-netezire":
    "Scrub de corp, 200 ml: elibereaza pielea de celule moarte si impuritati si pregateste tesutul pentru produsele aplicate dupa.",
  "gel-de-du-reductor-250ml":
    "Gel de dus reducator, 250 ml, cu extracte de drosera si cafea verde. Pentru ingrijirea cosmetica a zonelor cu celulita.",

  // ─── nevoi-specifice ───────────────────────────────────────────────────
  collagen:
    "Collagen Snep: colagen hidrolizat cu vitamina C, vitamina E, acid folic, biotina si seleniu. Aport suplimentar zilnic.",
  "morinda-piugrave":
    "Morinda Piu: suc liofilizat de noni cu vitaminele B1 si B3, zinc, crom si coenzima Q10. Varianta imbogatita fata de Morinda.",
  superelease:
    "SuperElease: L-triptofan si coenzima Q10, cu nutrienti care contribuie la reducerea oboselii si a starii de epuizare.",
  ergovir:
    "ErgoVir: arginina, citrulina, turmeric, maca, maslin, ginseng, serenoa, Q10, zinc, piper negru si vitamina D, intr-o formula.",
  "vincigrave":
    "Vinci: vitamina C si flavonoide din fructe citrice, cu extracte din plante. Vitamina C contribuie la functionarea sistemului imunitar.",
  "am-pm":
    "AM & PM: fermenti lactici vii si fibre prebiotice in acelasi produs — probiotic si prebiotic, pentru dimineata si seara.",
  "marine-venere":
    "Marine Venere: formula cu vitamina A, care contribuie la mentinerea normala a pielii, a mucoaselor si a vederii.",
  glucosamina:
    "Glucosamina Snep: 90 de capsule de 630 mg cu sulfat de glucozamina, pentru aportul suplimentar al acestui nutrient.",
  "olimind-2x500ml":
    "OliMind la doua sticle de 500 ml: extract de maslin cu curcuma si bacopa, in format de doua flacoane mai mici.",
  "olivox-2x60-capsule":
    "Olivox, 2 x 60 capsule: 350 mg extract de frunze de maslin titrat 40%, adica 140 mg oleuropeina pe zi, cu anghinare si tamarind.",
  "q10-snep-200":
    "Q10 Snep 200: 60 de capsule cu coenzima Q10, tartrat de L-carnitina, acid folic si vitaminele B6 si B12.",
  "black-garlic":
    "Black Garlic: 60 de capsule cu usturoi negru si berberis, extracte asociate traditional cu functionarea sistemului cardiovascular.",
  alkalyne:
    "Alkalyne: saruri minerale alcalinizante — carbonat de calciu, bicarbonat de sodiu si hidroxid de magneziu.",
  oliprox:
    "OliProx, 500 ml: supliment lichid cu extract de maslin, curcuma, epilobium si dovleac. Din familia oli- a catalogului Snep.",
  "oligravever":
    "Oliver, 500 ml: supliment lichid pe baza de extracte vegetale, din aceeasi familie oli- construita in jurul frunzei de maslin.",
  "l-z-lactoferina-zinc":
    "L&Z: 60 de capsule cu lactoferina si zinc. Zincul contribuie la functionarea normala a sistemului imunitar.",
  cystoben:
    "Cystoben: D-manoza, oleuropeina, bromelaina, afine, urzica si vitamina C, reunite intr-o singura formula.",
  "olivox-6-sticle-de-1-litru":
    "Olivox la set de 6 sticle de 1 litru: extract de maslin titrat 15%, cu anghinare si tamarind. Doza de 20 ml, de doua ori pe zi.",
  "extra-d":
    "Extra-D: 60 de capsule cu astragalus, poligonium, ulei esential de tea tree si vitamina D, pentru sezonul rece.",
  xfetta:
    "XFetta: 60 de capsule cu trifoi rosu, angelica chinezeasca si salvie, plus vitamina D. Formula dedicata femeilor la menopauza.",
  "kalogel-plicuri":
    "Kalogel la plic: 30 x 13 g cu ispagul, griffonia, policosanoli si probioticul Bb-18. Se dizolva in 250 ml de apa.",
  "olimind-1-lt":
    "OliMind, 1 litru: supliment lichid cu extract de maslin, curcuma si bacopa monnieri. Doza de 40 ml, o data sau de doua ori pe zi.",
  "intelli-g":
    "Intelli-G: 60 de capsule cu extracte titrate de bacopa monnieri, maslin, withania somnifera si sofran.",
  "marine-collagen":
    "Marine Collagen: colagen de origine marina, cu indulcitori. Alternativa la colagenul bovin din alte formule.",
  "olivox-40-2-sticle-de-1-litru":
    "Olivox 40, doua sticle de 1 litru: formula hidroglicerica cu maslin, curcuma si rozmarin. Doza de 50 ml, de doua ori pe zi.",
  buonanotte:
    "BuonaNotte: 60 de capsule cu melatonina, paducel si roinita. Melatonina contribuie la reducerea timpului necesar pentru a adormi.",
  redris:
    "RedRis: orez rosu fermentat cu extracte din plante. Berberisul este asociat traditional cu functia digestiva si hepatica.",
  kalogel:
    "Kalogel la borcan, 390 g: ispagul, pulbere de zmeura, griffonia, policosanoli si Bifidobacterium breve Bb-18.",
  tatapros:
    "TataPros: 60 de capsule cu extracte titrate de serenoa, ortosifon si urzica. Serenoa este asociata cu functionalitatea prostatei.",
  "super-cal":
    "Super-Cal: calciu cu vitaminele C, K2 si D3. Calciul contribuie la mentinerea normala a oaselor si a dintilor.",
  olivograve:
    "Olivo: 60 de capsule cu 800 mg extract de maslin titrat 40%, adica 320 mg oleuropeina pe zi — cea mai concentrata varianta.",
  "mood-up":
    "Mood Up: jeleuri cu extract de sofran si vitamina B6, cu aroma de fructe rosii. Formatul cel mai usor de luat din gama.",

  // ─── protectie-solara (accesoriu) ──────────────────────────────────────
  "pochette-suncare":
    "Pochette Suncare: husa Snep pentru transportul produselor de protectie solara. Le tine la un loc in geanta de plaja.",

  // ─── promotii-si-kit-uri ───────────────────────────────────────────────
  // Imbracaminte si accesorii
  "tricou-snep-femeie-roie-l":
    "Tricou Snep pentru femei, culoare rosie, marimea L. Din gama de merchandise a brandului, cu logo aplicat.",
  "tricou-snep-femei-negru-m":
    "Tricou Snep pentru femei, culoare neagra, marimea M. Din gama de merchandise a brandului, cu logo aplicat.",
  "tricou-snep-brbai-rou-s":
    "Tricou Snep pentru barbati, culoare rosie, marimea S. Din gama de merchandise a brandului, cu logo aplicat.",
  "tricou-snep-brbai-negru-s":
    "Tricou Snep pentru barbati, culoare neagra, marimea S. Din gama de merchandise a brandului, cu logo aplicat.",
  "snep-slimfit-pentru-femei-t-thirt-s":
    "Tricou Snep slim fit pentru femei, marimea S. Croiala mulata pe corp, diferita de tricoul clasic din gama.",
  "snep-slimfit-brbai-t-thirt-s":
    "Tricou Snep slim fit pentru barbati, marimea S. Croiala mulata, pentru cine prefera o linie mai stransa.",
  "jacheta-snep-man-xxl":
    "Jacheta Snep pentru barbati, marimea XXL: soft shell impermeabila in doua straturi, 6000 mm/H2O, 95% poliester cu elastan.",
  "cciul-de-iarn-neagr":
    "Caciula de iarna Snep, tricotata, culoare neagra, model simplu, fara pompon.",
  "cciul-de-iarn-roie":
    "Caciula de iarna Snep, tricotata, culoare rosie. Varianta colorata a modelului clasic din gama.",
  "cciul-de-iarn-neagr-cu-pompon":
    "Caciula de iarna Snep, tricotata, culoare neagra, cu pompon. Varianta cu detaliu fata de modelul simplu.",
  "fular-snep":
    "Fular Snep tricotat, accesoriu de iarna asortat cu caciulile din aceeasi gama de merchandise.",

  // Accesorii pentru produse
  shaker:
    "Shaker Snep pentru amestecarea shake-urilor Plus. Accesoriul de baza daca folosesti inlocuitorii de masa.",
  "agitator-mare-cu-praf-i-suport-pentru-capsule":
    "Shaker Snep de capacitate mare, cu compartiment pentru pudra si suport pentru capsule. Varianta completa, pentru sala.",
  "termos-snep":
    "Termos Snep pentru bauturi calde sau reci, din gama de accesorii a brandului.",
  "termos-snep-sport11":
    "Termos Snep Sport, 500 ml, format pentru sala si deplasari. Mai compact decat termosul clasic din gama.",
  "grande-capsule-door":
    "Grande Capsule Door: suport modular pentru capsulele de cafea, cu pana la 12 compartimente.",
  "husa-pentru-tableta":
    "Husa Snep pentru tableta, 27 x 21 x 2 cm. Protectie moale, subtire, folosita singura sau in interiorul unei genti.",
  "plac-de-silicon-pentru-valiz":
    "Placa de silicon Snep pentru valiza, folosita la protejarea produselor lichide in bagaj.",
  "geant-frigorific-suncare":
    "Geanta frigorifica Suncare: pastreaza produsele de plaja la temperatura potrivita in zilele caniculare.",
  "medium-empty-gift-box":
    "Cutie cadou Snep goala, 20 x 25 x 10 cm. Se completeaza cu produsele alese de tine, pentru un cadou personalizat.",
  "kit-cadou-snep":
    "Kit cadou Snep: ambalajul care transforma orice comanda intr-un cadou, cu elementele de prezentare incluse.",

  // Materiale pentru distribuitori
  "snep-agenda":
    "Agenda Snep pentru planificarea activitatii. Instrument de lucru pentru distribuitorii care isi urmaresc contactele.",
  "snepcard-biglietti-da-visita-digitali":
    "SnepCard: set de 3 etichete digitale NFC care inlocuiesc cartea de vizita clasica. Se ating de telefon si transmit datele.",
  "pixuri-snep":
    "Set de 10 pixuri Snep soft touch, cu capat pentru ecran tactil. Utile la prezentari si ca mic cadou.",
  "brri-snep-costiquellochecosti-cu-diverse-culori":
    "Set de 5 bratari Snep din cauciuc, unisex, cu inscriptia COSTIQUELLOCHECOSTI, in culori diferite.",
  "abibilduri-snep-medii-roii-7-buc":
    "Abtibilduri Snep rosii, marime medie, 9 x 4,5 cm, set de 7 bucati. Disponibile si in alb sau negru.",
  "abibilduri-snep-ndash-mici-roii-7-buc":
    "Abtibilduri Snep rosii, marime mica, 6 x 3 cm, set de 7 bucati. Varianta discreta fata de cele medii.",

  // Cataloage si brosuri
  "catalog-general-a4-rom-eng-2024":
    "Catalog general Snep 2024, format A4, editie bilingva romana si engleza. Materialul de prezentare al gamei.",
  "catalog-general-a4-itaeng-2024":
    "Catalog general Snep 2024, format A4, editie bilingva italiana si engleza.",
  "catalog-general-a5-esp-2024":
    "Catalog general Snep 2024, format A5, editie in limba spaniola. Bucata individuala.",
  "catalog-general-a5-esp-2024-x3":
    "Catalog general Snep 2024, format A5, editie spaniola, set de 3 bucati. Pentru cine imparte materiale la prezentari.",
  "catalog-general-a5-ita-2025":
    "Catalog general Snep 2025, format A5, editie in limba italiana. Editia cea mai recenta a gamei.",
  "catalog-general-a5-x10-ita-2025":
    "Catalog general Snep 2025, format A5, editie italiana, set de 10 bucati. Format de distributie in volum.",
  "catalog-general-a5-eng-2025":
    "Catalog general Snep 2025, format A5, editie in limba engleza. Pentru prezentari catre clienti vorbitori de engleza.",
  "catalog-general-a5-rou-2025":
    "Catalog general Snep 2025, format A5, editie in limba romana. Cel mai util material pentru piata locala.",
  "catalog-de-produse-a5-fra-2025":
    "Catalog de produse Snep 2025, format A5, editie in limba franceza. Aceeasi gama, pentru piata francofona.",
  "rezervati-costa-atat-costa-rou":
    "Brosura Snep „Costa atat cat costa”, editie in limba romana. Material de prezentare pentru discutiile despre preturi.",
  "rezervati-costa-atat-costa-eng":
    "Brosura Snep „Costa atat cat costa”, editie in limba engleza. Material de sustinere in discutiile despre preturi.",
  "rezervati-costa-atat-costa-ita":
    "Brosura Snep „Costa atat cat costa”, editie in limba italiana, in varianta originala a materialului.",
  "rezervati-costa-atat-costa-esp":
    "Brosura Snep „Costa atat cat costa”, editie in limba spaniola, pentru prezentari pe piata hispanica.",
};

const MIN = 70;
const MAX = 158;

async function main() {
  const { data: products, error } = await supabase
    .from("products")
    .select("slug, name, meta_description")
    .limit(1000);
  if (error || !products) {
    console.error("Nu am putut citi produsele:", error?.message);
    process.exit(1);
  }

  const problems: string[] = [];
  for (const [slug, v] of Object.entries(META)) {
    if (!products.some((p) => p.slug === slug)) problems.push(`slug inexistent: ${slug}`);
    if (v.length < MIN || v.length > MAX) problems.push(`${slug}: ${v.length} caractere (${MIN}-${MAX})`);
  }

  // Unicitate pe starea finala a intregului tabel.
  const seen = new Map<string, string>();
  for (const p of products) {
    const v = (META[p.slug] ?? p.meta_description ?? "").trim();
    if (!v) continue;
    if (seen.has(v)) problems.push(`duplicat: ${p.slug} <-> ${seen.get(v)}`);
    seen.set(v, p.slug);
  }

  if (problems.length) {
    console.error(`VALIDARE ESUATA (${problems.length}) — nu am scris nimic:`);
    problems.slice(0, 20).forEach((x) => console.error("  -", x));
    process.exit(1);
  }

  const lens = Object.values(META).map((v) => v.length);
  console.log(
    `Validare OK. ${Object.keys(META).length} descrieri scrise de mana | ` +
      `lungimi ${Math.min(...lens)}-${Math.max(...lens)} caractere.`
  );
  if (DRY) return console.log("--dry: nu s-a scris nimic.");

  let ok = 0;
  for (const [slug, v] of Object.entries(META)) {
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
  console.log(`Actualizate: ${ok}/${Object.keys(META).length} produse.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
