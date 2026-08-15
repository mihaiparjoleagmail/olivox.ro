/**
 * Paginile-ghid de la radacina (pillar pages) si regulile de potrivire.
 *
 * Erau declarate doar in pagina de produs, deci singurele legaturi interne spre
 * ele veneau din paginile de produs si din sitemap. In august 2026, patru din
 * cele cinci aveau in Search Console starea „Discovered — currently not indexed":
 * Google stia URL-ul din sitemap dar nu-l crawlase niciodata. Un URL care nu
 * primeste legaturi din paginile cu autoritate e un URL fara vot.
 *
 * De aceea lista sta acum aici: o folosesc si prima pagina, si capul categoriei
 * corespondente, nu doar pagina de produs.
 */

export interface Pillar {
  /** Se potriveste pe slug-ul sau numele produsului. */
  match: RegExp;
  href: string;
  title: string;
  /** Text scurt pe pagina de produs. */
  blurb: string;
  /** Eticheta scurta pentru prima pagina. */
  short: string;
  /** Categoriile in capul carora apare legatura. */
  categorySlugs: string[];
}

export const PILLARS: Pillar[] = [
  {
    match: /^oliv/i,
    href: "/olivox-supliment-antioxidant",
    title: "Ghid complet Olivox",
    blurb:
      "ce inseamna extractul titrat de frunze de maslin, diferenta dintre capsule, sticla si Olivox 40, mod de utilizare si contraindicatii.",
    short: "Extract titrat de frunze de maslin: capsule, sticla sau Olivox 40, cum se ia si cine trebuie sa evite.",
    categorySlugs: ["nevoi-specifice"],
  },
  {
    match: /^kalo/i,
    href: "/kalosnep",
    title: "Ghid complet KaloSnep",
    blurb:
      "diferenta dintre plicuri, capsule si Kalogel, compozitia cu cifrele de pe eticheta, administrare si avertismentele importante.",
    short: "Plicuri, capsule sau KaloGel: compozitia in cifre, administrare si avertismente.",
    categorySlugs: ["nevoi-specifice"],
  },
  {
    // `trico[- ]salus`, not `trico`, so the TRICOU t-shirts never match.
    match: /^trico[- ]salus/i,
    href: "/trico-salus",
    title: "Ghid complet Trico-Salus",
    blurb:
      "protocoalele recomandate pentru matreata, scalp gras, scalp uscat si rarire, ce contine fiecare sampon si cand e cazul sa mergi la dermatolog.",
    short: "Protocoale pentru matreata, scalp gras, scalp uscat si rarire — si cand mergi la dermatolog.",
    categorySlugs: ["par"],
  },
  {
    match: /^sneplumina/i,
    href: "/sneplumina",
    title: "Ghid complet SnepLumina",
    blurb:
      "ce contine fiecare produs, rutina in trei pasi, ce inseamna exact claim-urile de pe eticheta si cand ai nevoie de Trico-Salus in loc.",
    short: "Rutina in trei pasi, ce contine fiecare produs si cand ai nevoie de Trico-Salus in loc.",
    categorySlugs: ["par"],
  },
  {
    match: /^realfibre/i,
    href: "/realfibre",
    title: "Ghid complet RealFibre",
    blurb:
      "prebiotic, nu probiotic — compozitia in cifre, diferenta dintre pudra, plicuri si comprimate si ce sa astepti in primele zile.",
    short: "Prebiotic, nu probiotic: pudra, plicuri sau comprimate si ce sa astepti in primele zile.",
    categorySlugs: ["linia-real"],
  },
];

/** Ghidul potrivit unui produs, dupa slug sau nume. */
export function pillarForProduct(slug: string, name: string): Pillar | undefined {
  return PILLARS.find((p) => p.match.test(slug) || p.match.test(name));
}

/** Ghidurile care apar in capul unei categorii. */
export function pillarsForCategory(categorySlug: string): Pillar[] {
  return PILLARS.filter((p) => p.categorySlugs.includes(categorySlug));
}
