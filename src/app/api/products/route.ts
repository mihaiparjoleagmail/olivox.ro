import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * Text pregatit pentru cautare: fara diacritice, majuscule uniforme, doar
 * litere si cifre. "VINCÌ" si "vinci" ajung amandoua "VINCI"; "Ceai Verde"
 * ajunge "CEAI VERDE".
 */
function normalizeSearch(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const slug = searchParams.get("slug");
  const page = parseInt(searchParams.get("page") || "1");
  const perPage = parseInt(searchParams.get("per_page") || "24");

  // Single product by slug
  if (slug) {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("slug", slug)
      .single();

    if (error || !data) {
      return NextResponse.json({ product: null }, { status: 404 });
    }

    // Resolve addon groups into custom_fields
    if (data.addon_group_ids?.length) {
      const { data: settingsRow } = await supabase.from("settings").select("value").eq("key", "addon_groups").single();
      if (settingsRow) {
        try {
          const groups = JSON.parse(settingsRow.value);
          const groupFields = (data.addon_group_ids as string[])
            .flatMap((gid: string) => {
              const group = groups.find((g: { id: string; fields: unknown[] }) => g.id === gid);
              return group?.fields || [];
            });
          data.custom_fields = [...groupFields, ...(data.custom_fields || [])];
        } catch { /* ignore parse errors */ }
      }
    }

    return NextResponse.json({ product: data });
  }
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabase
    .from("products")
    .select("id, name, slug, r2_image_url, image_url, price, currency, category_slugs, short_description, sku, stock_status, imported_at", { count: "exact" });

  if (category) {
    query = query.contains("category_slugs", [category]);
  }

  const searchTerm = searchParams.get("search");
  if (searchTerm) {
    /*
     * Cautarea acopera si numele, si codul ("4000342" trebuie sa dea VINCÌ), si
     * trebuie sa ignore diacriticele ("vinci" trebuie sa dea "VINCÌ").
     *
     * `ilike` din Postgres ignora majusculele, dar nu si diacriticele, iar
     * `unaccent` ar cere o extensie si un index adaugate in baza. Catalogul are
     * cateva sute de produse, deci filtram in cod: citim doar id + nume + cod,
     * normalizam ambele parti si cerem apoi randurile potrivite. Sortarea si
     * paginarea raman pe server.
     */
    const words = normalizeSearch(searchTerm).split(" ").filter(Boolean);
    if (words.length === 0) {
      return NextResponse.json({ products: [], total: 0, page, per_page: perPage, total_pages: 0 });
    }

    let indexQuery = supabase.from("products").select("id, name, sku").limit(5000);
    if (category) indexQuery = indexQuery.contains("category_slugs", [category]);
    const { data: index, error: indexError } = await indexQuery;
    if (indexError) {
      return NextResponse.json({ products: [], total: 0 }, { status: 500 });
    }

    const matched = (index || [])
      .filter((p) => {
        const haystack = normalizeSearch(`${p.name || ""} ${p.sku || ""}`);
        return words.every((w) => haystack.includes(w));
      })
      .map((p) => p.id);

    if (matched.length === 0) {
      return NextResponse.json({ products: [], total: 0, page, per_page: perPage, total_pages: 0 });
    }
    query = query.in("id", matched);
  }

  // Sortare din admin: implicit dupa id, dar si dupa data importului, ca sa se
  // vada imediat produsele nou aduse de la furnizor.
  const sortParam = searchParams.get("sort") || "id";
  const sortCol = ["id", "name", "price", "imported_at"].includes(sortParam) ? sortParam : "id";
  const asc = searchParams.get("dir") === "asc";

  const { data, error, count } = await query
    .order(sortCol, { ascending: asc, nullsFirst: false })
    .range(from, to);

  if (error) {
    return NextResponse.json({ products: [], total: 0 }, { status: 500 });
  }

  return NextResponse.json({
    products: data || [],
    total: count || 0,
    page,
    per_page: perPage,
    total_pages: Math.ceil((count || 0) / perPage),
  });
}
