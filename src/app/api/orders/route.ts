import { NextResponse } from "next/server";
import { sendOrderEmail, sendClientEmail } from "@/lib/email";
import { getSiteConfig, resolveShippingCost } from "@/lib/site-config";

/** Acceptam doar dd.mm.yyyy si verificam ca e o data reala (nu 31.02.1990). */
function isValidBirthDate(value: string): boolean {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value);
  if (!m) return false;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return false;
  const now = new Date();
  return d <= now && year >= 1900;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customer_name, customer_phone, address } = body;

    if (!customer_name || !customer_phone || !address) {
      return NextResponse.json(
        { error: "Nume, telefon si adresa sunt obligatorii." },
        { status: 400 }
      );
    }

    const birthDate = String(body.birth_date || "").trim();
    if (!isValidBirthDate(birthDate)) {
      return NextResponse.json(
        { error: "Data nasterii este obligatorie si trebuie sa fie in formatul zz.ll.aaaa." },
        { status: 400 }
      );
    }

    const postalCode = String(body.postal_code || "").trim();
    if (!/^\d{6}$/.test(postalCode)) {
      return NextResponse.json(
        { error: "Codul postal este obligatoriu si trebuie sa aiba 6 cifre." },
        { status: 400 }
      );
    }

    // Transportul se recalculeaza aici, din setari — valoarea trimisa de client
    // e doar informativa si nu poate modifica totalul comenzii.
    const config = await getSiteConfig();
    const productsValue = Number(body.products_value) || 0;
    const shippingCost = resolveShippingCost(productsValue, config);
    const orderValue = productsValue > 0 ? productsValue + shippingCost : Number(body.order_value) || 0;

    const { createOrder } = await import("@/lib/db");
    const order = await createOrder({
      product_id: body.product_id || null,
      product_name: body.product_name || "",
      product_slug: body.product_slug || "",
      quantity: body.quantity || 1,
      customer_name,
      customer_phone,
      customer_email: body.customer_email || "",
      address,
      observations: body.observations || "",
      order_value: orderValue,
      shipping_cost: productsValue > 0 ? shippingCost : Number(body.shipping_cost) || 0,
      shipping_method: body.shipping_method || "",
      locker_id: body.locker_id || null,
      order_source: body.order_source || "",
      custom_field_values: body.custom_field_values || {},
      birth_date: birthDate,
      postal_code: postalCode,
    });

    const emailErrors: string[] = [];
    // Emailurile arata cifrele salvate in comanda, nu ce a trimis clientul.
    const emailData = {
      ...body,
      order_id: order.id,
      order_value: order.order_value,
      shipping_cost: order.shipping_cost,
    };

    try {
      await sendOrderEmail(emailData);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`Admin email failed for order #${order.id}:`, msg);
      emailErrors.push(`Admin email: ${msg}`);
    }

    try {
      await sendClientEmail(emailData);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`Client email failed for order #${order.id}:`, msg);
      emailErrors.push(`Client email: ${msg}`);
    }

    return NextResponse.json(
      { ...order, email_errors: emailErrors.length > 0 ? emailErrors : undefined },
      { status: 201 }
    );
  } catch (error) {
    console.error("Order creation failed:", error);
    return NextResponse.json(
      { error: "Comanda nu a putut fi salvata. Incearca din nou.", details: String(error) },
      { status: 500 }
    );
  }
}
