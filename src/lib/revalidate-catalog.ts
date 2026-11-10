import { revalidatePath, revalidateTag } from "next/cache";
import { CATALOG_TAG } from "./catalog-cache";

// Goleste datele de catalog (lib/catalog-cache.ts) si paginile care le afiseaza.
// Se cheama dupa orice scriere in products / product_categories; fara ea, un
// pret schimbat ar ramane vechi pe site pana la o ora, in contradictie cu feed-ul
// Merchant Center.
export function invalidateCatalog() {
  try {
    revalidateTag(CATALOG_TAG);
    revalidatePath("/produse/[slug]", "page");
    revalidatePath("/produse/[slug]/[product]", "page");
  } catch {}
}
