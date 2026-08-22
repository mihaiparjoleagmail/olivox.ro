import type { Metadata } from "next";
import { cache } from "react";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { displayPrice, schemaPrice } from "@/lib/price";

// Pillar page for "realfibre". GSC shows real demand for "probiotic realfibre",
// which is the exact confusion this page exists to clear up.
export const revalidate = 900;

const URL = "https://olivox.ro/realfibre";

// Vezi nota din app/kalosnep/page.tsx: pretul se compune la randare din cel mai
// mic pret dintre variante, nu se scrie static, ca sa nu ramana in urma.
function buildMetadataText(minPrice: number) {
  const title =
    minPrice > 0
      ? `RealFibre: pret de la ${minPrice} lei, compozitie si administrare`
      : "RealFibre Snep: compozitie, administrare, variante si pret";
  const description =
    minPrice > 0
      ? `RealFibre costa de la ${minPrice} lei. Ghid complet: prebiotic, nu probiotic. Inulina, fibre din mar si FOS in cifre, diferenta dintre pudra, plicuri si comprimate, cui nu i se potriveste.`
      : "Ghid complet RealFibre: prebiotic, nu probiotic. Inulina, fibre din mar si FOS in cifre, diferenta dintre pudra, plicuri si comprimate, administrare si cui nu i se potriveste.";
  return { title, description };
}

const VARIANT_SLUGS = ["realfibre", "realfibre-plicuri", "realfibre-comprimates"];

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

// `zile` = how long one pack lasts at the label dose, for the cost-per-day table.
const VARIANT_NOTES: Record<string, { forma: string; doza: string; zile: number }> = {
  "realfibre": { forma: "120 g pudra, borcan", doza: "4 g pe zi", zile: 30 },
  "realfibre-plicuri": { forma: "30 plicuri de 4,01 g", doza: "1 plic pe zi", zile: 30 },
  "realfibre-comprimates": { forma: "120 comprimate de 700 mg", doza: "4–8 comprimate pe zi", zile: 20 },
};

const getVariants = cache(async (): Promise<Variant[]> => {
  const { data } = await supabase
    .from("products")
    .select("name, slug, price, currency, quantity, sku, stock_status, r2_image_url, image_url, category_slugs")
    .in("slug", VARIANT_SLUGS);
  const rows = (data as Variant[]) || [];
  return VARIANT_SLUGS.map((s) => rows.find((r) => r.slug === s)).filter(Boolean) as Variant[];
});

function hrefFor(v: Variant): string {
  const cat = v.category_slugs?.[0] || "linia-real";
  return `/produse/${cat}/${v.slug}`;
}

const FAQ: { q: string; a: string }[] = [
  {
    q: "RealFibre este probiotic?",
    a: "Nu. RealFibre este un prebiotic: contine inulina, fibre din mar si fructooligozaharide, adica hrana pentru bacteriile bune din intestin. Nu contine bacterii vii. Probioticele sunt microorganismele in sine — in catalogul Snep, un exemplu de produs cu probiotic este Kalogel, care contine Bifidobacterium breve Bb-18.",
  },
  {
    q: "Ce contine RealFibre?",
    a: "La doza zilnica maxima recomandata: 3.500 mg inulina, 400 mg fibre din mar si 100 mg fructooligozaharide (FOS). Varianta la comprimate mai contine si 80 mg spirulina. Produsul este declarat fara gluten, iar variantele pudra si plicuri sunt declarate vegan.",
  },
  {
    q: "Care este diferenta dintre pudra, plicuri si comprimate?",
    a: "Cantitatile de fibre sunt aceleasi in toate trei. Pudra la borcan de 120 g este cea mai economica pe zi si permite dozare graduala. Plicurile de 4,01 g sunt portionate, comode in deplasare. Comprimatele sunt cele mai practice daca nu vrei sa dizolvi nimic si contin in plus spirulina, dar necesita 4-8 bucati pe zi.",
  },
  {
    q: "Cum se administreaza RealFibre?",
    a: "Pudra: 4 g direct in gura sau dizolvate intr-un pahar de apa. Plicuri: continutul unui pliculet, direct sau diluat cu apa. Comprimate: intre 4 si 8 pe zi; tabelul nutritional de pe eticheta este calculat pentru 6 comprimate. In toate cazurile, bea suficienta apa.",
  },
  {
    q: "Cat costa RealFibre?",
    a: "Preturile difera intre cele trei variante si le gasesti actualizate in tabelul comparativ de mai sus, precum si pe fiecare pagina de produs. Mai util decat pretul de raft este costul pe zi, calculat tot in pagina.",
  },
  {
    q: "Pot aparea balonare sau disconfort?",
    a: "Da, mai ales in primele zile. Inulina si FOS fermenteaza in colon — asta este exact mecanismul prin care hranesc flora, dar produce si gaze pana cand microbiota se adapteaza. Daca disconfortul e mare, incepe cu jumatate de doza si creste treptat. Consumul excesiv poate avea efect laxativ.",
  },
  {
    q: "Cine ar trebui sa evite RealFibre?",
    a: "Copiii sub 3 ani, persoanele cu hipersensibilitate la unul dintre ingrediente si persoanele cu sindrom de intestin iritabil sau alte afectiuni digestive sensibile la fibre fermentabile — inulina si FOS sunt fibre fermentabile si pot accentua simptomele. Daca ai o afectiune digestiva diagnosticata, intreaba medicul inainte.",
  },
  {
    q: "Se poate lua impreuna cu Kalogel?",
    a: "Cu atentie. Kalogel contine 10 g de ispagul pe zi, adica deja o cantitate mare de fibra. Adaugarea RealFibre peste inseamna un aport total de fibre pe care multi nu il tolereaza. Nu este o combinatie de facut din reflex.",
  },
  {
    q: "Ce spune prospectul la avertismente?",
    a: "Eticheta cere sa nu se depaseasca doza zilnica recomandata, sa nu se lase la indemana copiilor sub 3 ani si precizeaza ca produsul este supliment alimentar si nu inlocuieste o dieta variata si echilibrata. Mentioneaza si ca un consum excesiv poate cauza efecte laxative.",
  },
  {
    q: "De unde comand?",
    a: "De pe pagina fiecarui produs, telefonic sau pe WhatsApp, cu livrare in 3-5 zile lucratoare in toata Romania. Snep interzice contractual vanzarea pe eMAG, OLX si alte marketplace-uri.",
  },
];

export async function generateMetadata(): Promise<Metadata> {
  const variants = await getVariants();
  const prices = variants.map((v) => displayPrice(v.price)).filter((p) => p > 0);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const { title, description } = buildMetadataText(minPrice);

  return {
    title,
    description,
    keywords:
      "realfibre, realfibre snep, realfibre pret, probiotic realfibre, realfibre prospect, realfibre beneficii, realfibre plicuri, realfibre comprimate, inulina, prebiotic",
    alternates: { canonical: URL },
    openGraph: {
      title,
      description,
      url: URL,
      siteName: "olivox.ro",
      type: "article",
      locale: "ro_RO",
      images: [
        {
          url: "https://media.ghidulfunerar.ro/olivox/products/realfibre.jpg",
          alt: "RealFibre — supliment alimentar cu fibre prebiotice, Snep",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["https://media.ghidulfunerar.ro/olivox/products/realfibre.jpg"],
    },
  };
}

export default async function RealfibrePillarPage() {
  const variants = await getVariants();
  const prices = variants.map((v) => displayPrice(v.price)).filter((p) => p > 0);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const { description } = buildMetadataText(minPrice);

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "RealFibre — ghid complet: prebiotic, compozitie, variante si administrare",
    description,
    image: "https://media.ghidulfunerar.ro/olivox/products/realfibre.jpg",
    author: { "@type": "Organization", name: "Olivox", url: "https://olivox.ro" },
    publisher: {
      "@type": "Organization",
      name: "olivox.ro",
      logo: { "@type": "ImageObject", url: "https://olivox.ro/logo.png" },
    },
    mainEntityOfPage: URL,
    inLanguage: "ro-RO",
    about: { "@type": "Thing", name: "RealFibre — supliment alimentar cu fibre prebiotice" },
  };

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Variantele RealFibre",
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
          price: schemaPrice(v.price),
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
      { "@type": "ListItem", position: 2, name: "RealFibre — ghid complet", item: URL },
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
        <a href="/">Acasa</a> / <span>RealFibre — ghid complet</span>
      </nav>

      <header className="guide-hero">
        <div className="eyebrow">Ghid complet</div>
        <h1 className="guide-hero__h1">RealFibre: prebiotic, compozitie, variante si administrare</h1>
        <p className="guide-hero__intro">
          RealFibre face parte din linia Real a Snep si este unul dintre cele mai simple produse din catalog —
          si tocmai de aceea, unul dintre cele mai des inteles gresit. Multi il cauta drept „probiotic
          RealFibre”. Nu este. Ghidul de mai jos lamureste diferenta, arata compozitia cu cifrele de pe
          eticheta si compara corect cele trei variante.
        </p>
      </header>

      <div className="prose">
        <h2>Prebiotic, nu probiotic — diferenta pe scurt</h2>
        <p>
          Este cea mai importanta clarificare din toata pagina, asa ca o punem prima:
        </p>
        <ul>
          <li>
            <strong>Probioticele</strong> sunt microorganisme vii — bacterii sau drojdii — care se adauga
            florei intestinale. Se masoara in UFC (unitati formatoare de colonii) si sunt sensibile la caldura.
          </li>
          <li>
            <strong>Prebioticele</strong> sunt fibre care nu se digera in stomac si in intestinul subtire,
            ajung intacte in colon si servesc drept <em>hrana</em> pentru bacteriile bune deja prezente. Se
            masoara in grame.
          </li>
        </ul>
        <p>
          <strong>RealFibre este prebiotic.</strong> Nu contine bacterii vii si nu pretinde ca ar contine.
          Rolul lui este sa creeze conditii favorabile pentru flora existenta, nu sa aduca tulpini noi.
        </p>
        <p>
          Daca ceea ce cauti este un produs cu bacterii vii, in catalog exista{" "}
          <a href="/produse/nevoi-specifice/kalogel">Kalogel</a>, care contine{" "}
          <em>Bifidobacterium breve</em> Bb-18 — detaliat in <a href="/kalosnep">ghidul KaloSnep</a>. Cele doua
          abordari nu se exclud: prebioticul hraneste, probioticul populeaza.
        </p>

        <h2>Compozitia, in cifre</h2>
        <p>La doza zilnica maxima recomandata, toate variantele aduc:</p>
        <ul>
          <li><strong>Inulina</strong> — 3.500 mg</li>
          <li><strong>Fibre din mar</strong> — 400 mg</li>
          <li><strong>Fructooligozaharide (FOS)</strong> — 100 mg</li>
        </ul>
        <p>
          Varianta la comprimate mai contine si <strong>80 mg spirulina</strong> (Spirulina maxima, pulbere de
          thallus), plus agenti de aglomerare — izomalt si celuloza microcristalina — necesari ca sa se poata
          comprima. Variantele pudra si plicuri sunt aromatizate cu ananas.
        </p>

        <h3>Inulina: fibra principala</h3>
        <p>
          Inulina reprezinta peste 87% din aportul de fibre al produsului. Este o fibra solubila din familia
          fructanilor, prezenta natural in cicoare, andive, praz, ceapa si topinambur. Nu este hidrolizata de
          enzimele digestive umane, deci trece nemodificata pana in colon, unde este fermentata selectiv de
          bifidobacterii.
        </p>

        <h3>FOS si fibrele din mar</h3>
        <p>
          <strong>Fructooligozaharidele</strong> sunt lanturi scurte din aceeasi familie, fermentate rapid in
          partea proximala a colonului. <strong>Fibrele din mar</strong> aduc si o componenta de pectina, o
          fibra solubila cu comportament diferit — formeaza gel si contribuie la consistenta bolului fecal.
        </p>
        <p>
          Combinatia are logica: fibre cu viteze diferite de fermentatie acopera segmente diferite ale
          colonului, in loc sa produca totul intr-un singur punct.
        </p>

        <h3>De ce spirulina doar in comprimate</h3>
        <p>
          Cele 80 mg de spirulina din varianta la comprimate sunt un adaos, nu componenta principala — o
          cantitate mica, cu rol mai degraba de aport de micronutrienti decat de ingredient activ dominant.
          Daca alegi intre variante, nu spirulina ar trebui sa fie criteriul.
        </p>

        <h2>Cele trei variante</h2>

        {variants.length > 0 && (
          <div className="olivox-table-wrap">
            <table className="olivox-table">
              <thead>
                <tr>
                  <th>Varianta</th>
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
                        {v.price != null ? `${displayPrice(v.price)} ${v.currency || "RON"}` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <h3>Cat tine si cat costa pe zi</h3>
        <p>
          Preturile de raft nu sunt comparabile direct, pentru ca pachetele tin perioade diferite. Tradus in
          cost pe zi la doza de pe eticheta:
        </p>
        <div className="olivox-table-wrap">
          <table className="olivox-table">
            <thead>
              <tr>
                <th>Varianta</th>
                <th>Tine</th>
                <th>Cost pe zi</th>
              </tr>
            </thead>
            <tbody>
              {variants
                .filter((v) => VARIANT_NOTES[v.slug] && v.price != null)
                .map((v) => {
                  const zile = VARIANT_NOTES[v.slug].zile;
                  return (
                    <tr key={v.slug}>
                      <td><a href={hrefFor(v)}>{v.name}</a></td>
                      <td>{zile} zile</td>
                      <td>{(Number(v.price) / zile).toFixed(1).replace(".", ",")} RON</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        <p>
          Comprimatele tin 20 de zile la doza din tabelul nutritional (6 pe zi), nu 30 — de aici si costul mai
          mare pe zi, desi pretul de raft e cel mai mic dintre cele trei. Este exact genul de comparatie care
          se pierde cand te uiti doar la eticheta de pret.
        </p>

        <h3>Cum alegi intre ele</h3>
        <ul>
          <li>
            <strong>Pudra la borcan</strong> — cea mai economica si singura care permite dozare graduala. Daca
            e prima ta experienta cu fibre prebiotice, e alegerea cea mai buna: poti incepe cu jumatate de doza.
          </li>
          <li>
            <strong>Plicurile</strong> — portionate, fara cantar si fara ghicit, comode in deplasare. Platesti
            putin in plus pentru comoditate.
          </li>
          <li>
            <strong>Comprimatele</strong> — pentru cine nu vrea sa dizolve nimic. Atentie: 4-8 comprimate pe zi
            inseamna un numar mare de bucati de inghitit.
          </li>
        </ul>

        <h2>Mod de administrare</h2>
        <ul>
          <li>
            <strong>Pudra:</strong> 4 g de produs, direct in gura sau dizolvate intr-un pahar de apa.
          </li>
          <li>
            <strong>Plicuri:</strong> continutul unui pliculet, direct in gura sau diluat cu apa.
          </li>
          <li>
            <strong>Comprimate:</strong> intre 4 si 8 pe zi. Tabelul nutritional de pe eticheta este calculat
            pentru 6 comprimate — asta e referinta pentru cantitatile de mai sus.
          </li>
        </ul>
        <p>
          <strong>Bea suficienta apa.</strong> Fibrele solubile lucreaza prin absorbtia apei; luate cu prea
          putin lichid, efectul se inverseaza si apare disconfort. Nu depasi doza zilnica recomandata —
          consumul excesiv poate avea efect laxativ.
        </p>

        <h2>Cate fibre iti trebuie, de fapt</h2>
        <p>
          Aceasta este verificarea de realitate care lipseste din majoritatea descrierilor de produs.
          Recomandarile nutritionale uzuale pentru adulti sunt in jur de <strong>25-30 g de fibre pe zi</strong>,
          din alimentatie. RealFibre aduce aproximativ <strong>4 g</strong> la doza zilnica.
        </p>
        <p>
          Cu alte cuvinte: produsul acopera in jur de o saptime din necesarul zilnic. Nu este si nu pretinde
          sa fie inlocuitorul legumelor, fructelor, leguminoaselor si cerealelor integrale. Este un aport
          suplimentar, cu o compozitie aleasa special ca sa hraneasca flora — nu un substitut pentru o dieta
          echilibrata.
        </p>
        <p>
          Daca mananci sub 15 g de fibre pe zi, cea mai eficienta schimbare nu e un supliment, ci o portie in
          plus de legume la doua mese. Suplimentul are sens ca adaos peste o baza decenta, nu ca inlocuitor al
          ei — acelasi principiu pe care il aplicam in{" "}
          <a href="/ghid/suplimente-alimentare-naturale">ghidul suplimentelor alimentare</a>.
        </p>

        <h3>Inulina din alimente vs. inulina din supliment</h3>
        <p>
          Inulina nu e o substanta exotica: o gasesti natural in cicoare, andive, praz, ceapa, usturoi,
          sparanghel si topinambur. Diferenta pe care o face suplimentul este <strong>doza cunoscuta si
          constanta</strong> — greu de obtinut din alimentatie, unde continutul variaza mult in functie de
          sezon, soi si mod de preparare.
        </p>
        <p>
          Nu este „mai bun” decat sursa alimentara. Este doar previzibil.
        </p>

        <h2>Ce sa te astepti in primele zile</h2>
        <p>
          Aici merita sa fim directi, pentru ca e motivul principal pentru care oamenii renunta la fibre
          prebiotice dupa trei zile.
        </p>
        <p>
          Inulina si FOS <strong>fermenteaza</strong> in colon. Asta nu e un efect secundar nedorit — este
          exact mecanismul prin care hranesc bacteriile. Dar fermentatia produce gaze, iar daca dieta ta era
          pana acum saraca in fibre, microbiota are nevoie de timp sa se adapteze. Balonarea si un tranzit mai
          activ in prima saptamana sunt de asteptat.
        </p>
        <p>Ce poti face:</p>
        <ul>
          <li>Incepe cu jumatate de doza si creste treptat pe parcursul a 1-2 saptamani.</li>
          <li>Ia produsul la aceeasi ora, ca sa dai un ritm previzibil.</li>
          <li>Creste aportul de apa in paralel.</li>
          <li>Daca disconfortul e mare sau persista peste doua saptamani, opreste si intreaba medicul.</li>
        </ul>

        <h2>Cui NU i se adreseaza</h2>
        <ul>
          <li>Copiilor sub 3 ani.</li>
          <li>Persoanelor cu hipersensibilitate la unul dintre ingrediente.</li>
          <li>
            Persoanelor cu <strong>sindrom de intestin iritabil</strong> sau alte afectiuni digestive
            sensibile la fibre fermentabile. Inulina si FOS sunt fibre puternic fermentabile si pot accentua
            simptomele la persoanele predispuse. Daca ai un diagnostic digestiv, aceasta e o discutie cu
            medicul, nu una de catalog.
          </li>
          <li>
            Celor care iau deja o cantitate mare de fibre din alte suplimente — vezi mai jos.
          </li>
        </ul>

        <h2>Atentie la suprapunerea fibrelor</h2>
        <p>
          Este greseala cea mai frecventa la cine cumpara mai multe produse din catalog. Doua exemple concrete:
        </p>
        <ul>
          <li>
            <a href="/produse/nevoi-specifice/kalogel">Kalogel</a> aduce <strong>10 g de ispagul</strong>{" "}
            (psyllium) pe zi. Peste RealFibre, ajungi la un aport de fibre suplimentare pe care multi nu il
            tolereaza.
          </li>
          <li>
            <a href="/produse/linia-real/realcomplex">RealComplex</a> nu contine fibre in cantitati notabile,
            deci se combina fara aceasta problema — detalii in{" "}
            <a href="/articole/realcomplex-snep-ghid">ghidul RealComplex</a>.
          </li>
        </ul>
        <p>
          Regula simpla: aduna gramele de fibra suplimentara pe care le iei zilnic din toate sursele, nu doar
          din produsul pe care il ai in fata.
        </p>

        <h2>Greseli frecvente</h2>
        <ul>
          <li>
            <strong>Doza plina din prima zi.</strong> Cea mai comuna si cea mai usor de evitat. Jumatate de
            doza timp de o saptamana rezolva majoritatea problemelor de toleranta.
          </li>
          <li>
            <strong>Prea putina apa.</strong> Fibrele solubile lucreaza cu lichid. Fara el, efectul se
            inverseaza.
          </li>
          <li>
            <strong>Renuntarea dupa trei zile.</strong> Adaptarea microbiotei nu se face intr-un weekend.
            Evalueaza dupa 2-3 saptamani de utilizare constanta, nu dupa primele senzatii.
          </li>
          <li>
            <strong>Cumpararea comprimatelor pentru ca „sunt cele mai ieftine”.</strong> Sunt cele mai ieftine
            pe cutie, dar nu si pe zi — vezi tabelul de mai sus.
          </li>
          <li>
            <strong>Suprapunerea cu alte fibre</strong>, in special cu Kalogel. Aduna, nu ignora.
          </li>
          <li>
            <strong>Asteptarea unui efect de laxativ.</strong> Nu asta este scopul produsului, iar consumul
            excesiv pentru a-l obtine e contraproductiv si contrar etichetei.
          </li>
        </ul>

        <h2>Ce urmaresti si in cat timp</h2>
        <p>
          Fara promisiuni — doar ce e rezonabil sa observi si pe ce interval:
        </p>
        <ul>
          <li>
            <strong>Primele 3-7 zile:</strong> perioada de adaptare. Balonare posibila, tranzit mai activ.
            Momentul in care se renunta cel mai des, si cel mai gresit.
          </li>
          <li>
            <strong>Saptamanile 2-3:</strong> daca produsul ti se potriveste, disconfortul initial se estompeaza
            si tranzitul devine mai regulat.
          </li>
          <li>
            <strong>Dupa o luna:</strong> daca nu observi nimic si nici disconfort, si nici o schimbare, e o
            informatie utila in sine — poate problema ta nu era aportul de fibre.
          </li>
        </ul>

        <h2>Unde se incadreaza in linia Real</h2>
        <p>
          RealFibre este una dintre componentele liniei Real, alaturi de:
        </p>
        <ul>
          <li>
            <a href="/produse/linia-real/realcomplex">RealComplex</a> — papadie, mesteacan, anghinare si
            minerale.
          </li>
          <li>
            <a href="/produse/linia-real/realvita">RealVita</a> — complex de vitamine pentru metabolismul
            energetic normal.
          </li>
          <li>
            <a href="/produse/programe/real-detox">Real Detox</a> — programul care le reuneste.
          </li>
        </ul>
        <p>
          Vezi toata <a href="/produse/linia-real">linia Real</a> si citeste, inainte de a porni un program,{" "}
          <a href="/articole/programe-detox-cand-ai-nevoie">cand are sens un detox si cand nu are</a>.
        </p>

        <h2>Cum comanzi</h2>
        <p>
          Comanda se plaseaza de pe pagina produsului, telefonic sau pe WhatsApp, cu livrare prin curier in{" "}
          <strong>3-5 zile lucratoare</strong> in toata Romania si factura fiscala. Detalii in{" "}
          <a href="/livrare-si-retur">pagina de livrare si retur</a>, inclusiv dreptul legal de retur in 14
          zile. Produsele Snep nu se vand pe eMAG, OLX sau alte marketplace-uri — este o restrictie
          contractuala. Mai multe despre brand pe pagina <a href="/brand/snep">Snep</a>.
        </p>

        <p className="art-cta">
          Nu esti sigur ce varianta ti se potriveste sau daca fibrele prebiotice sunt ce iti trebuie? Scrie-ne
          pe <a href="https://wa.me/40779243541" rel="nofollow">WhatsApp</a> sau suna la{" "}
          <a href="tel:0779243541">0779 243 541</a>. Iti raspunde un distribuitor autorizat Snep, fara
          obligatia de a comanda.
        </p>

        <p className="art-disclaimer">
          <strong>Disclaimer.</strong> Supliment alimentar. Acest ghid are caracter informativ si nu inlocuieste
          consultul medical. Suplimentele alimentare nu sunt medicamente si nu sunt destinate tratarii,
          prevenirii sau vindecarii vreunei boli. Un supliment alimentar nu inlocuieste o dieta variata si
          echilibrata si un stil de viata sanatos. Nu depasi doza recomandata pe eticheta; consumul excesiv
          poate cauza efecte laxative. A nu se lasa la indemana copiilor sub 3 ani. Consulta medicul inainte de
          utilizare, in special daca ai o afectiune digestiva, urmezi un tratament medicamentos, esti
          insarcinata sau alaptezi.
        </p>
      </div>

      <section className="guide-faq">
        <div className="eyebrow">Intrebari frecvente</div>
        <h2 className="guide-faq__title">Intrebari despre RealFibre</h2>
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
          <a href="/produse/linia-real" className="guide-related__cat">Linia Real</a>
          <a href="/produse/nevoi-specifice" className="guide-related__cat">Nevoi specifice</a>
          <a href="/produse/programe" className="guide-related__cat">Programe</a>
          <a href="/produse/suplimente" className="guide-related__cat">Suplimente</a>
        </div>
        <ul className="guide-related__links">
          <li><a href="/kalosnep">KaloSnep: ghid complet</a></li>
          <li><a href="/olivox-supliment-antioxidant">Olivox: ghid complet</a></li>
          <li><a href="/articole/realcomplex-snep-ghid">RealComplex Snep: ghid complet</a></li>
          <li><a href="/ghid/cum-alegi-supliment">Cum alegi un supliment alimentar</a></li>
        </ul>
      </aside>

      <section className="guide-cta">
        <h2 className="guide-cta__title">Vezi variantele RealFibre</h2>
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
