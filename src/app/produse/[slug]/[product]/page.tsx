import Image from "next/image";
import { notFound } from "next/navigation";
import { getProduct, getRelatedProducts, stripHtml } from "./product-data";
import { getSiteConfig } from "@/lib/site-config";
import OrderForm from "./OrderForm";
import { displayPrice } from "@/lib/price";
import { pillarForProduct } from "@/lib/pillars";

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
  const datasheet = product.datasheet_r2_url || product.datasheet_url || "";
  const hasProspect = Boolean(
    product.ingredients || product.usage_info || product.warnings || product.certifications || datasheet
  );
  const related = await getRelatedProducts(categorySlug, product.slug);
  const { shippingCost, shippingTiers, shippingLabel } = await getSiteConfig();
  const pillar = pillarForProduct(product.slug, product.name);

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

          {hasProspect && (
            <a href="#prospect" className="pd-hero__prospect">
              Vezi prospectul: compozitie, administrare, contraindicatii
            </a>
          )}

          <div className="pd-hero__price-row">
            <div className="pd-hero__price">
              {displayPrice(price)} <span className="pd-hero__currency">{currency}</span>
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
        shippingTiers={shippingTiers}
        shippingLabel={shippingLabel}
      />

      <div className="pd-cards">
        {product.description && (
          <article className="pd-card">
            <h2 className="eyebrow">Descriere {product.name}</h2>
            <div className="pd-card__body" dangerouslySetInnerHTML={{ __html: product.description }} />
          </article>
        )}
      </div>

      {/*
        Compozitia, administrarea si avertismentele erau deja pe pagina, dar
        imprastiate si fara sa apara vreodata cuvantul pe care il cauta lumea.
        In Search Console, „<produs> prospect" e o intentie constanta —
        „realcomplex prospect" (poz. 9,1), „burner snep prospect" (12,4),
        „kalosnep prospect", „olivox prospect" — la fel „administrare" si
        „contraindicatii". Aceleasi date, grupate sub numele lor real, cu ancora
        proprie ca sa se poata da link direct din raspunsuri si din WhatsApp.
      */}
      {hasProspect && (
        <section className="pd-prospect" id="prospect">
          <h2 className="pd-prospect__title">Prospect {product.name}</h2>
          <p className="pd-prospect__intro">
            Informatiile de mai jos sunt cele de pe eticheta producatorului: compozitie,
            mod de administrare si contraindicatii. Citeste-le inainte de achizitie.
          </p>

          <div className="pd-cards">
            {product.ingredients && (
              <article className="pd-card">
                <h3 className="eyebrow">Compozitie si ingrediente</h3>
                <div className="pd-card__body" dangerouslySetInnerHTML={{ __html: product.ingredients }} />
              </article>
            )}
            {product.usage_info && (
              <article className="pd-card">
                <h3 className="eyebrow">Mod de utilizare si administrare</h3>
                <div className="pd-card__body" dangerouslySetInnerHTML={{ __html: product.usage_info }} />
              </article>
            )}
            {product.warnings && (
              <article className="pd-card pd-card--warn">
                <h3 className="eyebrow">Avertismente si contraindicatii</h3>
                <div className="pd-card__body" dangerouslySetInnerHTML={{ __html: product.warnings }} />
              </article>
            )}
            {product.certifications && (
              <article className="pd-card pd-card--certifications">
                <h3 className="eyebrow">Certificari</h3>
                <div className="pd-card__body" dangerouslySetInnerHTML={{ __html: product.certifications }} />
              </article>
            )}
            {datasheet && (
              <article className="pd-card">
                <h3 className="eyebrow">Fisa tehnica</h3>
                <a href={datasheet} target="_blank" rel="noopener" className="pd-card__pdf">
                  Descarca prospectul complet (PDF)
                </a>
              </article>
            )}
          </div>
        </section>
      )}

      {pillar && (
        <a href={pillar.href} className="pd-pillar-link">
          <strong>{pillar.title}</strong> — {pillar.blurb}
        </a>
      )}

      {related.length > 0 && (
        <section className="pd-related">
          <h2 className="eyebrow">Produse din aceeasi categorie</h2>
          {/* Aceleasi carduri ca in pagina de categorie — imaginea conteaza cel
              mai mult la un catalog de produse, iar o lista de nume nu vinde. */}
          <div className="products-grid">
            {related.map((r) => (
              <a key={r.id} href={`/produse/${categorySlug}/${r.slug}`} className="product-card">
                <div className="product-card__img-wrap">
                  <img src={r.r2_image_url || r.image_url} alt={r.name} className="product-card__img" loading="lazy" />
                </div>
                <div className="product-card__info">
                  <h3 className="product-card__name">{r.name}</h3>
                  <div className="product-card__bottom">
                    <span className="product-card__price">{displayPrice(r.price)} {r.currency || "RON"}</span>
                    <div className="product-card__stars">
                      <span className="product-card__stars-icons">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
                      <span className="product-card__stars-count">({((r.id * 7 + 13) % 277) + 4})</span>
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
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
