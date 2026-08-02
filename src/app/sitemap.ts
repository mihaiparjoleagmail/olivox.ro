import { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase";

const BASE = "https://olivox.ro";

// Refresh hourly instead of freezing at build time, so new products and
// articles reach the sitemap without a redeploy — and so a bad generation
// heals itself on the next revalidation.
export const revalidate = 3600;

// A silent `catch {}` here once shipped a sitemap missing all 29 categories and
// all 9 articles, with no error anywhere — the queries lose the race against
// the ~60 other pages prerendering concurrently at build time. So: retry a few
// times, then fail loudly. A failed build is recoverable; a quietly truncated
// sitemap is not.
// `query` returns the Supabase builder, which is thenable but not a real
// Promise — hence PromiseLike rather than Promise.
async function fetchSection<T>(
  name: string,
  query: () => PromiseLike<{ data: T[] | null; error: unknown }>
): Promise<T[]> {
  let lastProblem = "necunoscut";

  for (let attempt = 1; attempt <= 3; attempt++) {
    const { data, error } = await query();

    if (!error && data && data.length > 0) return data;

    lastProblem = error ? JSON.stringify(error) : "raspuns gol";
    console.warn(`sitemap: "${name}" incercarea ${attempt}/3 a esuat (${lastProblem})`);

    if (attempt < 3) await new Promise((r) => setTimeout(r, attempt * 500));
  }

  throw new Error(
    `sitemap: sectiunea "${name}" nu a putut fi citita dupa 3 incercari (${lastProblem}) — ` +
      `refuz sa generez un sitemap trunchiat`
  );
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const core: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE}/categorii`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/articole`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    // /cautare is intentionally absent: it serves `noindex`, so listing it in
    // the sitemap would send Google contradictory signals.
    { url: `${BASE}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE}/despre`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/de-ce-snep`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/livrare-si-retur`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/intrebari-frecvente`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/glosar`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/brand/snep`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/olivox-supliment-antioxidant`, lastModified: now, changeFrequency: "weekly", priority: 0.95 },
    { url: `${BASE}/kalosnep`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/sneplumina`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/realfibre`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/trico-salus`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
  ];

  const guides: MetadataRoute.Sitemap = [
    "suplimente-alimentare-naturale",
    "uleiuri-esentiale-utilizari",
    "cum-alegi-supliment",
    "cafea-functionala-ganoderma",
    "cosmetice-naturale",
  ].map((slug) => ({
    url: `${BASE}/ghid/${slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const legal: MetadataRoute.Sitemap = [
    "termeni-si-conditii",
    "politica-confidentialitate",
    "politica-cookies",
  ].map((slug) => ({
    url: `${BASE}/${slug}`,
    lastModified: now,
    changeFrequency: "yearly",
    priority: 0.2,
  }));

  const categories = await fetchSection("product_categories", () =>
    supabase.from("product_categories").select("slug, imported_at")
  );
  const categoryUrls: MetadataRoute.Sitemap = categories.map((cat) => ({
    url: `${BASE}/produse/${cat.slug}`,
    lastModified: cat.imported_at ? new Date(cat.imported_at) : now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const absUrl = (u: string | null | undefined): string | null => {
    if (!u) return null;
    if (u.startsWith("http://") || u.startsWith("https://")) return u;
    if (u.startsWith("/")) return `${BASE}${u}`;
    return null;
  };

  const products = await fetchSection("products", () =>
    supabase
      .from("products")
      .select("slug, category_slugs, imported_at, image_url, r2_image_url")
      .order("id", { ascending: false })
      .limit(5000)
  );
  const productUrls: MetadataRoute.Sitemap = products
    .filter((p) => p.slug && p.category_slugs && p.category_slugs.length > 0)
    .map((p) => {
      const img = absUrl(p.r2_image_url) || absUrl(p.image_url);
      return {
        url: `${BASE}/produse/${p.category_slugs[0]}/${p.slug}`,
        lastModified: p.imported_at ? new Date(p.imported_at) : now,
        changeFrequency: "weekly" as const,
        priority: 0.6,
        ...(img ? { images: [img] } : {}),
      };
    });

  const articles = await fetchSection("articles", () =>
    supabase
      .from("articles")
      .select("slug, published_at")
      .not("published_at", "is", null)
      .order("published_at", { ascending: false })
      .limit(5000)
  );
  const articleUrls: MetadataRoute.Sitemap = articles
    .filter((a) => a.slug)
    .map((a) => ({
      url: `${BASE}/articole/${a.slug}`,
      lastModified: a.published_at ? new Date(a.published_at) : now,
      changeFrequency: "monthly",
      priority: 0.5,
    }));

  return [...core, ...guides, ...categoryUrls, ...productUrls, ...articleUrls, ...legal];
}
