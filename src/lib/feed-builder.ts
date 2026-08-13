import { supabase } from "@/lib/supabase";

const BASE = "https://olivox.ro";
// Costul de transport vine din site_config (Admin -> Setari -> Preturi).
import { getSiteConfig, resolveShippingCost } from "@/lib/site-config";
import { displayPrice } from "./price";
const BRAND = "Snep";
const GOOGLE_CAT_SUPPLEMENTS = "2984"; // Vitamins & Supplements

export type FeedPlatform = "google" | "facebook" | "tiktok";

interface FeedProduct {
  id: number;
  name: string;
  slug: string;
  sku: string | null;
  image_url: string | null;
  r2_image_url: string | null;
  short_description: string | null;
  description: string | null;
  price: number | null;
  old_price: number | null;
  currency: string | null;
  stock_status: string | null;
  category_slugs: string[] | null;
  meta_title: string | null;
  meta_description: string | null;
  gallery: string[] | null;
  imported_at: string | null;
}

interface FeedStats {
  items: number;
  skipped: number;
  generated_at: string;
  platform: FeedPlatform;
}

function xmlEscape(s: string): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function stripHtml(s: string): string {
  return (s || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchAllProducts(): Promise<FeedProduct[]> {
  const all: FeedProduct[] = [];
  const pageSize = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("products")
      .select("id, name, slug, sku, image_url, r2_image_url, short_description, description, price, old_price, currency, stock_status, category_slugs, meta_title, meta_description, gallery, imported_at")
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error || !data || data.length === 0) break;
    all.push(...(data as FeedProduct[]));
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

function buildProductUrl(p: FeedProduct): string {
  const cat = p.category_slugs?.[0] || "toate";
  return `${BASE}/produse/${cat}/${p.slug}`;
}

function buildTitle(p: FeedProduct): string {
  if (p.meta_title) return p.meta_title;
  return `${p.name} | Snep`;
}

function buildDescription(p: FeedProduct): string {
  const short = stripHtml(p.short_description || "");
  const full = stripHtml(p.description || "");
  const raw = (p.meta_description || short || full || `${p.name} - produs Snep natural, disponibil pe olivox.ro.`).trim();
  return raw.slice(0, 4900);
}

function buildProductType(p: FeedProduct): string {
  const cat = p.category_slugs?.[0] || "";
  const pretty = cat.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return `Suplimente naturale > Snep${pretty ? ` > ${pretty}` : ""}`;
}

function availability(p: FeedProduct): string {
  return p.stock_status === "out_of_stock" ? "out_of_stock" : "in_stock";
}

function shippingBlock(fee: number): string {
  return `<g:shipping>
      <g:country>RO</g:country>
      <g:service>Standard</g:service>
      <g:price>${fee.toFixed(2)} RON</g:price>
    </g:shipping>`;
}

function pricesBlock(p: FeedProduct): string {
  // Aceleasi cifre ca pe pagina de produs — Google respinge feed-ul cand pretul
  // din feed nu e cel afisat pe site.
  const price = displayPrice(p.price);
  const oldPrice = displayPrice(p.old_price);
  // Google: g:price = listing price, g:sale_price = current sale if lower
  if (oldPrice > 0 && oldPrice > price) {
    return `<g:price>${oldPrice.toFixed(2)} RON</g:price>
    <g:sale_price>${price.toFixed(2)} RON</g:sale_price>`;
  }
  return `<g:price>${price.toFixed(2)} RON</g:price>`;
}

function imagesBlock(p: FeedProduct): string {
  const primary = p.r2_image_url || p.image_url || "";
  const extras = (p.gallery || []).filter((g) => g && g !== primary).slice(0, 10);
  const extraTags = extras.map((u) => `<g:additional_image_link>${xmlEscape(u)}</g:additional_image_link>`).join("\n    ");
  return `<g:image_link>${xmlEscape(primary)}</g:image_link>${extraTags ? "\n    " + extraTags : ""}`;
}

function googleItem(p: FeedProduct, shippingFee: number): string {
  const url = buildProductUrl(p);
  const title = xmlEscape(buildTitle(p));
  const desc = xmlEscape(buildDescription(p));
  const productType = xmlEscape(buildProductType(p));
  const sku = p.sku || `OV-${p.id}`;
  const identifierExists = p.sku ? "yes" : "no";

  return `<item>
    <g:id>${xmlEscape(sku)}</g:id>
    <g:title>${title}</g:title>
    <g:description>${desc}</g:description>
    <g:link>${xmlEscape(url)}</g:link>
    ${imagesBlock(p)}
    <g:availability>${availability(p)}</g:availability>
    ${pricesBlock(p)}
    <g:brand>${BRAND}</g:brand>
    <g:mpn>${xmlEscape(sku)}</g:mpn>
    <g:condition>new</g:condition>
    <g:identifier_exists>${identifierExists}</g:identifier_exists>
    <g:google_product_category>${GOOGLE_CAT_SUPPLEMENTS}</g:google_product_category>
    <g:product_type>${productType}</g:product_type>
    ${shippingBlock(shippingFee)}
    <g:custom_label_0>snep</g:custom_label_0>
    <g:custom_label_1>${xmlEscape(p.category_slugs?.[0] || "")}</g:custom_label_1>
  </item>`;
}

function facebookItem(p: FeedProduct, shippingFee: number): string {
  const url = buildProductUrl(p);
  const title = xmlEscape(buildTitle(p));
  const desc = xmlEscape(buildDescription(p));
  const sku = p.sku || `OV-${p.id}`;
  const avail = availability(p) === "out_of_stock" ? "out of stock" : "in stock";

  return `<item>
    <g:id>${xmlEscape(sku)}</g:id>
    <g:title>${title}</g:title>
    <g:description>${desc}</g:description>
    <g:link>${xmlEscape(url)}</g:link>
    ${imagesBlock(p)}
    <g:availability>${avail}</g:availability>
    ${pricesBlock(p)}
    <g:brand>${BRAND}</g:brand>
    <g:condition>new</g:condition>
    <g:google_product_category>${GOOGLE_CAT_SUPPLEMENTS}</g:google_product_category>
    <g:visibility>published</g:visibility>
    ${shippingBlock(shippingFee)}
  </item>`;
}

function tiktokItem(p: FeedProduct): string {
  const url = buildProductUrl(p);
  const title = xmlEscape(buildTitle(p).slice(0, 100));
  const desc = xmlEscape(buildDescription(p));
  const productType = xmlEscape(buildProductType(p));
  const sku = p.sku || `OV-${p.id}`;
  const identifierExists = p.sku ? "yes" : "no";

  return `<item>
    <g:id>${xmlEscape(sku)}</g:id>
    <g:title>${title}</g:title>
    <g:description>${desc}</g:description>
    <g:link>${xmlEscape(url)}</g:link>
    ${imagesBlock(p)}
    <g:availability>${availability(p)}</g:availability>
    ${pricesBlock(p)}
    <g:brand>${BRAND}</g:brand>
    <g:mpn>${xmlEscape(sku)}</g:mpn>
    <g:condition>new</g:condition>
    <g:google_product_category>${GOOGLE_CAT_SUPPLEMENTS}</g:google_product_category>
    <g:product_type>${productType}</g:product_type>
    <g:identifier_exists>${identifierExists}</g:identifier_exists>
  </item>`;
}

export async function buildFeed(platform: FeedPlatform): Promise<{ xml: string; stats: FeedStats }> {
  const products = await fetchAllProducts();
  const config = await getSiteConfig();
  let items = 0;
  let skipped = 0;
  const parts: string[] = [];

  for (const p of products) {
    const img = p.r2_image_url || p.image_url;
    if (!p.slug || !img || !p.category_slugs || p.category_slugs.length === 0 || !p.price) {
      skipped++;
      continue;
    }
    const shippingFee = resolveShippingCost(displayPrice(p.price), config);
    if (platform === "google") parts.push(googleItem(p, shippingFee));
    else if (platform === "facebook") parts.push(facebookItem(p, shippingFee));
    else parts.push(tiktokItem(p));
    items++;
  }

  const now = new Date().toUTCString();
  const title = platform === "facebook" ? "Olivox.ro - Meta Catalog" : platform === "tiktok" ? "Olivox.ro - TikTok Catalog" : "Olivox.ro - Google Shopping";

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>${title}</title>
    <link>${BASE}</link>
    <description>Suplimente alimentare si cosmetice naturale Snep. Livrare in toata Romania.</description>
    <language>ro-RO</language>
    <pubDate>${now}</pubDate>
    <lastBuildDate>${now}</lastBuildDate>
${parts.join("\n")}
  </channel>
</rss>`;

  const stats: FeedStats = { items, skipped, generated_at: new Date().toISOString(), platform };
  await saveStats(stats);
  return { xml, stats };
}

export async function saveStats(stats: FeedStats) {
  const key = `feed_stats_${stats.platform}`;
  try {
    await supabase.from("settings").upsert({ key, value: JSON.stringify(stats) }, { onConflict: "key" });
  } catch {}
}

export async function getAllStats(): Promise<Record<FeedPlatform, FeedStats | null>> {
  const { data } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", ["feed_stats_google", "feed_stats_facebook", "feed_stats_tiktok"]);
  const result: Record<FeedPlatform, FeedStats | null> = { google: null, facebook: null, tiktok: null };
  data?.forEach((row) => {
    try {
      const platform = row.key.replace("feed_stats_", "") as FeedPlatform;
      const val = typeof row.value === "string" ? JSON.parse(row.value) : row.value;
      result[platform] = val;
    } catch {}
  });
  return result;
}
