/**
 * Produsele care nu au ce cauta in indexul Google.
 *
 * Categoria „promotii-si-kit-uri" e aproape numai merch de reprezentare:
 * tricouri, caciuli, autocolante, cataloage tiparite, pixuri, agende, termosuri,
 * shakere, huse. In trei luni (15 mai – 12 aug 2026) toate cele 50 de produse
 * din ea au produs impreuna **4 clicuri** din 345 de afisari, iar cele cu volum
 * stateau pe pozitiile 48-55 la cautari generice („shaker" — 99 afisari, poz. 48,
 * zero clicuri). Nu se vand prin cautare organica si consuma buget de crawl care
 * ar trebui sa mearga spre paginile-ghid.
 *
 * Regula e pe categorie, nu pe slug, ca sa nu se strice la curatarea slug-urilor
 * si ca sa prinda din oficiu si merch-ul importat pe viitor.
 *
 * `noindex` NU inseamna ascuns: paginile raman pe site si accesibile, doar ies
 * din rezultatele Google. Legaturile din ele se urmaresc mai departe (`follow`).
 */

/** Categoria in care aterizeaza merch-ul la import. */
const MERCH_CATEGORY = "promotii-si-kit-uri";

/**
 * Exceptiile: produse reale care stau in aceeasi categorie fiindca sunt vandute
 * ca pachet. Astea raman indexate.
 */
const KEEP_INDEXED = new Set([
  "kit-saptamanal-de-cocos",
  "weekly-kit-cacao",
  "kit-cadou-snep",
]);

export function isNoindexProduct(
  slug: string,
  categorySlugs: string[] | null | undefined
): boolean {
  if (KEEP_INDEXED.has(slug)) return false;
  return (categorySlugs || []).includes(MERCH_CATEGORY);
}
