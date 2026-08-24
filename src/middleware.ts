import { NextRequest, NextResponse } from "next/server";
import { SLUG_REDIRECTS } from "@/lib/slug-redirects";

// Known routes in the new app - if a request doesn't match any of these,
// we treat it as a legacy URL and 301 to /categorii.
const KNOWN_PREFIXES = [
  "/produse",
  "/articole",
  "/categorii",
  "/cautare",
  "/contact",
  "/admin",
  "/api",
  "/_next",
  "/termeni-si-conditii",
  "/politica-confidentialitate",
  "/politica-cookies",
  "/livrare-si-retur",
  "/despre",
  "/de-ce-snep",
  "/ghid",
  "/brand",
  "/olivox-supliment-antioxidant",
  "/kalosnep",
  "/sneplumina",
  "/realfibre",
  "/realcomplex",
  "/trico-salus",
  "/glosar",
  "/intrebari-frecvente",
  "/feed",
  "/favicon",
  // Next.js serveste app/icon.png si app/apple-icon.png pe rute fara extensie,
  // deci nu sunt prinse de STATIC_EXT_REGEX si ar fi redirectionate la /categorii.
  "/icon",
  "/apple-icon",
  "/robots.txt",
  "/sitemap.xml",
  "/sitemap-images.xml",
  "/manifest",
];

// File extensions we never redirect (static assets, images, etc.)
const STATIC_EXT_REGEX = /\.(jpg|jpeg|png|webp|gif|svg|ico|css|js|map|woff2?|ttf|eot|xml|txt|pdf|mp4|webm|json)$/i;

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // /produs/:slug -> /produse/<category>/<slug> (dynamic DB lookup)
  const productMatch = pathname.match(/^\/produs\/([^\/]+)\/?$/);
  if (productMatch) {
    const slug = productMatch[1];
    try {
      const apiUrl = new URL(`/api/resolve-product?slug=${encodeURIComponent(slug)}`, req.url);
      const r = await fetch(apiUrl, { cache: "force-cache" });
      if (r.ok) {
        const { category, productSlug } = await r.json();
        if (category && productSlug) {
          return NextResponse.redirect(new URL(`/produse/${category}/${productSlug}`, req.url), 301);
        }
      }
    } catch {}
    return NextResponse.redirect(new URL("/categorii", req.url), 301);
  }

  // Slug-uri reparate: /produse/<categorie>/<slug-vechi> -> .../<slug-nou>.
  // Categoria ramane cea din URL, se schimba doar ultimul segment. Unele dintre
  // URL-urile astea erau deja clasate, deci 301, nu 404.
  const legacySlug = pathname.match(/^\/produse\/([^/]+)\/([^/]+)\/?$/);
  if (legacySlug) {
    const target = SLUG_REDIRECTS[legacySlug[2]];
    if (target) {
      return NextResponse.redirect(
        new URL(`/produse/${legacySlug[1]}/${target}`, req.url),
        301
      );
    }
  }

  // Skip homepage, static assets, and known prefixes
  if (pathname === "/" || STATIC_EXT_REGEX.test(pathname)) {
    return NextResponse.next();
  }
  if (KNOWN_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  // Anything else = legacy URL -> 301 to /categorii
  return NextResponse.redirect(new URL("/categorii", req.url), 301);
}

export const config = {
  // Match everything except Next.js internals, API routes and static files.
  // /api nu are nevoie de redirect-urile de mai sus, iar trecerea prin edge
  // middleware bufereaza raspunsul — ruta de sincronizare (NDJSON, streaming)
  // ramanea agatata la mijloc din cauza asta, nu din cauza furnizorului.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|api|.*\\..*).*)",
  ],
};
