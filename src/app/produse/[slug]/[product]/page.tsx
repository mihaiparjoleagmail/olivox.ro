import Image from "next/image";
import { notFound } from "next/navigation";
import { getProduct, getRelatedProducts, stripHtml } from "./product-data";
import { getSiteConfig } from "@/lib/site-config";
import OrderForm from "./OrderForm";

interface Props {
  params: Promise<{ slug: string; product: string }>;
}

// Product pages are server-rendered so the name, description, ingredients and
// usage notes exist in the HTML Google receives — not only after hydration.
export const revalidate = 300;

const OPTIMIZED_IMAGE_HOSTS = ["media.ghidulfunerar.ro", "huse.gravpoint.ro"];

// Categories where the legal supplement disclaimer is required (see .claude/CLAUDE.md).
const SUPPLEMENT_CATEGORIES = new Set([
  "suplimente", "nevoi-specifice", "linia-real", "pur", "aloe", "ceaiuri",
  "controlul-greutatii", "programe", "sport", "necesitatile-energetice",
  "omega-si-perle", "proteina", "alimente", "cafea", "choco",
]);

// Product families that have a pillar guide. First match wins.
const PILLAR_GUIDES: { match: RegExp; href: string; title: string; blurb: string }[] = [
  {
    match: /^oliv/i,
    href: "/olivox-supliment-antioxidant",
    title: "Ghid complet Olivox",
    blurb:
      "ce inseamna extractul titrat de frunze de maslin, diferenta dintre capsule, sticla si Olivox 40, mod de utilizare si contraindicatii.",
  },
  {
    match: /^kalo/i,
    href: "/kalosnep",
    title: "Ghid complet KaloSnep",
    blurb:
      "diferenta dintre plicuri, capsule si Kalogel, compozitia cu cifrele de pe eticheta, administrare si avertismentele importante.",
  },
  {
    // `trico[- ]salus`, not `trico`, so the TRICOU t-shirts never match.
    match: /^trico[- ]salus/i,
    href: "/trico-salus",
    title: "Ghid complet Trico-Salus",
    blurb:
      "protocoalele recomandate pentru matreata, scalp gras, scalp uscat si rarire, ce contine fiecare sampon si cand e cazul sa mergi la dermatolog.",
  },
  {
    match: /^sneplumina/i,
    href: "/sneplumina",
    title: "Ghid complet SnepLumina",
    blurb:
      "ce contine fiecare produs, rutina in trei pasi, ce inseamna exact claim-urile de pe eticheta si cand ai nevoie de Trico-Salus in loc.",
  },
  {
    match: /^realfibre/i,
    href: "/realfibre",
    title: "Ghid complet RealFibre",
    blurb:
      "prebiotic, nu probiotic — compozitia in cifre, diferenta dintre pudra, plicuri si comprimate si ce sa astepti in primele zile.",
  },
];

function isOptimized(url: string): boolean {
  try {
    return OPTIMIZED_IMAGE_HOSTS.includes(new URL(url).hostname);
  } catch {
    return false;
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug: categorySlug, product: productSlug } = await params;
  const product = await getProduct(productSlug);

  // Missing product must answer 404, not 200 with an empty shell.
  if (!product) notFound();

  const image = product.r2_image_url || product.image_url || "";
  const currency = product.currency || "RON";
  const price = Number(product.price) || 0;
  const inStock = product.stock_status !== "out_of_stock";
  const shortPlain = stripHtml(product.short_description);
  const shortClipped = shortPlain.length > 180
    ? shortPlain.slice(0, 177).replace(/\s+\S*$/, "") + "..."
    : shortPlain;

  const categories = product.category_slugs || [];
  const needsDisclaimer = categories.some((c) => SUPPLEMENT_CATEGORIES.has(c));
  const related = await getRelatedProducts(categorySlug, product.slug);
  const { shippingCost, shippingLabel } = await getSiteConfig();
  const pillar = PILLAR_GUIDES.find(
    (p) => p.match.test(product.slug) || p.match.test(product.name)
  );

  return (
    <div className="pd-wrap">
      <section className="pd-hero">
        <div className="pd-hero__media">
          {image && (isOptimized(image) ? (
            <Image
              src={image}
              alt={product.name}
              width={640}
              height={640}
              sizes="(max-width: 768px) 100vw, 480px"
              className="pd-hero__img"
              priority
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt={product.name} className="pd-hero__img" />
          ))}
        </div>

        <div className="pd-hero__info">
          <div className="pd-hero__meta">
            {product.sku && <span className="pd-hero__sku">Cod: {product.sku}</span>}
            {product.quantity && <span className="pd-hero__qty">{product.quantity}</span>}
            <span className={`pd-hero__stock ${inStock ? "is-in" : "is-out"}`}>
              {inStock ? "In stoc" : "Indisponibil"}
            </span>
          </div>

          <h1 className="pd-hero__name">{product.name}</h1>

          {shortClipped && <p className="pd-hero__short">{shortClipped}</p>}

          <div className="pd-hero__price-row">
            <div className="pd-hero__price">
              {Math.ceil(price)} <span className="pd-hero__currency">{currency}</span>
            </div>
          </div>
        </div>
      </section>

      <OrderForm
        product={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          price,
          currency,
          inStock,
        }}
        shippingCost={shippingCost}
        shippingLabel={shippingLabel}
      />

      <div className="pd-cards">
        {product.description && (
          <article className="pd-card">
            <h2 className="eyebrow">Descriere {product.name}</h2>
            <div className="pd-card__body" dangerouslySetInnerHTML={{ __html: product.description }} />
          </article>
        )}
        {product.ingredients && (
          <article className="pd-card">
            <h2 className="eyebrow">Ce este inauntru</h2>
            <div className="pd-card__body" dangerouslySetInnerHTML={{ __html: product.ingredients }} />
          </article>
        )}
        {product.usage_info && (
          <article className="pd-card">
            <h2 className="eyebrow">Mod de utilizare</h2>
            <div className="pd-card__body" dangerouslySetInnerHTML={{ __html: product.usage_info }} />
          </article>
        )}
        {product.warnings && (
          <article className="pd-card pd-card--warn">
            <h2 className="eyebrow">Avertismente</h2>
            <div className="pd-card__body" dangerouslySetInnerHTML={{ __html: product.warnings }} />
          </article>
        )}
        {product.certifications && (
          <article className="pd-card pd-card--certifications">
            <h2 className="eyebrow">Certificari</h2>
            <div className="pd-card__body" dangerouslySetInnerHTML={{ __html: product.certifications }} />
          </article>
        )}
        {(product.datasheet_r2_url || product.datasheet_url) && (
          <article className="pd-card">
            <h2 className="eyebrow">Specificatii tehnice</h2>
            <a href={product.datasheet_r2_url || product.datasheet_url || "#"} target="_blank" rel="noopener" className="pd-card__pdf">
              Descarca fisa produs (PDF)
            </a>
          </article>
        )}
      </div>

      {pillar && (
        <a href={pillar.href} className="pd-pillar-link">
          <strong>{pillar.title}</strong> — {pillar.blurb}
        </a>
      )}

      {related.length > 0 && (
        <section className="pd-related">
          <h2 className="eyebrow">Produse din aceeasi categorie</h2>
          <ul className="pd-related__list">
            {related.map((r) => (
              <li key={r.id}>
                <a href={`/produse/${categorySlug}/${r.slug}`} className="pd-related__link">
                  <span className="pd-related__name">{r.name}</span>
                  {r.price != null && (
                    <span className="pd-related__price">{Math.ceil(Number(r.price))} {r.currency || "RON"}</span>
                  )}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {needsDisclaimer && (
        <p className="pd-disclaimer">
          Supliment alimentar. Acest text are caracter informativ si nu inlocuieste consultul medical.
          Suplimentele alimentare nu sunt medicamente si nu sunt destinate tratarii, prevenirii sau vindecarii
          vreunei boli. Nu depasi doza recomandata pe eticheta. A nu se lasa la indemana copiilor.
          Consulta medicul inainte de utilizare, in special daca urmezi un tratament medicamentos,
          esti insarcinata sau alaptezi.
        </p>
      )}
    </div>
  );
}
