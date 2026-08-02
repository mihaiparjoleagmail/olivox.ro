/**
 * Upgrades the `aloe` product category to pillar-grade content.
 *
 * Why the category page and not a new /aloe route: GSC (mai-aug 2026) shows
 * /produse/aloe already ranking for 15 of 15 aloe queries — there is no split
 * to consolidate, unlike olivox / kalosnep / sneplumina / realfibre / trico-salus.
 * A competing root URL would only dilute it. The actual bottleneck is CTR:
 * 90 impressions, 1 click, positions 9-10, with a meta description that was
 * truncated mid-sentence ("...de calitate — ajutor.").
 *
 * Run:
 *   npx tsx scripts/upgrade-aloe-category.ts
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

const META_TITLE = "Aloe Vera Snep: sucuri, Aloe 100 Bio si glucozamina";
const META_DESCRIPTION =
  "Sucuri de Aloe Vera Snep: ce inseamna aloina sub 10 ppm si gel fara epidermida, diferenta dintre cele 4 variante, doze si pastrare dupa deschidere.";

const DESCRIPTION = `
<p>Aloe Vera este unul dintre cele mai vandute ingrediente din intreg catalogul Snep, iar aceasta categorie
reuneste variantele pentru consum intern: aloe pura certificata bio, sucuri cu fructe si o formula cu
glucozamina. Toate sunt suplimente alimentare produse in Italia, din gelul interior al frunzei.</p>

<p>Ghidul de mai jos iti arata ce diferentiaza un suc de aloe bun de unul slab — incepand cu doi termeni de pe
eticheta pe care aproape nimeni nu ii verifica.</p>

<h2>Aloina sub 10 ppm: markerul de calitate care conteaza cel mai mult</h2>

<p>Frunza de aloe are trei straturi. La exterior, coaja. Imediat sub ea, un strat de <strong>latex galben</strong>
bogat in antrachinone, dintre care cea mai cunoscuta este <strong>aloina</strong>. In interior, parenchimul —
gelul transparent, partea utila.</p>

<p>Aloina are un efect laxativ puternic si iritant pentru mucoasa intestinala. Un suc de aloe obtinut neglijent,
din frunza intreaga si fara decolorare, poate contine cantitati semnificative — iar reactiile digestive pe care
le pun unii pe seama „detoxifierii" sunt, de fapt, aloina.</p>

<p>De aceea, produsele serioase declara continutul de aloina. <strong>Aloe 100 Bio din aceasta categorie
mentioneaza explicit pe eticheta: continut de aloina &lt; 10 ppm</strong> — adica sub 10 parti per milion, pragul
uzual pentru aloe decolorata destinata consumului.</p>

<p>Daca iei un singur lucru din aceasta pagina, ia-l pe acesta: <em>cand cumperi un suc de aloe, cauta mentiunea
despre aloina. Absenta ei nu e o garantie ca produsul e slab, dar prezenta ei e o garantie ca producatorul stie ce
face.</em></p>

<h2>„Gel fara epidermida": a doua mentiune de urmarit</h2>

<p>Pe etichetele sucurilor din aceasta categorie apare formularea <strong>„Aloe vera (aloe barbadensis mill.) gel
fara epidermida"</strong>. Inseamna ca s-a folosit doar parenchimul interior, fara coaja si fara stratul de latex.
Este metoda de procesare care da un produs curat, si este direct legata de continutul scazut de aloina.</p>

<p>Alternativa industriala — aloe din frunza intreaga, macinata cu tot cu coaja — este mai ieftina si da un
randament mai mare, dar cere apoi filtrare pe carbune ca sa devina consumabila. Diferenta se vede in pret si,
uneori, in cum te simti dupa.</p>

<h3>Polizaharidele: partea activa</h3>

<p>Componentele de interes din gelul de aloe sunt polizaharidele, in special cele din familia acemananului. Aloe
100 Bio declara <strong>247,5 mg de polizaharide la 99 ml</strong> de produs — genul de cifra pe care putini
producatori o pun pe eticheta si care permite o comparatie reala intre produse.</p>

<h2>Cele patru variante si ce le diferentiaza</h2>

<h3>Aloe 100 Bio — aloe pura</h3>
<p>Suc si pulpa de aloe vera din agricultura ecologica, certificat bio, fara arome adaugate. Aproape integral
aloe, cu acid citric natural ca singur adaos. Vegan si fara gluten. Este varianta pentru cine vrea aloe si nimic
altceva. Se dilueaza intr-un pahar cu apa.</p>

<h3>Aloe &amp; Piersica Drink — aloe aromata</h3>
<p>Gel de aloe in proportie de <strong>98%</strong>, cu aroma de piersica. Practic aceeasi baza, facuta mult mai
usor de baut zilnic. Alegerea logica daca gustul pur de aloe te-a facut sa renunti in trecut.</p>

<h3>Aloe Drink 7 Fructe — aloe plus antioxidanti</h3>
<p>Combina gelul de aloe cu extracte de <strong>acai</strong> (titrat 10% polifenoli), <strong>goji</strong>
(titrat 50% polizaharide), <strong>mangustan</strong> (titrat 10% alfa-mangostina), suc liofilizat de
<strong>noni</strong>, <strong>ceai verde</strong> (titrat 95% polifenoli) si <strong>afine</strong>. Aduce, pe
langa aloe, fibrele si polifenolii acestor fructe. Se gaseste la flacon de 1 litru si la set de 6 sticle de 200 ml,
varianta portionata pentru cine e des pe drum.</p>

<h3>Aloe + Glucozamina — formula pentru articulatii</h3>
<p>Baza de aloe (70%) peste care se adauga <strong>sulfat de glucozamina 500 mg</strong>,
<strong>MSM 200 mg</strong> si <strong>vitamina C 500 mg</strong> (625% din valoarea nutritionala de referinta) la
doza zilnica de 40 ml. Vitamina C contribuie la formarea normala a colagenului pentru functionarea normala a
cartilajelor. Este singura varianta din categorie cu o directie clara, dincolo de aloe in sine.</p>

<h2>Cum se administreaza</h2>

<ul>
  <li><strong>Sucurile aromate</strong> (Piersica, 7 Fructe): doua masuri de 20 ml, o data sau de doua ori pe zi,
  diluate intr-un pahar de apa.</li>
  <li><strong>Aloe 100 Bio</strong>: o lingura de 20 ml de doua ori pe zi, de preferinta inainte de mese, diluata
  in aproximativ 250 ml de apa.</li>
  <li><strong>Aloe + Glucozamina</strong>: 40 ml pe zi, de preferat in timpul mesei, folosind paharul dozator.</li>
</ul>

<p>Flacoanele sunt de 1 litru. La doza maxima de pe eticheta, un flacon acopera aproximativ <strong>25 de
zile</strong> — util de stiut cand compari cu produse ambalate la 500 ml.</p>

<h2>Pastrarea dupa deschidere — detaliul care strica cele mai multe produse</h2>

<p>Este partea pe care o rateaza aproape toata lumea. <strong>Aloe 100 Bio se tine la frigider dupa deschidere si
se consuma in aproximativ 20 de zile.</strong> Este un produs concentrat, fara sistem de conservare agresiv —
exact motivul pentru care e bun, si exact motivul pentru care nu rezista luni intregi in dulap.</p>

<p>Celelalte variante se pastreaza la loc racoros si uscat, sub 30°C, ferite de sursele de caldura. La
Aloe + Glucozamina, eticheta atrage atentia ca produsul poate absorbi umiditate dupa desigilare, deci flaconul
trebuie tinut bine inchis.</p>

<h2>Cui i se adreseaza</h2>
<ul>
  <li>Celor care vor un aport zilnic de aloe dintr-o sursa cu procesare declarata.</li>
  <li>Celor interesati de confort digestiv si de o rutina simpla, cu un pahar pe zi.</li>
  <li>Celor care cauta o sursa de polifenoli din fructe, in cazul variantei 7 Fructe.</li>
  <li>Celor care vor glucozamina si MSM intr-o forma lichida, mai usor de luat decat capsulele.</li>
</ul>

<h2>Cui NU i se adreseaza</h2>
<ul>
  <li>Copiilor sub 3 ani.</li>
  <li>Persoanelor cu hipersensibilitate la unul dintre ingrediente. Varianta cu glucozamina nu este potrivita
  celor cu alergie la crustacee, sursa uzuala a glucozaminei.</li>
  <li>Femeilor insarcinate sau care alapteaza, fara acordul medicului.</li>
  <li>Persoanelor cu afectiuni digestive in puseu sau sub tratament medicamentos, fara sa fi intrebat medicul.</li>
  <li>Celor care se asteapta la efecte rapide si spectaculoase — un supliment se evalueaza in saptamani, nu in
  zile.</li>
</ul>

<h2>Aloe de baut si aloe pentru piele: nu se confunda</h2>

<p>Produsele din aceasta categorie sunt <strong>suplimente alimentare</strong>, pentru consum. Snep are si o gama
de cosmetice cu aloe — gel, spray hidratant, crema — care sunt produse de uz extern si se gasesc in categoria
<a href="/produse/corp">Corp</a>. Sunt formule complet diferite; sucul nu se aplica pe piele si gelul cosmetic nu
se bea.</p>

<h2>Cu ce se combina</h2>
<p>Aloe apare frecvent alaturi de alte produse din catalog, in functie de obiectiv:</p>
<ul>
  <li><a href="/realfibre">RealFibre</a> — fibre prebiotice, daca obiectivul e flora intestinala.</li>
  <li><a href="/olivox-supliment-antioxidant">Olivox</a> — extract titrat de frunze de maslin, pe partea
  antioxidanta.</li>
  <li><a href="/produse/programe">Programele</a> Fit9 si Real Detox, care includ deja aloe in pachet.</li>
</ul>
<p>Citeste si <a href="/ghid/suplimente-alimentare-naturale">ghidul suplimentelor alimentare naturale</a> inainte
sa iti construiesti o rutina.</p>

<p style="margin-top:24px;padding:14px 16px;background:#f7f5f0;border-radius:8px;font-size:0.82rem;line-height:1.6;color:#6b7280">
<strong>Disclaimer.</strong> Suplimente alimentare. Informatiile de mai sus au caracter informativ si nu inlocuiesc
consultul medical. Suplimentele alimentare nu sunt medicamente si nu sunt destinate tratarii, prevenirii sau
vindecarii vreunei boli. Un supliment alimentar nu inlocuieste o dieta variata si echilibrata si un stil de viata
sanatos. Nu depasi doza recomandata pe eticheta. A nu se lasa la indemana copiilor sub 3 ani. Consulta medicul
inainte de utilizare, in special daca urmezi un tratament medicamentos, esti insarcinata sau alaptezi.</p>
`;

async function main() {
  const { data: before } = await supabase
    .from("product_categories")
    .select("slug, meta_title, meta_description, description")
    .eq("slug", "aloe")
    .single();

  if (!before) {
    console.error("Categoria `aloe` nu a fost gasita.");
    process.exit(1);
  }

  const wordsBefore = (before.description || "").replace(/<[^>]+>/g, " ").trim().split(/\s+/).length;

  const { error } = await supabase
    .from("product_categories")
    .update({
      meta_title: META_TITLE,
      meta_description: META_DESCRIPTION,
      description: DESCRIPTION.trim(),
    })
    .eq("slug", "aloe");

  if (error) {
    console.error("UPDATE FAIL:", error.message);
    process.exit(1);
  }

  const wordsAfter = DESCRIPTION.replace(/<[^>]+>/g, " ").trim().split(/\s+/).length;
  console.log("Categoria `aloe` actualizata:");
  console.log(`  meta_title:       ${before.meta_title}  ->  ${META_TITLE}`);
  console.log(`  meta_description: ${(before.meta_description || "").slice(0, 60)}...  ->  ${META_DESCRIPTION.slice(0, 60)}...`);
  console.log(`  description:      ${wordsBefore} cuvinte  ->  ${wordsAfter} cuvinte`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
