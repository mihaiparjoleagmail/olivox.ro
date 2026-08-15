import { Resend } from "resend";
import { getSiteConfig } from "./site-config";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const resend = new Resend(RESEND_API_KEY);

interface OrderEmailData {
  product_name?: string;
  quantity?: number;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  address: string;
  /** dd.mm.yyyy */
  birth_date?: string;
  postal_code?: string;
  observations?: string;
  /** Total de plata: produse + transport. */
  order_value?: number;
  shipping_cost?: number;
  order_id: number;
}

export async function sendOrderEmail(data: OrderEmailData) {
  if (!RESEND_API_KEY) return;
  const config = await getSiteConfig();
  const adminEmail = config.emailAdmin || "atelieruldeprint@gmail.com";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f5f7; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
    .header { background: #1a6b3a; color: #fff; padding: 24px 32px; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 700; }
    .badge { display: inline-block; background: #fff; color: #1a6b3a; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; margin-top: 8px; }
    .body { padding: 32px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    td { padding: 9px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; vertical-align: top; }
    td:first-child { width: 140px; font-weight: 600; color: #374151; }
    td:last-child { color: #1a1a2e; }
    .footer { background: #f9fafb; padding: 16px 32px; text-align: center; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${config.logoHtml}</h1>
      <div class="badge">Comanda #${data.order_id}</div>
    </div>
    <div class="body">
      <table>
        <tr><td>Produs</td><td>${data.product_name || "—"}</td></tr>
        <tr><td>Cantitate</td><td>${data.quantity || 1}</td></tr>
        ${data.shipping_cost ? `<tr><td>${config.shippingLabel}</td><td>${data.shipping_cost} RON</td></tr>` : ""}
        ${data.order_value ? `<tr><td>Valoare</td><td>${data.order_value} RON${data.shipping_cost ? " (transport inclus)" : ""}</td></tr>` : ""}
        <tr><td>Nume</td><td>${data.customer_name}</td></tr>
        <tr><td>Telefon</td><td>${data.customer_phone}</td></tr>
        ${data.customer_email ? `<tr><td>Email</td><td>${data.customer_email}</td></tr>` : ""}
        ${data.birth_date ? `<tr><td>Data nasterii</td><td>${data.birth_date}</td></tr>` : ""}
        <tr><td>Adresa</td><td>${data.address}</td></tr>
        ${data.postal_code ? `<tr><td>Cod postal</td><td>${data.postal_code}</td></tr>` : ""}
        ${data.observations ? `<tr><td>Observatii</td><td>${data.observations}</td></tr>` : ""}
      </table>
    </div>
    <div class="footer">${config.siteName} &mdash; Comanda primita automat</div>
  </div>
</body>
</html>`;

  const { error } = await resend.emails.send({
    from: config.emailFrom || "Olivox <no-reply@ghidulfunerar.ro>",
    to: adminEmail,
    subject: `Comanda #${data.order_id} — ${data.product_name || "produs Snep"}`,
    html,
  });

  if (error) throw error;
}

export async function sendClientEmail(data: OrderEmailData) {
  if (!data.customer_email) return;
  if (!RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY nu este configurat");
  }
  const config = await getSiteConfig();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f5f7; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
    .header { background: #1a6b3a; color: #fff; padding: 24px 32px; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 700; }
    .body { padding: 32px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    td { padding: 9px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; vertical-align: top; }
    td:first-child { width: 140px; font-weight: 600; color: #374151; }
    td:last-child { color: #1a1a2e; }
    .footer { background: #f9fafb; padding: 20px 32px; text-align: center; font-size: 12px; color: #9ca3af; }
    .footer a { color: #1a6b3a; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${config.logoHtml}</h1>
    </div>
    <div class="body">
      <p style="font-size:16px;margin-bottom:16px">Salut <strong>${data.customer_name}</strong>,</p>
      <p style="font-size:14px;color:#374151;margin-bottom:20px">Multumim pentru comanda! Am primit-o si o vom procesa in cel mai scurt timp posibil.</p>
      <table>
        <tr><td>Comanda</td><td>#${data.order_id}</td></tr>
        <tr><td>Produs</td><td>${data.product_name || "—"}</td></tr>
        <tr><td>Cantitate</td><td>${data.quantity || 1}</td></tr>
        ${data.shipping_cost ? `<tr><td>${config.shippingLabel}</td><td>${data.shipping_cost} RON</td></tr>` : ""}
        ${data.order_value ? `<tr><td>Total de plata</td><td><strong>${data.order_value} RON</strong></td></tr>` : ""}
        <tr><td>Livrare la</td><td>${data.address}${data.postal_code ? `, cod postal ${data.postal_code}` : ""}</td></tr>
      </table>
      <div style="border:1px solid #e5e7eb;border-left:4px solid #1a6b3a;border-radius:8px;padding:16px 18px;margin-bottom:20px;background:#f9fafb">
        <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#1a6b3a">Plata se efectueaza online, direct catre Snep</p>
        <p style="margin:0 0 10px;font-size:13px;color:#374151;line-height:1.5">
          Dupa verificarea comenzii primesti pe WhatsApp sau pe e-mail linkul securizat de plata cu cardul${data.order_value ? `, pentru suma de <strong>${data.order_value} RON</strong> (produse + transport)` : ""}.
          Olivox nu incaseaza contravaloarea produselor si nu se plateste nimic la curier.
        </p>
      </div>
      <p style="font-size:14px;color:#374151">
        Te vom contacta in scurt timp pentru confirmare (produse, adresa si costul total, inclusiv transportul). Poti sa ne scrii si pe
        <a href="https://wa.me/${config.phone.replace(/^0/, "40")}" style="color:#25D366;font-weight:700">WhatsApp</a>
        sau sa suni la <a href="tel:${config.phone}" style="color:#1a6b3a;font-weight:600">${config.phone}</a>.
      </p>
    </div>
    <div class="footer">
      <p>${config.siteName} &mdash; ${config.tagline}</p>
      <p><a href="${config.domain}">${config.domain}</a></p>
    </div>
  </div>
</body>
</html>`;

  const { error } = await resend.emails.send({
    from: config.emailFrom,
    to: data.customer_email,
    subject: `Comanda #${data.order_id} confirmata — ${config.siteName}`,
    html,
  });

  if (error) throw error;
}
