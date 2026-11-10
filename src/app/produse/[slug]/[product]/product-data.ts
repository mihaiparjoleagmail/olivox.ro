import { cache } from "react";
import { getProductCached, getCategoryCached, getCategoryProductsCached } from "@/lib/catalog-cache";

export type { ProductRow } from "@/lib/catalog-cache";

// Citirile trec prin Data Cache (lib/catalog-cache.ts, golit din admin si din
// sincronizare); cache() de React le uneste in cadrul aceleiasi randari
// (metadata + layout + pagina).
export const getProduct = cache((productSlug: string) => getProductCached(productSlug));

export const getCategoryName = cache(async (slug: string): Promise<string> => {
  const category = await getCategoryCached(slug);
  return category?.name || slug.replace(/-/g, " ");
});

// Same-category products, used for the internal-linking block at the bottom.
export const getRelatedProducts = cache(async (categorySlug: string, excludeSlug: string) => {
  const all = await getCategoryProductsCached(categorySlug);
  return all.filter((p) => p.slug !== excludeSlug).slice(0, 8);
});

export function stripHtml(html: string | null): string {
  return (html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function truncate(str: string, max: number): string {
  if (!str || str.length <= max) return str;
  const cut = str.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd() + "…";
}
