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

// Folosim fetch() DIN pachetul undici, nu fetch() global — un `dispatcher`
// dintr-un undici instalat separat nu are garantie ca e recunoscut de
// instanta interna de undici din spatele fetch()-ului global al Node (dual
// package hazard: verificat, cu dispatcher pe fetch global, comportamentul
// a ramas identic — semn ca era pur si simplu ignorat).
import { Agent, fetch as undiciFetch } from "undici";

const BASE = "https://www.mysnep.com";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36";

/**
 * fetch() global nu are cum sa opreasca o conexiune blocata la faza de
 * conectare (TCP/TLS) — AbortSignal si Promise.race opresc doar asteptarea
 * noastra, nu si socket-ul de dedesubt, care ramane deschis. Verificat pe
 * productie: dupa ~40 de cereri sincronizarea se agata mereu in acelasi loc
 * (~15-28s), desi aceeasi cerere, ceruta izolat, raspunde in sub 2s — semn
 * ca socket-uri blocate se acumuleaza pana epuizeaza agentul implicit.
 * Cu un Agent propriu si connect timeout strict, o conectare blocata e
 * distrusa efectiv de Node, nu doar abandonata la nivel de JS.
 */
const mysnepAgent = new Agent({
  connect: { timeout: 6000 },
  headersTimeout: 12000,
  bodyTimeout: 12000,
  keepAliveTimeout: 3000,
});

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

/**
 * Unele produse (parfumurile "inspirate", verificat pe profumi-ispirati) nu au
 * pret RON configurat pe mysnep si pagina afiseaza cifra in EUR — fara sa
 * schimbe eticheta. Fara filtrul asta, cifra in EUR ajungea scrisa direct ca
 * RON (ex: "EUR 25,71" citit ca "26 RON" in loc de pretul real, ~131 RON).
 * Mai bine "pret negasit" decat un pret gresit de 5x.
 */
function ronOnly(amt: { value: number; currency: string } | null): number | null {
  return amt && amt.currency === "RON" ? amt.value : null;
}

/**
 * Citeste preturile din blocul #prod_price. Doua forme, ambele intalnite:
 *
 *   cu discount:  <strong id="totale_articolo_scontato">RON 182,73</strong>
 *                 (<strike>RON 209,51</strike>)
 *   fara discount:<strong id="totale_articolo">RON 347,31</strong>
 *
 * Al doilea caz nu are <strike> si foloseste alt id — de aceea nu ne legam de
 * id, ci de <strike>: daca exista, acolo e pretul de catalog si cifra din
 * <strong> e cea de distribuitor; daca nu, singura cifra din bloc e chiar
 * pretul de catalog.
 */
export function parseProductPrices(html: string): ProductPrices {
  const block = extractPriceBlock(html);
  if (!block) return { endUser: null, distributor: null, currency: "RON" };

  const struck = firstAmount(/<strike[^>]*>([\s\S]{0,80}?)<\/strike>/i.exec(block)?.[1] || "");
  const strong = firstAmount(/<strong[^>]*>([\s\S]{0,80}?)<\/strong>/i.exec(block)?.[1] || "");
  const anyAmount = strong || firstAmount(block.slice(0, 400));

  const endUser = struck || anyAmount;
  const distributor = struck ? anyAmount : null;

  return {
    endUser: ronOnly(endUser),
    distributor: ronOnly(distributor),
    currency: "RON",
  };
}

/* =========================================================================
   CATALOGUL FURNIZORULUI
   Paginile de categorie contin, pentru fiecare produs, tot ce ne trebuie:
   link, nume, "Cod: NNNN", pretul de catalog (<strike>) si cel de distribuitor,
   plus disponibilitatea. Le citim de acolo, nu produs cu produs: ~40 de cereri
   in loc de 349.
   ========================================================================= */

/** Numele fara diacritice/entitati/spatii dublate — cheie de potrivire stabila. */
export function normalizeName(name: string): string {
  return decodeEntities(name)
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

export interface SupplierProduct {
  sku: string;
  name: string;
  url: string;
  /** Pretul de catalog (end user). */
  price: number | null;
  distributorPrice: number | null;
  /**
   * true = furnizorul scrie "disponibil", false = scrie ca nu e disponibil,
   * null = nu spune nimic. Pe null NU atingem stocul: exact asa s-au marcat
   * gresit produse ca indisponibile.
   */
  available: boolean | null;
  /** Slug-ul categoriei mysnep in care a fost gasit prima data. */
  category: string;
}

/** Categoriile din meniul de pe prima pagina. */
export async function fetchCategoryUrls(cookies: string): Promise<string[]> {
  const html = await fetchWithTimeout(`${BASE}/`, cookies).then((r) => r.text());
  const raw = html.match(/href="([^"]*-AC\d+\.html)"/g) || [];
  // Link-urile apar si ca "../../x-AC4.html" — pastram doar numele fisierului.
  return [...new Set(raw.map((s) => s.slice(6, -1).replace(/^.*\//, "")))];
}

function headersFor(cookies: string): Record<string, string> {
  return {
    "User-Agent": UA,
    "Accept-Language": "ro-RO,ro;q=0.9,it;q=0.8",
    // mysnep raspunde cu "Keep-Alive: timeout=4, max=150" — o conexiune
    // reutilizata care sta peste 4s intre cereri (posibil in mediul Vercel,
    // nu s-a reprodus local) ramane agatata pe partea clientului cand
    // serverul a inchis-o deja pe tacute. Cerem conexiune noua de fiecare
    // data — mai lent cu o strangere de mana TCP/TLS, dar sigur.
    Connection: "close",
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

/**
 * Disponibilitatea din cardul de listare. Atentie: "indisponibil" contine
 * "disponibil" ca subsir, deci negatiile se verifica primele.
 */
export function readAvailability(card: string): boolean | null {
  const text = card.replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ");
  if (/in?disponibil|non\s*disponibil|esaurito|epuizat|stoc\s*epuizat/i.test(text)) return false;
  if (/(^|[^a-z])disponibil/i.test(text)) return true;
  return null;
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
    const price = ronOnly(struck) ?? ronOnly(anyAmount);
    const distributorPrice = struck ? ronOnly(firstAmount(wFooter.split("</strike>")[1] || "")) : null;

    out.push({
      sku,
      name,
      url: href.startsWith("http") ? href : `${BASE}/${href.replace(/^\.*\//, "")}`,
      price,
      distributorPrice,
      available: readAvailability(card),
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
const PER_PAGE = 24;

/** Pauza scurta intre cereri: mysnep intoarce pagini trunchiate cand e batut prea des. */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * fetch() simplu n-are timeout implicit — daca mysnep accepta conexiunea si
 * nu mai raspunde nimic, cererea ramane agatata si scanarea nu se mai termina
 * niciodata. Cu semnalul asta, o pagina blocata pica in cel mult `ms`, se
 * reincearca sau ajunge in "esuate".
 */
function fetchWithTimeout(url: string, cookies: string, ms = 15000) {
  return undiciFetch(url, {
    headers: headersFor(cookies),
    cache: "no-store",
    signal: AbortSignal.timeout(ms),
    dispatcher: mysnepAgent,
  });
}

/**
 * Timeout "dur", independent de AbortSignal — verificat pe productie ca
 * AbortSignal.timeout() NU e destul: o cerere se putea agata la conectare
 * (din mediul Vercel, nu reprodus local) fara ca semnalul de abort sa o mai
 * opreasca. Promise.race garanteaza ca renuntam dupa `ms`, indiferent ce
 * face fetch-ul pe fir mai departe (cererea agatata ramane sa moara singura).
 */
function raceTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("local-timeout")), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); }
    );
  });
}

/** O pagina, cu cateva reincercari. O cerere picata inseamna produse "disparute". */
async function fetchListing(url: string, cookies: string): Promise<string | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await raceTimeout(fetchWithTimeout(url, cookies), 12000);
      if (r.ok) return await raceTimeout(r.text(), 8000);
    } catch {
      /* reincercam — timeout sau eroare de retea */
    }
    await sleep(400 * (attempt + 1));
  }
  return null;
}

/**
 * Toate produsele unei categorii, paginat. Intoarce si cate a declarat pagina
 * ("N articole gasite"), ca apelantul sa poata verifica daca a citit tot.
 */
async function crawlCategory(
  cat: string,
  cookies: string,
  onPage?: (page: number) => void
): Promise<{ items: SupplierProduct[]; declared: number; loggedOut: boolean }> {
  // Cheia include numele: la textilele EaseLine toate marimile au acelasi cod
  // ("GENUNCHIERA ... - L" si "- XXL" au amandoua Cod: 4000506), deci dedupe
  // dupa cod ar arunca variantele si ar face categoria sa para incompleta.
  const byKey = new Map<string, SupplierProduct>();
  let declared = 0;
  let loggedOut = false;

  for (let page = 1; page <= 30; page++) {
    const url = `${BASE}/${cat}${page > 1 ? `?pag=${page}` : ""}`;
    const html = await fetchListing(url, cookies);
    if (html === null) break;
    onPage?.(page);

    if (page === 1) declared = Number(/(\d+)\s*articole\s*g[ăa]site/i.exec(html)?.[1] || 0);
    if (/REGISTRAZIONE|REGISTRARE/i.test(html) && !/logout|esci\b|deconect/i.test(html)) loggedOut = true;

    const found = parseListingPage(html, cat);
    for (const p of found) {
      const key = `${p.sku}::${normalizeName(p.name)}`;
      if (!byKey.has(key)) byKey.set(key, p);
    }

    // Mergem mai departe cat timp pagina a venit plina sau catalogul declara mai mult.
    const full = found.length >= PER_PAGE;
    const moreDeclared = declared > page * PER_PAGE;
    if (!full && !moreDeclared) break;
    await sleep(250);
  }

  return { items: [...byKey.values()], declared, loggedOut };
}

export async function fetchSupplierCatalog(
  cookies: string,
  onProgress?: (done: number, total: number, label: string) => void
): Promise<{ products: Map<string, SupplierProduct>; expired: boolean; partial: boolean; failures: string[] }> {
  const categories = await fetchCategoryUrls(cookies);
  const products = new Map<string, SupplierProduct>();
  const failures: string[] = [];
  let pagesDone = 0;
  let sawPrice = false;
  let sawLogin = false;

  for (const cat of categories) {
    // mysnep raspunde uneori cu listari trunchiate. Comparam cu numarul pe care
    // il declara chiar el si reincercam categoria daca am citit mai putin —
    // altfel produsele necitite ar aparea drept "disparute de la furnizor".
    let best: SupplierProduct[] = [];
    let declared = 0;
    for (let attempt = 0; attempt < 2; attempt++) {
      const r = await crawlCategory(cat, cookies, () => {
        pagesDone++;
        onProgress?.(pagesDone, 0, `${cat}`);
      });
      if (r.loggedOut) sawLogin = true;
      declared = r.declared;
      if (r.items.length > best.length) best = r.items;
      if (declared === 0 || best.length >= declared) break;
    }

    if (declared > 0 && best.length < declared) {
      failures.push(`${cat}: ${best.length}/${declared}`);
    }
    for (const p of best) {
      if (p.price != null) sawPrice = true;
      const key = `${p.sku}::${normalizeName(p.name)}`;
      if (!products.has(key)) products.set(key, p);
    }
  }

  return { products, expired: sawLogin && !sawPrice, partial: failures.length > 0, failures };
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
  const timeoutSignal = AbortSignal.timeout(15000);
  let res: Awaited<ReturnType<typeof undiciFetch>>;
  try {
    res = await undiciFetch(url, {
      headers: headersFor(cookies),
      cache: "no-store",
      signal: signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal,
      dispatcher: mysnepAgent,
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

/* =========================================================================
   PAGINA DE PRODUS — continutul complet
   Tot ce afiseaza mysnep e in HTML-ul livrat (cu sesiune valida), deci se
   citeste cu fetch simplu. Nu e nevoie de Playwright, deci merge si din
   functiile Vercel. Taburile au id-uri numerice ("20"), care nu sunt selectori
   CSS valizi — de aceea cautarea se face pe text, nu cu querySelector.
   ========================================================================= */

export interface ProductDetails {
  description: string;
  shortDescription: string;
  ingredients: string;
  usageInfo: string;
  warnings: string;
  certifications: string;
  quantity: string;
  points: number | null;
  datasheetUrl: string;
  imageUrl: string;
  sku: string;
  price: number | null;
  distributorPrice: number | null;
  available: boolean | null;
}

/**
 * Continutul unui <div id="X">, cu numararea div-urilor imbricate.
 * Comentariile HTML se scot inainte: pagina contine `<!--<div ...>-->`, iar
 * div-ul comentat ar strica numaratoarea si ar taia continutul.
 */
function divById(html: string, id: string): string | null {
  const clean = html.replace(/<!--[\s\S]*?-->/g, "");
  const at = clean.indexOf(`id="${id}"`);
  if (at === -1) return null;
  const bodyStart = clean.indexOf(">", at) + 1;
  if (bodyStart === 0) return null;
  let depth = 1;
  const tag = /<\/?div\b[^>]*>/gi;
  tag.lastIndex = bodyStart;
  let m: RegExpExecArray | null;
  while ((m = tag.exec(clean))) {
    depth += m[0][1] === "/" ? -1 : 1;
    if (depth === 0) return clean.slice(bodyStart, m.index);
  }
  return null;
}

/** Pastreaza paragrafele si tabelele, scoate stilurile inline si atributele. */
function cleanHtml(raw: string | null): string {
  if (!raw) return "";
  const out = decodeEntities(
    raw
      // Continutul vine invelit in 2-3 div-uri de layout; pastram doar textul.
      .replace(/<\/?div[^>]*>/gi, "")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      // <p> imbricate in <p>, cum vin de la ei — le aplatizam
      .replace(/<p[^>]*>\s*<p[^>]*>/gi, "<p>")
      .replace(/<\/p>\s*<\/p>/gi, "</p>")
      .replace(/\s(style|class|border|cellpadding|cellspacing|align|width|height)="[^"]*"/gi, "")
      .replace(/<p>\s*(&nbsp;|\s)*<\/p>/gi, "")
  );
  return out.replace(/\s+/g, " ").trim();
}

function plainText(raw: string | null): string {
  return decodeEntities((raw || "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

/** Prima propozitie intreaga care incape in `max` caractere. */
function firstSentences(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const stop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  if (stop > max * 0.4) return cut.slice(0, stop + 1).trim();
  return cut.replace(/\s+\S*$/, "").trim();
}

export async function fetchProductDetails(
  sourceUrl: string,
  cookies: string
): Promise<{ ok: boolean; details?: ProductDetails; reason?: string }> {
  const url = sourceUrl.startsWith("http") ? sourceUrl : `${BASE}/${sourceUrl.replace(/^\//, "")}`;
  let html: string;
  try {
    const res = await fetchWithTimeout(url, cookies);
    if (!res.ok) return { ok: false, reason: `http_${res.status}` };
    html = await res.text();
  } catch {
    return { ok: false, reason: "network" };
  }

  const prices = parseProductPrices(html);
  if (prices.endUser == null && /REGISTRAZIONE|REGISTRARE/i.test(html) && !/logout|esci\b/i.test(html)) {
    return { ok: false, reason: "expired" };
  }

  const description = cleanHtml(divById(html, "one"));
  const descPlain = plainText(divById(html, "one"));
  const imgRel = /network\/img\/Articoli\/big\/[\w.-]+/i.exec(html)?.[0] || "";

  return {
    ok: true,
    details: {
      description,
      shortDescription: firstSentences(descPlain, 180),
      ingredients: cleanHtml(divById(html, "20")),
      usageInfo: cleanHtml(divById(html, "21")),
      warnings: cleanHtml(divById(html, "22")),
      // Tabul de certificari incepe cu titlul "Certifications" — il scoatem.
      certifications: cleanHtml(divById(html, "24")).replace(/^\s*Certifications\s*/i, ""),
      quantity: plainText(/class="size-case"[^>]*>([\s\S]{0,160}?)<\/div>/i.exec(html)?.[1] || ""),
      points: Number(/Puncte Volum[^0-9]{0,20}([\d.,]+)/i.exec(html)?.[1]?.replace(",", ".")) || null,
      datasheetUrl: /href="([^"]*\.pdf)"/i.exec(html)?.[1] || "",
      imageUrl: imgRel ? `${BASE}/${imgRel}` : "",
      sku: /Cod\s*produs\s*[:\s]*(\w+)/i.exec(plainText(html))?.[1] || "",
      price: prices.endUser,
      distributorPrice: prices.distributor,
      available: readAvailability(html),
    },
  };
}
