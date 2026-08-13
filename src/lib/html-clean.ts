/**
 * Curatarea HTML-ului de continut inainte de salvare.
 *
 * Editorul din admin (React Quill) serializeaza spatiile ca `&nbsp;` si lasa
 * paragrafe goale. Rezultatul: un text fara spatii care se poate rupe pe randuri
 * — adica un singur "cuvant" imens, care iese din ecran pe telefon si arata
 * literal "BATOANE&nbsp;CU&nbsp;GUST" acolo unde textul e afisat ca text simplu.
 *
 * Se aplica si la salvarea din admin, si la import, ca sa nu depinda de unde
 * vine continutul.
 */

/** Spatiile insecabile devin spatii normale, ca textul sa se poata rupe pe randuri. */
export function cleanContentHtml(html: string | null | undefined): string {
  if (!html) return "";
  return (
    html
      // &nbsp; si varianta lui unicode (U+00A0) -> spatiu obisnuit
      .replace(/&nbsp;/gi, " ")
      .replace(/ /g, " ")
      // paragrafe si titluri ramase goale de la editor
      .replace(/<(p|h[1-6])>(\s|<br\s*\/?>)*<\/\1>/gi, "")
      // <p> imbricat in <p> (vine asa de la furnizor) — il aplatizam
      .replace(/<p([^>]*)>\s*<p[^>]*>/gi, "<p$1>")
      .replace(/<\/p>\s*<\/p>/gi, "</p>")
      .replace(/[ \t]{2,}/g, " ")
      .trim()
  );
}

/** Varianta text simplu, pentru short_description si meta. */
export function cleanContentText(html: string | null | undefined): string {
  return cleanContentHtml(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
