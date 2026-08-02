import type { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// Pillar page for "sneplumina". The term currently splits across the shampoo,
// the box and the argan oil product pages — this page is the hub.
export const revalidate = 900;

const URL = "https://olivox.ro/sneplumina";
const TITLE = "SnepLumina: sampon, masca, ulei de argan si BOX";
const DESCRIPTION =
  "Ghid complet SnepLumina: ce contine fiecare produs (ulei de argan, colagen, matase), cum se folosesc, ce inseamna claim-urile de pe eticheta si cat costa setul.";

const VARIANT_SLUGS = [
  "sneplumina-sampon-hidratant-efect-de-matase",
  "sneplumina-masc-hidratant-efect-de-mtase",
  "sneplumina-ulei-de-argan-pt-netezirea-firelor",
  "sneplumina-box",
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

const VARIANT_LABELS: Record<string, { scurt: string; rol: string }> = {
  "sneplumina-sampon-hidratant-efect-de-matase": { scurt: "Sampon", rol: "curatare delicata, pasul 1" },
  "sneplumina-masc-hidratant-efect-de-mtase": { scurt: "Masca", rol: "hranire pe lungimi, pasul 2" },
  "sneplumina-ulei-de-argan-pt-netezirea-firelor": { scurt: "Ulei de argan", rol: "finisare si anti-frizz, pasul 3" },
  "sneplumina-box": { scurt: "BOX", rol: "toate trei, la pachet" },
};

async function getVariants(): Promise<Variant[]> {
  const { data } = await supabase
    .from("products")
    .select("name, slug, price, currency, quantity, sku, stock_status, r2_image_url, image_url, category_slugs")
    .in("slug", VARIANT_SLUGS);
  const rows = (data as Variant[]) || [];
  return VARIANT_SLUGS.map((s) => rows.find((r) => r.slug === s)).filter(Boolean) as Variant[];
}

function hrefFor(v: Variant): string {
  const cat = v.category_slugs?.[0] || "par";
  return `/produse/${cat}/${v.slug}`;
}

const FAQ: { q: string; a: string }[] = [
  {
    q: "Ce este SnepLumina?",
    a: "SnepLumina este linia de ingrijire a parului din catalogul Snep, formata din trei produse cosmetice: un sampon hidratant, o masca hidratanta si un ulei de argan pentru netezirea firelor. Toate trei au acelasi trio de ingrediente caracteristice — ulei de argan, colagen hidrolizat si proteine din matase hidrolizate.",
  },
  {
    q: "Ce contine SnepLumina BOX?",
    a: "BOX-ul contine toate cele trei produse ale liniei: sampon 500 ml, masca 500 ml si ulei de argan 100 ml. Cumparate impreuna ies mai ieftin decat luate separat — vezi comparatia de preturi de mai sus.",
  },
  {
    q: "Samponul SnepLumina contine sulfati?",
    a: "Eticheta declara „NO sles-sls”, adica fara Sodium Laureth Sulfate si fara Sodium Lauryl Sulfate. Formula contine insa alti tensioactivi din familia sulfatilor — ammonium lauryl sulfate si sodium myreth sulfate. Claim-ul este corect, dar se refera strict la cele doua ingrediente numite, nu la sulfati in general.",
  },
  {
    q: "Uleiul de argan SnepLumina este ulei pur?",
    a: "Nu, si nici nu pretinde asta. Este un serum de finisare pe baza de siliconi (cyclopentasiloxane, dimethicone, dimethiconol) in care uleiul de argan, colagenul si matasea sunt ingrediente active. Este constructia standard pentru un produs anti-frizz — siliconii dau netezirea imediata si rezistenta la umiditate.",
  },
  {
    q: "Cum se folosesc corect cele trei produse?",
    a: "Sampon pe par ud, masaj circular pe scalp aproximativ 30 de secunde, clatire. Masca pe par spalat si uscat cu prosopul, doar pe lungimi si varfuri, 3-5 minute pentru descurcare sau 10-15 minute pentru actiune mai profunda, apoi clatire. Uleiul, cateva picaturi pe par ud inainte de uscare si inca 1-2 picaturi dupa coafare.",
  },
  {
    q: "Masca se aplica si pe scalp?",
    a: "Nu. Instructiunile spun explicit sa fie aplicata uniform pe lungimi si varfuri. Masca este un produs de conditionare pentru fibra capilara, nu pentru scalp.",
  },
  {
    q: "Ce inseamna „METAL TESTED: Ni-Co-Cr < 1 ppm”?",
    a: "Este un test care confirma ca nichelul, cobaltul si cromul se afla sub un prag de o parte per milion. Conteaza pentru persoanele cu sensibilitate la aceste metale, care pot reactiona la cantitati foarte mici prezente ca impuritati in materiile prime cosmetice.",
  },
  {
    q: "SnepLumina este bun pentru parul care cade?",
    a: "SnepLumina este o linie de hidratare si stralucire — lucreaza pe aspectul si textura firului. Pentru scalp cu probleme specifice, catalogul Snep are linia Trico-Salus, cu produse dedicate. Sunt doua linii diferite, cu scopuri diferite.",
  },
  {
    q: "Cat tine un flacon?",
    a: "Samponul si masca sunt de 500 ml fiecare — flacoane mari, care la o utilizare de doua-trei ori pe saptamana tin cateva luni. Uleiul de 100 ml se foloseste in cantitati de cateva picaturi, deci tine si mai mult. Perioada dupa deschidere este de 12 luni.",
  },
  {
    q: "De unde comand SnepLumina?",
    a: "De pe pagina fiecarui produs, telefonic sau pe WhatsApp, cu livrare in 3-5 zile lucratoare in toata Romania. Contractul de distribuitor Snep interzice vanzarea pe eMAG, OLX sau alte marketplace-uri.",
  },
];

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords:
    "sneplumina, sneplumina sampon, sampon sneplumina, sneplumina box, sneplumina masca, sneplumina ulei de argan, sneplumina pret, snep par",
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
        url: "https://media.ghidulfunerar.ro/olivox/products/sneplumina-box.jpg",
        alt: "SnepLumina — linia de ingrijire a parului Snep",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["https://media.ghidulfunerar.ro/olivox/products/sneplumina-box.jpg"],
  },
};

export default async function SnepluminaPillarPage() {
  const variants = await getVariants();
  const box = variants.find((v) => v.slug === "sneplumina-box");
  const singles = variants.filter((v) => v.slug !== "sneplumina-box" && v.price != null);
  const sumSingles = singles.reduce((acc, v) => acc + Number(v.price), 0);
  const boxSaving = box?.price != null && singles.length === 3 ? sumSingles - Number(box.price) : null;

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "SnepLumina — ghid complet: sampon, masca, ulei de argan si BOX",
    description: DESCRIPTION,
    image: "https://media.ghidulfunerar.ro/olivox/products/sneplumina-box.jpg",
    author: { "@type": "Organization", name: "Olivox", url: "https://olivox.ro" },
    publisher: {
      "@type": "Organization",
      name: "olivox.ro",
      logo: { "@type": "ImageObject", url: "https://olivox.ro/favicon.ico" },
    },
    mainEntityOfPage: URL,
    inLanguage: "ro-RO",
    about: { "@type": "Thing", name: "SnepLumina — linia de ingrijire a parului Snep" },
  };

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Produsele liniei SnepLumina",
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
        category: "Cosmetic pentru par",
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
      { "@type": "ListItem", position: 2, name: "SnepLumina — ghid complet", item: URL },
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
        <a href="/">Acasa</a> / <span>SnepLumina — ghid complet</span>
      </nav>

      <header className="guide-hero">
        <div className="eyebrow">Ghid complet</div>
        <h1 className="guide-hero__h1">SnepLumina: sampon, masca, ulei de argan si BOX</h1>
        <p className="guide-hero__intro">
          SnepLumina este linia de ingrijire a parului din catalogul Snep — trei produse construite in jurul
          aceluiasi trio de ingrediente: ulei de argan, colagen hidrolizat si proteine din matase. Ghidul de
          mai jos iti arata ce face fiecare, cum se folosesc in ordinea corecta, ce contine efectiv formula si
          ce inseamna — exact — claim-urile de pe eticheta.
        </p>
      </header>

      <div className="prose">
        <h2>Linia in trei pasi</h2>
        <p>
          Cele trei produse nu sunt variante ale aceluiasi lucru, ci pasi consecutivi ai unei rutine:
        </p>
        <ul>
          <li>
            <strong>Samponul</strong> curata — pasul de baza, se aplica pe scalp.
          </li>
          <li>
            <strong>Masca</strong> conditioneaza — se aplica dupa spalare, doar pe lungimi si varfuri.
          </li>
          <li>
            <strong>Uleiul de argan</strong> finiseaza — cateva picaturi inainte de uscare si dupa coafare.
          </li>
        </ul>
        <p>
          Poti folosi oricare separat, dar au fost gandite sa lucreze impreuna — de aici si existenta
          BOX-ului.
        </p>

        {variants.length > 0 && (
          <div className="olivox-table-wrap">
            <table className="olivox-table">
              <thead>
                <tr>
                  <th>Produs</th>
                  <th>Rol</th>
                  <th>Volum</th>
                  <th>Pret</th>
                </tr>
              </thead>
              <tbody>
                {variants.map((v) => {
                  const lbl = VARIANT_LABELS[v.slug];
                  return (
                    <tr key={v.slug}>
                      <td><a href={hrefFor(v)}>{lbl?.scurt || v.name}</a></td>
                      <td>{lbl?.rol || "—"}</td>
                      <td>{v.quantity || "—"}</td>
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

        {boxSaving != null && boxSaving > 0 && (
          <p>
            Cele trei produse luate separat costa <strong>{Math.ceil(sumSingles)} RON</strong>, iar BOX-ul{" "}
            <strong>{Math.ceil(Number(box!.price))} RON</strong> — o diferenta de aproximativ{" "}
            <strong>{Math.round(boxSaving)} RON</strong>. Daca oricum vrei toata rutina, setul e alegerea
            evidenta. Daca vrei sa incerci intai, ia samponul singur.
          </p>
        )}

        <h2>Ce contine formula, de fapt</h2>
        <p>
          Toate cele trei produse impartasesc acelasi trio de ingrediente caracteristice. Iata ce face fiecare,
          in limbaj cosmetic corect:
        </p>
        <ul>
          <li>
            <strong>Ulei de argan</strong> (Argania spinosa kernel oil), biocertificat la sampon si masca —
            bogat in acizi grasi si vitamina E, folosit pentru a hrani fibra si a imbunatati aspectul
            varfurilor.
          </li>
          <li>
            <strong>Colagen hidrolizat</strong> (Hydrolyzed collagen) — proteina fragmentata in lanturi scurte,
            care adera la suprafata firului si contribuie la un aspect mai plin si mai neted.
          </li>
          <li>
            <strong>Matase hidrolizata</strong> (Hydrolyzed silk) — de aici vine si numele „efect de matase”;
            filmogen, contribuie la stralucire si la senzatia de alunecare la pieptanare.
          </li>
        </ul>
        <p>
          Un lucru important de inteles despre proteinele din produsele de par: <strong>ele nu „repara”
          firul</strong> in sens biologic. Firul de par este tesut mort — nu se vindeca. Ce fac proteinele
          hidrolizate este sa umple temporar neregularitatile de pe cuticula si sa formeze un film care
          netezeste suprafata. Efectul e real si vizibil, dar cosmetic si reversibil la spalare. Orice produs
          care iti promite „reparare definitiva” iti vinde o poveste.
        </p>

        <h3>Samponul, in detaliu</h3>
        <p>
          Flacon de 500 ml. Baza de curatare este formata din ammonium lauryl sulfate, sodium myreth sulfate si
          disodium cocoamphodiacetate, cu coco-glucoside ca tensioactiv blând suplimentar. Contine si guar
          hydroxypropyltrimonium chloride — un conditioner cationic care face parul mai usor de descurcat inca
          din timpul spalarii.
        </p>

        <h3>Masca, in detaliu</h3>
        <p>
          Flacon de 500 ml. Baza este cetearyl alcohol plus cetrimonium chloride — combinatia clasica de
          conditionare, care neutralizeaza sarcina electrostatica a firului si il face maleabil. Contine si
          amodimethicone, un silicon care se depune selectiv pe zonele deteriorate ale cuticulei. Eticheta
          declara „NO sles-sls”.
        </p>

        <h3>Uleiul de argan, in detaliu</h3>
        <p>
          Flacon de 100 ml, si aici e important sa fim exacti: <strong>nu este ulei de argan pur</strong>, ci un
          serum de finisare pe baza de siliconi — cyclopentasiloxane, dimethicone si dimethiconol — in care
          arganul, colagenul si matasea sunt ingredientele active. Este constructia standard a oricarui produs
          anti-frizz serios: siliconii dau netezirea imediata, rezistenta la umiditate si protectia la caldura
          in timpul uscarii sau indreptarii.
        </p>
        <p>
          Formula contine si doua filtre — bumetrizole si benzophenone-3 — cu rol de protectie a culorii
          impotriva degradarii la lumina. Util daca ai parul vopsit.
        </p>

        <h2>Ce inseamna claim-urile de pe eticheta</h2>
        <p>
          Aici merita citit atent, pentru ca formularile sunt corecte, dar mai inguste decat par la prima
          vedere.
        </p>
        <h3>„NO: sles-sls”</h3>
        <p>
          Inseamna exact ce scrie: fara <strong>Sodium Laureth Sulfate</strong> si fara{" "}
          <strong>Sodium Lauryl Sulfate</strong>, cei doi tensioactivi cu cea mai proasta reputatie in
          discutiile despre cosmetice. Nu inseamna insa „fara sulfati” — samponul contine ammonium lauryl
          sulfate si sodium myreth sulfate, care apartin aceleiasi familii chimice.
        </p>
        <p>
          Spunem asta nu ca sa criticam produsul, ci pentru ca merita sa stii ce cumperi. Daca eviti SLS/SLES
          din motive de sensibilitate, e posibil sa reactionezi similar la rudele lor. Daca il eviti pentru ca
          asa ai citit pe internet, diferenta practica e mai mica decat crezi. Aceeasi logica de citire a
          etichetei o aplicam si in{" "}
          <a href="/articole/cosmetice-naturale-fara-parabeni">articolul despre cosmeticele fara parabeni</a>.
        </p>
        <h3>„NO: silicon” la sampon</h3>
        <p>
          Se refera la sampon. Masca contine amodimethicone, iar uleiul este in mod fundamental un produs pe
          baza de siliconi. Nu e o contradictie — sunt produse cu roluri diferite — dar e util sa stii, mai
          ales daca urmezi o rutina de tip „silicone-free” din convingere.
        </p>
        <h3>„METAL TESTED: Ni-Co-Cr &lt; 1 ppm”</h3>
        <p>
          Confirma ca nichelul, cobaltul si cromul sunt sub o parte per milion. Sunt metale care ajung in
          cosmetice ca impuritati din materiile prime, nu ca ingrediente adaugate, iar persoanele cu alergie de
          contact la nichel pot reactiona la urme foarte mici. Testarea pe lot este exact genul de transparenta
          care merita ceruta.
        </p>

        <h2>Cum citesti o lista INCI in 30 de secunde</h2>
        <p>
          Toate cosmeticele vandute in UE au lista de ingrediente in nomenclatura INCI, iar ea urmeaza o regula
          simpla pe care putini o folosesc: <strong>ingredientele sunt listate in ordinea descrescatoare a
          concentratiei</strong>, pana la pragul de 1%. Sub 1%, ordinea poate fi oricare.
        </p>
        <p>Ce inseamna practic:</p>
        <ul>
          <li>
            Primele 4-5 ingrediente iti spun aproape tot despre produs. La un sampon vei gasi acolo apa si
            tensioactivii; la o masca, apa si conditionerii.
          </li>
          <li>
            <strong>Ingredientul-vedeta din reclama este adesea spre coada listei.</strong> La samponul
            SnepLumina, uleiul de argan, colagenul si matasea apar dupa mijlocul listei — adica in concentratii
            mici. Nu e o problema si nici o exceptie: asa sunt construite majoritatea samponelor, pentru ca un
            sampon sta pe par un minut si trebuie in primul rand sa curete. La masca, unde produsul are timp sa
            actioneze, aceleasi ingrediente conteaza mai mult.
          </li>
          <li>
            Alergenii din parfum sunt declarati separat la final — linalool, limonene, alpha-isomethyl ionone.
            Daca stii ca reactionezi la vreunul, verifica-i inainte de cumparare.
          </li>
        </ul>
        <p>
          Aceeasi metoda o poti aplica pe orice produs cosmetic, nu doar pe acesta. Detalii si in{" "}
          <a href="/ghid/cosmetice-naturale">ghidul cosmeticelor naturale</a>.
        </p>

        <h2>Proteine si hidratare: echilibrul care conteaza</h2>
        <p>
          SnepLumina este o linie cu <strong>proteine</strong> — colagen si matase hidrolizate. Merita stiut ce
          inseamna asta pentru rutina ta.
        </p>
        <p>
          Proteinele hidrolizate se depun pe cuticula si o intaresc temporar: parul pare mai plin, mai
          rezistent, mai neted. Pentru parul poros, deteriorat de decolorare sau de placa de indreptat, efectul
          e vizibil. Dar proteinele nu inlocuiesc hidratarea, iar un par tratat exclusiv cu produse proteice
          poate deveni, in timp, mai rigid si mai casant la atingere — nu pentru ca produsul ar fi prost, ci
          pentru ca lipseste cealalta jumatate a ecuatiei.
        </p>
        <p>
          Semnalul practic: daca dupa cateva saptamani parul iti pare paradoxal mai uscat si mai „scortos”,
          alterneaza cu o masca pur hidratanta si redu frecventa celei proteice. Este un echilibru personal, nu
          o regula fixa — depinde de porozitate, de istoricul de vopsit si de duritatea apei din zona ta.
        </p>

        <h2>Rutina, pas cu pas</h2>
        <ol>
          <li>
            <strong>Sampon.</strong> Pe parul ud, distribuie cantitatea potrivita direct pe scalp si maseaza
            circular aproximativ 30 de secunde, pana obtii o spuma usoara. Clateste bine. Repeta doar daca e
            necesar.
          </li>
          <li>
            <strong>Masca.</strong> Pe parul spalat si uscat bine cu prosopul, aplica aproximativ o jumatate de
            nuca de produs, uniform pe lungimi si varfuri. Lasa 3-5 minute pentru descurcare si disciplinare
            sau 10-15 minute pentru o actiune mai profunda. Clateste bine.
          </li>
          <li>
            <strong>Ulei.</strong> Cateva picaturi pe lungimi si varfuri, pe parul inca ud, apoi usuca sau
            coafeaza. Dupa coafare, inca 1-2 picaturi pentru netezire si stralucire.
          </li>
        </ol>
        <p>
          Doua greseli frecvente: masca aplicata pe scalp (nu e locul ei — ingreuneaza radacina) si ulei in
          exces (parul devine greu si pare gras; se incepe intotdeauna cu mai putin).
        </p>

        <h2>SnepLumina sau Trico-Salus?</h2>
        <p>
          Este cea mai utila intrebare pe care si-o pun oamenii care ajung pe aceasta pagina, iar raspunsul e
          simplu: <strong>sunt doua linii cu scopuri diferite</strong>.
        </p>
        <ul>
          <li>
            <strong>SnepLumina</strong> lucreaza pe <em>fibra</em> — hidratare, stralucire, textura, aspect.
            Este o linie de frumusete.
          </li>
          <li>
            <strong>Trico-Salus</strong> lucreaza pe <em>scalp</em> — are sampoane dedicate pentru{" "}
            <a href="/produse/par/trico-salus-solution-sampon-anti-caderea-parului">par cu tendinta de rarire</a>,{" "}
            <a href="/produse/par/trico-salus-solution-sampon-pentru-par-cu-matreata">par cu matreata</a>,{" "}
            <a href="/produse/par/trico-salus-solution-sampon-pentru-par-gras">par gras</a> si{" "}
            <a href="/produse/par/trico-salus-solution-sampon-spalare-frecventa">spalare frecventa</a>, plus un{" "}
            <a href="/produse/par/trico-salus-solution-scrub-purificator-efect-detox">scrub purificator</a> si o{" "}
            <a href="/produse/par/trico-salus-solution-loiune-redensifant">lotiune redensifianta</a>.
          </li>
        </ul>
        <p>
          Daca problema ta e la scalp, SnepLumina nu o rezolva — indiferent cat de bine arata parul dupa. Si
          invers: daca scalpul e in regula si vrei doar fir mai neted si mai stralucitor, nu ai nevoie de linia
          tehnica.
        </p>
        <p>
          Se pot combina: sampon Trico-Salus pentru scalp, masca si ulei SnepLumina pentru lungimi. Vezi toata{" "}
          <a href="/produse/par">categoria Par</a>.
        </p>

        <h2>Ce nu poate face un cosmetic pentru par</h2>
        <p>
          Merita spus limpede, pentru ca marketingul din categoria asta e printre cele mai agresive:
        </p>
        <ul>
          <li>
            <strong>Nu poate repara firul.</strong> Parul care iese din scalp este tesut mort. Se poate acoperi,
            netezi si proteja — nu se poate regenera. Varfurile despicate se taie; orice altceva le mascheaza.
          </li>
          <li>
            <strong>Nu poate schimba structura parului.</strong> Daca il ai fin sau cret, un sampon nu modifica
            asta. Poate schimba cum arata si cum se comporta, nu ce este.
          </li>
          <li>
            <strong>Nu poate opri caderea din cauze interne.</strong> Caderea sezoniera, hormonala, post-partum
            sau legata de deficiente nutritionale nu se rezolva din flacon. Acolo e nevoie de analize si de
            medic.
          </li>
          <li>
            <strong>Nu poate compensa caldura excesiva.</strong> Placa la temperatura maxima, zilnic, invinge
            orice serum protector.
          </li>
        </ul>
        <p>
          Ce poate face un produs bun: sa curete fara sa usuce, sa lase fibra neteda si maleabila, sa reduca
          frizz-ul si sa protejeze culoarea. SnepLumina joaca in aceasta categorie — si e onest sa o spunem asa.
        </p>

        <h2>Cui i se potriveste</h2>
        <ul>
          <li>Parului uscat, aspru sau lipsit de stralucire.</li>
          <li>Parului lung, care sufera la varfuri si se incalceste.</li>
          <li>Parului vopsit — uleiul contine filtre care protejeaza culoarea la lumina.</li>
          <li>Celor care vor o rutina simpla, de trei pasi, fara zece produse.</li>
        </ul>

        <h2>Cui nu i se potriveste</h2>
        <ul>
          <li>
            Celor care urmeaza o rutina strict fara siliconi — masca si mai ales uleiul nu se incadreaza.
          </li>
          <li>
            Celor cu par foarte fin si predispus la a se ingreuna; masca si uleiul cer dozare atenta.
          </li>
          <li>
            Celor cu probleme de scalp — matreata, mancarime, cadere accentuata. Acolo e nevoie de alta linie
            sau de un consult dermatologic.
          </li>
          <li>
            Celor cu alergie cunoscuta la vreun ingredient din lista INCI. Toate produsele contin parfum, cu
            alergeni declarati (linalool, limonene, alpha-isomethyl ionone).
          </li>
        </ul>

        <h2>Cum comanzi</h2>
        <p>
          Comanda se plaseaza de pe pagina produsului, telefonic sau pe WhatsApp, cu livrare prin curier in{" "}
          <strong>3-5 zile lucratoare</strong> in toata Romania si factura fiscala. Detalii in{" "}
          <a href="/livrare-si-retur">pagina de livrare si retur</a>, inclusiv dreptul legal de retur in 14
          zile pentru produsele sigilate. Nu vei gasi SnepLumina pe eMAG sau OLX — contractul de distribuitor
          Snep interzice marketplace-urile. Mai multe despre brand pe pagina <a href="/brand/snep">Snep</a>.
        </p>

        <p className="art-cta">
          Nu esti sigur daca linia ti se potriveste sau ai nevoie de altceva pentru scalp? Scrie-ne pe{" "}
          <a href="https://wa.me/40779243541" rel="nofollow">WhatsApp</a> sau suna la{" "}
          <a href="tel:0779243541">0779 243 541</a>. Daca raspunsul corect e „ai nevoie de Trico-Salus, nu de
          SnepLumina”, asta iti vom spune.
        </p>

        <p className="art-disclaimer">
          <strong>Mentiune.</strong> Produsele SnepLumina sunt cosmetice de uz extern. Informatiile de aici au
          caracter informativ si descriu efecte asupra aspectului parului, nu efecte terapeutice. Nu inlocuiesc
          consultul dermatologic. A nu se lasa la indemana copiilor. A se evita contactul cu ochii; in caz de
          contact, clatiti bine cu apa. Daca apare orice reactie in timpul utilizarii, opriti folosirea
          produsului. Verificati intotdeauna lista INCI de pe ambalaj daca aveti alergii cunoscute.
        </p>
      </div>

      <section className="guide-faq">
        <div className="eyebrow">Intrebari frecvente</div>
        <h2 className="guide-faq__title">Intrebari despre SnepLumina</h2>
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
          <a href="/produse/par" className="guide-related__cat">Par</a>
          <a href="/produse/fata" className="guide-related__cat">Fata</a>
          <a href="/produse/corp" className="guide-related__cat">Corp</a>
          <a href="/produse/makeup" className="guide-related__cat">Make-up</a>
        </div>
        <ul className="guide-related__links">
          <li><a href="/trico-salus">Trico-Salus: ghid complet</a></li>
          <li><a href="/ghid/cosmetice-naturale">Ghidul cosmeticelor naturale</a></li>
          <li><a href="/articole/cosmetice-naturale-fara-parabeni">Cosmetice fara parabeni: ce sa cauti pe eticheta</a></li>
          <li><a href="/olivox-supliment-antioxidant">Olivox: ghid complet</a></li>
          <li><a href="/kalosnep">KaloSnep: ghid complet</a></li>
        </ul>
      </aside>

      <section className="guide-cta">
        <h2 className="guide-cta__title">Vezi produsele SnepLumina</h2>
        <p className="guide-cta__sub">Livrare 3–5 zile in toata Romania · Factura fiscala · Suport in romana</p>
        <div className="guide-cta__btns">
          {[box, ...variants.filter((v) => v.slug !== "sneplumina-box")]
            .filter(Boolean)
            .slice(0, 3)
            .map((v, i) => (
              <a
                key={v!.slug}
                href={hrefFor(v!)}
                className={i === 0 ? "guide-cta__btn-primary" : "guide-cta__btn-outline"}
              >
                {VARIANT_LABELS[v!.slug]?.scurt || v!.name}
              </a>
            ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}
