import { NextResponse } from "next/server";
import { sendOrderEmail, sendClientEmail } from "@/lib/email";
import { getSiteConfig, resolveShippingCost } from "@/lib/site-config";

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
