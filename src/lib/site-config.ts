// Default site config — overridden by Supabase settings.site_config
export interface SiteConfig {
  siteName: string;
  domain: string;
  tagline: string;
  logoHtml: string;

  currency: string;
  productPrice?: number;
  productionCost?: number;
  /** Cost fix de livrare, adaugat la totalul comenzii. 0 = livrare gratuita. */
  shippingCost: number;
  /** Eticheta afisata clientului pentru linia de transport (ex: "Curier", "Curier Sameday"). */
  shippingLabel: string;
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
  shippingCost: 30,
  shippingLabel: "Curier",

  companyName: "OLIVOX SRL",
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

let cachedConfig: SiteConfig | null = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

export async function getSiteConfig(): Promise<SiteConfig> {
  if (cachedConfig && Date.now() - cacheTime < CACHE_TTL) return cachedConfig;

  try {
    const { supabase } = await import("./supabase");
    const { data } = await supabase.from("settings").select("value").eq("key", "site_config").single();
    if (data?.value) {
      const parsed = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
      const merged = { ...DEFAULT_CONFIG, ...parsed };
      // shippingCost trebuie sa fie mereu un numar (0 = livrare gratuita, valoare valida).
      const ship = Number(merged.shippingCost);
      merged.shippingCost = Number.isFinite(ship) && ship >= 0 ? ship : DEFAULT_CONFIG.shippingCost;
      merged.shippingLabel = (merged.shippingLabel || "").trim() || DEFAULT_CONFIG.shippingLabel;
      cachedConfig = merged;
      cacheTime = Date.now();
      return merged;
    }
  } catch {}

  cachedConfig = DEFAULT_CONFIG;
  cacheTime = Date.now();
  return DEFAULT_CONFIG;
}
