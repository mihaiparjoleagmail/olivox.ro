"use client";

import { useState, useEffect, useRef } from "react";
import { trackEvent } from "@/lib/analytics";
import { resolveShippingCost, type ShippingTier } from "@/lib/shipping";
import { displayPrice, lineTotal } from "@/lib/price";

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

/** Pune punctele singur pe masura ce se tasteaza: 01011990 -> 01.01.1990 */
function maskBirthDate(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
}

/** Aceeasi regula ca pe server (/api/orders): dd.mm.yyyy si data sa existe. */
function isValidBirthDate(value: string): boolean {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value);
  if (!m) return false;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return false;
  return d <= new Date() && year >= 1900;
}

export interface OrderFormProduct {
  id: number;
  name: string;
  slug: string;
  price: number;
  currency: string;
  inStock: boolean;
}

export default function OrderForm({
  product,
  shippingCost = 0,
  shippingTiers = [],
  shippingLabel = "Curier",
}: {
  product: OrderFormProduct;
  /** Cost de livrare folosit cand nu se potriveste nicio plaja. */
  shippingCost?: number;
  /** Plaje de transport in functie de valoarea produselor, din Admin -> Setari. */
  shippingTiers?: ShippingTier[];
  /** Eticheta liniei de transport, din Admin -> Setari. */
  shippingLabel?: string;
}) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [strada, setStrada] = useState("");
  const [judetId, setJudetId] = useState("");
  const [judetName, setJudetName] = useState("");
  const [localitate, setLocalitate] = useState("");
  const [judeteList, setJudeteList] = useState<{ id: number; name: string }[]>([]);
  const [localitatiList, setLocalitatiList] = useState<string[]>([]);
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

  const currency = product.currency;
  const inStock = product.inStock;
  // Transportul depinde de valoarea produselor, deci se recalculeaza la fiecare
  // schimbare de cantitate. Aceeasi regula ruleaza si pe server, la salvare.
  // Rotunjim pretul unitar INAINTE de inmultire: pe pagina scrie pretul intreg
  // pe bucata, deci 2 buc trebuie sa dea exact dublul acelui numar.
  const productsTotal = lineTotal(product.price, quantity);
  const shipping = resolveShippingCost(productsTotal, { shippingCost, shippingTiers });
  const total = productsTotal + shipping;

  useEffect(() => {
    trackEvent("view_item", {
      currency: product.currency,
      value: displayPrice(product.price),
      items: [{ item_id: product.id, item_name: product.name, price: displayPrice(product.price) }],
    });
  }, [product.id, product.name, product.price, product.currency]);

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
  }, [customerName, customerPhone, customerEmail, birthDate, postalCode, strada, localitate, judetName, observations, quantity, success]);

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

  useEffect(() => {
    fetch("/api/judete").then((r) => r.json()).then((data) => {
      if (Array.isArray(data)) setJudeteList(data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!judetId) { setLocalitatiList([]); setLocalitate(""); return; }
    fetch(`/api/localitati?judetId=${judetId}`).then((r) => r.json()).then((data) => {
      if (Array.isArray(data)) setLocalitatiList(data);
    }).catch(() => {});
  }, [judetId]);

  // Keep beacon payload in sync with latest form state on every render.
  const combinedAddress = [strada.trim(), localitate, judetName].filter(Boolean).join(", ");
  const hasContactInfo = !!(customerName.trim() || customerPhone.trim() || customerEmail.trim());
  beaconDataRef.current = {
    submitted: success,
    payload: hasContactInfo ? {
      customer_name: customerName.trim(),
      customer_phone: customerPhone.trim(),
      customer_email: customerEmail.trim(),
      address: combinedAddress,
      product_id: product.id,
      product_name: product.name,
      product_slug: product.slug,
      url: typeof window !== "undefined" ? window.location.href : "",
      snapshot: {
        quantity,
        birth_date: birthDate,
        postal_code: postalCode,
        observations: observations.trim(),
        unit_price: displayPrice(product.price),
        currency,
        shipping_cost: shipping,
        total,
      },
    } : null,
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidBirthDate(birthDate)) {
      setErrorMsg("Introdu data nașterii în formatul zz.ll.aaaa (ex. 04.09.1985).");
      return;
    }
    if (!/^\d{6}$/.test(postalCode)) {
      setErrorMsg("Codul poștal trebuie să aibă 6 cifre.");
      return;
    }
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
          birth_date: birthDate,
          postal_code: postalCode,
          address: combinedAddress,
          observations,
          // Serverul recalculeaza transportul din setari; le trimitem doar ca fallback.
          products_value: productsTotal,
          shipping_cost: shipping,
          // Totalul pe care il plateste clientul prin transfer: produse + transport.
          order_value: total,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.error || "Eroare la plasarea comenzii");
      }
      const orderData = await res.json().catch(() => ({}));
      trackEvent("add_to_cart", {
        currency,
        value: productsTotal,
        items: [{ item_id: product.id, item_name: product.name, quantity, price: displayPrice(product.price) }],
      });
      trackEvent("purchase", {
        transaction_id: orderData?.id ? String(orderData.id) : undefined,
        currency,
        value: total,
        shipping,
        items: [{ item_id: product.id, item_name: product.name, quantity, price: displayPrice(product.price) }],
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

  if (success) {
    return (
      <div className="pd-success">
        <h3>Multumim pentru comanda!</h3>
        <p>Te contactam in cel mai scurt timp pentru confirmare.</p>
        <p>
          Plata se face exclusiv online, prin transfer bancar. La confirmare primesti datele de plata
          (IBAN, beneficiar, numarul comenzii), iar coletul pleaca imediat ce plata intra in cont.
          Nu se plateste nimic la curier.
        </p>
      </div>
    );
  }

  return (
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
        <div className="pd-form__row">
          <label>Email</label>
          <input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
        </div>
        <div className="pd-form__row">
          <label>Data nașterii *</label>
          <input
            type="text"
            required
            inputMode="numeric"
            autoComplete="bday"
            placeholder="zz.ll.aaaa"
            maxLength={10}
            value={birthDate}
            onChange={(e) => setBirthDate(maskBirthDate(e.target.value))}
          />
        </div>
        <div className="pd-form__row">
          <label>Județ *</label>
          <select required value={judetId} onChange={(e) => {
            const id = e.target.value;
            setJudetId(id);
            const j = judeteList.find((x) => String(x.id) === id);
            setJudetName(j?.name || "");
            setLocalitate("");
          }}>
            <option value="">Selectează județ</option>
            {judeteList.map((j) => <option key={j.id} value={j.id}>{j.name}</option>)}
          </select>
        </div>
        <div className="pd-form__row">
          <label>Localitate *</label>
          <select required value={localitate} onChange={(e) => setLocalitate(e.target.value)} disabled={!judetId}>
            <option value="">{judetId ? "Selectează localitate" : "Alege județul mai întâi"}</option>
            {localitatiList.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div className="pd-form__row pd-form__row--full">
          <label>Stradă, număr *</label>
          <input type="text" required value={strada} onChange={(e) => setStrada(e.target.value)} placeholder="Strada, număr, bloc, apartament" />
        </div>
        <div className="pd-form__row">
          <label>Cod poștal *</label>
          <input
            type="text"
            required
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="6 cifre"
            maxLength={6}
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          />
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
        <div className="pd-form__totals">
          <div className="pd-form__line">
            <span>Produse</span>
            <span>{productsTotal} {currency}</span>
          </div>
          <div className="pd-form__line">
            <span>{shippingLabel}</span>
            <span>{shipping > 0 ? `${shipping} ${currency}` : "Gratuit"}</span>
          </div>
          <div className="pd-form__total">
            <span>Total de plata</span>
            <strong>{total} {currency}</strong>
          </div>
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
        ⚠️ Plata se face exclusiv online, prin transfer bancar — nu livrăm cu plata ramburs. Vă contactăm imediat după plasarea comenzii, iar coletul se expediază după confirmarea plății.
      </p>
    </form>
  );
}
