import { cache } from "react";
import { supabase } from "@/lib/supabase";

export interface ProductRow {
  id: number;
  name: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  ingredients: string | null;
  warnings: string | null;
  usage_info: string | null;
  certifications: string | null;
  datasheet_url: string | null;
  datasheet_r2_url: string | null;
  price: number | null;
  currency: string | null;
  sku: string | null;
  quantity: string | null;
  points: number | null;
  stock_status: string | null;
  r2_image_url: string | null;
  image_url: string | null;
  meta_title: string | null;
  meta_description: string | null;
  keywords: string | null;
  category_slugs: string[] | null;
}

// Cached per request: layout (metadata + JSON-LD) and page (markup) share one query.
export const getProduct = cache(async (productSlug: string): Promise<ProductRow | null> => {
  const { data } = await supabase
    .from("products")
    .select(
      "id, name, slug, short_description, description, ingredients, warnings, usage_info, certifications, datasheet_url, datasheet_r2_url, price, currency, sku, quantity, points, stock_status, r2_image_url, image_url, meta_title, meta_description, keywords, category_slugs"
    )
    .eq("slug", productSlug)
    .single();
  return (data as ProductRow) || null;
});

export const getCategoryName = cache(async (slug: string): Promise<string> => {
  const { data } = await supabase
    .from("product_categories")
    .select("name")
    .eq("slug", slug)
    .single();
  return data?.name || slug.replace(/-/g, " ");
});

// Same-category products, used for the internal-linking block at the bottom.
export const getRelatedProducts = cache(async (categorySlug: string, excludeSlug: string) => {
  const { data } = await supabase
    .from("products")
    .select("id, name, slug, price, currency, r2_image_url, image_url")
    .contains("category_slugs", [categorySlug])
    .neq("slug", excludeSlug)
    .limit(9);
  return (data || []).slice(0, 8);
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
