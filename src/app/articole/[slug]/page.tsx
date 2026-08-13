import type { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface Props {
  params: Promise<{ slug: string }>;
}

interface Article {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string | null;
  image_url: string | null;
  published_at: string | null;
  meta_title: string | null;
  meta_description: string | null;
}

async function getArticle(slug: string): Promise<Article | null> {
  const { data } = await supabase
    .from("articles")
    .select("id, slug, title, excerpt, body, image_url, published_at, meta_title, meta_description")
    .eq("slug", slug)
    .single();
  return (data as Article) || null;
}

function truncate(str: string, max: number): string {
  if (!str || str.length <= max) return str;
  const cut = str.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd() + "…";
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) {
    return { title: "Articol negasit | olivox.ro", robots: { index: false, follow: true } };
  }
  const rawTitle = article.meta_title || `${article.title} | olivox.ro`;
  const title = truncate(rawTitle, 60);
  const description = truncate(article.meta_description || article.excerpt || article.title, 160);
  const url = `https://olivox.ro/articole/${slug}`;
  // Fara imagine proprie articolul ramanea complet fara og:image (lista goala
  // suprascrie si default-ul din layout), deci cadea inapoi pe marca olivox.
  const image = article.image_url || "https://olivox.ro/og-default.jpg";
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title, description, url,
      siteName: "olivox.ro", type: "article", locale: "ro_RO",
      publishedTime: article.published_at || undefined,
      images: [{ url: image, alt: article.title, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image", title, description,
      images: [image],
    },
  };
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return "";
  }
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = await getArticle(slug);

  if (!article) {
    return (
      <div className="page-wrapper">
        <Header />
        <div className="products-loading">Articolul nu a fost gasit.</div>
        <Footer />
      </div>
    );
  }

  const url = `https://olivox.ro/articole/${slug}`;
  const plainExcerpt = (article.excerpt || (article.body || "").replace(/<[^>]+>/g, "").slice(0, 200) || article.title).trim();

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    headline: article.title,
    description: plainExcerpt,
    image: article.image_url ? [article.image_url] : undefined,
    datePublished: article.published_at || undefined,
    dateModified: article.published_at || undefined,
    author: { "@type": "Organization", name: "Snep", url: "https://www.snep.it" },
    publisher: {
      "@type": "Organization",
      name: "olivox.ro",
      url: "https://olivox.ro",
      logo: { "@type": "ImageObject", url: "https://olivox.ro/logo.png" },
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Acasa", item: "https://olivox.ro" },
      { "@type": "ListItem", position: 2, name: "Articole", item: "https://olivox.ro/articole" },
      { "@type": "ListItem", position: 3, name: article.title, item: url },
    ],
  };

  return (
    <div className="page-wrapper">
      <Header />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <nav className="breadcrumb" style={{ padding: "0 16px" }}>
        <a href="/">Acasa</a> / <a href="/articole">Articole</a> / <span>{article.title}</span>
      </nav>

      <header className="article-hero">
        {article.image_url ? (
          <>
            <div className="article-hero__img-wrap">
              <img src={article.image_url} alt={article.title} className="article-hero__img" />
            </div>
            <div className="article-hero__meta">
              <div className="eyebrow">Articol</div>
              <h1 className="article-hero__h1">{article.title}</h1>
              {article.published_at && (
                <p className="article-hero__date">{formatDate(article.published_at)}</p>
              )}
            </div>
          </>
        ) : (
          <div className="article-hero__plain">
            <div className="eyebrow">Articol</div>
            <h1 className="article-hero__h1">{article.title}</h1>
            {article.published_at && (
              <p className="article-hero__date">{formatDate(article.published_at)}</p>
            )}
          </div>
        )}
      </header>

      {article.body && (
        <div className="prose" dangerouslySetInnerHTML={{ __html: article.body }} />
      )}

      <Footer />
    </div>
  );
}
