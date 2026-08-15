/**
 * Articolul despre farmacii si marketplace-uri.
 *
 * De ce exista (Search Console, 15 mai – 12 aug 2026): un cluster intreg de
 * cautari cu intentie comerciala mare, pe care nicio pagina de pe site nu il
 * atinge — circa 130 de afisari in trei luni, cu zero clicuri.
 *
 *   realcomplex dr max pret ....... 69 afisari, poz. 18,1
 *   olivox plafar ................. 24 afisari, poz. 10,9
 *   olivox pret farmacie .......... 12 afisari, poz. 15,2  (2 clicuri, CTR 16,7%)
 *   realcomplex catena pret ....... 5
 *   real complex in farmacia ...... 5
 *   quercetina dr max ............. 4
 *   olivox pret farmacia tei ...... 2
 *   + olivox emag, olivox pret emag
 *
 * „olivox pret farmacie" convertea la 16,7% CTR fara o pagina dedicata — semn
 * ca intentia e reala si raspunsul lipseste.
 *
 * Tonul e onest, nu defensiv: raspunsul e „nu, si iata de ce", fara sa atace
 * farmaciile. Fara claim-uri medicale, fara comparatii de eficienta.
 *
 * Run: npx tsx scripts/seed-article-farmacii.ts [--dry]
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

const BODY = `
<p>Daca ai cautat <strong>Olivox in farmacie</strong>, <strong>RealComplex la Dr. Max</strong> sau
<strong>produse Snep la Catena, Tei sau Plafar</strong>, raspunsul scurt este acesta:</p>

<p class="art-lead"><strong>Nu. Produsele Snep nu se distribuie prin lanturile de farmacii din Romania.</strong>
Se comanda direct de la un distribuitor autorizat — asta e singurul canal oficial. Nu e o lipsa, e felul in care
functioneaza compania de la inceput.</p>

<h2>De ce nu sunt in farmacii</h2>

<p>Snep SpA este un producator italian care lucreaza pe un model de <strong>distributie directa</strong>:
produsele merg de la fabrica la client prin reteaua de distribuitori autorizati, fara lanturi intermediare de
retail. Nu e o particularitate romaneasca — asa functioneaza compania si in Italia, Franta, Spania sau Polonia.</p>

<p>Consecinta practica: nu exista un raft de farmacie cu produse Snep, pentru ca nu exista un contract de
distributie catre farmacii. Un farmacist nu ti le poate comanda nici la cerere.</p>

<h2>„Dar am vazut ceva cu nume asemanator la Dr. Max / Catena"</h2>

<p>Se intampla des, si merita spus limpede: <strong>nume asemanator nu inseamna acelasi produs</strong>.
Denumiri ca „real complex", „quercetina" sau „colagen marin" sunt formulari descriptive folosite de multi
producatori. Doua produse cu nume aproape identic pot avea compozitii complet diferite — alt extract, alta
titrare, alta cantitate per doza.</p>

<p>Daca vrei sa stii sigur daca ai in fata produsul Snep, verifica <strong>producatorul de pe ambalaj</strong>,
nu numele comercial. Pe produsele Snep scrie Snep SpA, Ponsacco (Pisa), Italia.</p>

<p>Acelasi lucru e valabil si invers: cand compari preturi intre un produs Snep si unul de farmacie cu nume
similar, compari doua lucruri diferite. Uita-te la cantitatea de principiu activ per doza, nu la pretul de pe
cutie. Am explicat pe larg de ce conteaza in
<a href="/ghid/cum-alegi-supliment">ghidul despre cum alegi un supliment</a>.</p>

<h2>Nici pe eMAG, OLX sau alte marketplace-uri</h2>

<p>Distribuitorii autorizati Snep <strong>nu au voie, prin contract, sa vanda pe marketplace-uri</strong> —
eMAG, OLX, Amazon si altele sunt excluse explicit. Motivul e trasabilitatea: pe un marketplace nu poti garanta
lantul de la fabrica la client, nici conditiile de depozitare, nici ca lotul e in termen.</p>

<p>Daca gasesti totusi un anunt cu produse Snep pe un marketplace, nu vine de la un distribuitor autorizat.
Nu putem garanta ce se vinde acolo — nici originea, nici termenul de valabilitate, nici dreptul de retur.</p>

<h2>Cat costa, de fapt</h2>

<p>Preturile sunt cele de catalog ale producatorului, aceleasi pentru orice distribuitor autorizat din Romania.
Nu exista pret „de farmacie" si pret „de distribuitor" — e un singur pret.</p>

<p>Il vezi direct pe pagina fiecarui produs, actualizat:</p>

<ul>
  <li><a href="/produse/nevoi-specifice/olivox-40-2-sticle-de-1-litru">Olivox 40</a> si
      <a href="/produse/nevoi-specifice/olivox-6-sticle-de-1-litru">Olivox la set de 6 sticle</a></li>
  <li><a href="/produse/linia-real/realcomplex">RealComplex la plic</a> si
      <a href="/produse/linia-real/realcomplex-tab">RealComplex TAB</a></li>
  <li><a href="/produse/linia-real/realfibre-plicuri">RealFibre</a></li>
  <li><a href="/produse/nevoi-specifice/kalosnep-capsule">KaloSnep capsule</a></li>
  <li><a href="/produse/nevoi-specifice/burner">Burner</a></li>
</ul>

<p>Catalogul complet, pe categorii, e in <a href="/categorii">pagina de categorii</a>. La total se adauga
transportul, afisat separat in formular inainte sa trimiti comanda.</p>

<h2>Cum se cumpara corect</h2>

<ol>
  <li><strong>Alegi produsul</strong> de pe site si trimiti formularul de comanda. Fara cont, fara card in
  acel moment.</li>
  <li><strong>Te contactam</strong> ca sa confirmam produsele, adresa si totalul. Aici poti pune orice
  intrebare despre compozitie sau administrare.</li>
  <li><strong>Primesti linkul de plata</strong> pe WhatsApp sau pe e-mail. Plata se face online, cu cardul,
  <strong>direct catre Snep</strong> — noi nu incasam contravaloarea produselor.</li>
  <li><strong>Coletul pleaca</strong> dupa confirmarea platii si ajunge in 3-5 zile lucratoare, prin curier.</li>
</ol>

<p>Detaliile complete sunt in <a href="/livrare-si-retur">pagina de livrare si retur</a>.</p>

<h2>Ce castigi fata de un raft de farmacie</h2>

<ul>
  <li><strong>Produs sigilat, direct de la producator.</strong> Fara intermediari, cu lot trasabil.</li>
  <li><strong>Eticheta in limba romana</strong>, conforma cu Regulamentul UE 1169/2011.</li>
  <li><strong>Cineva pe care poti suna.</strong> Daca ai o intrebare despre compozitie sau despre o
  interactiune posibila cu un tratament, primesti raspuns de la o persoana, nu de la un formular.</li>
  <li><strong>Drept de retur 14 zile</strong>, conform OUG 34/2014.</li>
</ul>

<p>Si ce nu castigi, ca sa fie spus si asta: nu iei produsul in aceeasi zi, cum ai lua de la farmacia de la
colt. Livrarea dureaza 3-5 zile lucratoare.</p>

<h2>Intrebari frecvente</h2>

<h3>Pot cere farmacistului sa comande produse Snep?</h3>
<p>Nu. Nu exista contract de distributie catre farmacii, deci nu le poate comanda nici la cerere.</p>

<h3>Produsele Snep sunt medicamente?</h3>
<p>Nu. Sunt <strong>suplimente alimentare</strong> si cosmetice, notificate ca atare. Nu se elibereaza pe reteta
si nu inlocuiesc un tratament prescris de medic.</p>

<h3>Pretul difera de la un distribuitor la altul?</h3>
<p>Nu. E pretul de catalog al producatorului, acelasi pentru toata Romania.</p>

<h3>Ce fac daca vad produse Snep pe eMAG sau OLX?</h3>
<p>Nu provin de la un distribuitor autorizat. Nu putem garanta originea, conditiile de pastrare sau termenul de
valabilitate al acelor produse.</p>

<h3>Cum verific ca produsul primit e original?</h3>
<p>Pe ambalaj trebuie sa scrie producatorul — Snep SpA, Ponsacco (Pisa), Italia — impreuna cu lotul si termenul
de valabilitate. Ambalajul ajunge sigilat de producator.</p>
`;

const ARTICLE = {
  slug: "produse-snep-in-farmacii-catena-dr-max-plafar",
  title: "Se gasesc produsele Snep in farmacii? Catena, Dr. Max, Tei, Plafar",
  excerpt:
    "Raspunsul scurt e nu, si merita explicat de ce. Cum functioneaza distributia Snep in Romania, de ce un nume asemanator din farmacie nu inseamna acelasi produs si cum se comanda corect.",
  tags: ["snep", "farmacie", "catena", "dr max", "plafar", "distributie", "olivox"],
  meta_title: "Produsele Snep in farmacii? Catena, Dr. Max, Plafar",
  meta_description:
    "Produsele Snep nu se vand in farmacii si nici pe marketplace-uri. De ce, cum functioneaza distributia directa si de ce un nume asemanator nu e acelasi produs.",
};

const DISCLAIMER = `
<p class="art-disclaimer"><strong>Disclaimer.</strong> Acest articol are caracter informativ si nu inlocuieste
consultul medical. Suplimentele alimentare nu sunt medicamente si nu sunt destinate tratarii, prevenirii sau
vindecarii vreunei boli. Un supliment alimentar nu inlocuieste o dieta variata si echilibrata si un stil de viata
sanatos. Consulta medicul inainte de utilizare, in special daca urmezi un tratament medicamentos, esti
insarcinata sau alaptezi.</p>
`;

const CTA = `
<p class="art-cta">Nu esti sigur ce produs ti se potriveste sau vrei sa verifici o compozitie inainte sa comanzi?
Scrie-ne pe <a href="https://wa.me/40779243541" rel="nofollow">WhatsApp</a> sau suna la
<a href="tel:0779243541">0779 243 541</a>. Iti raspunde un distribuitor autorizat Snep, fara obligatia de a comanda.</p>
`;

async function main() {
  const body = (BODY + CTA + DISCLAIMER).trim();

  const row = {
    slug: ARTICLE.slug,
    title: ARTICLE.title,
    excerpt: ARTICLE.excerpt,
    body,
    tags: ARTICLE.tags,
    meta_title: ARTICLE.meta_title,
    meta_description: ARTICLE.meta_description,
    published_at: new Date().toISOString(),
    is_published: true,
    author: "Redactia Olivox",
    updated_at: new Date().toISOString(),
  };

  console.log(`slug:  ${row.slug}`);
  console.log(`titlu: ${row.title} (${row.title.length})`);
  console.log(`meta:  ${row.meta_title} (${row.meta_title.length})`);
  console.log(`desc:  ${row.meta_description} (${row.meta_description.length})`);
  console.log(`corp:  ${body.length} caractere`);

  if (DRY) {
    console.log("\nDry-run. Ruleaza fara --dry ca sa scrii in baza de date.");
    return;
  }

  const { data: existing } = await supabase
    .from("articles")
    .select("id")
    .eq("slug", ARTICLE.slug)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("articles").update(row).eq("id", existing.id);
    if (error) {
      console.error("Update esuat:", error.message);
      process.exit(1);
    }
    console.log("\nActualizat.");
  } else {
    const { error } = await supabase.from("articles").insert(row);
    if (error) {
      console.error("Insert esuat:", error.message);
      process.exit(1);
    }
    console.log("\nInserat.");
  }
}

main();
