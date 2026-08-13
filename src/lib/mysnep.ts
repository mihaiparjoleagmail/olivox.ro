/**
 * Citirea preturilor de pe mysnep.com (platforma furnizorului).
 *
 * Pretul e vizibil doar cu sesiune de distribuitor: ca vizitator pagina nu
 * contine nicio cifra de pret. Sesiunea se tine intr-un cookie PHPSESSID, pus
 * din Admin -> Setari -> mysnep (sau, ca rezerva, din env MYSNEP_COOKIES).
 * Cookie-ul expira periodic — de aceea `fetchSupplierPrice` distinge explicit
 * intre "sesiune expirata" si "pret negasit", ca sa nu scriem preturi gresite.
 *
 * ATENTIE: pretul care ne intereseaza e cel de END USER (pretul de catalog
 * platit de client), nu pretul nostru de distribuitor. Pagina le afiseaza pe
 * amandoua in acelasi bloc — vezi `parseProductPrices`.
 */

const BASE = "https://www.mysnep.com";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36";

export interface PriceCandidate {
  /** Eticheta din stanga cifrei, exact cum apare in pagina. */
  label: string;
  value: number;
  currency: string;
  /** Textul brut din jur — folosit de endpointul de diagnostic. */
  context: string;
}

export interface SupplierPriceResult {
  ok: boolean;
  /** Pretul de catalog, cel platit de clientul final. */
  price: number | null;
  /** Pretul nostru de distribuitor — informativ, nu ajunge pe site. */
  distributorPrice?: number | null;
  currency: string;
  /** Toate cifrele de pret gasite, in ordinea din pagina. */
  candidates: PriceCandidate[];
  /** "expired" cand pagina s-a incarcat dar fara sesiune (nu are niciun pret). */
  reason?: "expired" | "not_found" | "http_error" | "network";
  status?: number;
}

/**
 * Pe pagina logata, cifrele apar in format italian: "RON 209,51" sau
 * "209,51 RON". Punctul e separator de mii, virgula e zecimala.
 */
function parseAmount(raw: string): number | null {
  const cleaned = raw.trim().replace(/\s/g, "");
  if (!/\d/.test(cleaned)) return null;
  // 1.234,56 -> 1234.56 ; 209,51 -> 209.51 ; 209.51 -> 209.51
  let normalized: string;
  if (cleaned.includes(",")) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else {
    normalized = cleaned;
  }
  const n = Number(normalized);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Scoate tag-urile si normalizeaza spatiile, ca sa putem citi etichetele. */
function toText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|td|tr|li|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&euro;/gi, "EUR")
    .replace(/&amp;/gi, "&")
    .replace(/[ \t ]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

/** Toate sumele cu moneda din pagina, cu eticheta care le precede. */
export function extractPriceCandidates(html: string): PriceCandidate[] {
  const text = toText(html);
  const out: PriceCandidate[] = [];
  // "RON 209,51" sau "209,51 RON" / LEI / EUR
  const re = /(?:(RON|LEI|EUR)\s*([\d][\d.,]*)|([\d][\d.,]*)\s*(RON|LEI|EUR))/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const currency = (m[1] || m[4] || "RON").toUpperCase();
    const value = parseAmount(m[2] || m[3] || "");
    if (value == null) continue;
    const before = text.slice(Math.max(0, m.index - 90), m.index);
    // Eticheta = ultima linie inainte de cifra (acolo scrie "Pret", "Pret public"...)
    const label = (before.split("\n").pop() || "").trim();
    out.push({
      label,
      value,
      currency: currency === "LEI" ? "RON" : currency,
      context: text.slice(Math.max(0, m.index - 90), m.index + 40).replace(/\n/g, " | ").trim(),
    });
  }
  return out;
}

/**
 * Blocul de pret al produsului, exact cum arata pe mysnep (verificat 13 aug 2026):
 *
 *   <div id="prod_price">
 *     <strong id="totale_articolo_scontato">RON&nbsp;182,73</strong>
 *     (<strike class="small">RON&nbsp;209,51</strike>)
 *   </div>
 *
 * "scontato" = cu discount, adica pretul NOSTRU de distribuitor. Cifra taiata
 * din <strike> e pretul de catalog, cel platit de clientul final — acela ne
 * intereseaza. Cand produsul nu are discount, <strike> lipseste si singura
 * cifra din bloc e chiar pretul de catalog.
 */
export interface ProductPrices {
  endUser: number | null;
  distributor: number | null;
  currency: string;
}

function extractPriceBlock(html: string): string | null {
  const start = html.search(/<div[^>]*id\s*=\s*["']prod_price["'][^>]*>/i);
  if (start === -1) return null;
  // Blocul e mic; luam o fereastra generoasa si taiem la primul </div></div>.
  return html.slice(start, start + 1200);
}

function firstAmount(fragment: string): { value: number; currency: string } | null {
  const cleaned = fragment.replace(/&nbsp;/gi, " ");
  const m = /(RON|LEI|EUR)\s*([\d][\d.,]*)|([\d][\d.,]*)\s*(RON|LEI|EUR)/i.exec(cleaned);
  if (!m) return null;
  const value = parseAmount(m[2] || m[3] || "");
  if (value == null) return null;
  const cur = (m[1] || m[4] || "RON").toUpperCase();
  return { value, currency: cur === "LEI" ? "RON" : cur };
}

/** Citeste ambele preturi din blocul #prod_price. */
export function parseProductPrices(html: string): ProductPrices {
  const block = extractPriceBlock(html);
  if (!block) return { endUser: null, distributor: null, currency: "RON" };

  const distributor = firstAmount(
    /<strong[^>]*id\s*=\s*["']totale_articolo_scontato["'][^>]*>([\s\S]{0,80}?)<\/strong>/i.exec(block)?.[1] || ""
  );
  const struck = firstAmount(/<strike[^>]*>([\s\S]{0,80}?)<\/strike>/i.exec(block)?.[1] || "");

  // Fara <strike> nu exista discount: pretul afisat e chiar cel de catalog.
  const endUser = struck || distributor;

  return {
    endUser: endUser?.value ?? null,
    distributor: distributor?.value ?? null,
    currency: endUser?.currency || distributor?.currency || "RON",
  };
}

/* =========================================================================
   CATALOGUL FURNIZORULUI
   Paginile de categorie contin, pentru fiecare produs, tot ce ne trebuie:
   link, nume, "Cod: NNNN", pretul de catalog (<strike>) si cel de distribuitor,
   plus disponibilitatea. Le citim de acolo, nu produs cu produs: ~40 de cereri
   in loc de 349.
   ========================================================================= */

export interface SupplierProduct {
  sku: string;
  name: string;
  url: string;
  /** Pretul de catalog (end user). */
  price: number | null;
  distributorPrice: number | null;
  available: boolean;
  /** Slug-ul categoriei mysnep in care a fost gasit prima data. */
  category: string;
}

/** Categoriile din meniul de pe prima pagina. */
export async function fetchCategoryUrls(cookies: string): Promise<string[]> {
  const html = await fetch(`${BASE}/`, { headers: headersFor(cookies), cache: "no-store" }).then((r) => r.text());
  const raw = html.match(/href="([^"]*-AC\d+\.html)"/g) || [];
  // Link-urile apar si ca "../../x-AC4.html" — pastram doar numele fisierului.
  return [...new Set(raw.map((s) => s.slice(6, -1).replace(/^.*\//, "")))];
}

function headersFor(cookies: string): Record<string, string> {
  return {
    "User-Agent": UA,
    "Accept-Language": "ro-RO,ro;q=0.9,it;q=0.8",
    ...(cookies ? { Cookie: cookies } : {}),
  };
}

// Numele produselor vin cu entitati HTML pentru diacritice (&Icirc;NCALZITOR,
// HYDROPURA&reg;). Fara decodare ar ajunge asa in baza de date si pe site.
const NAMED_ENTITIES: Record<string, string> = {
  nbsp: " ", amp: "&", quot: '"', apos: "'", reg: "®", copy: "©", trade: "™",
  deg: "°", laquo: "«", raquo: "»", hellip: "…", ndash: "–", mdash: "—",
  Agrave: "À", Aacute: "Á", Acirc: "Â", Atilde: "Ã", Auml: "Ä", Aring: "Å",
  agrave: "à", aacute: "á", acirc: "â", atilde: "ã", auml: "ä", aring: "å",
  Egrave: "È", Eacute: "É", Ecirc: "Ê", Euml: "Ë",
  egrave: "è", eacute: "é", ecirc: "ê", euml: "ë",
  Igrave: "Ì", Iacute: "Í", Icirc: "Î", Iuml: "Ï",
  igrave: "ì", iacute: "í", icirc: "î", iuml: "ï",
  Ograve: "Ò", Oacute: "Ó", Ocirc: "Ô", Otilde: "Õ", Ouml: "Ö",
  ograve: "ò", oacute: "ó", ocirc: "ô", otilde: "õ", ouml: "ö",
  Ugrave: "Ù", Uacute: "Ú", Ucirc: "Û", Uuml: "Ü",
  ugrave: "ù", uacute: "ú", ucirc: "û", uuml: "ü",
  Ccedil: "Ç", ccedil: "ç", Ntilde: "Ñ", ntilde: "ñ",
  Scedil: "Ş", scedil: "ş", Tcedil: "Ţ", tcedil: "ţ",
};

function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, name) => NAMED_ENTITIES[name] ?? NAMED_ENTITIES[name.toLowerCase()] ?? m)
    .replace(/\s+/g, " ")
    .trim();
}

/** Produsele dintr-o pagina de listare. */
export function parseListingPage(html: string, category: string): SupplierProduct[] {
  const out: SupplierProduct[] = [];
  // Fiecare card incepe cu class="product articolo ...". Produsele din widget-uri
  // (cross-sell) nu au acest container, deci pica singure.
  const cards = html.split(/class="product articolo/).slice(1);
  for (const card of cards) {
    const sku = /Cod:\s*(\d+)/i.exec(card)?.[1];
    if (!sku) continue;
    const href = /<a\s+href="([^"]*-A\d+\.html)"/i.exec(card)?.[1];
    if (!href) continue;
    const name = decodeEntities(
      /<a[^>]+title="([^"]+)"/i.exec(card)?.[1] ||
        /<h3[^>]*class="product-title"[^>]*>\s*<a[^>]*>([\s\S]*?)<br/i.exec(card)?.[1] ||
        ""
    );
    if (!name) continue;

    const struck = firstAmount(/<strike[^>]*>([\s\S]{0,60}?)<\/strike>/i.exec(card)?.[1] || "");
    // Fara <strike> produsul nu are discount: singurul pret afisat e cel de catalog.
    const wFooter = card.split('class="w-footer"')[1] || card;
    const anyAmount = firstAmount(wFooter.slice(0, 600));
    const price = struck?.value ?? anyAmount?.value ?? null;
    const distributorPrice = struck ? firstAmount(wFooter.split("</strike>")[1] || "")?.value ?? null : null;

    out.push({
      sku,
      name,
      url: href.startsWith("http") ? href : `${BASE}/${href.replace(/^\.*\//, "")}`,
      price,
      distributorPrice,
      available: /disponibil|disponibile/i.test(card) && !/nu\s*e?\s*disponibil|non\s*disponibile/i.test(card),
      category,
    });
  }
  return out;
}

/**
 * Parcurge toate categoriile, cu paginare (?pag=N, 24 produse pe pagina) si
 * intoarce catalogul complet, deduplicat dupa cod. Un produs poate aparea in
 * mai multe categorii — pastram prima aparitie.
 */
export async function fetchSupplierCatalog(
  cookies: string,
  onProgress?: (done: number, total: number, label: string) => void
): Promise<{ products: Map<string, SupplierProduct>; expired: boolean }> {
  const categories = await fetchCategoryUrls(cookies);
  const products = new Map<string, SupplierProduct>();
  let pagesDone = 0;
  let sawPrice = false;
  let sawLogin = false;

  for (const cat of categories) {
    let page = 1;
    let declared = Infinity;
    for (;;) {
      const url = `${BASE}/${cat}${page > 1 ? `?pag=${page}` : ""}`;
      const html = await fetch(url, { headers: headersFor(cookies), cache: "no-store" })
        .then((r) => (r.ok ? r.text() : ""))
        .catch(() => "");
      pagesDone++;
      if (!html) break;

      if (page === 1) {
        declared = Number(/(\d+)\s*articole\s*g[ăa]site/i.exec(html)?.[1] || 0);
      }
      if (/REGISTRAZIONE|REGISTRARE/i.test(html) && !/logout|esci\b|deconect/i.test(html)) sawLogin = true;

      const found = parseListingPage(html, cat);
      for (const p of found) {
        if (p.price != null) sawPrice = true;
        if (!products.has(p.sku)) products.set(p.sku, p);
      }
      onProgress?.(pagesDone, 0, `${cat} (pag. ${page})`);

      // 24 pe pagina; ne oprim cand am acoperit cate a declarat categoria.
      if (found.length === 0 || page * 24 >= declared || page > 20) break;
      page++;
    }
  }

  return { products, expired: sawLogin && !sawPrice };
}

/** Cookie-ul de sesiune: intai din setari, apoi din env. */
export function normalizeCookies(raw: string | null | undefined): string {
  return (raw || "").trim().replace(/^Cookie:\s*/i, "");
}

/**
 * Citeste pretul unui produs de pe mysnep. Nu arunca: intoarce mereu un
 * rezultat, ca un produs picat sa nu opreasca toata reactualizarea.
 */
export async function fetchSupplierPrice(
  sourceUrl: string,
  cookies: string,
  signal?: AbortSignal
): Promise<SupplierPriceResult> {
  const url = sourceUrl.startsWith("http") ? sourceUrl : `${BASE}/${sourceUrl.replace(/^\//, "")}`;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        "Accept-Language": "ro-RO,ro;q=0.9,it;q=0.8",
        ...(cookies ? { Cookie: cookies } : {}),
      },
      cache: "no-store",
      signal,
    });
  } catch {
    return { ok: false, price: null, currency: "RON", candidates: [], reason: "network" };
  }

  if (!res.ok) {
    return { ok: false, price: null, currency: "RON", candidates: [], reason: "http_error", status: res.status };
  }

  const html = await res.text();
  const parsed = parseProductPrices(html);
  const candidates = extractPriceCandidates(html);

  if (parsed.endUser == null) {
    // Fara sesiune valida pagina nu contine niciun pret, dar contine butonul de
    // login — asa deosebim "cookie expirat" de "produs fara pret".
    const loggedOut = /REGISTRAZIONE|REGISTRARE|\bLOGIN\b/i.test(html) && !/logout|esci\b|deconect/i.test(html);
    return {
      ok: false,
      price: null,
      currency: "RON",
      candidates,
      reason: loggedOut ? "expired" : "not_found",
    };
  }

  return {
    ok: true,
    price: parsed.endUser,
    distributorPrice: parsed.distributor,
    currency: parsed.currency,
    candidates,
  };
}
