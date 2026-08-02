import type { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// Pillar page for "kalosnep" — 475 impressions/month at position 9.5 with only
// the capsule product page ranking. Prices come from the DB so the comparison
// table and the Offer schema never drift from the catalog.
export const revalidate = 900;

const URL = "https://olivox.ro/kalosnep";
const TITLE = "KaloSnep: compozitie, administrare, variante si pret";
const DESCRIPTION =
  "Ghid complet KaloSnep Snep: diferenta dintre plicuri, capsule si Kalogel, compozitia reala (curcuma, berberina, emblica), mod de administrare si contraindicatii.";

const VARIANT_SLUGS = ["kalosnep", "kalosnep-capsule", "kalogel", "kalogel-plicuri", "kit-kalo-sprint"];

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

// Editorial notes that do not live in the catalog. `zile` = how long one pack
// lasts at the label dose, used to compute the cost-per-day table.
const VARIANT_NOTES: Record<string, { forma: string; doza: string; zile?: [number, number] }> = {
  "kalosnep": { forma: "34 pliculete de 12 ml, lichid", doza: "1–2 plicuri pe zi", zile: [17, 34] },
  "kalosnep-capsule": { forma: "120 capsule de 545 mg", doza: "4 capsule pe zi", zile: [30, 30] },
  "kalogel": { forma: "390 g pudra, borcan", doza: "2 lingurite dozatoare (13 g) pe zi", zile: [15, 15] },
  "kalogel-plicuri": { forma: "30 plicuri de 13 g", doza: "2 plicuri pe zi", zile: [15, 15] },
  "kit-kalo-sprint": { forma: "kit — mai multe produse", doza: "conform pliantului inclus" },
};

function costPerDay(price: number, zile: [number, number]): string {
  const [min, max] = zile;
  const hi = price / min;
  const lo = price / max;
  const fmt = (n: number) => n.toFixed(1).replace(".", ",");
  return min === max ? `${fmt(hi)} RON` : `${fmt(lo)}–${fmt(hi)} RON`;
}

async function getVariants(): Promise<Variant[]> {
  const { data } = await supabase
    .from("products")
    .select("name, slug, price, currency, quantity, sku, stock_status, r2_image_url, image_url, category_slugs")
    .in("slug", VARIANT_SLUGS);
  const rows = (data as Variant[]) || [];
  return VARIANT_SLUGS.map((s) => rows.find((r) => r.slug === s)).filter(Boolean) as Variant[];
}

function hrefFor(v: Variant): string {
  const cat = v.category_slugs?.[0] || "nevoi-specifice";
  return `/produse/${cat}/${v.slug}`;
}

const FAQ: { q: string; a: string }[] = [
  {
    q: "Ce este KaloSnep?",
    a: "KaloSnep este un supliment alimentar din catalogul Snep, formulat pornind de la traditia ayurvedica si construit in jurul unui grup de extracte vegetale titrate: curcuma, berberis, emblica, cassia nomame si ghimbir, la care se adauga coenzima Q10 si piperina. Nu este medicament.",
  },
  {
    q: "Care este diferenta dintre KaloSnep plicuri si KaloSnep capsule?",
    a: "Cea mai importanta diferenta este cofeina: varianta la plic contine extract de guarana titrat 10% in cofeina, capsulele nu. Plicurile se iau cu 10-60 de minute inainte de masa, 1-2 pe zi; capsulele se iau 4 pe zi. Daca esti sensibil la cofeina sau le-ai lua seara, capsulele sunt varianta logica.",
  },
  {
    q: "Kalogel este acelasi produs cu KaloSnep?",
    a: "Nu. Kalogel are o formula complet diferita: ispagul (tegument de Plantago ovata), pulbere de zmeura, extract de griffonia titrat in 5-HTP, policosanoli si probioticul Bifidobacterium breve Bb-18. Nu contine curcuma sau berberina. Lucreaza pe volum si satietate, nu pe extracte metabolice.",
  },
  {
    q: "Cum se administreaza KaloSnep?",
    a: "Plicuri: continutul unui pliculet cu 10-60 de minute inainte de mesele principale, 1-2 plicuri pe zi. Capsule: 4 capsule pe zi, inghitite cu multa apa. Kalogel: o lingurita dozatoare de 13 g dizolvata in 250 ml apa, de doua ori pe zi, de preferat la mesele principale.",
  },
  {
    q: "Cat costa KaloSnep?",
    a: "Preturile difera in functie de varianta si de gramaj si le gasesti actualizate in tabelul comparativ de mai sus, precum si pe fiecare pagina de produs. Nu publicam preturi in text tocmai ca sa nu ramana vechi.",
  },
  {
    q: "Ce scrie in prospect la capitolul avertismente?",
    a: "Eticheta KaloSnep contine un avertisment important: produsul nu se recomanda in caz de afectare a functiei hepatice, a functiei biliare sau in cazul calculilor biliari, nu se utilizeaza in sarcina si alaptare si nu se foloseste pe perioade indelungate fara recomandarea medicului. Daca iei medicamente, se recomanda consultarea medicului.",
  },
  {
    q: "Contine gluten sau alergeni?",
    a: "Toate variantele sunt declarate fara gluten. KaloSnep plicuri contine lecitina de soia si cofeina din guarana. Kalogel poate contine urme de susan si mustar. Verifica intotdeauna eticheta lotului primit.",
  },
  {
    q: "Se poate lua impreuna cu Burner sau cu un program detox?",
    a: "Sunt produse din aceeasi zona, deci suprapunerea nu este automat o idee buna — mai multe produse cu extracte similare inseamna depasirea dozelor, nu efect dublu. Daca urmezi tratament medicamentos sau ai o afectiune cronica, intreaba medicul inainte sa combini.",
  },
  {
    q: "Cat timp se poate lua?",
    a: "Eticheta recomanda explicit sa nu fie folosit pe perioade indelungate fara recomandarea medicului, iar pentru dietele urmate peste 3 saptamani recomanda consultarea medicului. Nu este un produs de luat la nesfarsit, din obisnuinta.",
  },
  {
    q: "De ce nu gasesc KaloSnep in farmacie sau pe eMAG?",
    a: "Snep distribuie exclusiv prin distribuitori independenti, iar contractul interzice vanzarea pe marketplace-uri. Produsul se comanda de pe site-ul distribuitorului, telefonic sau pe WhatsApp, cu livrare in 3-5 zile lucratoare.",
  },
];

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords:
    "kalosnep, kalosnep capsule, kalosnep plicuri, kalosnep pret, kalosnep administrare, kalosnep beneficii, kalosnep prospect, kalogel, kalogel plicuri, snep kalosnep",
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
        url: "https://media.ghidulfunerar.ro/olivox/products/kalosnep-capsule.jpg",
        alt: "KaloSnep — supliment alimentar Snep",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["https://media.ghidulfunerar.ro/olivox/products/kalosnep-capsule.jpg"],
  },
};

export default async function KalosnepPillarPage() {
  const variants = await getVariants();

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "KaloSnep — ghid complet: variante, compozitie, administrare si contraindicatii",
    description: DESCRIPTION,
    image: "https://media.ghidulfunerar.ro/olivox/products/kalosnep-capsule.jpg",
    author: { "@type": "Organization", name: "Olivox", url: "https://olivox.ro" },
    publisher: {
      "@type": "Organization",
      name: "olivox.ro",
      logo: { "@type": "ImageObject", url: "https://olivox.ro/favicon.ico" },
    },
    mainEntityOfPage: URL,
    inLanguage: "ro-RO",
    about: { "@type": "Thing", name: "KaloSnep — supliment alimentar Snep" },
  };

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Variantele KaloSnep si Kalogel",
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
      { "@type": "ListItem", position: 2, name: "KaloSnep — ghid complet", item: URL },
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
        <a href="/">Acasa</a> / <span>KaloSnep — ghid complet</span>
      </nav>

      <header className="guide-hero">
        <div className="eyebrow">Ghid complet</div>
        <h1 className="guide-hero__h1">KaloSnep: variante, compozitie, administrare si pret</h1>
        <p className="guide-hero__intro">
          KaloSnep este unul dintre cele mai cautate produse Snep in Romania — si unul dintre cele mai prost
          intelese, pentru ca sub acelasi nume exista patru produse diferite. Ghidul de mai jos separa clar
          variantele, arata compozitia reala cu cifrele de pe eticheta si trece prin contraindicatii, care aici
          sunt mai serioase decat la un supliment obisnuit.
        </p>
      </header>

      <div className="prose">
        <h2>Nu exista „un" KaloSnep. Exista patru produse.</h2>
        <p>
          Aceasta este sursa a jumatate din confuzie. Sub umbrela KaloSnep / Kalo se afla:
        </p>
        <ul>
          <li><strong>KaloSnep</strong> — varianta la pliculete, lichida, cu guarana (deci cu cofeina)</li>
          <li><strong>KaloSnep Capsule</strong> — aceleasi extracte principale, <em>fara</em> guarana</li>
          <li><strong>Kalogel</strong> — formula complet diferita, pe baza de ispagul si griffonia, la borcan</li>
          <li><strong>Kalogel Plicuri</strong> — aceeasi formula ca Kalogel, dozata la plic</li>
        </ul>
        <p>
          Kalogel <strong>nu este</strong> versiunea gel a KaloSnep. Sunt produse cu ingrediente si logici
          diferite, care se intampla sa aiba nume asemanatoare. Daca ai citit undeva ca sunt acelasi lucru in
          alta forma, informatia e gresita.
        </p>

        {variants.length > 0 && (
          <div className="olivox-table-wrap">
            <table className="olivox-table">
              <thead>
                <tr>
                  <th>Produs</th>
                  <th>Forma</th>
                  <th>Doza zilnica</th>
                  <th>Pret</th>
                </tr>
              </thead>
              <tbody>
                {variants.map((v) => {
                  const note = VARIANT_NOTES[v.slug];
                  return (
                    <tr key={v.slug}>
                      <td><a href={hrefFor(v)}>{v.name}</a></td>
                      <td>{note?.forma || v.quantity || "—"}</td>
                      <td>{note?.doza || "—"}</td>
                      <td>
                        {v.price != null ? `${Math.ceil(Number(v.price))} ${v.currency || "RON"}` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <h3>Cat tine un pachet si cat costa pe zi</h3>
        <p>
          Compararea preturilor de pe raft nu spune nimic cand dozele difera. Mai jos e acelasi tabel, dar
          tradus in <strong>cost pe zi la doza de pe eticheta</strong> — singura comparatie corecta:
        </p>
        <div className="olivox-table-wrap">
          <table className="olivox-table">
            <thead>
              <tr>
                <th>Produs</th>
                <th>Tine</th>
                <th>Cost pe zi</th>
              </tr>
            </thead>
            <tbody>
              {variants
                .filter((v) => VARIANT_NOTES[v.slug]?.zile && v.price != null)
                .map((v) => {
                  const zile = VARIANT_NOTES[v.slug].zile as [number, number];
                  const [min, max] = zile;
                  return (
                    <tr key={v.slug}>
                      <td><a href={hrefFor(v)}>{v.name}</a></td>
                      <td>{min === max ? `${min} zile` : `${min}–${max} zile`}</td>
                      <td>{costPerDay(Number(v.price), zile)}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        <p>
          Ce se vede din tabel si nu se vede din pretul de pe eticheta:
        </p>
        <ul>
          <li>
            La KaloSnep, costul pe zi al plicurilor depinde de doza pe care o alegi. La un plic pe zi este
            comparabil cu al capsulelor; la doua plicuri pe zi, aproape se dubleaza.
          </li>
          <li>
            La Kalogel, borcanul de 390 g iese mai ieftin pe zi decat cutia de plicuri, la exact aceeasi
            formula. Plicurile se platesc pentru comoditate si portionare, nu pentru continut.
          </li>
          <li>
            Kalogel tine 15 zile, nu 30. Daca il compari mental cu o cutie de capsule „pe luna", compari
            gresit.
          </li>
        </ul>

        <h2>KaloSnep: ce contine, in cifre</h2>
        <p>
          Formula porneste din traditia ayurvedica si combina extracte titrate cu standardizare occidentala.
          Pentru <strong>varianta in capsule</strong>, la doza zilnica de 4 capsule:
        </p>
        <ul>
          <li>
            <strong>Curcuma</strong> (Curcuma longa, rizom), extract titrat 95% — 600 mg, din care{" "}
            <strong>570 mg curcuminoizi</strong>
          </li>
          <li>
            <strong>Berberis</strong> (Berberis aristata, radacina), extract titrat 97% — 300 mg, din care{" "}
            <strong>291 mg berberina</strong>
          </li>
          <li>
            <strong>Emblica</strong> (Phyllanthus emblica, fructe), extract titrat 30% in tanini — 200 mg
          </li>
          <li><strong>Cassia nomame</strong>, extract titrat 8% in flavonoide</li>
          <li><strong>Ghimbir</strong> (Zingiber officinale), extract titrat 5% in gingeroli</li>
          <li><strong>Piper negru</strong>, extract titrat 95% in piperina</li>
          <li><strong>Coenzima Q10</strong></li>
        </ul>
        <p>
          Restul: hidroxipropilmetilceluloza (capsula), unt de cacao si agenti antiaglomeranti. O capsula are
          545 mg, cutia are 120 de capsule — adica 30 de zile la doza recomandata.
        </p>

        <h3>Varianta la plic, pe scurt</h3>
        <p>
          Aceleasi extracte de baza, dar in suspensie lichida cu trigliceride cu lant mediu din nuca de cocos,
          plus doua diferente care conteaza:
        </p>
        <ul>
          <li>
            <strong>Guarana</strong> (Paullinia cupana), extract titrat 10% in cofeina — nu apare in capsule.
          </li>
          <li>
            <strong>Lecitina de soia</strong> ca emulsifiant si indulcitor pe baza de glicozide cu steviol.
          </li>
        </ul>
        <p>
          Cutia are 34 de pliculete de 12 ml. Prezenta cofeinei este motivul pentru care eticheta precizeaza ca
          nu este recomandat copiilor, in sarcina si in alaptare.
        </p>

        <h3>De ce piper negru intr-o formula cu curcuma</h3>
        <p>
          Nu e intamplare si nu e umplutura. Curcuminoizii au biodisponibilitate orala redusa — o buna parte
          din ce inghiti nu ajunge sa fie folosit. <strong>Piperina</strong>, compusul activ din piperul negru,
          este adaugata tocmai pentru ca imbunatateste absorbtia curcuminoizilor. Cand vezi curcuma fara
          piperina sau fara alta forma de crestere a biodisponibilitatii, formula e incompleta.
        </p>

        <h3>Ce inseamna „titrat 97% in berberina"</h3>
        <p>
          Inseamna ca din cele 300 mg de extract de Berberis, 291 mg sunt berberina propriu-zisa. Este o
          concentratie mare, iar berberina este un compus cu efecte reale si documentate — motiv pentru care
          sectiunea de contraindicatii de mai jos nu este formalitate. Mai multe despre cum se citeste o
          eticheta, in <a href="/ghid/cum-alegi-supliment">ghidul despre cum alegi un supliment</a>.
        </p>

        <h2>Ce fac ingredientele</h2>
        <p>
          Formularile de mai jos sunt cele permise pentru suplimente alimentare: descriu contributii la functii
          fiziologice normale sau folosinta traditionala, nu efecte terapeutice.
        </p>
        <ul>
          <li>
            <strong>Emblica</strong> (amla, in traditia ayurvedica) este un antioxidant asociat traditional cu
            metabolismul carbohidratilor, cu controlul aciditatii gastrice, cu activitatea hepatica si cu
            apararea naturala a organismului.
          </li>
          <li>
            <strong>Curcuma</strong> este asociata traditional cu functia digestiva si hepatica si cu
            articulatiile.
          </li>
          <li>
            <strong>Cassia nomame</strong> este asociata traditional cu metabolismul trigliceridelor si al
            colesterolului si cu echilibrul greutatii corporale — o gasesti si in{" "}
            <a href="/produse/nevoi-specifice/burner">Burner</a>, detaliat in{" "}
            <a href="/articole/burner-snep-ghid">ghidul Burner</a>.
          </li>
          <li>
            <strong>Ghimbirul</strong> este asociat traditional cu digestia si cu confortul gastric.
          </li>
          <li>
            <strong>Guarana</strong> (doar in varianta la plic) este un tonic natural, cu actiune de stimulare
            atribuita continutului de cofeina.
          </li>
        </ul>

        <h2>Kalogel: alta formula, alta logica</h2>
        <p>
          Kalogel lucreaza pe cu totul alt principiu. La doza zilnica maxima de 26 g (doua portii de 13 g)
          aduce:
        </p>
        <ul>
          <li>
            <strong>Ispagul</strong> (tegument de seminte de Plantago ovata, adica psyllium) — <strong>10 g</strong>
          </li>
          <li><strong>Pulbere de fructe de zmeura</strong> — 1 g</li>
          <li>
            <strong>Griffonia simplicifolia</strong>, extract titrat 20% — 500 mg, din care{" "}
            <strong>100 mg 5-hidroxitriptofan (5-HTP)</strong>
          </li>
          <li><strong>Policosanoli</strong> — 20 mg, din care 1 mg octacosanol</li>
          <li>
            <strong>Bifidobacterium breve Bb-18</strong> — 1×10⁹ UFC (unitati formatoare de colonii)
          </li>
          <li>Inulina ca agent de volum, cu rol prebiotic</li>
        </ul>
        <p>
          Ispagul este o fibra solubila care, in contact cu apa, formeaza un gel — de aici si numele produsului.
          Contribuie la senzatia de satietate si la modularea absorbtiei nutrientilor, iar prin inulina si
          probioticul Bb-18 sustine echilibrul florei intestinale. Griffonia este sursa naturala de 5-HTP,
          asociata traditional cu controlul senzatiei de foame.
        </p>
        <p>
          <strong>Foarte important:</strong> se dizolva in 250 ml de apa si se bea imediat. O fibra care
          formeaza gel are nevoie de lichid suficient; luata cu putina apa poate provoca disconfort.
        </p>

        <h3>Ce inseamna „1×10⁹ UFC" la probiotic</h3>
        <p>
          UFC inseamna <strong>unitati formatoare de colonii</strong> — numarul de bacterii vii capabile sa se
          multiplice, la momentul fabricatiei sau la termenul de valabilitate, in functie de cum declara
          producatorul. 1×10⁹ inseamna un miliard de UFC pe doza zilnica.
        </p>
        <p>
          Cifra singura nu spune totul. La probiotice conteaza si tulpina exacta, nu doar specia — de aceea
          eticheta scrie <em>Bifidobacterium breve <strong>Bb-18</strong></em>, cu identificatorul tulpinii, nu
          doar „bifidobacterium". O eticheta care declara doar genul si specia, fara tulpina si fara UFC, iti
          ascunde exact informatia care conteaza.
        </p>
        <p>
          De retinut si ca bacteriile vii sunt sensibile la caldura si umiditate. Depozitarea la temperatura
          camerei, in loc uscat, nu e o sugestie decorativa.
        </p>

        <h2>Mod de administrare</h2>
        <ul>
          <li>
            <strong>KaloSnep plicuri:</strong> continutul unui pliculet cu 10 pana la 60 de minute inainte de
            mesele principale. Doza recomandata: 1–2 plicuri pe zi.
          </li>
          <li>
            <strong>KaloSnep capsule:</strong> 4 capsule pe zi, inghitite cu multa apa.
          </li>
          <li>
            <strong>Kalogel / Kalogel plicuri:</strong> o lingurita dozatoare sau un plic (13 g) dizolvat in
            250 ml de apa, de doua ori pe zi, de preferat la mesele principale. Se agita inainte de consum.
          </li>
        </ul>
        <p>
          In toate cazurile: nu depasi doza zilnica recomandata si pastreaza produsul la loc racoros si uscat,
          departe de surse de caldura.
        </p>

        <h2>Contraindicatii — cititi aceasta sectiune</h2>
        <p>
          La majoritatea suplimentelor, sectiunea de avertismente este scurta si generica. La KaloSnep nu este,
          iar eticheta contine un <strong>avertisment important</strong> explicit. Nu il rezumam, il redam:
        </p>
        <ul>
          <li>
            <strong>Nu se recomanda in caz de afectare a functiei hepatice, a functiei biliare sau in cazul
            calculilor biliari.</strong>
          </li>
          <li><strong>Nu se utilizeaza in timpul sarcinii si al alaptarii.</strong></li>
          <li><strong>Nu se utilizeaza pe perioade indelungate fara recomandarea medicului.</strong></li>
          <li><strong>Daca luati medicamente, se recomanda sa consultati medicul.</strong></li>
          <li>A nu se lasa la indemana copiilor sub 3 ani.</li>
          <li>
            Varianta la plic contine cofeina si nu este recomandata copiilor, in sarcina sau in alaptare.
          </li>
        </ul>
        <p>
          Doua observatii care merita spuse pe sleau, chiar daca nu ne ajuta comercial:
        </p>
        <ul>
          <li>
            <strong>Berberina</strong> in doza de 291 mg pe zi nu este un ingredient banal. Daca urmezi orice
            tratament cronic, discutia cu medicul nu e optionala.
          </li>
          <li>
            <strong>5-HTP</strong> din Kalogel, 100 mg pe zi, actioneaza pe caile serotoninei. Daca iei
            medicatie care influenteaza serotonina — inclusiv antidepresive — nu incepe Kalogel inainte sa
            intrebi medicul.
          </li>
        </ul>
        <p>
          Un site care iti vinde produsul fara sa iti spuna asta nu iti face un serviciu.
        </p>

        <h2>Cui i se potriveste fiecare varianta</h2>
        <ul>
          <li>
            <strong>Capsulele</strong> — daca vrei extractele metabolice fara cofeina, sau daca ai nevoie sa le
            iei si seara.
          </li>
          <li>
            <strong>Plicurile</strong> — daca preferi forma lichida, absorbtie rapida si nu ai probleme cu
            cofeina.
          </li>
          <li>
            <strong>Kalogel</strong> — daca problema ta e mai degraba satietatea si tranzitul decat suportul
            metabolic. Borcanul de 390 g e mai economic, plicurile sunt mai practice in deplasare.
          </li>
          <li>
            <strong>Kit Kalo Sprint</strong> — daca vrei abordarea combinata, cu produsele grupate intr-un
            program. Vezi si restul categoriei <a href="/produse/programe">Programe</a>.
          </li>
        </ul>

        <h2>„Formulat dupa traditia ayurvedica" — ce inseamna si ce nu inseamna</h2>
        <p>
          Descrierea produsului trimite la medicina ayurvedica, iar asta merita o clarificare, pentru ca
          formularea e folosita adesea ca argument de autoritate.
        </p>
        <p>
          Ce inseamna, corect: plantele din formula — curcuma, emblica (amla), berberis, ghimbir, piper negru —
          sunt ingrediente clasice ale farmacopeei traditionale indiene, folosite de secole in combinatii
          asemanatoare. Alegerea lor nu e intamplatoare si nici recenta.
        </p>
        <p>
          Ce <em>nu</em> inseamna: ca produsul ar fi validat clinic pentru vreo indicatie medicala, sau ca
          traditia tine loc de dovada. Vechimea unei practici nu este un argument stiintific in sine. Ce face
          diferenta la o formula moderna nu este referinta la traditie, ci{" "}
          <strong>standardizarea</strong>: faptul ca stii exact cati miligrami de curcuminoizi sau de berberina
          primesti in fiecare doza. Traditia a dat reteta; titrarea o face reproductibila.
        </p>

        <h2>Greseli frecvente</h2>
        <ul>
          <li>
            <strong>Confuzia KaloSnep / Kalogel.</strong> Sunt produse diferite, cu ingrediente care nu se
            suprapun deloc. Cumperi altceva decat crezi.
          </li>
          <li>
            <strong>Luarea plicurilor seara.</strong> Contin guarana, deci cofeina. Daca ai somn sensibil,
            varianta corecta sunt capsulele.
          </li>
          <li>
            <strong>Kalogel cu prea putina apa.</strong> 10 g de ispagul au nevoie de cele 250 ml de lichid
            indicate pe eticheta. Fibra care formeaza gel fara apa suficienta inseamna disconfort, nu efect.
          </li>
          <li>
            <strong>Suprapunerea cu alte fibre.</strong> Daca iei Kalogel si inca un supliment cu fibre, ajungi
            usor la un aport care iti da balonare si tranzit accelerat.
          </li>
          <li>
            <strong>Ignorarea avertismentului hepatic si biliar.</strong> Este scris explicit pe eticheta si nu
            e o formalitate.
          </li>
          <li>
            <strong>Utilizarea la nesfarsit.</strong> Eticheta cere consultarea medicului pentru perioade
            indelungate. Nu este un produs „de fond".
          </li>
        </ul>

        <h2>Ce nu face KaloSnep</h2>
        <p>
          Eticheta este clara: produsul trebuie folosit <strong>in cadrul unei diete hipocalorice adecvate</strong>,
          cu un stil de viata sanatos si un nivel bun de activitate fizica. Nu compenseaza alimentatia si nu
          produce rezultate de unul singur. Orice text care iti promite un numar de kilograme intr-un numar de
          zile incalca legislatia privind suplimentele alimentare — indiferent cat de convingator suna.
        </p>

        <h2>Ce urmaresti si in cat timp</h2>
        <p>
          Nu iti putem promite rezultate si nu o vom face. Putem insa spune ce e rezonabil sa observi si pe ce
          interval, ca sa nu iei decizii pe baza primelor trei zile:
        </p>
        <ul>
          <li>
            <strong>Kalogel</strong> lucreaza pe volum si fibra, deci efectele asupra confortului digestiv si
            ale senzatiei de satietate se resimt cel mai devreme. Primele zile pot aduce si balonare, pana cand
            flora se adapteaza la 10 g de ispagul pe zi — daca persista, redu doza si consulta medicul.
          </li>
          <li>
            <strong>KaloSnep</strong> contine extracte care actioneaza pe procese metabolice; nu se evalueaza
            in mai putin de cateva saptamani, la doza constanta.
          </li>
          <li>
            Tine cont ca eticheta insasi limiteaza utilizarea indelungata fara aviz medical. Daca ai nevoie de
            ceva pe termen lung, aceea e o discutie medicala, nu una de catalog.
          </li>
        </ul>
        <p>
          Si o regula simpla, valabila peste tot: <strong>nu incepe doua produse noi in aceeasi zi</strong>.
          Daca apare ceva neasteptat, nu vei sti de la care.
        </p>

        <h2>Cu ce se combina din catalog</h2>
        <ul>
          <li>
            <a href="/produse/linia-real/realfibre">RealFibre</a> — fibre prebiotice. Atentie: daca iei deja
            Kalogel, ai 10 g de ispagul pe zi; nu suprapune fibre fara rost.
          </li>
          <li>
            <a href="/produse/linia-real/realcomplex">RealComplex</a> — papadie, mesteacan, anghinare si
            minerale, detaliat in <a href="/articole/realcomplex-snep-ghid">ghidul RealComplex</a>.
          </li>
          <li>
            <a href="/olivox-supliment-antioxidant">Olivox</a> — extract titrat de frunze de maslin, pe partea
            antioxidanta.
          </li>
          <li>
            <a href="/produse/controlul-greutatii">Controlul greutatii</a> — restul categoriei.
          </li>
        </ul>
        <p>
          Inainte de orice program, citeste{" "}
          <a href="/articole/programe-detox-cand-ai-nevoie">cand are sens un program si cand nu are</a>.
        </p>

        <h2>Testele de lot si de unde comanzi</h2>
        <p>
          Pe fisele KaloSnep si Kalogel apar coduri de tip „nichel test" — verificari pe lot care confirma ca
          nivelul de nichel se afla sub pragul stabilit. Conteaza pentru persoanele cu sensibilitate la nichel.
        </p>
        <p>
          Comanda se plaseaza direct de pe pagina produsului, telefonic sau pe WhatsApp, cu livrare prin curier
          in <strong>3–5 zile lucratoare</strong> in toata Romania si factura fiscala. Detalii in{" "}
          <a href="/livrare-si-retur">pagina de livrare si retur</a>, inclusiv dreptul legal de retur in 14
          zile. Nu vei gasi produsul pe eMAG sau OLX: contractul de distribuitor Snep interzice explicit
          marketplace-urile. Mai multe despre brand pe pagina <a href="/brand/snep">Snep</a>.
        </p>

        <p className="art-cta">
          Nu esti sigur ce varianta ti se potriveste — sau daca ti se potriveste vreuna? Scrie-ne pe{" "}
          <a href="https://wa.me/40779243541" rel="nofollow">WhatsApp</a> sau suna la{" "}
          <a href="tel:0779243541">0779 243 541</a>. Daca raspunsul corect e „intreaba intai medicul", asta iti
          vom spune.
        </p>

        <p className="art-disclaimer">
          <strong>Disclaimer.</strong> Acest ghid are caracter informativ si nu inlocuieste consultul medical.
          Suplimentele alimentare nu sunt medicamente si nu sunt destinate tratarii, prevenirii sau vindecarii
          vreunei boli. Un supliment alimentar nu inlocuieste o dieta variata si echilibrata si un stil de viata
          sanatos. Nu depasi doza recomandata pe eticheta. A nu se lasa la indemana copiilor sub 3 ani.
          Consulta medicul inainte de utilizare, in special daca urmezi un tratament medicamentos, ai o
          afectiune hepatica sau biliara, esti insarcinata sau alaptezi.
        </p>
      </div>

      <section className="guide-faq">
        <div className="eyebrow">Intrebari frecvente</div>
        <h2 className="guide-faq__title">Intrebari despre KaloSnep</h2>
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
          <a href="/produse/controlul-greutatii" className="guide-related__cat">Controlul greutatii</a>
          <a href="/produse/programe" className="guide-related__cat">Programe</a>
          <a href="/produse/linia-real" className="guide-related__cat">Linia Real</a>
        </div>
        <ul className="guide-related__links">
          <li><a href="/olivox-supliment-antioxidant">Olivox: ghid complet</a></li>
          <li><a href="/articole/burner-snep-ghid">Burner Snep: ghid complet</a></li>
          <li><a href="/articole/realcomplex-snep-ghid">RealComplex Snep: ghid complet</a></li>
          <li><a href="/ghid/cum-alegi-supliment">Cum alegi un supliment alimentar</a></li>
        </ul>
      </aside>

      <section className="guide-cta">
        <h2 className="guide-cta__title">Vezi variantele KaloSnep</h2>
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
