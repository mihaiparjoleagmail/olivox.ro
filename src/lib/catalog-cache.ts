import { unstable_cache } from "next/cache";
import { supabase } from "./supabase";

// Citirile de catalog pentru /produse/[slug] si /produse/[slug]/[product].
//
// Paginile se randeaza pe server la fiecare vizita (Cache-Control: no-store),
// iar fara cache fiecare vizitator sau crawler facea 4-6 interogari Supabase
// (produs, categorie, produse similare, lista categoriei, numarare). Pe
// instanta NANO, citirile repetate de felul asta au epuizat bugetul de Disk IO
// la husepersonalizate (2026-11-09) — acelasi cod, aceeasi problema aici.
//
// Invalidare: invalidateCatalog() (lib/revalidate-catalog.ts) goleste tag-ul
// la orice scriere din admin (produse, categorii, sincronizare mysnep), ca
// pretul de pe pagina sa nu ramana in urma feed-ului Merchant Center.
// TTL-ul de 1 ora e doar plasa de siguranta pentru modificarile facute direct
// in baza (scripturi, SQL Editor).
//
// La eroare de DB functiile ARUNCA: unstable_cache nu memoreaza exceptiile,
// deci un incident trecator nu ramane in cache ca „produs inexistent" (404).

export const CATALOG_TAG = "catalog";
const TTL = 3600;

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

export interface CategoryRow {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  meta_title: string | null;
  meta_description: string | null;
}

export interface CategoryProduct {
  id: number;
  name: string;
  slug: string;
  price: number;
  currency: string | null;
  r2_image_url: string | null;
  image_url: string | null;
  stock_status: string | null;
}

// null = produsul nu exista (raspuns valid, se memoreaza).
export const getProductCached = unstable_cache(
  async (slug: string): Promise<ProductRow | null> => {
    const { data, error } = await supabase
      .from("products")
      .select(
        "id, name, slug, short_description, description, ingredients, warnings, usage_info, certifications, datasheet_url, datasheet_r2_url, price, currency, sku, quantity, points, stock_status, r2_image_url, image_url, meta_title, meta_description, keywords, category_slugs"
      )
      .eq("slug", slug)
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`produs ${slug}: ${error.message}`);
    return (data as ProductRow) || null;
  },
  ["olivox-product"],
  { revalidate: TTL, tags: [CATALOG_TAG] }
);

export const getCategoryCached = unstable_cache(
  async (slug: string): Promise<CategoryRow | null> => {
    const { data, error } = await supabase
      .from("product_categories")
      .select("id, name, slug, description, image_url, meta_title, meta_description")
      .eq("slug", slug)
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`categorie ${slug}: ${error.message}`);
    return (data as CategoryRow) || null;
  },
  ["olivox-category"],
  { revalidate: TTL, tags: [CATALOG_TAG] }
);

// Toate produsele categoriei, cele mai noi primele. Paginarea, lista din
// JSON-LD si produsele similare se taie din ea in memorie.
export const getCategoryProductsCached = unstable_cache(
  async (slug: string): Promise<CategoryProduct[]> => {
    const { data, error } = await supabase
      .from("products")
      .select("id, name, slug, price, currency, r2_image_url, image_url, stock_status")
      .contains("category_slugs", [slug])
      .order("id", { ascending: false });
    if (error) throw new Error(`produse ${slug}: ${error.message}`);
    return (data || []) as CategoryProduct[];
  },
  ["olivox-category-products"],
  { revalidate: TTL, tags: [CATALOG_TAG] }
);
