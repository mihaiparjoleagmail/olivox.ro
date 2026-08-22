import type { Metadata } from "next";
import { cache } from "react";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { displayPrice, schemaPrice } from "@/lib/price";

// Pillar page for "realcomplex" — 474 impressions/90 zile, sub pozitia 9, sub 3
// URL-uri diferite (plic, tab, articolul-ghid) care se canibalizau intre ele.
// Aceeasi reteta ca /realfibre si /kalosnep: preturile vin din DB, ca tabelul
// comparativ si schema Offer sa nu ramana niciodata in urma catalogului.
export const revalidate = 900;

const URL = "https://olivox.ro/realcomplex";

// Vezi nota din app/kalosnep/page.tsx: pretul se compune la randare din cel mai
// mic pret dintre variante, nu se scrie static, ca sa nu ramana in urma.
function buildMetadataText(minPrice: number) {
  const title =
    minPrice > 0
      ? `RealComplex: pret de la ${minPrice} lei, compozitie si administrare`
      : "RealComplex Snep: compozitie, administrare, variante si pret";
  const description =
    minPrice > 0
      ? `RealComplex costa de la ${minPrice} lei. Ghid complet: papadie, mesteacan, anghinare si minerale, diferenta dintre plicuri si comprimate, administrare si contraindicatii.`
      : "Ghid complet RealComplex: papadie, mesteacan, anghinare si minerale, diferenta dintre plicuri si comprimate, administrare si contraindicatii.";
  return { title, description };
}

const VARIANT_SLUGS = ["realcomplex", "realcomplex-tab"];

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

// `zile` = [minim, maxim] cate zile tine un pachet, in functie de doza de pe
// eticheta. La plic doza e fixa (1/zi); la comprimate e flexibila (2-6/zi),
// deci un pachet poate tine intre 20 si 60 de zile.
const VARIANT_NOTES: Record<string, { forma: string; doza: string; zile: [number, number] }> = {
  "realcomplex": { forma: "30 plicuri de 8 g", doza: "1 plic pe zi", zile: [30, 30] },
  "realcomplex-tab": { forma: "120 comprimate de 800 mg", doza: "2–6 comprimate pe zi", zile: [20, 60] },
};

function costPerDay(price: number, zile: [number, number]): string {
  const [min, max] = zile;
  const hi = price / min;
  const lo = price / max;
  const fmt = (n: number) => n.toFixed(1).replace(".", ",");
  return min === max ? `${fmt(hi)} RON` : `${fmt(lo)}–${fmt(hi)} RON`;
}

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
    q: "Ce este RealComplex?",
    a: "RealComplex este un supliment alimentar din catalogul Snep, care poate fi util pentru a favoriza purificarea organismului prin ficat si rinichi. Combina trei extracte vegetale titrate — papadie, mesteacan si anghinare — cu un pachet de minerale (magneziu, calciu, potasiu, fier bisglicinat) si vitaminele C si D. Nu este medicament.",
  },
  {
    q: "Ce contine RealComplex? Compozitia in cifre",
    a: "La doza zilnica (1 plic sau 6 comprimate): 300 mg magneziu (80% VNR), 400 mg calciu la plic / 320 mg la comprimate (50% / 40% VNR), 400 mg potasiu (20% VNR), 14 mg fier bisglicinat (100% VNR), 10 mcg vitamina D3 (200% VNR) si 160 mg vitamina C (200% VNR). Extractele: papadie 400 mg (plic) / 300 mg (tab), mesteacan 400 mg / 300 mg, anghinare 200 mg / 150 mg. Comprimatele mai aduc 1 mg cupru, pe care plicul nu il are.",
  },
  {
    q: "Care este diferenta dintre RealComplex plic si RealComplex TAB?",
    a: "Compozitia de baza e aceeasi, cu doua diferente reale: comprimatele contin in plus cupru (1 mg) si permit o doza flexibila — intre 2 si 6 comprimate pe zi, in functie de cat de concentrat vrei aportul. Plicul are o doza fixa (1 plic pe zi) si contine aroma portocalie plus un indulcitor (sucraloza); comprimatele nu au arome sau indulcitori adaugati, doar agenti de volumizare (izomalt, celuloza microcristalina) necesari ca sa se poata presa tableta.",
  },
  {
    q: "Cum se administreaza RealComplex?",
    a: "Plic: continutul unui pliculet pe zi, direct in gura sau dizolvat intr-un pahar de apa. Comprimate: intre 2 si 6 pe zi, de preferat in timpul mesei. In ambele cazuri, nu depasi doza zilnica recomandata de pe eticheta.",
  },
  {
    q: "Cat costa RealComplex pe zi?",
    a: "Plicul costa fix pe zi, pentru ca doza e fixa. Comprimatele au un cost pe zi variabil, intre cel mai mic si cel mai mare punct al intervalului de doza — vezi tabelul comparativ de mai sus pentru cifrele actualizate. Cu cat iei mai putine comprimate pe zi, cu atat pachetul tine mai mult si costul pe zi scade.",
  },
  {
    q: "RealComplex contine fibre sau are efect laxativ?",
    a: "Contine o cantitate mica de fibre (aproximativ 1 g per plic, provenite din extractele vegetale), nesemnificativa fata de un produs cu fibre precum RealFibre. Eticheta avertizeaza totusi ca un consum excesiv, peste doza recomandata, poate cauza efecte laxative — o mentiune standard la produsele cu extract de papadie si mesteacan, nu o promisiune de efect.",
  },
  {
    q: "Cine ar trebui sa evite RealComplex?",
    a: "Copiii sub 3 ani si persoanele cu hipersensibilitate cunoscuta la unul dintre ingrediente. Pentru ca aduce fier, calciu si vitamina D in doze apropiate de 100-200% din valoarea nutritionala de referinta, persoanele care iau deja suplimente separate cu aceste minerale/vitamine sau au afectiuni renale, hepatice ori de metabolism al fierului (hemocromatoza) ar trebui sa intrebe medicul inainte, ca sa nu ajunga la un aport total prea mare.",
  },
  {
    q: "Se poate lua impreuna cu RealFibre sau cu Kalogel?",
    a: "Da, fara probleme de suprapunere de fibre — RealComplex aduce cantitati neglijabile. Atentia trebuie indreptata spre alte suprapuneri: daca iei deja alt supliment cu fier, calciu sau vitamina D (inclusiv un multivitamin), aduna dozele din toate sursele inainte de a le combina, ca sa nu depasesti valorile de referinta zilnice.",
  },
  {
    q: "Unde gasesc prospectul pentru RealComplex?",
    a: "Prospectul complet — compozitia cu cantitatile de pe eticheta, modul de administrare si avertismentele — este pe pagina fiecarei variante (plic si TAB), in sectiunea Prospect. Fisele tehnice ale producatorului se pot descarca in format PDF din aceeasi sectiune.",
  },
  {
    q: "De ce nu gasesc RealComplex in farmacie sau pe eMAG?",
    a: "Snep distribuie exclusiv prin distribuitori independenti, iar contractul interzice vanzarea pe marketplace-uri precum eMAG sau OLX. Produsul se comanda de pe site-ul distribuitorului, telefonic sau pe WhatsApp, cu livrare in 3-5 zile lucratoare.",
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
      "realcomplex, realcomplex snep, realcomplex pret, realcomplex prospect, realcomplex beneficii, realcomplex tab, realcomplex comprimate, realcomplex plicuri, papadie, anghinare, mesteacan",
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
          url: "https://media.ghidulfunerar.ro/olivox/products/realcomplex.jpg",
          alt: "RealComplex — supliment alimentar Snep",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["https://media.ghidulfunerar.ro/olivox/products/realcomplex.jpg"],
    },
  };
}

export default async function RealcomplexPillarPage() {
  const variants = await getVariants();
  const prices = variants.map((v) => displayPrice(v.price)).filter((p) => p > 0);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const { description } = buildMetadataText(minPrice);

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "RealComplex — ghid complet: compozitie, variante si administrare",
    description,
    image: "https://media.ghidulfunerar.ro/olivox/products/realcomplex.jpg",
    author: { "@type": "Organization", name: "Olivox", url: "https://olivox.ro" },
    publisher: {
      "@type": "Organization",
      name: "olivox.ro",
      logo: { "@type": "ImageObject", url: "https://olivox.ro/logo.png" },
    },
    mainEntityOfPage: URL,
    inLanguage: "ro-RO",
    about: { "@type": "Thing", name: "RealComplex — supliment alimentar" },
  };

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Variantele RealComplex",
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
      { "@type": "ListItem", position: 2, name: "RealComplex — ghid complet", item: URL },
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
        <a href="/">Acasa</a> / <span>RealComplex — ghid complet</span>
      </nav>

      <header className="guide-hero">
        <div className="eyebrow">Ghid complet</div>
        <h1 className="guide-hero__h1">RealComplex: compozitie, variante si administrare</h1>
        <p className="guide-hero__intro">
          RealComplex este, dupa Olivox, unul dintre cele mai cautate produse Snep din Romania — si unul
          impartit intre trei pagini diferite care se canibalizau reciproc in rezultatele Google. Ghidul de
          mai jos aduna totul intr-un singur loc: compozitia reala cu cifrele de pe eticheta, diferenta dintre
          plic si comprimate si cui nu i se adreseaza.
        </p>
      </header>

      <div className="prose">
        <h2>Ce este RealComplex</h2>
        <p>
          RealComplex este un supliment alimentar din catalogul Snep care poate fi util pentru a favoriza{" "}
          <strong>purificarea organismului prin ficat si rinichi</strong>. Combina trei extracte vegetale
          titrate — papadie, mesteacan si anghinare — cu un pachet de minerale (magneziu, calciu, potasiu,
          fier bisglicinat) si vitaminele C si D. Se gaseste in doua forme: plic si comprimate (TAB), cu
          aceeasi baza de compozitie.
        </p>

        <h3>Papadia (Taraxacum officinale)</h3>
        <p>
          Extractul de papadie poate favoriza detoxifierea prin ficat a substantelor toxice si a
          metabolitilor acumulati in organism. Este planta cu titrarea cea mai mare din formula (400 mg la
          plic, 300 mg la comprimate).
        </p>

        <h3>Mesteacanul (Betula pendula)</h3>
        <p>
          Extractul de mesteacan poate incuraja activitatea de diureza, atribuita continutului de flavonoide,
          si poate fi util pentru prevenirea formarii pietrelor renale. In formula, e prezent in aceeasi
          cantitate ca papadia.
        </p>

        <h3>Anghinarea (Cynara scolymus)</h3>
        <p>
          Extractul de anghinare poate promova o actiune coleretica, datorita substantei amare cynarina, care
          stimuleaza secretia de bila. I se atribuie si un rol digestiv, la nivelul stomacului. Este planta cu
          titrarea cea mai mica dintre cele trei (200 mg la plic, 150 mg la comprimate).
        </p>

        <h2>Mineralele si vitaminele</h2>
        <p>La doza zilnica (1 plic sau 6 comprimate), RealComplex aduce:</p>
        <ul>
          <li><strong>Fier bisglicinat</strong> — 14 mg (100% VNR). Fierul bisglicinat este o forma legata de doua molecule de glicina, cunoscuta pentru toleranta si absorbtia buna la nivel gastrointestinal.</li>
          <li><strong>Vitamina C</strong> — 160 mg (200% VNR). Antioxidant, important si pentru absorbtia si utilizarea fierului din aceeasi formula.</li>
          <li><strong>Vitamina D3</strong> — 10 mcg / 400 UI (200% VNR). Impreuna cu calciul, poate contribui la mentinerea oaselor normale.</li>
          <li><strong>Magneziu (citrat)</strong> — 300 mg (80% VNR). Citratul de magneziu poate fi util pentru relaxarea musculara si in situatii de oboseala.</li>
          <li><strong>Calciu</strong> — 400 mg la plic / 320 mg la comprimate (50% / 40% VNR).</li>
          <li><strong>Potasiu (citrat)</strong> — 400 mg (20% VNR).</li>
          <li><strong>Cupru</strong> — 1 mg, <em>doar la comprimate</em>. Este singura diferenta reala de compozitie dintre cele doua variante, in afara de doza.</li>
        </ul>

        <h2>Cele doua variante</h2>

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
          Plicul are o doza fixa, deci un cost fix pe zi. Comprimatele au o doza flexibila (2-6 pe zi), deci
          costul pe zi depinde de cate iei:
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
                      <td>{zile[0] === zile[1] ? `${zile[0]} zile` : `${zile[0]}–${zile[1]} zile`}</td>
                      <td>{costPerDay(displayPrice(v.price), zile)}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        <p>
          La comprimate, cu cat alegi o doza mai mica din intervalul recomandat (2 in loc de 6 pe zi), cu atat
          pachetul tine mai mult si costul pe zi scade — decizia ramane insa una de doza, nu de a intinde
          artificial pachetul.
        </p>

        <h3>Cum alegi intre ele</h3>
        <ul>
          <li>
            <strong>Plicul</strong> — doza fixa, simpla, fara de gandit. Contine aroma portocalie si un
            indulcitor (sucraloza), pentru gust.
          </li>
          <li>
            <strong>Comprimatele (TAB)</strong> — pentru cine vrea sa ajusteze doza in functie de nevoie, intre
            2 si 6 pe zi. Aduc in plus cupru si nu contin arome sau indulcitori adaugati.
          </li>
        </ul>

        <h2>Mod de administrare</h2>
        <ul>
          <li>
            <strong>Plic:</strong> continutul unui pliculet pe zi, direct in gura sau dizolvat intr-un pahar de
            apa.
          </li>
          <li>
            <strong>Comprimate:</strong> intre 2 si 6 pe zi, de preferat in timpul mesei.
          </li>
        </ul>
        <p>
          In ambele cazuri, nu depasi doza zilnica recomandata de pe eticheta si nu lasa produsul la indemana
          copiilor sub 3 ani.
        </p>

        <h2>Cui NU i se adreseaza</h2>
        <ul>
          <li>Copiilor sub 3 ani.</li>
          <li>Persoanelor cu hipersensibilitate cunoscuta la unul dintre ingrediente.</li>
          <li>
            Persoanelor care iau deja alte suplimente cu <strong>fier, calciu sau vitamina D</strong> — inclusiv
            un multivitamin — fara sa fi calculat aportul total. RealComplex aduce 100-200% din valoarea
            nutritionala de referinta la fiecare dintre acestea, deci suprapunerea neatenta duce usor la
            depasire.
          </li>
          <li>
            Persoanelor cu afectiuni renale sau hepatice, ori cu tulburari de metabolism al fierului (de
            exemplu hemocromatoza) — pentru acestea, discutia e cu medicul, nu de catalog.
          </li>
        </ul>

        <h2>Atentie la suprapunerea cu alte produse din linia Real</h2>
        <p>
          RealComplex nu aduce fibre in cantitati notabile (aproximativ 1 g per plic), deci se combina fara
          probleme cu <a href="/realfibre">RealFibre</a>, care este exact sursa de fibre din linie. Atentia
          reala trebuie indreptata spre mineralele si vitaminele deja mentionate mai sus, mai ales daca iei si{" "}
          <a href="/produse/linia-real/realvita">RealVita</a>, care aduce propriul sau pachet de vitamine.
        </p>

        <h2>Greseli frecvente</h2>
        <ul>
          <li>
            <strong>Combinarea cu alt supliment de fier sau calciu</strong> fara sa aduni dozele. E cea mai
            usor de evitat: verifica eticheta oricarui alt produs pe care il iei deja.
          </li>
          <li>
            <strong>Alegerea variantei doar dupa pretul de raft.</strong> Comprimatele par mai ieftine pe cutie,
            dar costul real pe zi depinde de doza aleasa — vezi tabelul de mai sus.
          </li>
          <li>
            <strong>Asteptarea unui efect laxativ intentionat.</strong> Nu acesta e scopul produsului; eticheta
            mentioneaza doar ca un consum excesiv, peste doza recomandata, poate avea acest efect secundar.
          </li>
        </ul>

        <h2>Unde se incadreaza in linia Real</h2>
        <p>RealComplex este una dintre componentele liniei Real, alaturi de:</p>
        <ul>
          <li>
            <a href="/realfibre">RealFibre</a> — fibre prebiotice (inulina, fibre din mar, FOS).
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
          Vezi toata <a href="/produse/linia-real">linia Real</a>, citeste{" "}
          <a href="/articole/realcomplex-snep-ghid">articolul original despre RealComplex</a> pentru varianta
          pe scurt, si, inainte de a porni un program,{" "}
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
          Nu esti sigur daca alegi plicul sau comprimatele, sau daca RealComplex se potriveste cu ce mai iei
          deja? Scrie-ne pe <a href="https://wa.me/40779243541" rel="nofollow">WhatsApp</a> sau suna la{" "}
          <a href="tel:0779243541">0779 243 541</a>. Iti raspunde un distribuitor autorizat Snep, fara
          obligatia de a comanda.
        </p>

        <p className="art-disclaimer">
          <strong>Disclaimer.</strong> Supliment alimentar. Acest ghid are caracter informativ si nu inlocuieste
          consultul medical. Suplimentele alimentare nu sunt medicamente si nu sunt destinate tratarii,
          prevenirii sau vindecarii vreunei boli. Un supliment alimentar nu inlocuieste o dieta variata si
          echilibrata si un stil de viata sanatos. Nu depasi doza recomandata pe eticheta; consumul excesiv
          poate cauza efecte laxative. A nu se lasa la indemana copiilor sub 3 ani. Consulta medicul inainte de
          utilizare, in special daca urmezi un tratament medicamentos, iei deja suplimente cu fier, calciu sau
          vitamina D, ai o afectiune renala sau hepatica, esti insarcinata sau alaptezi.
        </p>
      </div>

      <section className="guide-faq">
        <div className="eyebrow">Intrebari frecvente</div>
        <h2 className="guide-faq__title">Intrebari despre RealComplex</h2>
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
          <li><a href="/realfibre">RealFibre: ghid complet</a></li>
          <li><a href="/kalosnep">KaloSnep: ghid complet</a></li>
          <li><a href="/olivox-supliment-antioxidant">Olivox: ghid complet</a></li>
          <li><a href="/ghid/cum-alegi-supliment">Cum alegi un supliment alimentar</a></li>
        </ul>
      </aside>

      <section className="guide-cta">
        <h2 className="guide-cta__title">Vezi variantele RealComplex</h2>
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
