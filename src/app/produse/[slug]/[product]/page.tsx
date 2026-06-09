"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { trackEvent } from "@/lib/analytics";

interface BeaconPayload {
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  address: string;
  product_id?: number;
  product_name: string;
  product_slug: string;
  url: string;
  snapshot: Record<string, unknown>;
}

interface Product {
  id: number;
  name: string;
  slug: string;
  r2_image_url: string;
  image_url: string;
  price: number;
  currency?: string;
  short_description: string;
  description: string;
  ingredients?: string | null;
  warnings?: string | null;
  usage_info?: string | null;
  certifications?: string | null;
  datasheet_r2_url?: string | null;
  datasheet_url?: string | null;
  category_slugs: string[];
  sku?: string | null;
  quantity?: string | null;
  points?: number | null;
  stock_status?: string | null;
}

export default function ProductPage() {
  const params = useParams();
  const productSlug = params.product as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [address, setAddress] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [observations, setObservations] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const sessionIdRef = useRef<string | null>(null);
  const beaconDataRef = useRef<{ submitted: boolean; payload: BeaconPayload | null }>({
    submitted: false,
    payload: null,
  });

  useEffect(() => {
    fetch(`/api/products?slug=${encodeURIComponent(productSlug)}`)
      .then((r) => r.json())
      .then((data) => {
        const p = data?.product || (Array.isArray(data?.products) ? data.products[0] : null) || data;
        if (p && p.id) {
          setProduct(p as Product);
          trackEvent("view_item", {
            currency: (p as Product).currency || "RON",
            value: Number((p as Product).price) || 0,
            items: [{ item_id: (p as Product).id, item_name: (p as Product).name, price: (p as Product).price }],
          });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [productSlug]);

  // Debounced beacon: 1.5s after any field change, send a snapshot to abandoned_carts.
  useEffect(() => {
    if (success) return;
    const ref = beaconDataRef.current;
    if (!ref.payload) return;
    const sid = sessionIdRef.current || (typeof window !== "undefined" ? sessionStorage.getItem("cart_session_id") : null);
    if (!sid) return;

    const timer = setTimeout(() => {
      const current = beaconDataRef.current;
      if (current.submitted || !current.payload) return;
      fetch("/api/orders/log-abandoned", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...current.payload, session_id: sid }),
        keepalive: true,
      }).catch(() => {});
    }, 1500);

    return () => clearTimeout(timer);
  }, [customerName, customerPhone, customerEmail, address, observations, quantity, success]);

  // Stable session ID + unload beacon listener.
  useEffect(() => {
    if (typeof window === "undefined") return;
    let sid = sessionStorage.getItem("cart_session_id");
    if (!sid) {
      sid = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem("cart_session_id", sid);
    }
    sessionIdRef.current = sid;

    const fire = () => {
      const ref = beaconDataRef.current;
      if (ref.submitted || !ref.payload) return;
      const payload = { ...ref.payload, session_id: sid };
      try {
        const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
        navigator.sendBeacon("/api/orders/log-abandoned", blob);
      } catch {
        fetch("/api/orders/log-abandoned", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          keepalive: true,
        }).catch(() => {});
      }
    };

    const onVisibility = () => { if (document.visibilityState === "hidden") fire(); };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", fire);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", fire);
    };
  }, []);

  // Keep beacon payload in sync with latest form state on every render.
  const hasContactInfo = !!(customerName.trim() || customerPhone.trim() || customerEmail.trim());
  beaconDataRef.current = {
    submitted: success,
    payload: (hasContactInfo && product) ? {
      customer_name: customerName.trim(),
      customer_phone: customerPhone.trim(),
      customer_email: customerEmail.trim(),
      address: address.trim(),
      product_id: product.id,
      product_name: product.name,
      product_slug: product.slug,
      url: typeof window !== "undefined" ? window.location.href : "",
      snapshot: {
        quantity,
        observations: observations.trim(),
        unit_price: Number(product.price) || 0,
        currency: product.currency || "RON",
        total: (Number(product.price) || 0) * Number(quantity),
      },
    } : null,
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    setSubmitting(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: product.id,
          product_name: product.name,
          product_slug: product.slug,
          quantity,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_email: customerEmail,
          address,
          observations,
          order_value: Number(product.price) * Number(quantity),
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.error || "Eroare la plasarea comenzii");
      }
      const orderData = await res.json().catch(() => ({}));
      const value = Number(product.price) * Number(quantity);
      const currency = product.currency || "RON";
      trackEvent("add_to_cart", {
        currency,
        value,
        items: [{ item_id: product.id, item_name: product.name, quantity, price: product.price }],
      });
      trackEvent("purchase", {
        transaction_id: orderData?.id ? String(orderData.id) : undefined,
        currency,
        value,
        items: [{ item_id: product.id, item_name: product.name, quantity, price: product.price }],
      });
      setSuccess(true);
      if (sessionIdRef.current) {
        fetch(`/api/orders/log-abandoned?session_id=${encodeURIComponent(sessionIdRef.current)}`, {
          method: "DELETE",
          keepalive: true,
        }).catch(() => {});
        sessionStorage.removeItem("cart_session_id");
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Eroare");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="products-loading">Se incarca...</div>;
  if (!product) return <div className="products-loading">Produsul nu a fost gasit.</div>;

  const image = product.r2_image_url || product.image_url;
  const currency = product.currency || "RON";
  const total = Number(product.price) * Number(quantity);
  const inStock = product.stock_status !== "out_of_stock";

  return (
    <div className="pd-wrap">
      <section className="pd-hero">
        <div className="pd-hero__media">
          {image && (() => {
            let optimized = false;
            try {
              const h = new URL(image).hostname;
              optimized = h === "media.ghidulfunerar.ro" || h === "huse.gravpoint.ro";
            } catch {}
            return optimized ? (
              <Image
                src={image}
                alt={product.name}
                width={640}
                height={640}
                sizes="(max-width: 768px) 100vw, 480px"
                className="pd-hero__img"
                priority
              />
            ) : (
              <img src={image} alt={product.name} className="pd-hero__img" />
            );
          })()}
        </div>

        <div className="pd-hero__info">
          <div className="pd-hero__meta">
            {product.sku && <span className="pd-hero__sku">Cod: {product.sku}</span>}
            {product.quantity && <span className="pd-hero__qty">{product.quantity}</span>}
            <span className={`pd-hero__stock ${inStock ? "is-in" : "is-out"}`}>
              {inStock ? "In stoc" : "Indisponibil"}
            </span>
          </div>

          <h1 className="pd-hero__name">{product.name}</h1>

          {product.short_description && (() => {
            const plain = product.short_description.replace(/<[^>]+>/g, "").trim();
            const clipped = plain.length > 180 ? plain.slice(0, 177).replace(/\s+\S*$/, "") + "..." : plain;
            return <p className="pd-hero__short">{clipped}</p>;
          })()}

          <div className="pd-hero__price-row">
            <div className="pd-hero__price">
              {Math.ceil(Number(product.price) || 0)} <span className="pd-hero__currency">{currency}</span>
            </div>
          </div>
        </div>
      </section>

      {success ? (
        <div className="pd-success">
          <h3>Multumim pentru comanda!</h3>
          <p>Te contactam in cel mai scurt timp pentru confirmare.</p>
        </div>
      ) : (
        <form className="pd-form pd-form--stacked" onSubmit={handleSubmit}>
          <div className="eyebrow">Plaseaza comanda</div>
          <div className="pd-form__grid">
            <div className="pd-form__row">
              <label>Nume complet *</label>
              <input type="text" required value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            </div>
            <div className="pd-form__row">
              <label>Telefon *</label>
              <input type="tel" required value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
            </div>
            <div className="pd-form__row pd-form__row--full">
              <label>Email</label>
              <input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
            </div>
            <div className="pd-form__row pd-form__row--full">
              <label>Adresa livrare *</label>
              <textarea required rows={2} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Judet, localitate, strada, numar" />
            </div>
            <div className="pd-form__row pd-form__row--full">
              <label>Observatii</label>
              <textarea rows={2} value={observations} onChange={(e) => setObservations(e.target.value)} />
            </div>
          </div>

          <div className="pd-form__summary">
            <div className="pd-form__qty">
              <label>Cantitate</label>
              <input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))} />
            </div>
            <div className="pd-form__total">
              <span>Total</span>
              <strong>{Math.ceil(total)} {currency}</strong>
            </div>
          </div>
          {errorMsg && <p className="pd-form__error">{errorMsg}</p>}
          <button type="submit" className="pd-form__submit" disabled={submitting || !inStock}>
            {submitting ? "Se trimite..." : inStock ? "Comanda acum" : "Indisponibil momentan"}
          </button>
          <p style={{
            marginTop: "0.75rem",
            padding: "0.6rem 0.9rem",
            border: "1.5px dashed #dc2626",
            borderRadius: "6px",
            color: "#dc2626",
            fontSize: "0.82rem",
            lineHeight: "1.45",
            textAlign: "center",
          }}>
            ⚠️ Comenzile se expediază doar după confirmarea plății online. Veți fi contactat imediat după plasarea comenzii.
          </p>
        </form>
      )}

      <div className="pd-cards">
        {product.description && (
          <article className="pd-card">
            <div className="eyebrow">Descriere</div>
            <div className="pd-card__body" dangerouslySetInnerHTML={{ __html: product.description }} />
          </article>
        )}
        {product.ingredients && (
          <article className="pd-card">
            <div className="eyebrow">Ce este inauntru</div>
            <div className="pd-card__body" dangerouslySetInnerHTML={{ __html: product.ingredients }} />
          </article>
        )}
        {product.usage_info && (
          <article className="pd-card">
            <div className="eyebrow">Mod de utilizare</div>
            <div className="pd-card__body" dangerouslySetInnerHTML={{ __html: product.usage_info }} />
          </article>
        )}
        {product.warnings && (
          <article className="pd-card pd-card--warn">
            <div className="eyebrow">Avertismente</div>
            <div className="pd-card__body" dangerouslySetInnerHTML={{ __html: product.warnings }} />
          </article>
        )}
        {product.certifications && (
          <article className="pd-card pd-card--certifications">
            <div className="eyebrow">Certificari</div>
            <div className="pd-card__body" dangerouslySetInnerHTML={{ __html: product.certifications }} />
          </article>
        )}
        {(product.datasheet_r2_url || product.datasheet_url) && (
          <article className="pd-card">
            <div className="eyebrow">Specificatii tehnice</div>
            <a href={product.datasheet_r2_url || product.datasheet_url || "#"} target="_blank" rel="noopener" className="pd-card__pdf">
              Descarca fisa produs (PDF)
            </a>
          </article>
        )}
      </div>
    </div>
  );
}
