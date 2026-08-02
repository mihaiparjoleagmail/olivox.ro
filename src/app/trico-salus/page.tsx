import type { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// Pillar page for "trico salus". The line has six products and four distinct
// protocols; today every query lands on whichever shampoo Google picks.
export const revalidate = 900;

const URL = "https://olivox.ro/trico-salus";
const TITLE = "Trico-Salus Solution: linia completa si protocoalele";
const DESCRIPTION =
  "Ghid complet Trico-Salus Solution: cele 6 produse, ce contine fiecare sampon si protocolul recomandat pentru matreata, scalp gras, scalp uscat si rarirea parului.";

const VARIANT_SLUGS = [
  "trico-salus-solution-scrub-purificator-efect-detox",
  "trico-salus-solution-sampon-anti-caderea-parului",
  "trico-salus-solution-sampon-pentru-par-cu-matreata",
  "trico-salus-solution-sampon-pentru-par-gras",
  "trico-salus-solution-sampon-spalare-frecventa",
  "trico-salus-solution-loiune-redensifant",
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
  "trico-salus-solution-scrub-purificator-efect-detox": {
    scurt: "Scrub purificator",
    rol: "exfoliere scalp, 1–2× pe saptamana",
  },
  "trico-salus-solution-sampon-anti-caderea-parului": {
    scurt: "Sampon anti-cadere",
    rol: "par cu tendinta de rarire",
  },
  "trico-salus-solution-sampon-pentru-par-cu-matreata": {
    scurt: "Sampon matreata",
    rol: "scalp cu descuamare",
  },
  "trico-salus-solution-sampon-pentru-par-gras": {
    scurt: "Sampon par gras",
    rol: "scalp cu sebum in exces",
  },
  "trico-salus-solution-sampon-spalare-frecventa": {
    scurt: "Sampon spalare frecventa",
    rol: "curatare zilnica, de alternanta",
  },
  "trico-salus-solution-loiune-redensifant": {
    scurt: "Lotiune redensifianta",
    rol: "fara clatire, cicluri de 8 saptamani",
  },
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
    q: "Ce este Trico-Salus Solution?",
    a: "Este linia dermatocosmetica pentru scalp din catalogul Snep, formata din sase produse: patru sampoane specifice (anti-cadere, matreata, par gras, spalare frecventa), un scrub purificator si o lotiune redensifianta fara clatire. Toate sunt produse cosmetice de uz extern, nu medicamente.",
  },
  {
    q: "Care este diferenta dintre Trico-Salus si SnepLumina?",
    a: "Trico-Salus lucreaza pe scalp — matreata, sebum, descuamare, rarire. SnepLumina lucreaza pe fibra capilara — hidratare, stralucire, textura. Instructiunile producatorului chiar recomanda trecerea la SnepLumina dupa ce echilibrul scalpului a fost restabilit.",
  },
  {
    q: "Ce au in comun toate produsele din linie?",
    a: "Doua ingrediente apar in aproape toata linia: glutationul, cu rol antioxidant, si oleuropeina din extractul de frunze de maslin, folosita pentru mentinerea echilibrului si calmarea scalpului. Este acelasi compus care sta la baza suplimentului Olivox, doar ca aici este aplicat topic.",
  },
  {
    q: "Cum se foloseste lotiunea redensifianta?",
    a: "Se aplica linie cu linie pe tot scalpul, pe par uscat sau umed, fara clatire, cu o usoara presiune a degetelor, urmata de un masaj. Protocolul este de o aplicare pe zi timp de 8 saptamani consecutive, apoi o luna pauza, apoi reluarea ciclului.",
  },
  {
    q: "De ce se inroseste pielea dupa lotiune?",
    a: "Formula contine methyl nicotinate, un vasodilatator care creste temporar circulatia locala. Producatorul precizeaza pe eticheta ca o usoara inrosire face parte din mecanismul normal de actiune. Se evita expunerea la soare timp de 60 de minute dupa aplicare.",
  },
  {
    q: "Ce sampon aleg daca am si matreata, si par gras?",
    a: "Matreata grasa este exact aceasta combinatie. Protocolul producatorului pentru matreata prevede scrub de 1-2 ori pe saptamana si samponul pentru matreata timp de 2-3 saptamani, apoi alternare cu samponul pentru spalare frecventa. Daca sebumul ramane problema dominanta, samponul pentru par gras devine cel principal.",
  },
  {
    q: "Cat costa linia Trico-Salus?",
    a: "Cele patru sampoane au acelasi pret, scrubul si lotiunea sunt mai scumpe. Preturile actualizate le gasesti in tabelul de mai sus si pe fiecare pagina de produs.",
  },
  {
    q: "Cate fire de par pe zi inseamna cadere normala?",
    a: "Materialul producatorului mentioneaza intervalul de 50-100 de fire pe zi ca fiind normal. Peste acest nivel, mai ales insotit de rarire vizibila si subtierea firului, merita o evaluare — de preferat si una medicala, nu doar cosmetica.",
  },
  {
    q: "Produsele contin sulfati?",
    a: "Sampoanele folosesc sodium coceth sulfate ca tensioactiv principal, alaturi de cocamidopropyl betaine si coco-glucoside. Sunt sulfati, dar din categoria mai bland tolerata decat SLS clasic. Verifica lista INCI de pe ambalaj daca ai sensibilitati cunoscute.",
  },
  {
    q: "De unde comand?",
    a: "De pe pagina fiecarui produs, telefonic sau pe WhatsApp, cu livrare in 3-5 zile lucratoare in toata Romania. Contractul de distribuitor Snep interzice vanzarea pe eMAG, OLX si alte marketplace-uri.",
  },
];

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords:
    "trico salus, trico salus solution, tricosalus, trico salus sampon, trico salus pret, sampon matreata snep, sampon anti cadere snep, lotiune redensifianta, scrub scalp",
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
        url: "https://media.ghidulfunerar.ro/olivox/products/trico-salus-solution-loiune-redensifant.jpg",
        alt: "Trico-Salus Solution — linia dermatocosmetica pentru scalp, Snep",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["https://media.ghidulfunerar.ro/olivox/products/trico-salus-solution-loiune-redensifant.jpg"],
  },
};

// The four protocols the manufacturer documents, as product baskets.
const PROTOCOALE: { nume: string; slugs: string[]; cicluriLotiune: number }[] = [
  {
    nume: "Matreata",
    slugs: [
      "trico-salus-solution-scrub-purificator-efect-detox",
      "trico-salus-solution-sampon-pentru-par-cu-matreata",
      "trico-salus-solution-sampon-spalare-frecventa",
    ],
    cicluriLotiune: 2,
  },
  {
    nume: "Scalp gras",
    slugs: [
      "trico-salus-solution-scrub-purificator-efect-detox",
      "trico-salus-solution-sampon-pentru-par-gras",
      "trico-salus-solution-sampon-spalare-frecventa",
    ],
    cicluriLotiune: 2,
  },
  {
    nume: "Cadere / rarire",
    slugs: [
      "trico-salus-solution-scrub-purificator-efect-detox",
      "trico-salus-solution-sampon-anti-caderea-parului",
    ],
    cicluriLotiune: 3,
  },
  {
    nume: "Scalp uscat",
    slugs: [
      "trico-salus-solution-scrub-purificator-efect-detox",
      "trico-salus-solution-sampon-spalare-frecventa",
    ],
    cicluriLotiune: 2,
  },
];

export default async function TricoSalusPillarPage() {
  const variants = await getVariants();
  const lotiune = variants.find((v) => v.slug === "trico-salus-solution-loiune-redensifant");
  const costCiclu = lotiune?.price != null ? Number(lotiune.price) / 56 : null;

  const priceBySlug = new Map(variants.map((v) => [v.slug, v.price != null ? Number(v.price) : 0]));
  const pretLotiune = priceBySlug.get("trico-salus-solution-loiune-redensifant") || 0;
  const protocoaleCost = PROTOCOALE.map((p) => ({
    ...p,
    total:
      p.slugs.reduce((acc, s) => acc + (priceBySlug.get(s) || 0), 0) +
      p.cicluriLotiune * pretLotiune,
  }));

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Trico-Salus Solution — ghid complet: produse, ingrediente si protocoale",
    description: DESCRIPTION,
    image: "https://media.ghidulfunerar.ro/olivox/products/trico-salus-solution-loiune-redensifant.jpg",
    author: { "@type": "Organization", name: "Olivox", url: "https://olivox.ro" },
    publisher: {
      "@type": "Organization",
      name: "olivox.ro",
      logo: { "@type": "ImageObject", url: "https://olivox.ro/favicon.ico" },
    },
    mainEntityOfPage: URL,
    inLanguage: "ro-RO",
    about: { "@type": "Thing", name: "Trico-Salus Solution — linia dermatocosmetica pentru scalp" },
  };

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Produsele liniei Trico-Salus Solution",
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
        category: "Produs dermatocosmetic pentru scalp",
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
      { "@type": "ListItem", position: 2, name: "Trico-Salus — ghid complet", item: URL },
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
        <a href="/">Acasa</a> / <span>Trico-Salus — ghid complet</span>
      </nav>

      <header className="guide-hero">
        <div className="eyebrow">Ghid complet</div>
        <h1 className="guide-hero__h1">Trico-Salus Solution: linia completa si protocoalele</h1>
        <p className="guide-hero__intro">
          Trico-Salus Solution este linia Snep dedicata scalpului — sase produse dermatocosmetice care se
          folosesc in combinatii diferite, in functie de problema. Spre deosebire de un sampon obisnuit, aici
          nu alegi un produs, ci urmezi un protocol. Ghidul de mai jos le pune pe toate cap la cap: ce contine
          fiecare, ce combinatie recomanda producatorul pentru fiecare situatie si — important — unde se opreste
          ce poate face un cosmetic.
        </p>
      </header>

      <div className="prose">
        <h2>Cele sase produse</h2>
        <p>
          Linia are patru sampoane, un scrub si o lotiune. Sampoanele au acelasi pret intre ele; scrubul si
          lotiunea sunt produsele „tehnice” ale liniei.
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
                      <td>{(v.quantity || "—").split("-")[0].replace("℮", "").trim()}</td>
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

        <h2>Firul comun: glutation si oleuropeina</h2>
        <p>
          Aproape toate produsele din linie impartasesc doua ingrediente, iar asta explica de ce sunt gandite ca
          sistem, nu ca produse independente:
        </p>
        <ul>
          <li>
            <strong>Glutationul</strong> (in formule ca S-Stearoyl glutathione) — un tripeptid cu rol
            antioxidant, folosit aici pentru a favoriza intarirea fiziologica a firului.
          </li>
          <li>
            <strong>Oleuropeina</strong>, din extractul de frunze de maslin (Olea europaea leaf extract) —
            folosita pentru mentinerea echilibrului si calmarea scalpului.
          </li>
        </ul>
        <p>
          Al doilea merita o mentiune aparte: este exact acelasi polifenol care sta la baza suplimentului{" "}
          <a href="/olivox-supliment-antioxidant">Olivox</a>, doar ca acolo se ia intern, iar aici se aplica
          topic. Snep construieste mai multe linii in jurul frunzei de maslin — o coerenta rara pentru un
          catalog de dimensiunea asta.
        </p>

        <h2>Ce contine fiecare produs, in plus</h2>

        <h3>Scrub purificator cu efect detox</h3>
        <p>
          Baza este <strong>hydrated silica</strong> — microgranule care exfoliaza mecanic scalpul, eliberand
          porii. Contine si extract de in (Linum usitatissimum), sursa de omega-3, plus glutation si
          oleuropeina. Se aplica pe par umed, se maseaza circular, se lasa 5 minute, apoi se clateste si se
          continua cu samponul potrivit.
        </p>

        <h3>Sampon anti-caderea parului</h3>
        <p>
          Ingredientele distinctive sunt <strong>extractul de frunze de mesteacan</strong>, bogat in vitamine
          din grupul B, si <strong>extractul de urzica</strong> — folosite in sinergie pentru stimularea
          microcirculatiei scalpului. Contine si sodium DNA, un ingredient cosmetic cu rol de hidratare si film
          protector.
        </p>

        <h3>Sampon pentru par cu matreata</h3>
        <p>
          Aici se afla ingredientul cel mai „functional” din toata linia:{" "}
          <strong>piroctone olamine</strong>, agentul antimatreata propriu-zis, folosit pe scara larga in
          formularile dermocosmetice. Alaturi de el: eucalipt, rozmarin si <strong>mentol</strong>, care da
          senzatia de prospetime si racoare la aplicare.
        </p>

        <h3>Sampon pentru par gras</h3>
        <p>
          Cea mai incarcata formula din linie. Pe langa extractele de castan salbatic, portocala si lamaie,
          contine <strong>cofeina</strong>, <strong>biotina</strong>, <strong>panthenol</strong>,{" "}
          <strong>niacinamida</strong>, <strong>gluconat de zinc</strong>, ammonium glycyrrhizate (derivat din
          lemn dulce, cu rol calmant) si extract de ferment de drojdie. Zincul si niacinamida sunt ingredientele
          clasice in formularile care vizeaza productia de sebum.
        </p>

        <h3>Sampon pentru spalare frecventa</h3>
        <p>
          Cel mai bland din linie si, contraintuitiv, cel mai important: <strong>este samponul de
          alternanta</strong> in aproape toate protocoalele. Contine extract de aloe, extract de galbenele
          (calendula) si ulei de argan, pentru a permite spalarea deasa fara sa iriti scalpul.
        </p>

        <h3>Lotiunea redensifianta</h3>
        <p>
          Produsul cel mai tehnic si cel mai scump din linie. Se aplica fara clatire, pe scalp, iar formula
          contine <strong>methyl nicotinate</strong> — un vasodilatator care creste temporar circulatia locala.
          De aici si precizarea de pe eticheta: o usoara inrosire a pielii face parte din mecanismul normal de
          actiune. Contine si o forma complexa de glutation (S-Arachidonoyl/Linolenoyl/Linoleoyl) plus
          oleuropeina, intr-o baza alcoolica.
        </p>
        {costCiclu != null && (
          <p>
            Flaconul de 100 ml este calculat pentru un ciclu de 8 saptamani la o aplicare pe zi — adica
            aproximativ <strong>{costCiclu.toFixed(1).replace(".", ",")} RON pe zi</strong> pe durata ciclului.
            Protocoalele cer intre 2 si 3 cicluri, cu pauza de o luna intre ele, deci merita bugetat ca atare de
            la inceput.
          </p>
        )}

        <h2>Protocoalele recomandate de producator</h2>
        <p>
          Aceasta este partea pentru care exista pagina. Materialul care insoteste linia descrie patru situatii
          distincte si combinatia de produse pentru fiecare. Le redam mai jos, cu precizarea ca sunt
          recomandarile producatorului pentru produse cosmetice, nu scheme terapeutice.
        </p>

        <h3>Matreata (pitiriazis)</h3>
        <p>
          Producatorul distinge doua forme: <strong>matreata uscata</strong>, in care scuamele se desprind de
          pe piele, si <strong>matreata grasa</strong>, asociata cu productie excesiva de sebum, in care
          scuamele raman atasate de scalp.
        </p>
        <ul>
          <li>Scrub purificator, de 1-2 ori pe saptamana.</li>
          <li>
            Sampon pentru par cu matreata, ori de cate ori e nevoie, timp de aproximativ 2-3 saptamani.
          </li>
          <li>Apoi alternare cu samponul pentru spalare frecventa.</li>
          <li>Lotiune redensifianta, cel putin 2 cicluri de aplicare.</li>
        </ul>

        <h3>Scalp gras (seboree)</h3>
        <ul>
          <li>Scrub purificator, de 1-2 ori pe saptamana.</li>
          <li>Sampon pentru par gras, aproximativ 2 saptamani.</li>
          <li>Apoi alternare cu samponul pentru spalare frecventa.</li>
          <li>Lotiune redensifianta, cel putin 2 cicluri.</li>
        </ul>

        <h3>Cadere excesiva / rarire</h3>
        <p>
          Materialul mentioneaza ca o cadere de aproximativ <strong>50-100 de fire pe zi este considerata
          normala</strong>. Peste acest nivel, insotita de rarire si subtierea firului, se recomanda
          interventie.
        </p>
        <ul>
          <li>Scrub purificator, de 1-2 ori pe saptamana.</li>
          <li>Sampon anti-cadere, ori de cate ori e nevoie.</li>
          <li>
            Lotiune redensifianta, cel putin <strong>trei</strong> cicluri consecutive — mai multe decat la
            celelalte situatii.
          </li>
          <li>
            In luna de pauza dintre cicluri: se continua cu scrubul o data pe saptamana si cu samponul
            anti-cadere.
          </li>
        </ul>

        <h3>Scalp uscat (asteatoza)</h3>
        <p>
          Producatorul insista pe un punct util: <strong>nu se confunda cu matreata</strong>. Aici scuamele sunt
          deshidratate, se desprind compact si de regula nu produc mancarime; problema e asociata cu par uscat,
          deshidratat.
        </p>
        <ul>
          <li>Scrub de 1-2 ori pe saptamana in primele trei saptamani, apoi o data la 7-10 zile.</li>
          <li>Sampon pentru spalare frecventa.</li>
          <li>Lotiune redensifianta, cel putin 2 cicluri.</li>
          <li>
            Dupa aproximativ 3 saptamani, cand echilibrul scalpului s-a restabilit, se recomanda trecerea la
            samponul hidratant si masca din linia <a href="/sneplumina">SnepLumina</a>, cu grija de a nu aplica
            masca pe piele.
          </li>
        </ul>

        <h2>Cat costa un protocol complet</h2>
        <p>
          Nimeni nu iti spune asta inainte sa cumperi primul sampon, asa ca o facem noi. Fiecare protocol
          inseamna mai multe produse, iar lotiunea se ia in 2-3 cicluri — adica 2-3 flacoane. Estimarea de mai
          jos aduna produsele necesare, la preturile curente din catalog:
        </p>
        <div className="olivox-table-wrap">
          <table className="olivox-table">
            <thead>
              <tr>
                <th>Protocol</th>
                <th>Produse</th>
                <th>Cicluri lotiune</th>
                <th>Total estimativ</th>
              </tr>
            </thead>
            <tbody>
              {protocoaleCost.map((p) => (
                <tr key={p.nume}>
                  <td>{p.nume}</td>
                  <td>{p.slugs.length} + lotiune</td>
                  <td>{p.cicluriLotiune}</td>
                  <td>{Math.ceil(p.total)} RON</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Cifrele acopera un parcurs complet, care se intinde pe 5-8 luni cu tot cu pauzele dintre cicluri — nu
          o cheltuiala dintr-o data. Sampoanele de 250 ml tin oricum mai multe luni, deci nu se cumpara din nou
          la fiecare ciclu. Le punem aici ca sa stii de la inceput in ce te bagi, nu ca sa te descurajam.
        </p>
        <p>
          Daca bugetul e o problema, ordinea rezonabila de prioritati este: samponul specific problemei tale,
          apoi scrubul, apoi lotiunea. Lotiunea este cea mai scumpa si cea care cere cel mai mult angajament —
          nu incepe cu ea daca nu esti sigur ca duci ciclul de 8 saptamani pana la capat.
        </p>

        <h2>Cum iti dai seama ce ai</h2>
        <p>
          Alegerea protocolului depinde de identificarea corecta a situatiei, iar doua dintre ele se confunda
          constant. Reperele de mai jos sunt cele folosite de producator:
        </p>
        <ul>
          <li>
            <strong>Matreata uscata</strong> — scuame mici, albicioase, care se desprind usor de pe scalp si
            cad pe umeri. Frecvent insotita de mancarime.
          </li>
          <li>
            <strong>Matreata grasa</strong> — scuamele raman atasate de scalp, iar zona are aspect gras. De
            regula apare impreuna cu sebum in exces.
          </li>
          <li>
            <strong>Scalp gras (seboree)</strong> — fara descuamare notabila, dar parul devine gras si isi
            pierde volumul la scurt timp dupa spalare.
          </li>
          <li>
            <strong>Scalp uscat (asteatoza)</strong> — descuamare si crapare a pielii, dar scuamele sunt
            deshidratate si se desprind compact. In cele mai multe cazuri <em>fara</em> mancarime, si asociat cu
            par uscat. <strong>Nu este matreata</strong>, iar tratarea lui ca atare inrautateste situatia.
          </li>
        </ul>
        <p>
          Distinctia care conteaza cel mai mult: <strong>mancarime + scuame grase = matreata; lipsa mancarimii
          + scuame uscate + par deshidratat = scalp uscat.</strong> Daca esti in dubiu, un dermatolog
          diferentiaza in doua minute — si merita drumul inainte sa cumperi trei produse gresite.
        </p>

        <h2>De ce conteaza alternanta sampoanelor</h2>
        <p>
          Este detaliul cel mai des ignorat din toate protocoalele. Samponul specific — antimatreata, pentru
          par gras — este activ si conceput pentru perioade limitate: 2-3 saptamani de utilizare intensiva,
          apoi <strong>alternare</strong> cu samponul pentru spalare frecventa.
        </p>
        <p>
          Logica e simpla: un sampon activ folosit continuu, la nesfarsit, ajunge sa dezechilibreze exact ce
          incerca sa corecteze. Samponul de spalare frecventa e blandul care permite spalarea deasa fara sa
          usuce, si de aceea apare in aproape toate schemele. Nu e produsul „de umplutura" al liniei, cum pare
          la prima vedere.
        </p>

        <h2>Ce sunt aceste produse, din punct de vedere legal</h2>
        <p>
          Merita spus limpede, pentru ca materialele producatorului folosesc pe alocuri un vocabular care suna
          medical: <strong>toate produsele Trico-Salus sunt cosmetice de uz extern</strong>. Nu sunt
          medicamente, nu sunt destinate tratarii vreunei boli si nu inlocuiesc un consult dermatologic.
        </p>
        <p>
          Asta nu inseamna ca nu fac nimic — un cosmetic bine formulat poate curata fara sa usuce, poate reduce
          descuamarea vizibila, poate imbunatati aspectul si confortul scalpului. Inseamna doar ca limita este
          la aspect si confort, nu la diagnostic si tratament.
        </p>

        <h3>Cand mergi la medic, nu la raft</h3>
        <ul>
          <li>Cadere brusca, in smocuri, sau zone fara par bine delimitate.</li>
          <li>Rarire progresiva care continua peste 2-3 luni in ciuda ingrijirii.</li>
          <li>Scalp cu leziuni, cruste, sangerare sau durere.</li>
          <li>Mancarime intensa care nu cedeaza.</li>
          <li>Cadere aparuta dupa o boala, o interventie, o sarcina sau odata cu un tratament nou.</li>
        </ul>
        <p>
          Caderea parului are frecvent cauze interne — hormonale, nutritionale, autoimune, medicamentoase.
          Niciun sampon nu le rezolva, oricat de bine formulat ar fi. Un cosmetic potrivit ajuta in paralel cu
          investigatia, nu in locul ei.
        </p>

        <h2>Trico-Salus sau SnepLumina?</h2>
        <p>
          Cele doua linii de par din catalog se confunda des, desi raspund la nevoi complet diferite:
        </p>
        <ul>
          <li>
            <strong>Trico-Salus</strong> — pentru <em>scalp</em>. Matreata, sebum, descuamare, rarire. Linie
            tehnica, cu protocoale si cicluri.
          </li>
          <li>
            <strong><a href="/sneplumina">SnepLumina</a></strong> — pentru <em>fibra capilara</em>. Hidratare,
            stralucire, textura, anti-frizz. Linie de frumusete, rutina simpla in trei pasi.
          </li>
        </ul>
        <p>
          Nu se exclud — dimpotriva. Instructiunile producatorului trimit explicit catre SnepLumina dupa
          reechilibrarea scalpului uscat. O combinatie logica: sampon Trico-Salus pentru scalp, masca si ulei
          SnepLumina pentru lungimi. Vezi toata <a href="/produse/par">categoria Par</a>.
        </p>

        <h2>Greseli frecvente</h2>
        <ul>
          <li>
            <strong>Cumpararea unui singur sampon si asteptarea rezultatelor de protocol.</strong> Linia e
            construita in jurul combinatiei sampon specific + scrub + lotiune. Samponul singur face doar o parte
            din treaba.
          </li>
          <li>
            <strong>Renuntarea la samponul de spalare frecventa.</strong> Pare cel mai „inutil” din linie, dar
            este piesa de alternanta din aproape toate protocoalele — folosirea continua doar a samponului
            specific nu este ce recomanda producatorul.
          </li>
          <li>
            <strong>Intreruperea lotiunii dupa doua saptamani.</strong> Ciclul este de 8 saptamani. Evaluarea la
            doua saptamani nu inseamna nimic.
          </li>
          <li>
            <strong>Confundarea scalpului uscat cu matreata.</strong> Sunt situatii diferite, cu protocoale
            diferite — si un sampon antimatreata pe un scalp uscat il usuca si mai tare.
          </li>
          <li>
            <strong>Expunerea la soare imediat dupa lotiune.</strong> Eticheta cere evitarea soarelui timp de 60
            de minute dupa aplicare.
          </li>
          <li>
            <strong>Scrub pe scalp cu leziuni.</strong> Eticheta interzice explicit aplicarea pe pielea cu
            leziuni.
          </li>
        </ul>

        <h2>Cum comanzi</h2>
        <p>
          Comanda se plaseaza de pe pagina produsului, telefonic sau pe WhatsApp, cu livrare prin curier in{" "}
          <strong>3-5 zile lucratoare</strong> in toata Romania si factura fiscala. Detalii in{" "}
          <a href="/livrare-si-retur">pagina de livrare si retur</a>, inclusiv dreptul legal de retur in 14
          zile pentru produsele sigilate. Produsele Snep nu se vand pe eMAG, OLX sau alte marketplace-uri —
          este o restrictie contractuala. Mai multe despre brand pe pagina <a href="/brand/snep">Snep</a>.
        </p>

        <p className="art-cta">
          Nu esti sigur ce protocol ti se potriveste sau de unde sa incepi? Scrie-ne pe{" "}
          <a href="https://wa.me/40779243541" rel="nofollow">WhatsApp</a> sau suna la{" "}
          <a href="tel:0779243541">0779 243 541</a>. Daca raspunsul corect e „mergi intai la dermatolog”, asta
          iti vom spune.
        </p>

        <p className="art-disclaimer">
          <strong>Mentiune.</strong> Produsele Trico-Salus Solution sunt produse dermatocosmetice de uz extern.
          Informatiile de aici au caracter informativ, descriu efecte asupra aspectului si confortului scalpului
          si al parului si nu reprezinta recomandari medicale. Nu inlocuiesc consultul dermatologic. A nu se
          inghiti. A nu se utiliza pe pielea cu leziuni. A se evita contactul cu ochii; in caz de contact,
          clatiti bine cu apa. A nu se lasa la indemana copiilor. In cazul aparitiei oricarei reactii adverse in
          timpul utilizarii, opriti folosirea si consultati un medic. Verificati lista INCI de pe ambalaj daca
          aveti alergii cunoscute.
        </p>
      </div>

      <section className="guide-faq">
        <div className="eyebrow">Intrebari frecvente</div>
        <h2 className="guide-faq__title">Intrebari despre Trico-Salus</h2>
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
          <a href="/produse/nevoi-specifice" className="guide-related__cat">Nevoi specifice</a>
        </div>
        <ul className="guide-related__links">
          <li><a href="/sneplumina">SnepLumina: ghid complet</a></li>
          <li><a href="/olivox-supliment-antioxidant">Olivox: ghid complet</a></li>
          <li><a href="/ghid/cosmetice-naturale">Ghidul cosmeticelor naturale</a></li>
          <li><a href="/articole/cosmetice-naturale-fara-parabeni">Cosmetice fara parabeni: ce sa cauti pe eticheta</a></li>
        </ul>
      </aside>

      <section className="guide-cta">
        <h2 className="guide-cta__title">Vezi produsele Trico-Salus</h2>
        <p className="guide-cta__sub">Livrare 3–5 zile in toata Romania · Factura fiscala · Suport in romana</p>
        <div className="guide-cta__btns">
          {variants.slice(0, 3).map((v, i) => (
            <a
              key={v.slug}
              href={hrefFor(v)}
              className={i === 0 ? "guide-cta__btn-primary" : "guide-cta__btn-outline"}
            >
              {VARIANT_LABELS[v.slug]?.scurt || v.name}
            </a>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}
