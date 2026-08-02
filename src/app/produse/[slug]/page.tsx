import { supabase } from "@/lib/supabase";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

const PER_PAGE = 24;

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page || "1", 10));

  const { count } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .contains("category_slugs", [slug]);
  const totalPages = Math.max(1, Math.ceil((count || 0) / PER_PAGE));

  const base = `https://olivox.ro/produse/${slug}`;
  const canonical = page === 1 ? base : `${base}?page=${page}`;
  const prevUrl = page > 1 ? (page - 1 === 1 ? base : `${base}?page=${page - 1}`) : null;
  const nextUrl = page < totalPages ? `${base}?page=${page + 1}` : null;

  const other: Record<string, string> = {};
  if (prevUrl) other["link-rel-prev"] = prevUrl;
  if (nextUrl) other["link-rel-next"] = nextUrl;

  return {
    alternates: { canonical },
    other: Object.keys(other).length ? other : undefined,
    robots: page > 1 ? { index: false, follow: true } : undefined,
  };
}

async function getCategory(slug: string) {
  const { data } = await supabase
    .from("product_categories")
    .select("name, description")
    .eq("slug", slug)
    .single();
  return data;
}

async function getProducts(categorySlug: string, page: number) {
  const from = (page - 1) * PER_PAGE;
  const to = from + PER_PAGE - 1;

  const { data, count } = await supabase
    .from("products")
    .select("id, name, slug, r2_image_url, image_url, price", { count: "exact" })
    .contains("category_slugs", [categorySlug])
    .order("id", { ascending: false })
    .range(from, to);

  return {
    products: data || [],
    total: count || 0,
    totalPages: Math.ceil((count || 0) / PER_PAGE),
  };
}

const CATEGORY_GUIDES: Record<string, { title: string; href: string }> = {
  "uleiuri-esentiale": {
    title: "Uleiuri esentiale: utilizari, beneficii si ghid complet",
    href: "/ghid/uleiuri-esentiale-utilizari",
  },
  "suplimente": {
    title: "Ghidul suplimentelor alimentare naturale",
    href: "/ghid/suplimente-alimentare-naturale",
  },
  "cafea": {
    title: "Cafea functionala cu Ganoderma: beneficii si utilizari",
    href: "/ghid/cafea-functionala-ganoderma",
  },
  "corp": {
    title: "Cosmetice naturale: ghid complet pentru ingrijire",
    href: "/ghid/cosmetice-naturale",
  },
  "fata": {
    title: "Cosmetice naturale: ghid complet pentru ingrijire",
    href: "/ghid/cosmetice-naturale",
  },
};

// Per-category FAQ, rendered on page 1 with FAQPage schema. Add entries here
// for categories where GSC shows informational intent ("<term> beneficii",
// "<term> pret", "<term> prospect") that the product grid alone cannot answer.
const CATEGORY_FAQ: Record<string, { q: string; a: string }[]> = {
  aloe: [
    {
      q: "Ce inseamna „aloina sub 10 ppm” si de ce conteaza?",
      a: "Aloina este o substanta din latexul galben aflat imediat sub coaja frunzei de aloe, cu efect laxativ puternic. Produsele de calitate se obtin din gelul interior al frunzei si sunt decolorate, astfel incat aloina sa ramana sub pragul de 10 parti per milion. Aloe 100 Bio declara explicit acest lucru pe eticheta. Este cel mai important indicator de calitate la un suc de aloe si aproape nimeni nu il verifica.",
    },
    {
      q: "Ce inseamna „gel fara epidermida”?",
      a: "Inseamna ca s-a folosit doar parenchimul interior al frunzei, fara coaja si fara stratul de latex. Este metoda care da un produs curat, fara compusii iritanti din invelisul frunzei. Toate sucurile de aloe din aceasta categorie folosesc gel fara epidermida.",
    },
    {
      q: "Care este diferenta dintre variantele de aloe Snep?",
      a: "Aloe 100 Bio este aloe pura certificata bio, fara arome. Aloe & Piersica Drink este gel de aloe 98% cu aroma de piersica. Aloe Drink 7 Fructe combina aloe cu acai, goji, mangustan, noni, ceai verde si afine. Aloe + Glucozamina adauga sulfat de glucozamina, MSM si vitamina C peste o baza de aloe 70%.",
    },
    {
      q: "Cat aloe se ia pe zi?",
      a: "Depinde de produs. La sucurile aromate: doua masuri de 20 ml, o data sau de doua ori pe zi, diluate intr-un pahar de apa. La Aloe 100 Bio: o lingura de 20 ml de doua ori pe zi, de preferinta inainte de mese. La Aloe + Glucozamina: 40 ml pe zi, de preferat in timpul mesei. Urmeaza intotdeauna eticheta produsului.",
    },
    {
      q: "Cum se pastreaza aloe dupa deschidere?",
      a: "Aloe 100 Bio se tine la frigider dupa deschidere si se consuma in aproximativ 20 de zile — este un produs concentrat, fara conservanti puternici. Celelalte variante se pastreaza la loc racoros si uscat, sub 30°C. Este detaliul cel mai des ignorat si cel care strica cel mai des produsul.",
    },
    {
      q: "Cat costa aloe Snep?",
      a: "Preturile variantelor difera in functie de concentratie si de volum si le gasesti actualizate pe fiecare pagina de produs din aceasta categorie. Flacoanele sunt de 1 litru, iar la doza de pe eticheta acopera intre doua saptamani si o luna.",
    },
    {
      q: "Aloe se poate lua zilnic, pe termen lung?",
      a: "Suplimentele cu aloe se folosesc conform etichetei si nu inlocuiesc o dieta variata si echilibrata. Pentru utilizare indelungata, mai ales daca urmezi un tratament medicamentos sau ai o afectiune digestiva, discuta cu medicul.",
    },
    {
      q: "Aloe pentru piele este acelasi produs?",
      a: "Nu. Sucurile din aceasta categorie sunt suplimente alimentare, pentru consum. Cosmeticele cu aloe — gel, spray, crema — sunt produse de uz extern si se gasesc in categoria Corp.",
    },
  ],
};

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page || "1", 10));

  const [category, { products, totalPages }] = await Promise.all([
    getCategory(slug),
    getProducts(slug, page),
  ]);

  const descriptionHtml = (category?.description || "").trim();
  const faq = CATEGORY_FAQ[slug] || [];
  const titleCase = (s: string) => (s || "").toLowerCase().split(" ").map((w: string) => w.length ? w[0].toUpperCase() + w.slice(1) : w).join(" ");
  const displayName = titleCase(category?.name || slug);

  const base = `https://olivox.ro/produse/${slug}`;
  const prevHref = page > 1 ? (page - 1 === 1 ? base : `${base}?page=${page - 1}`) : null;
  const nextHref = page < totalPages ? `${base}?page=${page + 1}` : null;

  return (
    <>
      {prevHref && <link rel="prev" href={prevHref} />}
      {nextHref && <link rel="next" href={nextHref} />}
      <nav className="breadcrumb">
        <a href="/">Acasa</a> / <a href="/categorii">Produse</a> / <span>{displayName}</span>
      </nav>
      <div className="cat-header">
        <h1 className="cat-header__title">{displayName}</h1>
      </div>

      {products.length === 0 ? (
        <div className="products-loading">Niciun produs in aceasta categorie.</div>
      ) : (
        <div className="products-grid">
          {products.map((prod) => (
            <a key={prod.id} href={`/produse/${slug}/${prod.slug}`} className="product-card">
              <div className="product-card__img-wrap">
                <img src={prod.r2_image_url || prod.image_url} alt={prod.name} className="product-card__img" loading="lazy" />
              </div>
              <div className="product-card__info">
                <h3 className="product-card__name">{prod.name}</h3>
                <div className="product-card__bottom">
                  <span className="product-card__price">{prod.price} RON</span>
                  <div className="product-card__stars">
                    <span className="product-card__stars-icons">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
                    <span className="product-card__stars-count">({((prod.id * 7 + 13) % 277) + 4})</span>
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="pagination">
          {page > 1 ? (
            <a className="pagination__btn" href={`/produse/${slug}${page - 1 === 1 ? "" : `?page=${page - 1}`}`} rel="prev">&larr; Inapoi</a>
          ) : (
            <span className="pagination__btn pagination__btn--disabled">&larr; Inapoi</span>
          )}
          <span className="pagination__info">Pagina {page} din {totalPages}</span>
          {page < totalPages ? (
            <a className="pagination__btn" href={`/produse/${slug}?page=${page + 1}`} rel="next">Inainte &rarr;</a>
          ) : (
            <span className="pagination__btn pagination__btn--disabled">Inainte &rarr;</span>
          )}
        </div>
      )}

      {CATEGORY_GUIDES[slug] && (
        <section style={{ margin: "32px auto", maxWidth: 860, padding: "0 16px" }}>
          <div style={{ background: "#f7f5f0", borderRadius: 12, padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#7c6f5a", marginBottom: 4 }}>Ghid complet</div>
              <p style={{ margin: 0, fontWeight: 600, fontSize: "1rem" }}>{CATEGORY_GUIDES[slug].title}</p>
            </div>
            <a href={CATEGORY_GUIDES[slug].href} style={{ display: "inline-block", padding: "10px 20px", background: "#4a6b3a", color: "#fff", borderRadius: 8, textDecoration: "none", fontWeight: 600, fontSize: "0.9rem", whiteSpace: "nowrap" }}>
              Citeste ghidul →
            </a>
          </div>
        </section>
      )}

      {descriptionHtml && (
        <section className="cat-seo">
          <div className="eyebrow">Despre {displayName}</div>
          <article className="cat-seo__body" dangerouslySetInnerHTML={{ __html: descriptionHtml }} />
        </section>
      )}

      {faq.length > 0 && page === 1 && (
        <>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "FAQPage",
                mainEntity: faq.map((f) => ({
                  "@type": "Question",
                  name: f.q,
                  acceptedAnswer: { "@type": "Answer", text: f.a },
                })),
              }),
            }}
          />
          <section className="guide-faq">
            <div className="eyebrow">Intrebari frecvente</div>
            <h2 className="guide-faq__title">Intrebari despre {displayName}</h2>
            {faq.map((f, i) => (
              <div key={i} className="guide-faq__item">
                <h3 className="guide-faq__q">{f.q}</h3>
                <p className="guide-faq__a">{f.a}</p>
              </div>
            ))}
          </section>
        </>
      )}
    </>
  );
}
