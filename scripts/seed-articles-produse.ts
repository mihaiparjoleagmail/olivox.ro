/**
 * Seeds the product-focused + recruiting articles into the Supabase `articles` table.
 * Idempotent: updates by `slug` if the article already exists.
 *
 * Run:
 *   npx tsx scripts/seed-articles-produse.ts
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

const DISCLAIMER_SUPLIMENT = `
<p class="art-disclaimer"><strong>Disclaimer.</strong> Acest articol are caracter informativ si nu inlocuieste
consultul medical. Suplimentele alimentare nu sunt medicamente si nu sunt destinate tratarii, prevenirii sau
vindecarii vreunei boli. Un supliment alimentar nu inlocuieste o dieta variata si echilibrata si un stil de viata
sanatos. Nu depasi doza recomandata pe eticheta. Consulta medicul inainte de utilizare, in special daca urmezi un
tratament medicamentos, esti insarcinata sau alaptezi.</p>
`;

const CTA = `
<p class="art-cta">Ai o intrebare despre produs sau vrei o recomandare pentru situatia ta?
Scrie-ne pe <a href="https://wa.me/40779243541" rel="nofollow">WhatsApp</a> sau suna la
<a href="tel:0779243541">0779 243 541</a>. Iti raspunde un distribuitor autorizat Snep, fara obligatia de a comanda.</p>
`;

type SeedArticle = {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  tags: string[];
  meta_title: string;
  meta_description: string;
  daysBack: number;
};

const ARTICLES: SeedArticle[] = [
  {
    slug: "burner-snep-ghid",
    title: "Burner Snep: ce contine, cum se ia si cui i se potriveste",
    excerpt:
      "Ghid complet despre Burner de la Snep: compozitia reala (Cassia nomame, Gymnema sylvestre, crom), mod de administrare, contraindicatii si ce nu trebuie sa astepti de la el.",
    tags: ["burner", "snep", "controlul greutatii", "crom", "gymnema"],
    meta_title: "Burner Snep: compozitie, mod de utilizare, pareri | Olivox",
    meta_description:
      "Ce contine Burner Snep, cum se administreaza cele 2 capsule pe zi, cui i se adreseaza si cui nu. Informatii din eticheta, fara promisiuni exagerate.",
    daysBack: 21,
    body: `
<p>Burner este unul dintre cele mai cautate produse din catalogul Snep in Romania, in categoria controlului
greutatii. Multi il cauta online si sub forma "burner extreme" — in catalogul oficial produsul se numeste simplu
<strong>Burner</strong> si este un supliment alimentar in capsule.</p>

<p>Acest articol iti arata exact ce scrie pe eticheta, ce inseamna fiecare ingredient si — la fel de important —
ce <em>nu</em> trebuie sa astepti de la el.</p>

<h2>Ce este Burner</h2>
<p><a href="/produse/nevoi-specifice/burner">Burner</a> este un supliment alimentar pe baza de extracte vegetale
si picolinat de crom, ambalat in 60 de capsule de 510 mg. Face parte din linia Snep dedicata echilibrului
greutatii corporale si se foloseste ca sprijin in cadrul unei diete hipocalorice, nu ca inlocuitor al acesteia.</p>

<h2>Compozitie: ce contine, in cifre</h2>
<p>Doza zilnica maxima recomandata este de 2 capsule. La aceasta doza, produsul aduce:</p>
<ul>
  <li><strong>Cassia nomame</strong> (extract uscat titrat 8% flavonoide) — 400 mg, din care 32 mg flavonoide</li>
  <li><strong>Gymnema sylvestre</strong> (extract uscat titrat 25% acizi gimnemici) — 400 mg, din care 100 mg acid gimnemic</li>
  <li><strong>Crom</strong> (sub forma de picolinat de crom) — 200 mcg, adica 500% din Valoarea Nutritionala de Referinta</li>
</ul>
<p>Restul formulei este alcatuit din hidroxipropilmetilceluloza (capsula) si maltodextrina ca agent de volum.
Produsul este declarat fara gluten.</p>

<h3>De ce conteaza cuvantul "titrat"</h3>
<p>Un extract "titrat 25% acizi gimnemici" garanteaza o cantitate exacta de principiu activ in fiecare doza.
Un extract netitrat poate varia enorm de la lot la lot. Este unul dintre criteriile pe care le explicam si in
<a href="/ghid/cum-alegi-supliment">ghidul despre cum alegi un supliment</a>.</p>

<h2>Ce fac ingredientele</h2>
<p>Formularile de mai jos sunt cele permise pentru suplimente alimentare — descriu contributii la functii
fiziologice normale, nu efecte terapeutice.</p>
<ul>
  <li><strong>Cassia nomame</strong> este asociata traditional cu metabolismul trigliceridelor si al colesterolului
  si cu echilibrul greutatii corporale.</li>
  <li><strong>Gymnema sylvestre</strong> este folosita traditional pentru a favoriza metabolismul carbohidratilor
  si al lipidelor si pentru controlul senzatiei de foame.</li>
  <li><strong>Cromul</strong> contribuie la mentinerea nivelului normal de glucoza in sange si la metabolismul
  normal al macronutrientilor.</li>
</ul>

<h2>Mod de administrare</h2>
<p>Recomandarea de pe eticheta: <strong>2 capsule pe zi, in momentul meselor principale</strong>. Produsul se
pastreaza la loc racoros si uscat, departe de surse de caldura.</p>
<p>Nu depasi doza zilnica recomandata. Daca folosesti produsul mai mult de 3 saptamani consecutive, eticheta
recomanda explicit sa consulti medicul.</p>

<h2>Cui i se adreseaza</h2>
<ul>
  <li>Persoane adulte care urmeaza deja o dieta hipocalorica si vor un sprijin in plus.</li>
  <li>Persoane care au un nivel bun de activitate fizica si vor sa mentina un aport echilibrat.</li>
  <li>Persoane care prefera formule pe baza de extracte vegetale titrate.</li>
</ul>

<h2>Cui NU i se adreseaza</h2>
<p>Aceasta sectiune conteaza mai mult decat lista de beneficii.</p>
<ul>
  <li>Copiilor sub 3 ani — produsul nu se lasa la indemana lor.</li>
  <li>Persoanelor care urmeaza tratament pentru glicemie sau alte tratamente medicamentoase, fara acordul medicului.</li>
  <li>Femeilor insarcinate sau care alapteaza, fara consult medical prealabil.</li>
  <li>Persoanelor cu hipersensibilitate cunoscuta la unul dintre ingrediente.</li>
  <li>Oricui se asteapta la rezultate fara nicio schimbare in alimentatie — eticheta insasi spune ca produsul
  trebuie folosit in cadrul unei diete hipocalorice adecvate, cu un stil de viata sanatos si activitate fizica.</li>
</ul>

<h2>Ce sa nu astepti de la Burner</h2>
<p>Fii sceptic cu orice text — inclusiv de la un distribuitor — care iti promite un numar de kilograme intr-un
numar de zile. Un supliment alimentar nu poate garanta asa ceva si nici nu are voie legal sa promita asta.
Burner este un sprijin intr-un context: mancare, miscare, somn. Fara context, nu are ce sustine.</p>

<h2>Cu ce se combina uzual in catalog</h2>
<ul>
  <li><a href="/produse/linia-real/realfibre">RealFibre</a> — fibre prebiotice, pentru confort digestiv si tranzit.</li>
  <li><a href="/produse/linia-real/realcomplex">RealComplex</a> — formula cu papadie, mesteacan, anghinare si minerale.</li>
  <li><a href="/produse/nevoi-specifice/olivox-2x60-capsule">Olivox</a> — extract de frunze de maslin, anghinare si tamarind.</li>
  <li><a href="/produse/programe/real-detox">Real Detox</a> — programul structurat care reuneste mai multe produse.</li>
</ul>
<p>Vezi si restul categoriei <a href="/produse/controlul-greutatii">Controlul greutatii</a>.</p>

<h2>Intrebari frecvente</h2>
<h3>Burner si "Burner Extreme" sunt acelasi produs?</h3>
<p>In catalogul Snep exista produsul <strong>Burner</strong>. "Burner extreme" este o formulare folosita in cautari
online, nu o denumire oficiala din catalog.</p>

<h3>Cate capsule are o cutie si cat tine?</h3>
<p>Cutia are 60 de capsule de 510 mg. La doza recomandata de 2 capsule pe zi, o cutie acopera 30 de zile.</p>

<h3>Se poate lua impreuna cu alte suplimente Snep?</h3>
<p>De regula da, dar depinde de ce iei deja si de starea ta de sanatate. Cel mai sigur este sa intrebi medicul
sau farmacistul, mai ales daca iei si alte produse cu crom sau cu efect asupra glicemiei.</p>

<h3>Contine gluten?</h3>
<p>Nu. Produsul este declarat fara gluten pe eticheta.</p>

${CTA}
${DISCLAIMER_SUPLIMENT}
`,
  },

  {
    slug: "realcomplex-snep-ghid",
    title: "RealComplex Snep: ce contine si cum se foloseste corect",
    excerpt:
      "Papadie, mesteacan, anghinare si un pachet de minerale cu fier bisglicinat. Ce este RealComplex, diferenta dintre plicuri si comprimate si cui i se potriveste.",
    tags: ["realcomplex", "snep", "purificare", "papadie", "anghinare", "minerale"],
    meta_title: "RealComplex Snep: compozitie si mod de utilizare | Olivox",
    meta_description:
      "RealComplex Snep in detaliu: papadie, mesteacan, anghinare, magneziu, potasiu, fier bisglicinat. Plicuri sau comprimate, cum se ia si cui nu i se potriveste.",
    daysBack: 14,
    body: `
<p>RealComplex face parte din linia Real a Snep si este, dupa Olivox, unul dintre cele mai cautate produse din
catalog in Romania. Este un supliment alimentar care combina trei extracte vegetale clasice cu un pachet
consistent de minerale si vitamine.</p>

<p>Ghidul de mai jos iti arata compozitia exacta, diferenta dintre cele doua forme in care se gaseste si
contraindicatiile care nu ar trebui sarite.</p>

<h2>Ce este RealComplex</h2>
<p><a href="/produse/linia-real/realcomplex">RealComplex</a> este un supliment alimentar care poate fi util pentru
a favoriza procesele naturale de purificare ale organismului, prin ficat si rinichi. Se gaseste in doua forme:</p>
<ul>
  <li><strong>Plicuri</strong> — 30 de plicuri a 8 g, cu aroma de portocale, solubile in apa.</li>
  <li><strong><a href="/produse/linia-real/realcomplex-tab">RealComplex TAB</a></strong> — 120 de comprimate de 800 mg.</li>
</ul>

<h2>Extractele vegetale din formula</h2>
<ul>
  <li><strong>Papadie</strong> (Taraxacum officinale, radacina, extract uscat titrat 2% in inulina) — traditional
  asociata cu sustinerea functiei hepatice si a proceselor de eliminare.</li>
  <li><strong>Mesteacan</strong> (Betula pendula, frunze, extract uscat titrat 2% in hiperozid) — traditional
  asociat cu activitatea de diureza, atribuita continutului de flavonoide.</li>
  <li><strong>Anghinare</strong> (Cynara scolymus, frunze, extract uscat titrat in acid clorogenic) — traditional
  asociata cu functia digestiva si cu secretia biliara, datorita cinarinei, substanta amara din frunze.</li>
</ul>

<h2>Mineralele si vitaminele: cifrele de pe eticheta</h2>
<p>Pentru varianta la plic, un plic aduce:</p>
<ul>
  <li><strong>Magneziu</strong> — 300 mg (80% VNR)</li>
  <li><strong>Calciu</strong> — 400 mg (50% VNR)</li>
  <li><strong>Potasiu</strong> — 400 mg (20% VNR)</li>
  <li><strong>Fier</strong> (bisglicinat) — 14 mg (100% VNR)</li>
  <li><strong>Vitamina C</strong> — 160 mg (200% VNR)</li>
  <li><strong>Vitamina D</strong> (colecalciferol) — 10 mcg / 400 UI (200% VNR)</li>
</ul>
<p><strong>VNR</strong> inseamna Valoare Nutritionala de Referinta — cantitatea zilnica orientativa pentru un
adult sanatos. Un procent peste 100% nu inseamna automat "mai bine"; inseamna doar ca doza depaseste referinta.</p>

<h3>De ce fier bisglicinat si nu alt fier</h3>
<p>Fierul bisglicinat este o molecula de fier legata de doua molecule de glicina. Aceasta forma chelata este in
general mai bine tolerata digestiv decat sarurile clasice de fier — un detaliu care conteaza pentru cine a
renuntat in trecut la suplimente cu fier din cauza disconfortului.</p>

<h3>Ce fac vitaminele din formula</h3>
<ul>
  <li>Vitamina C contribuie la protejarea celulelor impotriva stresului oxidativ si la functionarea normala a
  sistemului imunitar. In plus, creste absorbtia fierului — motiv pentru care apare alaturi de el in formula.</li>
  <li>Vitamina D contribuie la absorbtia normala a calciului si la mentinerea sanatatii oaselor.</li>
  <li>Magneziul contribuie la reducerea oboselii si la functionarea normala a sistemului nervos si muscular.</li>
</ul>

<h2>Mod de administrare</h2>
<p><strong>Plicuri:</strong> continutul unui plic pe zi, direct in gura sau dizolvat intr-un pahar de apa.</p>
<p><strong>TAB:</strong> intre 2 si 6 comprimate pe zi, de preferat in timpul mesei.</p>
<p>In ambele cazuri: nu depasi doza zilnica recomandata. Consumul excesiv poate avea efect laxativ.</p>

<h3>Plicuri sau comprimate — care varianta?</h3>
<ul>
  <li><strong>Plicurile</strong> au doza fixa, se dizolva in apa si sunt mai simple daca vrei ceva rapid, o data pe zi.</li>
  <li><strong>Comprimatele</strong> permit dozare flexibila (de la 2 la 6 pe zi) si sunt mai practice in deplasare.</li>
</ul>

<h2>Cui NU i se adreseaza</h2>
<ul>
  <li>Copiilor sub 3 ani.</li>
  <li>Persoanelor cu hipersensibilitate constatata la unul sau mai multe ingrediente.</li>
  <li>Persoanelor care iau deja suplimente cu fier sau tratament cu fier — un aport dublu nu este anodin;
  intreaba medicul.</li>
  <li>Persoanelor aflate sub tratament diuretic sau pentru afectiuni renale ori biliare, fara acordul medicului.</li>
  <li>Femeilor insarcinate sau care alapteaza, fara consult medical prealabil.</li>
</ul>

<h2>Cum se incadreaza intr-o rutina</h2>
<p>RealComplex este gandit ca parte dintr-un ansamblu, nu ca produs izolat. In catalog apare frecvent alaturi de:</p>
<ul>
  <li><a href="/produse/linia-real/realfibre">RealFibre</a> — inulina, fibre din mar si fructooligozaharide, pentru flora intestinala.</li>
  <li><a href="/produse/linia-real/realvita">RealVita</a> — complex de vitamine pentru metabolismul energetic normal.</li>
  <li><a href="/produse/programe/real-detox">Real Detox</a> — programul structurat care le reuneste.</li>
  <li><a href="/produse/nevoi-specifice/olivox-2x60-capsule">Olivox</a> — extract de frunze de maslin bogat in oleuropeina.</li>
</ul>
<p>Inainte sa pornesti un program, citeste si articolul despre
<a href="/articole/programe-detox-cand-ai-nevoie">cand are sens un program detox</a> — si cand nu are.</p>
<p>Vezi toata gama in categoria <a href="/produse/linia-real">Linia Real</a>.</p>

<h2>Intrebari frecvente</h2>
<h3>Cat tine o cutie?</h3>
<p>Varianta la plic are 30 de plicuri, deci acopera 30 de zile la doza de un plic pe zi. Varianta TAB are 120 de
comprimate; durata depinde de doza aleasa, intre 20 si 60 de zile.</p>

<h3>Contine gluten?</h3>
<p>Nu, ambele variante sunt declarate fara gluten pe eticheta.</p>

<h3>Se poate lua pe termen lung?</h3>
<p>Formula contine minerale si vitamine in doze care depasesc VNR la unele componente. Pentru utilizare
indelungata, discuta cu medicul, mai ales daca faci analize periodice pentru fier sau calciu.</p>

<h3>Are gust?</h3>
<p>Varianta la plic are aroma de portocale si contine indulcitor (sucraloza).</p>

${CTA}
${DISCLAIMER_SUPLIMENT}
`,
  },

  {
    slug: "cum-devii-distribuitor-snep",
    title: "Cum devii distribuitor Snep in Romania: ghid pas cu pas",
    excerpt:
      "Ce inseamna concret sa fii distribuitor Snep, cum arata inscrierea, cum functioneaza comisioanele, ce ai voie si ce nu ai voie sa faci — explicat fara promisiuni de venit.",
    tags: ["distribuitor snep", "snep romania", "vanzare directa", "afacere proprie"],
    meta_title: "Cum devii distribuitor Snep in Romania | Olivox",
    meta_description:
      "Pasii reali pentru a deveni distribuitor Snep: inscriere, catalog, comisioane, reguli de vanzare. Ce presupune activitatea si cui nu i se potriveste.",
    daysBack: 7,
    body: `
<p>Daca ai ajuns aici, probabil ai vazut produse Snep la cineva cunoscut si te intrebi cum functioneaza partea de
distributie. Acest ghid explica pasii reali, fara entuziasm artificial si fara cifre de castig — pentru ca
veniturile din aceasta activitate <strong>nu sunt garantate si depind direct de efortul fiecarei persoane</strong>.</p>

<h2>Ce inseamna, concret, sa fii distribuitor Snep</h2>
<p>Snep este un brand italian de suplimente alimentare, cosmetice si produse pentru casa, prezent in mai multe
tari europene. In Romania produsele ajung la clienti prin distribuitori independenti — nu prin lanturi de retail.</p>
<p>Ca distribuitor esti o <strong>persoana care desfasoara o activitate independenta</strong>: nu esti angajat al
Snep, nu ai salariu, nu ai program impus si nu ai garantia unui venit. Cumperi produse la pretul de distribuitor
si le vinzi mai departe, iar in functie de volum si de structura pe care o construiesti poti primi comisioane.</p>

<h2>Pasul 1: intelege ce vinzi</h2>
<p>Inainte de orice discutie despre comisioane, uita-te la catalog. Este mai larg decat cred majoritatea:</p>
<ul>
  <li><a href="/produse/suplimente">Suplimente alimentare</a> — de la <a href="/produse/nevoi-specifice/olivox-2x60-capsule">Olivox</a> la <a href="/produse/linia-real">linia Real</a>.</li>
  <li><a href="/produse/fata">Cosmetice pentru fata</a>, <a href="/produse/corp">corp</a> si <a href="/produse/par">par</a>.</li>
  <li><a href="/produse/cafea">Cafea functionala cu ganoderma</a> si <a href="/produse/alimente">alimente functionale</a>.</li>
  <li><a href="/produse/controlul-greutatii">Produse pentru controlul greutatii</a> si <a href="/produse/programe">programe structurate</a>.</li>
  <li><a href="/produse/hydropura">Sisteme de filtrare a apei HydroPura</a> si <a href="/produse/bio-effective">solutii BioEffective pentru casa</a>.</li>
  <li><a href="/produse/sport">Linia sport</a> si <a href="/produse/uleiuri-esentiale">uleiuri esentiale</a>.</li>
</ul>
<p>Daca produsele nu ti se par credibile tie, nu le vei putea recomanda onest nimanui. Comanda intai ceva pentru
tine si foloseste macar o luna. Citeste si <a href="/de-ce-snep">de ce am ales Snep</a>.</p>

<h2>Pasul 2: inscrierea</h2>
<p>Inscrierea se face <strong>prin recomandarea unui distribuitor deja activ</strong>, care devine sponsorul tau.
Practic:</p>
<ol>
  <li>Discuti cu un distribuitor autorizat despre cum functioneaza si ce presupune.</li>
  <li>Completezi formularul de inscriere cu datele tale si accepti conditiile contractuale.</li>
  <li>Primesti cont in platforma proprie Snep, de unde comanzi produse la pretul de distribuitor si iti vezi
  activitatea.</li>
  <li>De regula se incepe cu un pachet initial de produse, ca sa ai ce arata si ce folosi.</li>
</ol>
<p>Nu exista un examen si nu ai nevoie de studii de specialitate. Ai nevoie insa sa citesti contractul — inclusiv
partea de reguli de promovare, care este mai stricta decat cred majoritatea.</p>

<h2>Pasul 3: cum se formeaza venitul</h2>
<p>Sunt doua componente:</p>
<ul>
  <li><strong>Adaosul din vanzarea directa</strong> — diferenta dintre pretul de distribuitor si pretul de
  vanzare catre client.</li>
  <li><strong>Comisioanele</strong> — procente variabile calculate pe volumul propriu si, daca alegi sa construiesti
  o echipa, pe volumul structurii tale.</li>
</ul>
<p>Procentele si pragurile sunt stabilite de compania Snep prin planul de compensare si se pot modifica in timp.
Ce este important de retinut: <strong>nu exista un venit garantat, minim sau tipic</strong>. Doua persoane inscrise
in aceeasi zi pot avea rezultate complet diferite, pentru ca rezultatul depinde de timpul investit, de reteaua de
relatii, de constanta si de capacitatea de a invata.</p>

<h2>Pasul 4: reguli de promovare — partea pe care o sar multi</h2>
<p>Contractul de distribuitor Snep <strong>interzice vanzarea pe marketplace-uri</strong>. Concret:</p>
<ul>
  <li><strong>Nu ai voie</strong>: eMAG, OLX, Amazon, Bol.ro sau alte platforme de tip marketplace.</li>
  <li><strong>Ai voie</strong>: site propriu, retele sociale (Facebook, Instagram, TikTok), WhatsApp Business,
  telefon, intalniri directe.</li>
</ul>
<p>Motivul este protejarea pretului si a imaginii de brand. Incalcarea acestei reguli poate duce la incetarea
colaborarii, asa ca nu merita testata.</p>
<p>La fel de important: cand vorbesti despre suplimente, <strong>nu ai voie sa faci afirmatii medicale</strong> —
nu spui ca un produs trateaza, vindeca sau previne o boala. Formularile corecte sunt de tipul "poate sustine",
"contribuie la". Aceasta nu este doar o regula interna, ci legislatie europeana privind suplimentele alimentare.</p>

<h2>De ce ai nevoie realist ca sa iti mearga</h2>
<ul>
  <li><strong>Timp constant</strong>, nu sporadic. Cateva ore pe saptamana, sustinut, bat un weekend de entuziasm.</li>
  <li><strong>Un capital mic pentru stoc</strong> — clientii cumpara mai usor cand pot vedea si incerca produsul.</li>
  <li><strong>Disponibilitate de a invata</strong> — compozitii, contraindicatii, cui i se potriveste fiecare produs.</li>
  <li><strong>Onestitate</strong>. Un client caruia i-ai promis prea mult nu revine si, mai rau, spune altora.</li>
</ul>

<h2>Cui NU i se potriveste</h2>
<ul>
  <li>Celor care cauta venit rapid si garantat — nu este cazul aici.</li>
  <li>Celor care nu vor sa vorbeasca cu oameni; activitatea este in esenta relationala.</li>
  <li>Celor care nu au rabdare sa invete produsele si limitele legale ale comunicarii despre ele.</li>
  <li>Celor care vor sa listeze produsele pe eMAG sau OLX — contractual nu se poate.</li>
</ul>

<h2>Intrebari frecvente</h2>
<h3>Trebuie sa imi fac firma?</h3>
<p>Depinde de volumul activitatii si de forma pe care o alegi. Pentru situatia ta concreta, discuta cu un contabil —
regimul fiscal al veniturilor din activitati independente in Romania depinde de mai multi factori.</p>

<h3>Este obligatoriu sa construiesc o echipa?</h3>
<p>Nu. Poti ramane pe vanzare directa catre clienti proprii, fara sa recrutezi pe nimeni.</p>

<h3>Exista un target lunar obligatoriu?</h3>
<p>Conditiile de mentinere a statutului si pragurile de comision sunt cele din planul de compensare in vigoare.
Cere-le in scris inainte sa te inscrii si citeste-le pe indelete.</p>

<h3>Pot vinde si online?</h3>
<p>Da, pe site propriu si pe retelele sociale. Nu pe marketplace-uri. Site-ul acesta este un exemplu de canal
permis.</p>

<h3>Cat costa inscrierea?</h3>
<p>Costul pachetului initial variaza in timp, in functie de promotiile companiei. Cere lista actualizata inainte
sa iei o decizie si nu te grabi.</p>

<h2>Urmatorul pas</h2>
<p>Daca vrei o discutie onesta despre ce presupune, fara presiune, scrie-ne pe
<a href="https://wa.me/40779243541" rel="nofollow">WhatsApp</a> sau suna la
<a href="tel:0779243541">0779 243 541</a>. Iti spunem si partile mai putin comode, nu doar cele frumoase.
Poti vedea intre timp <a href="/produse/promotii-si-kit-uri">kiturile disponibile</a> si
<a href="/brand/snep">informatiile despre brandul Snep</a>.</p>

<p class="art-disclaimer"><strong>Mentiune importanta.</strong> Activitatea de distribuitor Snep este o activitate
independenta. Veniturile nu sunt garantate, nu sunt fixe si depind in mod direct de efortul individual, de timpul
investit si de rezultatele obtinute. Nimic din acest articol nu reprezinta o promisiune sau o estimare de castig.
Conditiile comerciale, planul de compensare si regulile contractuale sunt stabilite de compania Snep si se pot
modifica. Inainte de inscriere, citeste integral documentele contractuale.</p>
`,
  },
];

async function main() {
  const now = new Date();
  let inserted = 0;
  let updated = 0;

  for (const a of ARTICLES) {
    const published = new Date(now);
    published.setDate(published.getDate() - a.daysBack);

    const row = {
      slug: a.slug,
      title: a.title,
      excerpt: a.excerpt,
      body: a.body.trim(),
      tags: a.tags,
      meta_title: a.meta_title,
      meta_description: a.meta_description,
      published_at: published.toISOString(),
      is_published: true,
      author: "Redactia Olivox",
      updated_at: new Date().toISOString(),
    };

    const { data: existing } = await supabase
      .from("articles")
      .select("id")
      .eq("slug", a.slug)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase.from("articles").update(row).eq("slug", a.slug);
      if (error) {
        console.error(`  [UPDATE FAIL] ${a.slug}: ${error.message}`);
        continue;
      }
      updated++;
      console.log(`  [UPDATED] ${a.slug} (${a.body.length} chars)`);
    } else {
      const { error } = await supabase.from("articles").insert(row);
      if (error) {
        console.error(`  [INSERT FAIL] ${a.slug}: ${error.message}`);
        continue;
      }
      inserted++;
      console.log(`  [INSERTED] ${a.slug} (${a.body.length} chars)`);
    }
  }

  console.log(`\nDone. Inserted: ${inserted}, Updated: ${updated}, Total: ${ARTICLES.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
