import { NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";

function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "").slice(-10);
  return digits.length === 10 ? digits : null;
}

export async function POST(request: Request) {
  try {
    let body: Record<string, unknown> = {};
    try {
      body = await request.json();
    } catch {
      const text = await request.text().catch(() => "");
      try {
        body = JSON.parse(text);
      } catch {
        body = {};
      }
    }

    const sessionId = typeof body.session_id === "string" ? body.session_id.slice(0, 100) : null;
    if (!sessionId) {
      return NextResponse.json({ ok: false, reason: "missing session_id" }, { status: 200 });
    }

    const customerPhone = typeof body.customer_phone === "string" ? body.customer_phone.slice(0, 50) : null;
    const phoneDigits = normalizePhone(customerPhone);

    const row = {
      session_id: sessionId,
      last_seen_at: new Date().toISOString(),
      customer_name: typeof body.customer_name === "string" ? body.customer_name.slice(0, 200) : null,
      customer_phone: customerPhone,
      normalized_phone: phoneDigits,
      customer_email: typeof body.customer_email === "string" ? body.customer_email.slice(0, 200) : null,
      address: typeof body.address === "string" ? body.address.slice(0, 500) : null,
      product_id: typeof body.product_id === "number" ? body.product_id : null,
      product_name: typeof body.product_name === "string" ? body.product_name.slice(0, 300) : null,
      product_slug: typeof body.product_slug === "string" ? body.product_slug.slice(0, 300) : null,
      brand_name: typeof body.brand_name === "string" ? body.brand_name.slice(0, 100) : null,
      model_name: typeof body.model_name === "string" ? body.model_name.slice(0, 200) : null,
      snapshot: body.snapshot ?? null,
      user_agent: request.headers.get("user-agent")?.slice(0, 500) || null,
      url: typeof body.url === "string" ? body.url.slice(0, 500) : null,
    };

    if (phoneDigits) {
      const { data: existing } = await supabase
        .from("abandoned_carts")
        .select("id")
        .eq("normalized_phone", phoneDigits)
        .order("last_seen_at", { ascending: false })
        .limit(1);

      if (existing && existing.length > 0) {
        const keepId = existing[0].id;
        const { error: updErr } = await supabase
          .from("abandoned_carts")
          .update(row)
          .eq("id", keepId);
        if (updErr) {
          console.error("log-abandoned merge update error:", updErr);
          return NextResponse.json({ ok: false }, { status: 200 });
        }
        await supabase
          .from("abandoned_carts")
          .delete()
          .eq("normalized_phone", phoneDigits)
          .neq("id", keepId);
        await supabase
          .from("abandoned_carts")
          .delete()
          .eq("session_id", sessionId)
          .neq("id", keepId);
        return NextResponse.json({ ok: true, merged: true, id: keepId }, { status: 200 });
      }
    }

    const { error } = await supabase
      .from("abandoned_carts")
      .upsert(row, { onConflict: "session_id" });

    if (error) {
      console.error("log-abandoned upsert error:", error);
      return NextResponse.json({ ok: false }, { status: 200 });
    }
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    console.error("log-abandoned handler error:", e);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("session_id");
    if (!sessionId) return NextResponse.json({ ok: false }, { status: 200 });
    await supabase.from("abandoned_carts").delete().eq("session_id", sessionId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("log-abandoned delete error:", e);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
