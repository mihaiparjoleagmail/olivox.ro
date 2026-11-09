// Default site config — overridden by Supabase settings.site_config
import { normalizeTiers, type ShippingTier } from "./shipping";

export { normalizeTiers, resolveShippingCost, describeTiers } from "./shipping";
export type { ShippingTier } from "./shipping";

export interface SiteConfig {
  siteName: string;
  domain: string;
  tagline: string;
  logoHtml: string;

  currency: string;
  productPrice?: number;
  productionCost?: number;
  /** Cost de livrare folosit cand nu exista plaje configurate. 0 = livrare gratuita. */
  shippingCost: number;
  /** Plaje de transport in functie de valoarea produselor, sortate crescator dupa minValue. */
  shippingTiers: ShippingTier[];
  /** Eticheta afisata clientului pentru linia de transport (ex: "Curier", "Curier Sameday"). */
  shippingLabel: string;
  /**
   * Slug-urile produselor din blocul "Cele mai vandute" de pe prima pagina, in
   * ordinea afisarii. Lista e curata manual — catalogul nu are date de vanzari,
   * iar sortarea automata dupa id scotea in fata ultimele produse importate
   * (tricouri, sticle, autocolante).
   */
  featuredSlugs: string[];
  gravpointApiUrl?: string;

  companyName: string;
  companyCIF: string;
  companyAddress: string;
  companyCounty: string;
  companyLocality: string;

  phone: string;
  emailOrders: string;
  emailFrom: string;
  emailAdmin: string;

  iban: string;
  banca: string;

  metaTitle: string;
  metaDescription: string;
}

export const DEFAULT_CONFIG: SiteConfig = {
  siteName: "olivox.ro",
  domain: "https://olivox.ro",
  tagline: "Suplimente alimentare si cosmetice naturale — catalog Snep in Romania",
  logoHtml: "oli<span>vox</span>.ro",

  currency: "RON",
  productPrice: 0,
  productionCost: 0,
  // Tarif fix, fara plaje: 60 lei pentru orice comanda.
  shippingCost: 60,
  shippingTiers: [],
  shippingLabel: "Curier",
  featuredSlugs: [
    "olivox-40-2-sticle-de-1-litru",
    "burner",
    "realcomplex",
    "cafea-moka-cu-ganoderma",
    "aloe-100-bio",
    "marine-collagen",
    "realvita",
    "omega-3",
  ],

  // Site personal, nu firma: operatorul e o persoana fizica, distribuitor autorizat Snep.
  companyName: "Mirela Parjolea — distribuitor autorizat Snep",
  companyCIF: "",
  companyAddress: "",
  companyCounty: "",
  companyLocality: "",

  phone: "",
  emailOrders: "comenzi@olivox.ro",
  emailFrom: "Olivox <no-reply@ghidulfunerar.ro>",
  emailAdmin: "atelieruldeprint@gmail.com",

  iban: "",
  banca: "",

  metaTitle: "Olivox.ro — Suplimente alimentare si cosmetice naturale Snep",
  metaDescription: "Catalog complet Snep in Romania: suplimente alimentare pe baza de plante, programe nutritionale, alimente functionale, cosmetice naturale. Livrare rapida in 3-5 zile lucratoare.",
};

/**
 * Citirea site_config trece prin Data Cache-ul Next (comun tuturor instantelor
 * Vercel), nu prin memoria fiecarei instante (era 5 min per proces; pe
 * husepersonalizate acelasi tipar dadea ~900 citiri/zi, 2026-11-09).
 * 1 zi; salvarea din admin goleste tag-ul „site-config" (invalidateSiteConfigCache).
 * O eroare de DB arunca, deci NU se pune in cache.
 * `next/cache` si supabase se importa dinamic: fisierul e importat si din client.
 */
async function citesteSiteConfig(): Promise<unknown> {
  const { unstable_cache } = await import("next/cache");
  return unstable_cache(
    async (): Promise<unknown> => {
      const { supabase } = await import("./supabase");
      const { data, error } = await supabase.from("settings").select("value").eq("key", "site_config").maybeSingle();
      if (error) throw new Error(error.message);
      return data?.value ?? null;
    },
    ["site-config"],
    { revalidate: 86400, tags: ["site-config"] }
  )();
}

export async function invalidateSiteConfigCache(): Promise<void> {
  try {
    const { revalidateTag } = await import("next/cache");
    revalidateTag("site-config");
  } catch {}
}

export async function getSiteConfig(): Promise<SiteConfig> {
  try {
    const value = await citesteSiteConfig();
    if (value) {
      const parsed = typeof value === "string" ? JSON.parse(value) : value;
      const merged = { ...DEFAULT_CONFIG, ...parsed };
      // shippingCost trebuie sa fie mereu un numar (0 = livrare gratuita, valoare valida).
      const ship = Number(merged.shippingCost);
      merged.shippingCost = Number.isFinite(ship) && ship >= 0 ? ship : DEFAULT_CONFIG.shippingCost;
      merged.shippingLabel = (merged.shippingLabel || "").trim() || DEFAULT_CONFIG.shippingLabel;
      merged.shippingTiers = normalizeTiers(merged.shippingTiers);
      // Lista curata poate lipsi din DB — atunci ramane cea din cod.
      merged.featuredSlugs = Array.isArray(merged.featuredSlugs) && merged.featuredSlugs.length > 0
        ? merged.featuredSlugs.filter((s: unknown) => typeof s === "string" && s.trim() !== "")
        : DEFAULT_CONFIG.featuredSlugs;
      return merged;
    }
  } catch {}

  return DEFAULT_CONFIG;
}
