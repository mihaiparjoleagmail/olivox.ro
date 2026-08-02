import type { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// Pillar page for the brand keyword "olivox". Prices come from the DB so the
// comparison table and the Offer schema never drift from the catalog.
export const revalidate = 900;

const URL = "https://olivox.ro/olivox-supliment-antioxidant";
const TITLE = "Olivox: ce este, beneficii, mod de utilizare si preturi";
const DESCRIPTION =
  "Ghid complet Olivox Snep: compozitie (oleuropeina din frunze de maslin, anghinare, tamarind), diferenta dintre capsule si sticle, mod de utilizare, preturi.";

const VARIANT_SLUGS = [
  "olivox-2x60-capsule",
  "olivox-40-2-sticle-de-1-litru",
  "olivox-6-sticle-de-1-litru",
  "olivograve",
];

interface Variant {
  name: string;
  slug: string;
  price: number | null;
  currency: string | null;
  quantity: string | null;
  sku: string | null;
  stock_status: string | null;
  r2_image_url: string | null;
  image_url: string | null;
  category_slugs: string[] | null;
}

async function getVariants(): Promise<Variant[]> {
  const { data } = await supabase
    .from("products")
    .select("name, slug, price, currency, quantity, sku, stock_status, r2_image_url, image_url, category_slugs")
    .in("slug", VARIANT_SLUGS);
  const rows = (data as Variant[]) || [];
  // Keep the editorial order from VARIANT_SLUGS, not the DB order.
  return VARIANT_SLUGS.map((s) => rows.find((r) => r.slug === s)).filter(Boolean) as Variant[];
}

function hrefFor(v: Variant): string {
  const cat = v.category_slugs?.[0] || "nevoi-specifice";
  return `/produse/${cat}/${v.slug}`;
}

const FAQ: { q: string; a: string }[] = [
  {
    q: "Ce este Olivox, mai exact?",
    a: "Olivox este un supliment alimentar din catalogul Snep, construit in jurul extractului titrat de frunze de maslin (Olea europaea), la care se adauga anghinare si tamarind. Nu este medicament si nu inlocuieste o dieta variata si echilibrata.",
  },
  {
    q: "Care este diferenta dintre Olivox capsule si Olivox la sticla?",
    a: "Capsulele aduc 350 mg extract de maslin titrat 40%, adica 140 mg oleuropeina pe zi, la doua capsule. Varianta lichida clasica aduce 350 mg extract titrat 15% la 40 ml, adica 52,5 mg oleuropeina. Capsulele sunt mai concentrate pe oleuropeina; varianta lichida se absoarbe mai usor si e mai comoda pentru cine nu inghite capsule.",
  },
  {
    q: "Olivox 40 este acelasi produs, doar mai puternic?",
    a: "Nu. Olivox 40 este o formula diferita: pe langa extractul de maslin contine si curcuma si rozmarin, in forma hidroglicerica. Nu este pur si simplu o versiune concentrata a Olivox clasic.",
  },
  {
    q: "Cat costa Olivox?",
    a: "Preturile difera in functie de varianta si de gramaj. Le gasesti actualizate in tabelul comparativ de mai sus si pe fiecare pagina de produs; nu publicam preturi vechi in text tocmai ca sa nu induca in eroare.",
  },
  {
    q: "Cum se administreaza Olivox?",
    a: "Capsule: 2 capsule pe zi, inghitite cu multa apa. Varianta lichida clasica: 20 ml diluati in aproximativ 150 ml apa, de doua ori pe zi. Olivox 40: 50 ml de doua ori pe zi. Nu depasi doza recomandata pe eticheta.",
  },
  {
    q: "Cine nu ar trebui sa ia Olivox?",
    a: "Copiii sub 3 ani, persoanele cu hipersensibilitate la unul dintre ingrediente si oricine urmeaza tratament pentru tensiune arteriala, glicemie sau afectiuni biliare fara sa fi discutat cu medicul. Femeile insarcinate sau care alapteaza ar trebui sa ceara acordul medicului.",
  },
  {
    q: "Se poate lua Olivox impreuna cu Burner sau RealComplex?",
    a: "Sunt produse din categorii diferite si multi clienti le folosesc in aceeasi perioada. Nu exista insa o combinatie universal valabila: daca iei tratament medicamentos sau ai o afectiune cronica, intreaba medicul inainte sa suprapui mai multe suplimente.",
  },
  {
    q: "Ce inseamna «nichel tested» de pe ambalaj?",
    a: "Este un test de lot care verifica prezenta nichelului sub un prag stabilit. Conteaza pentru persoanele cu sensibilitate la nichel, care reactioneaza la cantitati mici din alimente si suplimente.",
  },
  {
    q: "In cat timp ajunge comanda?",
    a: "Livrarea se face prin curier in 3-5 zile lucratoare in toata Romania, de la confirmarea comenzii.",
  },
  {
    q: "De ce nu gasesc Olivox pe eMAG sau OLX?",
    a: "Contractul de distribuitor Snep interzice vanzarea pe marketplace-uri. Produsele se comanda de pe site-ul distribuitorului, telefonic sau pe WhatsApp.",
  },
];

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords:
    "olivox, olivox snep, snep olivox, olivox romania, olivox pret, olivox 40, olivox capsule, olivox beneficii, supliment antioxidant, oleuropeina, extract frunze maslin",
  alternates: { canonical: URL },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: URL,
    siteName: "olivox.ro",
    type: "article",
    locale: "ro_RO",
    images: [
      {
        url: "https://media.ghidulfunerar.ro/olivox/products/olivox-2x60-capsulenbsp.jpg",
        alt: "Olivox — supliment alimentar Snep pe baza de extract de frunze de maslin",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["https://media.ghidulfunerar.ro/olivox/products/olivox-2x60-capsulenbsp.jpg"],
  },
};

export default async function OlivoxPillarPage() {
  const variants = await getVariants();

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Olivox — ghid complet: ce este, compozitie, beneficii si mod de utilizare",
    description: DESCRIPTION,
    image: "https://media.ghidulfunerar.ro/olivox/products/olivox-2x60-capsulenbsp.jpg",
    author: { "@type": "Organization", name: "Olivox", url: "https://olivox.ro" },
    publisher: {
      "@type": "Organization",
      name: "olivox.ro",
      logo: { "@type": "ImageObject", url: "https://olivox.ro/favicon.ico" },
    },
    mainEntityOfPage: URL,
    inLanguage: "ro-RO",
    about: { "@type": "Thing", name: "Olivox — supliment alimentar Snep" },
  };

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Variantele Olivox disponibile",
    numberOfItems: variants.length,
    itemListElement: variants.map((v, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Product",
        name: v.name,
        url: `https://olivox.ro${hrefFor(v)}`,
        image: v.r2_image_url || v.image_url || undefined,
        sku: v.sku || undefined,
        brand: { "@type": "Brand", name: "Snep" },
        category: "Supliment alimentar",
        offers: v.price != null ? {
          "@type": "Offer",
          url: `https://olivox.ro${hrefFor(v)}`,
          price: Number(v.price).toFixed(2),
          priceCurrency: v.currency || "RON",
          availability: v.stock_status !== "out_of_stock"
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
          seller: { "@type": "Organization", name: "olivox.ro" },
        } : undefined,
      },
    })),
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Acasa", item: "https://olivox.ro" },
      { "@type": "ListItem", position: 2, name: "Olivox — ghid complet", item: URL },
    ],
  };

  return (
    <div className="page-wrapper">
      <Header />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <nav className="breadcrumb" style={{ padding: "0 16px" }}>
        <a href="/">Acasa</a> / <span>Olivox — ghid complet</span>
      </nav>

      <header className="guide-hero">
        <div className="eyebrow">Ghid complet</div>
        <h1 className="guide-hero__h1">Olivox: ce este, ce contine si cum se foloseste</h1>
        <p className="guide-hero__intro">
          Olivox este produsul dupa care se numeste acest site. Este un supliment alimentar din catalogul Snep,
          construit in jurul unui singur ingredient-vedeta: extractul titrat din frunze de maslin, bogat in
          oleuropeina. Ghidul de mai jos acopera compozitia exacta, diferentele dintre variante, modul de
          administrare de pe eticheta si — la fel de important — situatiile in care nu ti se potriveste.
        </p>
      </header>

      <div className="prose">
        <h2>Ce este Olivox</h2>
        <p>
          <strong>Olivox este un supliment alimentar</strong> pe baza de extracte titrate din trei plante:
          frunze de maslin, anghinare si tamarind. Face parte din catalogul Snep, brand italian de suplimente
          si cosmetice, si se incadreaza in categoria produselor cu actiune antioxidanta si de sustinere a
          proceselor naturale de purificare.
        </p>
        <p>
          Nu este medicament. Nu trateaza, nu previne si nu vindeca vreo boala, iar orice text care sustine
          contrariul incalca legislatia europeana privind suplimentele alimentare. Ce poate face un supliment
          bine formulat este sa <em>contribuie</em> la functii fiziologice normale — si asta e exact ce vom
          descrie mai jos, cu cifrele de pe eticheta.
        </p>

        <h2>Compozitia, in cifre</h2>
        <p>
          Pentru varianta in capsule, doza zilnica recomandata este de 2 capsule si aduce:
        </p>
        <ul>
          <li>
            <strong>Extract uscat de frunze de maslin</strong> (Olea europaea L.), titrat 40% in oleuropeina —
            350 mg, din care <strong>140 mg oleuropeina</strong>
          </li>
          <li>
            <strong>Extract uscat de anghinare</strong> (Cynara scolymus L.), titrat 2,5% in acid clorogenic —
            286 mg, din care 7,15 mg acid clorogenic
          </li>
          <li>
            <strong>Extract uscat de tamarind</strong> (Tamarindus indica L.) — 200 mg
          </li>
        </ul>
        <p>
          Restul formulei: hidroxipropilmetilceluloza (capsula vegetala) si agenti antiaglomeranti — dioxid de
          siliciu si saruri de magneziu ale acizilor grasi. O capsula are 530 mg, cutia are 60 de capsule.
        </p>

        <h3>Ce inseamna „titrat 40% in oleuropeina”</h3>
        <p>
          Este cel mai important cuvant de pe eticheta si aproape nimeni nu il explica. Un extract{" "}
          <strong>titrat</strong> garanteaza o cantitate exacta de principiu activ in fiecare doza. Un extract
          netitrat poate varia de la lot la lot in functie de recolta, de partea plantei folosita si de metoda
          de extractie — iar diferenta poate fi de cateva ori, nu de cateva procente.
        </p>
        <p>
          Cand vezi „extract de frunze de maslin 350 mg” fara procent, nu stii nimic despre cat activ primesti.
          Cand vezi „350 mg titrat 40% in oleuropeina”, stii ca primesti 140 mg de oleuropeina. Este criteriul
          numarul unu din <a href="/ghid/cum-alegi-supliment">ghidul despre cum alegi un supliment</a>.
        </p>

        <h2>Oleuropeina: de ce frunza de maslin, nu fructul</h2>
        <p>
          Uleiul de masline este celebru. Frunza, mult mai putin — desi ea concentreaza cel mai bine
          polifenolii caracteristici speciei. <strong>Oleuropeina</strong> este polifenolul dominant din frunza
          de maslin si compusul care da gustul amar caracteristic maslinelor necurate.
        </p>
        <p>
          In traditia mediteraneana, infuzia din frunze de maslin este folosita de secole. Interesul modern
          pentru oleuropeina vine din cercetarea asupra polifenolilor in general: compusi vegetali cu rol
          antioxidant, adica de protectie a celulelor impotriva stresului oxidativ.
        </p>
        <p>
          Ca sa fim corecti si aici: cercetarea pe oleuropeina este promitatoare, dar cea mai mare parte a
          studiilor sunt de laborator sau pe grupuri mici. Nu exista aprobari EFSA specifice pentru claim-uri
          de sanatate pe oleuropeina asa cum exista, de exemplu, pentru polifenolii din uleiul de masline.
          Cine iti prezinta oleuropeina ca pe o solutie miraculoasa iti vinde altceva decat informatie.
        </p>

        <h3>Frunza de maslin, pe scurt: de la infuzie la extract standardizat</h3>
        <p>
          Frunzele de maslin nu sunt o descoperire recenta. In bazinul mediteranean au fost folosite ca infuzie
          amara vreme de secole, iar arborele in sine este unul dintre cele mai longevive din regiune — ceea ce
          a hranit si o buna doza de simbolistica. Ce s-a schimbat in ultimele decenii nu este planta, ci{" "}
          <strong>felul in care o folosim</strong>.
        </p>
        <p>
          O infuzie de frunze de maslin iti da o cantitate necunoscuta de oleuropeina: depinde de cate frunze
          pui, cat de proaspete sunt, cat de fierbinte e apa si cat timp o lasi. Un extract titrat rezolva
          exact aceasta problema — iti da aceeasi cantitate, in fiecare zi, indiferent de recolta. Asta este
          intreaga diferenta dintre un remediu traditional si un supliment standardizat: nu efectul, ci
          <em>previzibilitatea dozei</em>.
        </p>

        <h3>Anghinarea si tamarindul: de ce sunt in formula</h3>
        <p>
          Nu sunt umplutura. Cele trei plante acopera zone complementare:
        </p>
        <ul>
          <li>
            <strong>Maslinul</strong> este asociat traditional cu metabolismul glucidelor si lipidelor, cu
            circulatia normala a sangelui, cu mentinerea tensiunii arteriale in limite normale si cu actiune
            antioxidanta.
          </li>
          <li>
            <strong>Anghinarea</strong> este asociata traditional cu functia digestiva si hepatica, cu
            eliminarea gazelor intestinale si cu procesele de purificare ale organismului. Cinarina, substanta
            amara din frunze, e responsabila de actiunea coleretica.
          </li>
          <li>
            <strong>Tamarindul</strong> este asociat traditional cu regularitatea tranzitului intestinal si cu
            volumul si consistenta normala a scaunului.
          </li>
        </ul>
        <p>
          Logica formulei: un antioxidant care sustine metabolismul, plus doua plante care sprijina caile prin
          care organismul elimina. Are sens ca ansamblu, nu ca lista de ingrediente puse la intamplare.
        </p>

        <h2>Variantele Olivox si care ti se potriveste</h2>
        <p>
          Aici se incurca cei mai multi. „Olivox” nu este un singur produs, ci o familie — iar Olivox 40 nu
          este versiunea concentrata a Olivox clasic, cum se crede frecvent. Este o <strong>formula
          diferita</strong>.
        </p>

        {variants.length > 0 && (
          <div className="olivox-table-wrap">
            <table className="olivox-table">
              <thead>
                <tr>
                  <th>Varianta</th>
                  <th>Gramaj</th>
                  <th>Pret</th>
                </tr>
              </thead>
              <tbody>
                {variants.map((v) => (
                  <tr key={v.slug}>
                    <td>
                      <a href={hrefFor(v)}>{v.name}</a>
                    </td>
                    <td>{v.quantity || "—"}</td>
                    <td>
                      {v.price != null ? `${Math.ceil(Number(v.price))} ${v.currency || "RON"}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <h3>Olivox capsule</h3>
        <p>
          Cea mai concentrata varianta pe oleuropeina din familia Olivox propriu-zisa: 140 mg pe zi, la 2
          capsule. Contine toate cele trei plante. Este alegerea logica daca vrei doza maxima de activ si nu ai
          probleme cu inghitit capsule.
        </p>

        <h3>Olivox la sticla (1 litru)</h3>
        <p>
          Aceeasi triada de plante, dar extractul de maslin e titrat 15%, deci 40 ml de produs aduc 350 mg
          extract din care 52,5 mg oleuropeina. Doza: 20 ml diluati in circa 150 ml apa, de doua ori pe zi.
          Mai putina oleuropeina decat capsulele, dar in forma lichida — mai comoda pentru cine nu suporta
          capsule si mai usor de dozat gradual.
        </p>

        <h3>Olivox 40</h3>
        <p>
          Formula distincta, hidroglicerica: extract de maslin plus <strong>curcuma</strong> si{" "}
          <strong>rozmarin</strong>. La doza zilnica maxima de 100 ml aduce 6 g frunze de maslin, 5 g rizom de
          curcuma si 5 g frunze de rozmarin, ca echivalent planta. Recomandarea de utilizare este de 50 ml de
          doua ori pe zi. Alege-l daca te intereseaza combinatia maslin + curcuma, nu doar oleuropeina.
        </p>

        <h3>Olivò — varianta „doar maslin”</h3>
        <p>
          Daca vrei exclusiv oleuropeina, fara anghinare si tamarind, <a href="/produse/nevoi-specifice/olivograve">Olivò</a>{" "}
          aduce 800 mg extract titrat 40% la 2 capsule, adica <strong>320 mg oleuropeina pe zi</strong> — mai
          mult decat dublul Olivox clasic. Este cea mai concentrata optiune pe acest polifenol din tot catalogul.
        </p>

        <h2>Rudele din catalog: familia „oli-”</h2>
        <p>
          Snep are o linie intreaga construita pe extractul de maslin, fiecare produs cu o a doua planta care
          ii da directia:
        </p>
        <ul>
          <li>
            <a href="/produse/nevoi-specifice/olimind-1-lt">OliMind</a> — maslin + curcuma + bacopa
          </li>
          <li>
            <a href="/produse/nevoi-specifice/oliprox">OliProx</a> — maslin + curcuma + epilobium + dovleac
          </li>
          <li>
            <a href="/produse/nevoi-specifice/olivessel-pro">Olivessel Pro</a> — maslin + curcuma + Solanred®
            (vanata rosie) + cartof dulce + vitamina E
          </li>
        </ul>
        <p>
          Toate pornesc de la aceeasi baza de maslin. Daca ai ajuns aici cautand „olivox” dar problema ta e
          alta, poate una dintre ele ti se potriveste mai bine. Vezi toata categoria{" "}
          <a href="/produse/nevoi-specifice">Nevoi specifice</a>.
        </p>

        <h2>Mod de utilizare</h2>
        <ul>
          <li><strong>Capsule:</strong> 2 capsule pe zi, inghitite cu multa apa.</li>
          <li><strong>Sticla clasica:</strong> 20 ml diluati in aproximativ 150 ml apa, de doua ori pe zi.</li>
          <li><strong>Olivox 40:</strong> 50 ml de doua ori pe zi.</li>
        </ul>
        <p>
          In toate cazurile: produsul se pastreaza in loc racoros si uscat, departe de surse de caldura, si nu
          se depaseste doza zilnica recomandata. Variantele lichide se agita bine inainte de utilizare.
        </p>
        <p>
          Nu iti recomandam doze diferite de cele de pe eticheta. Daca ai nevoie de o schema personalizata,
          aceea este discutie cu medicul, nu cu un distribuitor.
        </p>

        <h2>Cui i se adreseaza</h2>
        <ul>
          <li>Adultilor care vor un aport de polifenoli dintr-o sursa vegetala standardizata.</li>
          <li>Celor care isi construiesc o rutina de sustinere a digestiei si a proceselor de eliminare.</li>
          <li>Celor care prefera extracte titrate, cu cantitate de activ declarata pe ambalaj.</li>
          <li>Celor care cauta o alternativa la infuzia de frunze de maslin, cu doza constanta.</li>
        </ul>

        <h2>Cui NU i se adreseaza</h2>
        <p>Sectiunea pe care o sar majoritatea site-urilor. Nu ar trebui.</p>
        <ul>
          <li>Copiilor sub 3 ani.</li>
          <li>Persoanelor cu hipersensibilitate cunoscuta la unul dintre ingrediente.</li>
          <li>
            Persoanelor care urmeaza tratament pentru <strong>tensiune arteriala</strong> sau{" "}
            <strong>glicemie</strong>, fara acordul medicului — maslinul este asociat traditional cu ambele
            functii, iar suprapunerea nu e anodina.
          </li>
          <li>
            Persoanelor cu afectiuni biliare — anghinarea stimuleaza secretia de bila si poate fi
            contraindicata in obstructie biliara.
          </li>
          <li>Femeilor insarcinate sau care alapteaza, fara consult medical prealabil.</li>
          <li>
            Celor care se asteapta la efecte spectaculoase intr-o saptamana. Un supliment lucreaza in
            completarea unei diete, nu in locul ei.
          </li>
        </ul>

        <h2>Olivox fata de alte surse de polifenoli</h2>
        <p>
          Intrebarea corecta nu este „care e cel mai bun antioxidant”, ci „ce rol are fiecare”. Cateva repere
          utile:
        </p>
        <ul>
          <li>
            <strong>Uleiul de masline extravirgin</strong> aduce hidroxitirosol si tirosol, nu oleuropeina in
            cantitati notabile. Este sursa alimentara de baza si nu se inlocuieste cu un supliment — se
            completeaza.
          </li>
          <li>
            <strong>Ceaiul verde</strong> aduce catehine, in special EGCG. Alt profil de polifenoli, alta
            directie.
          </li>
          <li>
            <strong>Resveratrolul</strong> din struguri si vin rosu este cel mai mediatizat, dar si cel cu cea
            mai discutata biodisponibilitate.
          </li>
          <li>
            <strong>Vitamina C si vitamina E</strong> sunt antioxidanti cu claim-uri EFSA aprobate explicit
            pentru protectia celulelor impotriva stresului oxidativ — spre deosebire de majoritatea
            extractelor vegetale.
          </li>
        </ul>
        <p>
          Cu alte cuvinte: polifenolii din frunza de maslin nu concureaza cu vitamina C, ci acopera alt
          teritoriu. O rutina echilibrata nu se construieste din „cel mai puternic” produs, ci din surse
          diferite si constanta in timp.
        </p>

        <h3>Si fata de ceilalti antioxidanti din catalogul Snep</h3>
        <p>
          Daca te uiti in catalog dupa alte produse cu profil antioxidant, gasesti:
        </p>
        <ul>
          <li>
            <a href="/produse/pur/vitamina-c">Vitamina C</a> — antioxidantul cu claim aprobat, util si pentru
            absorbtia fierului.
          </li>
          <li>
            <a href="/produse/pur/quercetina-max">Quercetina Max</a> — flavonoid din alta familie decat
            oleuropeina.
          </li>
          <li>
            <a href="/produse/nevoi-specifice/q10-snep-200">Q10</a> — coenzima implicata in productia de
            energie celulara.
          </li>
          <li>
            <a href="/produse/pur/reishi-90-capsule">Reishi</a> si restul liniei de ciuperci din{" "}
            <a href="/produse/pur">categoria Pur</a>.
          </li>
        </ul>
        <p>
          Ce le deosebeste de Olivox: niciunul nu are componenta digestiva si de eliminare pe care o dau
          anghinarea si tamarindul. Daca te intereseaza strict partea antioxidanta, ai variante mai simple si
          mai ieftine. Daca te intereseaza ansamblul, formula Olivox are logica ei.
        </p>

        <h2>Cat timp se ia si in ce ritm</h2>
        <p>
          Nu exista o schema universala si nici nu iti vom inventa una. Cateva principii rezonabile:
        </p>
        <ul>
          <li>
            Un supliment cu extracte vegetale nu se evalueaza in trei zile. Perioada uzuala de observatie este
            de cateva saptamani, in care mentii aceeasi doza si aceeasi rutina.
          </li>
          <li>
            Daca folosesti produsul pe perioade lungi, este rezonabil sa faci pauze si sa discuti cu medicul —
            cu atat mai mult daca faci analize periodice.
          </li>
          <li>
            Nu incepe mai multe produse noi in aceeasi zi. Daca apare ceva neasteptat, nu vei sti de la care e.
          </li>
        </ul>

        <h2>Greseli frecvente</h2>
        <ul>
          <li>
            <strong>Compararea preturilor fara sa compari dozele.</strong> Un produs mai ieftin per cutie poate
            fi mai scump per miligram de activ. Uita-te la cantitatea de oleuropeina pe zi, nu la pretul de pe
            raft.
          </li>
          <li>
            <strong>Confuzia Olivox / Olivox 40.</strong> Sunt formule diferite, nu concentratii diferite ale
            aceluiasi produs.
          </li>
          <li>
            <strong>Asteptarea unui efect de medicament.</strong> Un supliment sustine functii normale. Daca ai
            o problema medicala, ea se rezolva la medic, nu in cosul de cumparaturi.
          </li>
          <li>
            <strong>Suprapunerea necontrolata.</strong> Trei produse cu aceleasi plante luate simultan nu
            inseamna de trei ori mai bine, ci doar depasirea dozelor recomandate.
          </li>
          <li>
            <strong>Ignorarea sectiunii de contraindicatii</strong> de pe eticheta. Este partea cea mai scurta
            si cea mai importanta.
          </li>
        </ul>

        <h2>Ce inseamna testele de pe ambalaj</h2>
        <p>
          Pe fisele Olivox apar coduri de tip „nichel test”. Este o verificare pe lot care confirma ca nivelul
          de nichel se afla sub un prag stabilit. Nu e un detaliu de marketing: persoanele cu sensibilitate la
          nichel reactioneaza la cantitati mici prezente in alimente si suplimente, iar testarea pe lot este
          exact genul de transparenta pe care merita sa o ceri de la orice producator.
        </p>

        <h2>„Supliment alimentar” — ce inseamna, din punct de vedere legal</h2>
        <p>
          Este o categorie definita, nu o eticheta comerciala. In Uniunea Europeana, suplimentele alimentare
          sunt reglementate prin <strong>Directiva 2002/46/CE</strong>, transpusa in legislatia romaneasca,
          iar in Romania notificarea produselor se face inainte de punerea pe piata. Cateva consecinte
          practice pentru tine, ca cititor:
        </p>
        <ul>
          <li>
            Un supliment <strong>nu poate</strong> revendica legal ca trateaza, previne sau vindeca o boala.
            Daca un site iti spune altceva, iti spune ceva ilegal.
          </li>
          <li>
            Claim-urile de sanatate permise sunt cele autorizate la nivel european, formulate ca „contribuie
            la”, „ajuta la mentinerea”. Formularile de tip „poate sustine” pentru extractele vegetale reflecta
            folosinta traditionala, nu o aprobare formala.
          </li>
          <li>
            Eticheta trebuie sa contina doza zilnica recomandata, avertismentul ca produsul nu inlocuieste o
            dieta variata si echilibrata, si mentiunea de a nu se lasa la indemana copiilor.
          </li>
        </ul>
        <p>
          Verifica aceste elemente pe orice produs, nu doar pe Olivox. Absenta lor este semnal de alarma.
        </p>

        <h3>De ce conteaza de la cine cumperi</h3>
        <p>
          La produsele vandute prin distributie directa, sursa conteaza mai mult decat la retail clasic. Un
          distribuitor autorizat comanda din depozitul oficial, cu loturi trasabile si termen de valabilitate
          verificabil. Produsele aparute pe canale neautorizate pot fi stocuri vechi, provenite din alte piete
          sau depozitate necorespunzator — iar extractele vegetale sunt sensibile la caldura si umiditate.
        </p>
        <p>
          Cere intotdeauna factura si verifica termenul de valabilitate la primire. Sunt doua minute care
          rezolva majoritatea problemelor.
        </p>

        <h2>Cum se incadreaza intr-o rutina mai larga</h2>
        <p>
          Olivox apare frecvent alaturi de alte produse din catalog, in functie de obiectiv:
        </p>
        <ul>
          <li>
            <a href="/produse/linia-real/realcomplex">RealComplex</a> — papadie, mesteacan, anghinare si
            minerale. Detalii in <a href="/articole/realcomplex-snep-ghid">ghidul RealComplex</a>.
          </li>
          <li>
            <a href="/produse/nevoi-specifice/burner">Burner</a> — pentru echilibrul greutatii corporale.
            Detalii in <a href="/articole/burner-snep-ghid">ghidul Burner</a>.
          </li>
          <li>
            <a href="/produse/linia-real/realfibre">RealFibre</a> — fibre prebiotice pentru flora intestinala.
          </li>
          <li>
            <a href="/produse/programe/real-detox">Real Detox</a> — programul structurat care reuneste mai
            multe produse.
          </li>
        </ul>
        <p>
          Inainte sa pornesti orice program, citeste{" "}
          <a href="/articole/programe-detox-cand-ai-nevoie">cand are sens un program detox si cand nu are</a>.
        </p>

        <h2>Cum comanzi</h2>
        <p>
          Comanda se plaseaza direct de pe pagina produsului, telefonic sau pe WhatsApp. Livrarea se face prin
          curier in <strong>3-5 zile lucratoare</strong> in toata Romania, cu factura fiscala. Detalii complete
          in <a href="/livrare-si-retur">pagina de livrare si retur</a>, unde gasesti si dreptul legal de
          retur in 14 zile.
        </p>
        <p>
          Nu gasesti Olivox pe eMAG, OLX sau alte marketplace-uri: contractul de distribuitor Snep interzice
          explicit vanzarea acolo. Daca vezi produsul listat pe astfel de platforme, nu vine de la un
          distribuitor autorizat. Mai multe despre brand pe pagina <a href="/brand/snep">Snep</a> si despre
          motivele alegerii noastre pe <a href="/de-ce-snep">De ce Snep</a>.
        </p>

        <p className="art-cta">
          Nu esti sigur ce varianta ti se potriveste? Scrie-ne pe{" "}
          <a href="https://wa.me/40779243541" rel="nofollow">WhatsApp</a> sau suna la{" "}
          <a href="tel:0779243541">0779 243 541</a>. Iti raspunde un distribuitor autorizat Snep, fara
          obligatia de a comanda.
        </p>

        <p className="art-disclaimer">
          <strong>Disclaimer.</strong> Acest ghid are caracter informativ si nu inlocuieste consultul medical.
          Suplimentele alimentare nu sunt medicamente si nu sunt destinate tratarii, prevenirii sau vindecarii
          vreunei boli. Un supliment alimentar nu inlocuieste o dieta variata si echilibrata si un stil de viata
          sanatos. Nu depasi doza recomandata pe eticheta. A nu se lasa la indemana copiilor sub 3 ani.
          Consulta medicul inainte de utilizare, in special daca urmezi un tratament medicamentos, esti
          insarcinata sau alaptezi.
        </p>
      </div>

      <section className="guide-faq">
        <div className="eyebrow">Intrebari frecvente</div>
        <h2 className="guide-faq__title">Intrebari despre Olivox</h2>
        {FAQ.map((f, i) => (
          <div key={i} className="guide-faq__item">
            <h3 className="guide-faq__q">{f.q}</h3>
            <p className="guide-faq__a">{f.a}</p>
          </div>
        ))}
      </section>

      <aside className="guide-related">
        <p className="guide-related__label">Exploreaza mai departe</p>
        <div className="guide-related__cats">
          <a href="/produse/nevoi-specifice" className="guide-related__cat">Nevoi specifice</a>
          <a href="/produse/suplimente" className="guide-related__cat">Suplimente</a>
          <a href="/produse/linia-real" className="guide-related__cat">Linia Real</a>
          <a href="/produse/programe" className="guide-related__cat">Programe</a>
        </div>
        <ul className="guide-related__links">
          <li><a href="/kalosnep">KaloSnep: ghid complet</a></li>
          <li><a href="/ghid/suplimente-alimentare-naturale">Ghidul suplimentelor alimentare naturale</a></li>
          <li><a href="/ghid/cum-alegi-supliment">Cum alegi un supliment alimentar</a></li>
          <li><a href="/articole/realcomplex-snep-ghid">RealComplex Snep: ghid complet</a></li>
          <li><a href="/articole/burner-snep-ghid">Burner Snep: ghid complet</a></li>
        </ul>
      </aside>

      <section className="guide-cta">
        <h2 className="guide-cta__title">Vezi variantele Olivox</h2>
        <p className="guide-cta__sub">Livrare 3–5 zile in toata Romania · Factura fiscala · Suport in romana</p>
        <div className="guide-cta__btns">
          {variants.slice(0, 3).map((v, i) => (
            <a
              key={v.slug}
              href={hrefFor(v)}
              className={i === 0 ? "guide-cta__btn-primary" : "guide-cta__btn-outline"}
            >
              {v.name}
            </a>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}
