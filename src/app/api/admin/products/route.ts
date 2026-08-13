import { NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { cleanContentHtml, cleanContentText } from "@/lib/html-clean";

const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "olivox2026!";

function checkAuth(request: Request): boolean {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Basic ")) return false;
  const decoded = atob(auth.slice(6));
  const [user, pass] = decoded.split(":");
  return user === ADMIN_USER && pass === ADMIN_PASS;
}

/**
 * Cauta un produs dupa id sau slug. Folosit in detaliile comenzii, ca sa se
 * poata deschide produsul pe site si originalul de pe mysnep (source_url).
 */
export async function GET(request: Request) {
  if (!checkAuth(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const slug = searchParams.get("slug");
  if (!id && !slug) return NextResponse.json({ error: "Missing id or slug" }, { status: 400 });

  const query = supabase.from("products").select("id, name, slug, sku, source_url, category_slugs").limit(1);
  const { data, error } = id
    ? await query.eq("id", Number(id)).maybeSingle()
    : await query.eq("slug", slug!).maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  if (!checkAuth(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const { error } = await supabase.from("products").insert({
    woo_id: 0,
    name: body.name,
    slug: body.slug,
    image_url: body.image_url || "",
    r2_image_url: body.image_url || "",
    price: body.price || 0,
    category_slugs: body.category_slugs || [],
    template: body.template || "generic",
    short_description: cleanContentText(body.short_description),
    description: cleanContentHtml(body.description),
    meta_title: body.meta_title || "",
    meta_description: body.meta_description || "",
    keywords: body.keywords || "",
    custom_fields: body.custom_fields || [],
    addon_group_ids: body.addon_group_ids || [],
    source_url: body.source_url || "",
    sku: body.sku || "",
    stock_status: body.stock_status || "",
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function PATCH(request: Request) {
  if (!checkAuth(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const { id, ...fields } = body;
  const update: Record<string, unknown> = {};
  for (const key of ["name", "slug", "price", "image_url", "r2_image_url", "print_image_url", "short_description", "description", "category_slugs", "template", "meta_title", "meta_description", "keywords", "custom_fields", "addon_group_ids", "source_url", "sku", "stock_status"]) {
    if (fields[key] !== undefined) update[key] = fields[key];
  }
  // Editorul din admin scrie spatiile ca &nbsp;. Curatam aici, ca sa fie curat
  // indiferent daca salvarea vine din editor, din import sau din alt script.
  if (typeof update.description === "string") update.description = cleanContentHtml(update.description);
  if (typeof update.short_description === "string") update.short_description = cleanContentText(update.short_description);
  for (const k of ["ingredients", "usage_info", "warnings", "certifications"]) {
    if (typeof update[k] === "string") update[k] = cleanContentHtml(update[k] as string);
  }
  const { error } = await supabase.from("products").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  if (!checkAuth(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await request.json();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
