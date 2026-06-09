import { NextResponse } from "next/server";
import { sendOrderEmail, sendClientEmail } from "@/lib/email";

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
      order_value: body.order_value || 0,
      shipping_method: body.shipping_method || "",
      locker_id: body.locker_id || null,
      order_source: body.order_source || "",
      custom_field_values: body.custom_field_values || {},
    });

    const emailErrors: string[] = [];

    try {
      await sendOrderEmail({ ...body, order_id: order.id });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`Admin email failed for order #${order.id}:`, msg);
      emailErrors.push(`Admin email: ${msg}`);
    }

    try {
      await sendClientEmail({ ...body, order_id: order.id });
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
