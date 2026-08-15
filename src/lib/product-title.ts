/**
 * Titlul <title> al paginii de produs.
 *
 * Forma: `<eticheta> — pret <X> lei`.
 *
 * Doua decizii in spate, ambele luate pe date din Search Console (august 2026):
 *
 * 1. **Fara sufixul `| olivox.ro`.** Il aveau 347 din 363 de titluri, ceea ce
 *    facea din fiecare pagina un candidat la cautarea „olivox". Pentru propriul
 *    nume de brand raspundeau peste 20 de URL-uri — inclusiv politica de
 *    confidentialitate si o crema de corp — iar Google nu se fixa pe niciunul.
 *
 * 2. **Pretul se compune la randare, nu se scrie in baza de date.** „pret" apare
 *    in zeci de cautari reale („olivox 40 pret", „kalosnep pret"), dar preturile
 *    se reactualizeaza periodic din mysnep. Daca ar sta in `meta_title`, ar
 *    ramane in urma tacut. Eticheta din DB e stabila, pretul e mereu cel curent.
 *
 * `meta_title` din DB pastreaza doar eticheta (nume curat + „Snep"), fara pret.
 */
import { displayPrice } from "./price";

/** Limita peste care Google taie titlul in rezultate. */
const MAX_TITLE = 60;

/** Taie la ultimul cuvant intreg care incape, fara puncte de suspensie. */
function trimToWord(str: string, max: number): string {
  const s = str.trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > max * 0.5 ? cut.slice(0, lastSpace) : cut).replace(/[\s,\-–—+&]+$/, "");
}

/**
 * Numele produsului asa cum se scrie intr-un text, nu asa cum sta in DB.
 *
 * In baza de date numele vin cu majuscule de la furnizor („REALCOMPLEX"), ceea
 * ce intr-o propozitie arata a tipat. Eticheta din `meta_title` e deja curatata
 * si scrisa corect, deci se ia din ea partea dinaintea primei virgule, fara
 * marca — „RealComplex Snep, 30 plicuri" devine „RealComplex".
 */
export function productDisplayName(
  metaTitle: string | null | undefined,
  name: string
): string {
  const label = (metaTitle || "").trim();
  if (!label) return name;
  return label.split(",")[0].replace(/\s+Snep\b/i, "").trim() || name;
}

export function buildProductTitle(
  metaTitle: string | null | undefined,
  name: string,
  price: number | string | null | undefined
): string {
  const label = (metaTitle || "").trim() || name;
  const p = displayPrice(price);

  // Produs fara pret (retras, epuizat): titlu fara coada de pret, nu „pret 0 lei".
  if (p <= 0) return trimToWord(label, MAX_TITLE);

  const suffix = ` — pret ${p} lei`;
  return trimToWord(label, MAX_TITLE - suffix.length) + suffix;
}
