/**
 * Pretul public al site-ului.
 *
 * In baza de date pastram pretul exact de la furnizor (mysnep), cu zecimale —
 * asa il primim la reactualizare si asa se poate compara. Pe site insa se
 * afiseaza si se incaseaza doar pret intreg, rotunjit IN SUS, ca sa nu vindem
 * niciodata sub pretul furnizorului.
 *
 * Toate locurile care arata un pret (grile, pagina de produs, JSON-LD, feed-uri,
 * formularul de comanda, emailuri) trebuie sa treaca prin `displayPrice`.
 * Daca vreunul nu o face, clientul vede un pret si plateste altul.
 */
export function displayPrice(raw: number | string | null | undefined): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.ceil(n);
}

/**
 * Totalul pentru o cantitate. Se rotunjeste pretul unitar INTAI, apoi se
 * inmulteste — altfel 2 x 201.45 ar da 403 desi pe pagina scrie 202 bucata
 * (adica 404).
 */
export function lineTotal(raw: number | string | null | undefined, quantity: number): number {
  const qty = Math.max(1, Math.floor(Number(quantity) || 1));
  return displayPrice(raw) * qty;
}

/** Pretul pentru schema.org / feed-uri: acelasi numar, format "210.00". */
export function schemaPrice(raw: number | string | null | undefined): string {
  return displayPrice(raw).toFixed(2);
}
