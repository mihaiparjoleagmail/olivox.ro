import type { Metadata } from "next";
import { getProduct, getCategoryName, stripHtml, truncate } from "./product-data";
import { getSiteConfig } from "@/lib/site-config";

interface Props {
  params: Promise<{ slug: string; product: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug: categorySlug, product: productSlug } = await params;
  const product = await getProduct(productSlug);

  if (!product) {
    return {
      title: "Produs negasit | olivox.ro",
      description: "Produsul cautat nu a fost gasit.",
      robots: { index: false, follow: true },
    };
  }

  const plainShort = stripHtml(product.short_description);
  const plainDesc = plainShort || stripHtml(product.description).slice(0, 160);
  const rawTitle = product.meta_title || `${product.name} | olivox.ro`;
  const title = truncate(rawTitle, 60);
  const description = truncate(
    product.meta_description || plainDesc || `${product.name} — ${product.price} RON. Comanda acum pe olivox.ro.`,
    160
  );
  const image = product.r2_image_url || product.image_url || "";
  const url = `https://olivox.ro/produse/${categorySlug}/${productSlug}`;

  return {
    title,
    description,
    keywords: product.keywords || undefined,
    alternates: { canonical: url },
    openGraph: {
      title, description, url,
      siteName: "olivox.ro", type: "website", locale: "ro_RO",
      images: image ? [{ url: image, alt: product.name, width: 1200, height: 1200 }] : [],
    },
    twitter: {
      card: "summary_large_image", title, description,
      images: image ? [image] : [],
    },
  };
}

export default async function ProductLayout({ params, children }: Props) {
  const { slug: categorySlug, product: productSlug } = await params;
  const product = await getProduct(productSlug);
  const rawCategoryName = await getCategoryName(categorySlug);
  const categoryName = (rawCategoryName || "")
    .toLowerCase()
    .split(" ")
    .map((w: string) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");

  if (!product) return <>{children}</>;

  const url = `https://olivox.ro/produse/${categorySlug}/${productSlug}`;
  const image = product.r2_image_url || product.image_url || "";
  const currency = product.currency || "RON";
  const inStock = product.stock_status !== "out_of_stock";
  const { shippingCost } = await getSiteConfig();

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Acasa", item: "https://olivox.ro" },
      { "@type": "ListItem", position: 2, name: categoryName, item: `https://olivox.ro/produse/${categorySlug}` },
      { "@type": "ListItem", position: 3, name: product.name, item: url },
    ],
  };

  const plainDesc =
    stripHtml(product.meta_description || "") ||
    stripHtml(product.short_description) ||
    stripHtml(product.description).slice(0, 300) ||
    product.name;

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: image ? [image] : undefined,
    description: plainDesc,
    sku: product.sku || String(product.id),
    mpn: product.sku || undefined,
    brand: { "@type": "Brand", name: "Snep" },
    category: categoryName || undefined,
    offers: {
      "@type": "Offer",
      url,
      price: product.price != null ? Number(product.price).toFixed(2) : undefined,
      priceCurrency: currency,
      availability: inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: "olivox.ro" },
      // Plata se face exclusiv online, in avans (transfer bancar). Fara ramburs.
      acceptedPaymentMethod: "http://purl.org/goodrelations/v1#ByBankTransferInAdvance",
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: { "@type": "MonetaryAmount", value: String(shippingCost), currency: "RON" },
        shippingDestination: { "@type": "DefinedRegion", addressCountry: "RO" },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          handlingTime: { "@type": "QuantitativeValue", minValue: 1, maxValue: 2, unitCode: "DAY" },
          transitTime: { "@type": "QuantitativeValue", minValue: 1, maxValue: 3, unitCode: "DAY" },
        },
      },
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "RO",
        returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
        merchantReturnDays: 14,
        returnMethod: "https://schema.org/ReturnByMail",
        returnFees: "https://schema.org/ReturnShippingFees",
        merchantReturnLink: "https://olivox.ro/livrare-si-retur",
      },
    },
  };

  const usage = stripHtml(product.usage_info);
  const warnings = stripHtml(product.warnings);
  const certifs = stripHtml(product.certifications);

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `Cum se livreaza ${product.name}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text:
            `Livrarea se face prin curier rapid, in 3-5 zile lucratoare de la confirmarea comenzii, in toata Romania. ${shippingCost > 0 ? `Transportul costa ${shippingCost} RON, indiferent de localitate.` : "Transportul este gratuit."} Plata se face exclusiv online, prin transfer bancar, inainte de expediere — nu livram cu plata ramburs.`,
        },
      },
      {
        "@type": "Question",
        name: "Pot returna produsul daca nu sunt multumit?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "Da, conform legii, ai dreptul sa returnezi produsul in 14 zile de la primire, fara a justifica decizia, atat timp cat produsul este sigilat si in stare originala.",
        },
      },
      {
        "@type": "Question",
        name: `Este ${product.name} un produs natural?`,
        acceptedAnswer: {
          "@type": "Answer",
          text:
            (certifs && `${product.name} face parte din catalogul Snep, un brand specializat in produse naturale. Certificari: ${truncate(certifs, 220)}`) ||
            `${product.name} face parte din catalogul Snep, un brand italian specializat in suplimente alimentare si cosmetice pe baza de ingrediente naturale, fara aditivi artificiali.`,
        },
      },
      {
        "@type": "Question",
        name: "Cum se utilizeaza corect produsul?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            (usage && truncate(usage, 280)) ||
            (warnings && `Recomandari de utilizare: urmeaza indicatiile de pe ambalaj. Atentionari importante: ${truncate(warnings, 220)}`) ||
            "Urmeaza indicatiile de pe ambalaj sau recomandarile specialistului. In caz de neclaritati, contacteaza echipa olivox.ro pentru consiliere.",
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <nav className="breadcrumb">
        <a href="/">Acasa</a> / <a href={`/produse/${categorySlug}`}>{categoryName}</a> / <span>{product.name}</span>
      </nav>
      {children}
    </>
  );
}
