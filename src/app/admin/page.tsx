"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useConfig } from "@/lib/use-config";
import { DEFAULT_CONFIG } from "@/lib/site-config";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { getAdminAuth, setAdminAuth, clearAdminAuth } from "@/lib/admin-auth";

// ===== TYPES =====
interface CustomFieldValue {
  value: string | boolean;
  label: string;
  type: string;
  option_label?: string;
  price_impact?: number;
  image_url?: string;
}

interface Order {
  id: number;
  product_id?: number | null;
  product_name?: string;
  product_slug?: string;
  quantity?: number;
  address: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  /** dd.mm.yyyy */
  birth_date?: string;
  postal_code?: string;
  observations: string;
  status: string;
  awb_number?: string;
  awb_status?: string;
  fan_awb?: string;
  fan_status?: string;
  sd_awb?: string;
  sd_status?: string;
  eb_awb?: string;
  eb_status?: string;
  shipping_method?: string;
  order_source?: string;
  ramburs?: number;
  fgo_serie?: string;
  fgo_numar?: string;
  fgo_link?: string;
  custom_field_values?: Record<string, CustomFieldValue>;
  order_value?: number;
  shipping_cost?: number;
  locker_id?: number | null;
  created_at: string;
}

/** Ce returneaza GET /api/admin/products?id=|slug= pentru detaliile comenzii. */
interface OrderProductInfo {
  id: number;
  name: string;
  slug: string;
  sku?: string | null;
  /** URL-ul original de pe mysnep, de unde a fost importat produsul. */
  source_url?: string | null;
  category_slugs?: string[] | null;
  r2_image_url?: string | null;
  image_url?: string | null;
}

/** Pune punctele singur pe masura ce se tasteaza: 01011990 -> 01.01.1990 */
function maskBirthDate(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
}

interface Category {
  id: number;
  woo_id: number;
  name: string;
  slug: string;
  image_url: string;
  product_count: number;
  sort_order: number;
}

interface Product {
  id: number;
  woo_id: number;
  name: string;
  slug: string;
  r2_image_url: string;
  image_url: string;
  price: number;
  category_slugs: string[];
  short_description: string;
  /** Data importului de la furnizor — dupa ea se sorteaza ca sa se vada ce e nou. */
  imported_at?: string | null;
}

const STATUSES = ["in procesare", "finalizata", "livrat", "anulata", "retur"];
const STATUS_COLORS: Record<string, string> = {
  "in procesare": "#f59e0b", finalizata: "#10b981", livrat: "#059669", anulata: "#6b7280", retur: "#dc2626",
};

type Tab = "dashboard" | "comenzi" | "abandonate" | "categorii" | "produse" | "homepage" | "recenzii" | "statistici" | "setari";

interface AbandonedCart {
  id: number;
  session_id: string;
  created_at: string;
  last_seen_at: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  address: string | null;
  product_id: number | null;
  product_name: string | null;
  product_slug: string | null;
  snapshot: Record<string, unknown> | null;
  user_agent: string | null;
  url: string | null;
  resolved_at: string | null;
}

export default function AdminPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [authHeader, setAuthHeader] = useState("");
  const [tab, setTab] = useState<Tab>("dashboard");
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const [abandonedCount, setAbandonedCount] = useState(0);
  const [directOrderId, setDirectOrderId] = useState<number | null>(null);
  const [ordersRefreshKey, setOrdersRefreshKey] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get("order");
    if (orderId) { setDirectOrderId(Number(orderId)); setTab("comenzi"); }
    const saved = getAdminAuth();
    if (saved) {
      setAuthHeader(saved); setLoggedIn(true);
      fetch("/api/admin/orders", { headers: { Authorization: saved } })
        .then(r => r.json())
        .then(data => { if (Array.isArray(data)) { setAllOrders(data); setNewOrdersCount(data.filter((o: Order) => o.status === "in procesare").length); } })
        .catch(() => {});
      fetch("/api/admin/abandoned-carts", { headers: { Authorization: saved } })
        .then(r => r.json())
        .then(data => { if (Array.isArray(data)) setAbandonedCount(data.filter((f: { resolved_at: string | null }) => !f.resolved_at).length); })
        .catch(() => {});
    }
  }, []);

  const handleLogin = async () => {
    const auth = "Basic " + btoa(`${user}:${pass}`);
    const res = await fetch("/api/admin/orders", { headers: { Authorization: auth } });
    if (res.ok) {
      setAuthHeader(auth); setLoggedIn(true); setAdminAuth(auth);
      const data = await res.json();
      if (Array.isArray(data)) { setAllOrders(data); setNewOrdersCount(data.filter((o: Order) => o.status === "in procesare").length); }
      fetch("/api/admin/abandoned-carts", { headers: { Authorization: auth } })
        .then(r => r.json())
        .then(d => { if (Array.isArray(d)) setAbandonedCount(d.filter((f: { resolved_at: string | null }) => !f.resolved_at).length); })
        .catch(() => {});
    }
  };

  if (!loggedIn) {
    return (
      <div className="admin-login-wrap">
        <form className="admin-login" onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
          <h1>Admin</h1>
          <p>olivox.ro</p>
          <input type="text" placeholder="Utilizator" value={user} onChange={(e) => setUser(e.target.value)} autoComplete="username" />
          <input type="password" placeholder="Parola" value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="current-password" />
          <button type="submit">Intra</button>
        </form>
      </div>
    );
  }

  return (
    <div className="admin-wrap">
      <div className="admin-topbar">
        <a href="/" className="admin-tab-icon" title="Site" target="_blank" rel="noopener">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
        </a>
       {/* buton pagina dash
        <button className={`admin-tab-icon ${tab === "dashboard" ? "admin-tab-icon--active" : ""}`} onClick={() => setTab("dashboard")} title="Dashboard">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M3 3v18h18"/><path d="M7 16l4-4 4 4 6-6"/></svg>
        </button>*/}
        <div className="admin-tabs">
          <button className={`admin-tab ${tab === "comenzi" ? "admin-tab--active" : ""}`} onClick={() => { setTab("comenzi"); setOrdersRefreshKey(Date.now()); if (directOrderId) { setDirectOrderId(null); window.history.replaceState({}, "", "/admin"); } }}>
            Comenzi{newOrdersCount > 0 && <span className="admin-tab__badge">{newOrdersCount}</span>}
          </button>
          <button className={`admin-tab ${tab === "abandonate" ? "admin-tab--active" : ""}`} onClick={() => setTab("abandonate")} title="Cosuri abandonate">
            <span className="admin-tab__text">Abandonate</span>
            {abandonedCount > 0 && <span className="admin-tab__badge" style={{ background: "#f59e0b" }}>{abandonedCount}</span>}
            <svg className="admin-tab__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>
          </button>
          <button className={`admin-tab ${tab === "statistici" ? "admin-tab--active" : ""}`} onClick={() => setTab("statistici")}>
            <span className="admin-tab__text">Statistici</span>
            <svg className="admin-tab__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
          </button>
          <button className={`admin-tab ${tab === "categorii" ? "admin-tab--active" : ""}`} onClick={() => setTab("categorii")}>
            <span className="admin-tab__text">Categorii</span>
            <svg className="admin-tab__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
          </button>
          <button className={`admin-tab ${tab === "produse" ? "admin-tab--active" : ""}`} onClick={() => setTab("produse")}>
            <span className="admin-tab__text">Produse</span>
            <svg className="admin-tab__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12"/></svg>
          </button>
<button className={`admin-tab ${tab === "homepage" ? "admin-tab--active" : ""}`} onClick={() => setTab("homepage")}>
            <span className="admin-tab__text">Homepage</span>
            <svg className="admin-tab__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </button>
          <button className={`admin-tab ${tab === "recenzii" ? "admin-tab--active" : ""}`} onClick={() => setTab("recenzii")}>
            <span className="admin-tab__text">Recenzii</span>
            <svg className="admin-tab__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </button>
          <button className={`admin-tab-icon ${tab === "setari" ? "admin-tab-icon--active" : ""}`} onClick={() => setTab("setari")} title="Setari">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
          </button>
        </div>
        <button className="admin-logout" onClick={() => { setLoggedIn(false); clearAdminAuth(); }} title="Deconectare">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
        </button>
      </div>

      {tab === "dashboard" && <DashboardPanel orders={allOrders} onNavigate={setTab} />}
      {tab === "comenzi" && <OrdersPanel key={`${directOrderId || "list"}-${ordersRefreshKey}`} auth={authHeader} onCountUpdate={(n) => { setNewOrdersCount(n); }} onOrdersLoaded={setAllOrders} initialOrderId={directOrderId} />}
      {tab === "abandonate" && <AbandonedCartsPanel auth={authHeader} onCountUpdate={setAbandonedCount} />}
      {tab === "statistici" && <StatisticsPanel orders={allOrders} />}
      {tab === "categorii" && <CategoriesPanel auth={authHeader} />}
      {tab === "produse" && <ProductsPanel auth={authHeader} />}
      {tab === "homepage" && <HomepagePanel auth={authHeader} />}
      {tab === "recenzii" && <ReviewsPanel auth={authHeader} />}
      {tab === "setari" && <SettingsPanel auth={authHeader} />}
    </div>
  );
}

// ===== HELPERS =====
function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = String(d.getFullYear()).slice(2);
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  return `${day}.${month}.${year} ${hours}:${mins}`;
}

function parseAddress(addr: string) {
  const parts = addr?.split(",").map((s) => s.trim()) || [];
  return { street: parts[0] || addr || "", locality: parts[1] || "", county: parts[2] || "" };
}

// ===== ORDERS PANEL =====
function OrdersPanel({ auth, onCountUpdate, onOrdersLoaded, initialOrderId }: { auth: string; onCountUpdate: (n: number) => void; onOrdersLoaded: (orders: Order[]) => void; initialOrderId?: number | null }) {
  const config = useConfig();
  const isDirectPage = !!initialOrderId;
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "id">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<number | null>(initialOrderId || null);
  const [lightboxImg, setLightboxImg] = useState("");
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxNames, setLightboxNames] = useState<string[]>([]);
  const [lightboxIdx, setLightboxIdx] = useState(0);
  const perPage = 20;

  const onCountRef = useRef(onCountUpdate);
  const onLoadedRef = useRef(onOrdersLoaded);
  onCountRef.current = onCountUpdate;
  onLoadedRef.current = onOrdersLoaded;

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/orders", { headers: { Authorization: auth } });
    if (res.ok) { const data = await res.json(); if (Array.isArray(data)) { setOrders(data); onLoadedRef.current(data); onCountRef.current(data.filter((o: Order) => o.status === "in procesare").length); } }
    setLoading(false);
  }, [auth]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const updateStatus = async (id: number, status: string) => {
    await fetch("/api/admin/orders", { method: "PATCH", headers: { Authorization: auth, "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    fetchOrders();
  };

  const [refreshingCourier, setRefreshingCourier] = useState(false);
  const refreshCourierStatus = async () => {
    setRefreshingCourier(true);
    try {
      await fetch("/api/cron", { headers: { Authorization: auth } });
      await fetchOrders();
    } catch {}
    setRefreshingCourier(false);
  };

  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const deleteOrder = async (id: number) => {
    await fetch("/api/admin/orders", { method: "DELETE", headers: { Authorization: auth, "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setDeleteConfirmId(null);
    fetchOrders();
  };

  const getClientHistory = useCallback((order: Order): Order[] => {
    // Find ALL orders from same client (transitive: phone OR email match chain)
    const clientIds = new Set<number>([order.id]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const o of orders) {
        if (clientIds.has(o.id)) continue;
        const isMatch = [...clientIds].some((id) => {
          const existing = orders.find((x) => x.id === id);
          if (!existing) return false;
          const p1 = (existing.customer_phone || "").trim();
          const p2 = (o.customer_phone || "").trim();
          const e1 = (existing.customer_email || "").trim();
          const e2 = (o.customer_email || "").trim();
          return (p1 && p2 && p1 === p2) || (e1 && e2 && e1 === e2);
        });
        if (isMatch) { clientIds.add(o.id); changed = true; }
      }
    }
    clientIds.delete(order.id);
    return orders.filter((o) => clientIds.has(o.id)).sort((a, b) => b.id - a.id);
  }, [orders]);

  // Filter + search
  const filtered = orders.filter((o) => {
    if (filterStatus && o.status !== filterStatus) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    const all = `${o.id} ${o.customer_name} ${o.customer_phone} ${o.customer_email} ${o.product_name || ""} ${o.address} ${o.awb_number || ""} ${o.observations}`.toLowerCase();
    return all.includes(q);
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    if (sortBy === "id") return (a.id - b.id) * dir;
    return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir;
  });

  // Paginate
  const totalPages = Math.ceil(sorted.length / perPage);
  const paginated = sorted.slice((page - 1) * perPage, page * perPage);

  const toggleSort = (col: "date" | "id") => {
    if (sortBy === col) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("desc"); }
  };

  // Direct page mode: show only the order, no table/filters
  if (isDirectPage) {
    if (loading) return <p className="admin-loading">Se incarca...</p>;
    const order = orders.find((o) => o.id === expandedId);
    if (!order) return <p className="admin-loading">Comanda #{expandedId} nu a fost gasita.</p>;
    // Set browser tab title
    document.title = `${order.id} - ${order.customer_name}`;
    const history = getClientHistory(order);
    return (
      <div className="ot-page">
        <div className="ot-page__header">
          <button className="admin-back-btn" onClick={() => window.close()}>← Inchide</button>
          <h2>Comanda #{order.id} — {order.customer_name} — {new Date(order.created_at).toLocaleDateString("ro-RO")} {new Date(order.created_at).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}</h2>
          <div className="ot-page__header-right">
            <div className="admin-status-btns admin-status-btns--header">
              {STATUSES.map((s) => (
                <button key={s} className={`admin-status-btn ${order.status === s ? "admin-status-btn--active" : ""}`} style={order.status === s ? { background: STATUS_COLORS[s], color: "#fff" } : {}} onClick={() => updateStatus(order.id, s)}>{s}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="ot-page__body">
          <div className="admin-order__grid">
            <div className="admin-order__details">
              <OrderDetails order={order} auth={auth} onUpdate={fetchOrders} />
              {history.length > 0 && (
                <>
                  <h3>Comenzile clientului</h3>
                  <div className="ot-history-list">
                    {history.map((h) => (
                      <button key={h.id} className="ot-history-item" style={h.status === "finalizata" || h.status === "livrat" ? { color: "#10b981" } : h.status === "retur" ? { color: "#dc2626" } : h.status === "anulata" || h.status === "anulat" ? { textDecoration: "line-through" } : {}} onClick={() => window.open(`/admin?order=${h.id}`, "_blank")}>
                        #{h.id} — {new Date(h.created_at).toLocaleDateString("ro-RO")} — {h.product_name || "—"} ({h.status})
                      </button>
                    ))}
                  </div>
                </>
              )}
              <div className="admin-status-btns admin-status-btns--mobile">
                {STATUSES.map((s) => (
                  <button key={s} className={`admin-status-btn ${order.status === s ? "admin-status-btn--active" : ""}`} style={order.status === s ? { background: STATUS_COLORS[s], color: "#fff" } : {}} onClick={() => updateStatus(order.id, s)}>{s}</button>
                ))}
              </div>
            </div>
            <div className="admin-order__images">
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <h3 style={{ margin: 0 }}>Livrare</h3>
                    <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.5px", color: "#fff", background: order.shipping_method === "fancourier" ? "#e94560" : "#0066cc" }}>
                      {order.shipping_method === "easybox" ? "Easybox" : order.shipping_method === "sameday" ? "Sameday" : "FanCourier"}
                    </span>
                  </div>
                  <RambursField order={order} auth={auth} onUpdate={fetchOrders} />
                </div>
                <hr style={{ border: "none", borderTop: "1.5px solid var(--color-border)", margin: "12px 0" }} />
                <AwbSection order={order} auth={auth} onUpdate={fetchOrders} />
              </div>
            </div>
          </div>
        </div>
        {lightboxImg && (
          <div className="admin-lightbox" onClick={() => setLightboxImg("")}>
            <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 12 }} onClick={(e) => e.stopPropagation()}>
              {lightboxImages.length > 1 && (
                <button onClick={() => { const ni = (lightboxIdx - 1 + lightboxImages.length) % lightboxImages.length; setLightboxIdx(ni); setLightboxImg(lightboxImages[ni]); }}
                  style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", fontSize: 28, width: 40, height: 40, borderRadius: "50%", cursor: "pointer", flexShrink: 0 }}>&#8249;</button>
              )}
              <div style={{ position: "relative" }}>
                <img src={lightboxImg} alt="Preview" style={{ maxHeight: "80vh", maxWidth: "80vw", borderRadius: 8 }} />
                <div style={{ position: "absolute", top: 10, right: 10, display: "flex", gap: 6 }}>
                  <button onClick={() => {
                    const sn = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[șȘ]/g, "s").replace(/[țȚ]/g, "t").replace(/[ăĂ]/g, "a").replace(/[âÂ]/g, "a").replace(/[îÎ]/g, "i").replace(/[^a-zA-Z0-9_\-]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
                    const name = `${order.id}_${sn(order.customer_name)}_${order.product_name ? sn(order.product_name) : ""}_${lightboxNames[lightboxIdx] || "imagine"}.jpg`.replace(/_+/g, "_").replace(/_\./g, ".");
                    fetch(`/api/proxy-image?url=${encodeURIComponent(lightboxImg)}`).then(r => r.blob()).then(blob => {
                      const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
                    });
                  }} style={{ background: "rgba(0,0,0,0.6)", border: "none", color: "#fff", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: "0.78rem", fontWeight: 600, backdropFilter: "blur(4px)" }}>
                    ↓ Descarca
                  </button>
                  <button onClick={() => setLightboxImg("")}
                    style={{ background: "rgba(0,0,0,0.6)", border: "none", color: "#fff", width: 32, height: 32, borderRadius: 6, cursor: "pointer", fontSize: 16, backdropFilter: "blur(4px)" }}>✕</button>
                </div>
                {lightboxImages.length > 1 && (
                  <div style={{ position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.5)", color: "#fff", padding: "2px 10px", borderRadius: 12, fontSize: "0.72rem" }}>
                    {lightboxNames[lightboxIdx] || ""} — {lightboxIdx + 1} / {lightboxImages.length}
                  </div>
                )}
              </div>
              {lightboxImages.length > 1 && (
                <button onClick={() => { const ni = (lightboxIdx + 1) % lightboxImages.length; setLightboxIdx(ni); setLightboxImg(lightboxImages[ni]); }}
                  style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", fontSize: 28, width: 40, height: 40, borderRadius: "50%", cursor: "pointer", flexShrink: 0 }}>&#8250;</button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Filters */}
      <div className="ot-filters">
        <input className="ot-search" placeholder="Cauta in comenzi..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        <div className="ot-status-filters">
          <button className={`ot-sf ${!filterStatus ? "ot-sf--all" : ""}`} onClick={() => { setFilterStatus(""); setPage(1); }}>Toate ({orders.length})</button>
          {STATUSES.map((s) => {
            const c = orders.filter((o) => o.status === s).length;
            if (c === 0) return null;
            return <button key={s} className={`ot-sf ${filterStatus === s ? "ot-sf--active" : ""}`} style={filterStatus === s ? { background: STATUS_COLORS[s], color: "#fff" } : {}} onClick={() => { setFilterStatus(s); setPage(1); }}>{s} ({c})</button>;
          })}
          <button className="ot-sf" onClick={refreshCourierStatus} disabled={refreshingCourier} title="Refresh status curieri" style={{ marginLeft: 8, fontSize: "0.85rem", opacity: refreshingCourier ? 0.5 : 1 }}>{refreshingCourier ? "..." : "↻"}</button>
        </div>
      </div>

      {loading ? <p className="admin-loading">Se incarca...</p> : (
        <>
          <div className="ot-wrap">
            <table className="ot">
              <thead>
                <tr>
                  <th className="ot-sortable" onClick={() => toggleSort("id")}>Comanda {sortBy === "id" ? (sortDir === "asc" ? "↑" : "↓") : ""}</th>
                  <th className="ot-sortable" onClick={() => toggleSort("date")}>Data {sortBy === "date" ? (sortDir === "asc" ? "↑" : "↓") : ""}</th>
                  <th>Total</th>
                  <th>Adresa livrare</th>
                  <th>Comenzi</th>
                  <th>Factura</th>
                  <th>Curier</th>
                  <th>Origine</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((order) => {
                  const addr = parseAddress(order.address);
                  const history = getClientHistory(order);
                  return (
                    <tr key={order.id} className={expandedId === order.id ? "ot-row--expanded" : ""} onClick={() => {
                      if (window.innerWidth >= 768) {
                        window.open(`/admin?order=${order.id}`, "_blank");
                      } else {
                        setExpandedId(expandedId === order.id ? null : order.id);
                      }
                    }}>
                      <td className="ot-cmd">
                        <strong>#{order.id}</strong>
                        <span>{order.customer_name}</span>
                        <span>{order.customer_phone}</span>
                      </td>
                      <td className="ot-date">
                        <span>{formatShortDate(order.created_at)}</span>
                        <span className="ot-badge" style={{ background: STATUS_COLORS[order.status] || "#6b7280" }}>{order.status}</span>
                      </td>
                      <td className="ot-total"><strong>{order.order_value || config.productPrice} {config.currency}</strong></td>
                      <td className="ot-addr">
                        <span>{addr.county}</span>
                        <span>{addr.locality}</span>
                        <span>{addr.street}</span>
                      </td>
                      <td><ClientHistory history={history} onOpen={setExpandedId} /></td>
                      <td>{order.fgo_numar ? (
                        <a href={order.fgo_link || "#"} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()} style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--color-primary)", textDecoration: "none" }}>{order.fgo_serie} {order.fgo_numar}</a>
                      ) : <span className="ot-muted">-</span>}</td>
                      <td className="ot-curier">
                        <span className="ot-shipping-badge" style={{ background: order.shipping_method === "easybox" ? "#0066cc" : order.shipping_method === "sameday" ? "#0066cc" : "#e94560", color: "#fff" }}>
                          {order.shipping_method === "easybox" ? "Easybox" : order.shipping_method === "sameday" ? "Sameday" : "FanCourier"}
                        </span>
                        {(order.fan_awb || order.sd_awb || order.eb_awb) ? (
                          <>
                            {order.fan_awb && <span style={{ fontSize: "0.58rem", color: "#e94560" }}>FC: {order.fan_awb}{order.fan_status ? `-${order.fan_status}` : ""}</span>}
                            {order.sd_awb && <span style={{ fontSize: "0.58rem", color: "#0066cc" }}>SD: {order.sd_awb}{order.sd_status ? `-${order.sd_status}` : ""}</span>}
                            {order.eb_awb && <span style={{ fontSize: "0.58rem", color: "#0066cc" }}>EB: {order.eb_awb}{order.eb_status ? `-${order.eb_status}` : ""}</span>}
                          </>
                        ) : order.awb_number ? (
                          <span style={{ fontSize: "0.58rem" }}>{order.awb_number}{order.awb_status ? `-${order.awb_status}` : ""}</span>
                        ) : null}
                      </td>
                      <td className="ot-origin">{(() => {
                        try { const s = JSON.parse(order.order_source || "{}"); return s.label || "direct"; } catch { return order.order_source || "direct"; }
                      })()}</td>
                      <td>
                        <button className="ot-del" onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(order.id); }} title="Sterge">✕</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Order detail modal (mobile only - desktop opens in new tab) */}
          {expandedId && (() => {
            const order = orders.find((o) => o.id === expandedId);
            if (!order) return null;
            const history = getClientHistory(order);
            return (
              <div className="ot-modal-overlay" onClick={() => setExpandedId(null)}>
                <div className="ot-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="ot-modal__header">
                    <h2>Comanda #{order.id} — {order.customer_name} — {new Date(order.created_at).toLocaleDateString("ro-RO")} {new Date(order.created_at).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}</h2>
                    <div className="ot-modal__header-right">
                      <div className="admin-status-btns admin-status-btns--header">
                        {STATUSES.map((s) => (
                          <button key={s} className={`admin-status-btn ${order.status === s ? "admin-status-btn--active" : ""}`} style={order.status === s ? { background: STATUS_COLORS[s], color: "#fff" } : {}} onClick={() => updateStatus(order.id, s)}>{s}</button>
                        ))}
                      </div>
                      <button className="ot-modal__close" onClick={() => setExpandedId(null)}>✕</button>
                    </div>
                  </div>
                  <div className="ot-modal__body">
                    <div className="admin-order__grid">
                      <div className="admin-order__details">
                        <OrderDetails order={order} auth={auth} onUpdate={fetchOrders} />
                        {history.length > 0 && (
                          <>
                            <h3>Comenzile clientului</h3>
                            <div className="ot-history-list">
                              {history.map((h) => (
                                <button key={h.id} className="ot-history-item" style={h.status === "finalizata" || h.status === "livrat" ? { color: "#10b981" } : h.status === "retur" ? { color: "#dc2626" } : h.status === "anulata" || h.status === "anulat" ? { textDecoration: "line-through" } : {}} onClick={() => setExpandedId(h.id)}>
                                  #{h.id} — {new Date(h.created_at).toLocaleDateString("ro-RO")} — {h.product_name || "—"} ({h.status})
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                        <div className="admin-status-btns admin-status-btns--mobile">
                          {STATUSES.map((s) => (
                            <button key={s} className={`admin-status-btn ${order.status === s ? "admin-status-btn--active" : ""}`} style={order.status === s ? { background: STATUS_COLORS[s], color: "#fff" } : {}} onClick={() => updateStatus(order.id, s)}>{s}</button>
                          ))}
                        </div>
                      </div>
                      <div className="admin-order__images">
                        <div>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 12 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <h3 style={{ margin: 0 }}>Livrare</h3>
                              <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.5px", color: "#fff", background: order.shipping_method === "fancourier" ? "#e94560" : "#0066cc" }}>
                                {order.shipping_method === "easybox" ? "Easybox" : order.shipping_method === "sameday" ? "Sameday" : "FanCourier"}
                              </span>
                            </div>
                            <RambursField order={order} auth={auth} onUpdate={fetchOrders} />
                          </div>
                          <hr style={{ border: "none", borderTop: "1.5px solid var(--color-border)", margin: "12px 0" }} />
                          <AwbSection order={order} auth={auth} onUpdate={fetchOrders} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {totalPages > 1 && (
            <div className="pagination" style={{ marginTop: 8 }}>
              <button className="pagination__btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>←</button>
              <span className="pagination__info">{page}/{totalPages}</span>
              <button className="pagination__btn" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>→</button>
            </div>
          )}

          {sorted.length === 0 && <p className="admin-empty">Nicio comanda gasita.</p>}

          {/* Image lightbox with navigation */}
          {lightboxImg && (
            <div className="admin-lightbox" onClick={() => setLightboxImg("")}>
              <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 8 }} onClick={(e) => e.stopPropagation()}>
                {lightboxImages.length > 1 && lightboxIdx > 0 && (
                  <button onClick={() => { const ni = lightboxIdx - 1; setLightboxIdx(ni); setLightboxImg(lightboxImages[ni]); }}
                    style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", fontSize: 24, width: 36, height: 36, borderRadius: "50%", cursor: "pointer" }}>&#8249;</button>
                )}
                <div style={{ position: "relative" }}>
                  <img src={lightboxImg} alt="Preview" style={{ maxHeight: "75vh", maxWidth: "85vw", borderRadius: 8 }} />
                  <div style={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 6 }}>
                    <button onClick={() => {
                      const lbOrder = orders.find(o => o.id === expandedId);
                      const sn = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[șȘ]/g, "s").replace(/[țȚ]/g, "t").replace(/[ăĂ]/g, "a").replace(/[âÂ]/g, "a").replace(/[îÎ]/g, "i").replace(/[^a-zA-Z0-9_\-]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
                      const name = lbOrder ? `${lbOrder.id}_${sn(lbOrder.customer_name)}_${lbOrder.product_name ? sn(lbOrder.product_name) : ""}_${lightboxNames[lightboxIdx] || "imagine"}.jpg`.replace(/_+/g, "_").replace(/_\./g, ".") : `${lightboxNames[lightboxIdx] || "imagine"}.jpg`;
                      fetch(`/api/proxy-image?url=${encodeURIComponent(lightboxImg)}`).then(r => r.blob()).then(blob => {
                        const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
                      });
                    }} style={{ background: "rgba(0,0,0,0.6)", border: "none", color: "#fff", padding: "5px 10px", borderRadius: 6, cursor: "pointer", fontSize: "0.72rem", fontWeight: 600, backdropFilter: "blur(4px)" }}>
                      ↓ Descarca
                    </button>
                    <button onClick={() => setLightboxImg("")}
                      style={{ background: "rgba(0,0,0,0.6)", border: "none", color: "#fff", width: 28, height: 28, borderRadius: 6, cursor: "pointer", fontSize: 14, backdropFilter: "blur(4px)" }}>✕</button>
                  </div>
                  {lightboxImages.length > 1 && (
                    <div style={{ position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.5)", color: "#fff", padding: "2px 10px", borderRadius: 12, fontSize: "0.68rem" }}>
                      {lightboxNames[lightboxIdx] || ""} — {lightboxIdx + 1} / {lightboxImages.length}
                    </div>
                  )}
                </div>
                {lightboxImages.length > 1 && lightboxIdx < lightboxImages.length - 1 && (
                  <button onClick={() => { const ni = lightboxIdx + 1; setLightboxIdx(ni); setLightboxImg(lightboxImages[ni]); }}
                    style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", fontSize: 24, width: 36, height: 36, borderRadius: "50%", cursor: "pointer" }}>&#8250;</button>
                )}
              </div>
            </div>
          )}

          {/* Delete confirmation modal */}
          {deleteConfirmId && (
            <div className="ot-modal-overlay" onClick={() => setDeleteConfirmId(null)}>
              <div className="ot-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 380 }}>
                <div style={{ padding: 24, textAlign: "center" }}>
                  <p style={{ color: "#dc2626", fontSize: "1rem", fontWeight: 700, margin: "0 0 8px" }}>Esti sigur ca stergi comanda #{deleteConfirmId}?</p>
                  <p style={{ color: "#dc2626", fontSize: "0.82rem", margin: "0 0 20px" }}>Aceasta actiune este ireversibila.</p>
                  <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                    <button onClick={() => setDeleteConfirmId(null)} style={{ padding: "8px 20px", borderRadius: 6, border: "1px solid var(--color-border)", background: "transparent", cursor: "pointer", fontSize: "0.82rem", fontFamily: "var(--font)" }}>Anuleaza</button>
                    <button onClick={() => deleteOrder(deleteConfirmId)} style={{ padding: "8px 20px", borderRadius: 6, border: "none", background: "#dc2626", color: "#fff", cursor: "pointer", fontSize: "0.82rem", fontWeight: 700, fontFamily: "var(--font)" }}>Sterge comanda</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

// ===== IMAGE UPLOAD HELPER =====
function useImageUpload() {
  const [preview, setPreview] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (f: File) => { setFile(f); setPreview(URL.createObjectURL(f)); };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f?.type.startsWith("image/")) handleFile(f); };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) handleFile(f); };
  const reset = () => { setFile(null); setPreview(""); };

  const uploadToR2 = async (): Promise<string> => {
    if (!file) return "";
    const fd = new FormData(); fd.append("file", file);
    const r = await fetch("/api/upload", { method: "POST", body: fd });
    const d = await r.json();
    return d.url || "";
  };

  const DropZone = () => (
    <div className={`admin-dropzone ${dragOver ? "admin-dropzone--active" : ""}`} onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop}>
      {preview ? (
        <div className="admin-dropzone__preview">
          <img src={preview} alt="Preview" />
          <button type="button" onClick={reset} className="admin-dropzone__remove">✕</button>
        </div>
      ) : (
        <label className="admin-dropzone__label">
          <span>Trage o imagine sau click</span>
          <input type="file" accept="image/*" onChange={handleChange} style={{ display: "none" }} />
        </label>
      )}
    </div>
  );

  return { preview, file, uploadToR2, reset, DropZone };
}

// ===== CATEGORIES PANEL =====
function CategoriesPanel({ auth }: { auth: string }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [saving, setSaving] = useState(false);
  const imgUpload = useImageUpload();

  const fetchCats = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/categories");
    if (res.ok) { const data = await res.json(); if (Array.isArray(data)) setCategories(data); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchCats(); }, [fetchCats]);

  const startEdit = (cat: Category) => { setEditingId(cat.id); setEditName(cat.name); };

  const saveEdit = async () => {
    if (!editingId) return;
    await fetch("/api/admin/categories", {
      method: "PATCH", headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ id: editingId, name: editName }),
    });
    setEditingId(null); fetchCats();
  };

  const deleteCat = async (id: number) => {
    if (!confirm("Stergi categoria?")) return;
    await fetch("/api/admin/categories", {
      method: "DELETE", headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchCats();
  };

  const addCategory = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    const imageUrl = await imgUpload.uploadToR2();
    const slug = newSlug.trim() || newName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
    const res = await fetch("/api/admin/categories", {
      method: "POST", headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), slug, image_url: imageUrl }),
    });
    const result = await res.json();
    if (!res.ok || result.error) { alert("Eroare salvare categorie: " + (result.error || "necunoscuta")); setSaving(false); return; }
    setNewName(""); setNewSlug(""); imgUpload.reset(); setShowAdd(false); setSaving(false); fetchCats();
  };

  const filtered = categories.filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <div className="admin-toolbar">
        <input className="admin-search" placeholder="Cauta categorie..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <span className="admin-count">{filtered.length} categorii</span>
        <button className="admin-add-btn" onClick={() => setShowAdd(!showAdd)}><span className="admin-add-btn__plus">+</span><span className="admin-add-btn__text"> Adauga</span></button>
      </div>

      {showAdd && (
        <div className="admin-add-form">
          <imgUpload.DropZone />
          <div className="admin-add-form__fields">
            <input className="admin-inline-input" placeholder="Nume categorie" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <input className="admin-inline-input" placeholder="Slug (optional)" value={newSlug} onChange={(e) => setNewSlug(e.target.value)} />
            <div style={{ display: "flex", gap: 6 }}>
              <button className="admin-add-btn" onClick={addCategory} disabled={saving}>{saving ? "..." : "Salveaza"}</button>
              <button className="admin-inline-btn" onClick={() => { setShowAdd(false); imgUpload.reset(); }}>Anuleaza</button>
            </div>
          </div>
        </div>
      )}

      {loading ? <p className="admin-loading">Se incarca...</p> : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Imagine</th><th>Nume</th><th>Slug</th><th>Prio</th><th>Produse</th><th>Actiuni</th></tr>
            </thead>
            <tbody>
              {filtered.map((cat) => (
                <tr key={cat.id} className="admin-table__clickrow" onClick={() => window.location.href = `/admin/categorii/${cat.id}`}>
                  <td>{cat.image_url && <img src={cat.image_url} alt="" className="admin-table__thumb" />}</td>
                  <td><strong>{cat.name}</strong></td>
                  <td className="admin-table__muted">{cat.slug}</td>
                  <td>
                    <input
                      type="number"
                      className="admin-prio-input"
                      value={cat.sort_order}
                      min={1}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setCategories((prev) => prev.map((c) => c.id === cat.id ? { ...c, sort_order: val } : c));
                      }}
                      onBlur={() => {
                        fetch("/api/admin/categories", {
                          method: "PATCH",
                          headers: { Authorization: auth, "Content-Type": "application/json" },
                          body: JSON.stringify({ id: cat.id, sort_order: cat.sort_order }),
                        });
                      }}
                    />
                  </td>
                  <td>{cat.product_count}</td>
                  <td>
                    <div className="admin-actions">
                      <a className="admin-action-btn" href={`/admin/categorii/${cat.id}`} title="Editeaza">✎</a>
                      <button className="admin-action-btn admin-action-btn--danger" onClick={(e) => { e.stopPropagation(); deleteCat(cat.id); }} title="Sterge">✕</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ===== PRODUCTS PANEL =====
function ProductsPanel({ auth }: { auth: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(() => sessionStorage.getItem("admin_products_search") || "");
  const [page, setPage] = useState(() => Number(sessionStorage.getItem("admin_products_page")) || 1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const config = useConfig();
  const [newPrice, setNewPrice] = useState(String(config.productPrice || ""));
  const [newCats, setNewCats] = useState("");
  const [saving, setSaving] = useState(false);
  const [filterCat, setFilterCat] = useState(() => sessionStorage.getItem("admin_products_filter") || "");
  const [allCats, setAllCats] = useState<{slug: string; name: string}[]>([]);
  const [sortBy, setSortBy] = useState<"id" | "imported_at" | "name" | "price">("id");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const imgUpload = useImageUpload();

  // Clear saved position after restoring
  useEffect(() => {
    sessionStorage.removeItem("admin_products_page");
    sessionStorage.removeItem("admin_products_filter");
    sessionStorage.removeItem("admin_products_search");
  }, []);

  useEffect(() => {
    fetch("/api/categories").then((r) => r.json()).then((data) => { if (Array.isArray(data)) setAllCats(data.map((c: any) => ({ slug: c.slug, name: c.name }))); }).catch(() => {});
  }, []);

  const fetchProds = useCallback(async () => {
    setLoading(true);
    const catParam = filterCat ? `&category=${filterCat}` : "";
    const searchParam = search ? `&search=${encodeURIComponent(search)}` : "";
    const res = await fetch(`/api/products?page=${page}&per_page=20${catParam}${searchParam}&sort=${sortBy}&dir=${sortDir}`);
    if (res.ok) {
      const data = await res.json();
      setProducts(data.products || []);
      setTotalPages(data.total_pages || 1);
      setTotal(data.total || 0);
    }
    setLoading(false);
  }, [page, filterCat, search, sortBy, sortDir]);

  useEffect(() => { fetchProds(); }, [fetchProds]);

  const toggleSort = (col: "id" | "imported_at" | "name" | "price") => {
    if (sortBy === col) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("desc"); }
    setPage(1);
  };
  const arrow = (col: string) => (sortBy === col ? (sortDir === "asc" ? " \u2191" : " \u2193") : "");

  const startEdit = (p: Product) => { setEditingId(p.id); setEditName(p.name); setEditPrice(String(p.price)); };

  const saveEdit = async () => {
    if (!editingId) return;
    await fetch("/api/admin/products", {
      method: "PATCH", headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ id: editingId, name: editName, price: Number(editPrice) }),
    });
    setEditingId(null);
    fetchProds();
  };

  const deleteProd = async (id: number) => {
    if (!confirm("Stergi produsul?")) return;
    await fetch("/api/admin/products", {
      method: "DELETE", headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchProds();
  };

  const addProduct = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    const imageUrl = await imgUpload.uploadToR2();
    const slug = newSlug.trim() || newName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
    const categorySlugs = newCats.split(",").map((s) => s.trim()).filter(Boolean);
    await fetch("/api/admin/products", {
      method: "POST", headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), slug, price: Number(newPrice) || config.productPrice || 0, image_url: imageUrl, category_slugs: categorySlugs }),
    });
    setNewName(""); setNewSlug(""); setNewPrice(String(config.productPrice || "")); setNewCats(""); imgUpload.reset(); setShowAdd(false); setSaving(false); fetchProds();
  };

  const filtered = products;

  return (
    <>
      <div className="admin-toolbar">
        <select className="admin-cat-filter" value={filterCat} onChange={(e) => { setFilterCat(e.target.value); setPage(1); }}>
          <option value="">Toate categoriile</option>
          {allCats.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
        <input className="admin-search" placeholder="Cauta produs..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        <span className="admin-count">{total}</span>
        <a className="admin-inline-btn" href="/admin/sincronizare" title="Sincronizare catalog cu mysnep"
           style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", padding: "0 10px" }}>
          ⟳ Sincronizare
        </a>
        <a href="/admin/produse/nou" className="admin-add-btn" style={{ textDecoration: "none" }}><span className="admin-add-btn__plus">+</span><span className="admin-add-btn__text"> Adauga</span></a>
      </div>


      {showAdd && (
        <div className="admin-add-form">
          <imgUpload.DropZone />
          <div className="admin-add-form__fields">
            <input className="admin-inline-input" placeholder="Nume produs" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <input className="admin-inline-input" placeholder="Slug (optional)" value={newSlug} onChange={(e) => setNewSlug(e.target.value)} />
            <input className="admin-inline-input" placeholder="Pret (RON)" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} style={{ width: 80 }} />
            <input className="admin-inline-input" placeholder="Categorii (slug-uri, separate cu virgula)" value={newCats} onChange={(e) => setNewCats(e.target.value)} />
            <div style={{ display: "flex", gap: 6 }}>
              <button className="admin-add-btn" onClick={addProduct} disabled={saving}>{saving ? "..." : "Salveaza"}</button>
              <button className="admin-inline-btn" onClick={() => { setShowAdd(false); imgUpload.reset(); }}>Anuleaza</button>
            </div>
          </div>
        </div>
      )}
      {loading ? <p className="admin-loading">Se incarca...</p> : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Img</th>
                  <th className="ot-sortable" onClick={() => toggleSort("name")}>Nume{arrow("name")}</th>
                  <th className="ot-sortable" onClick={() => toggleSort("price")}>Pret{arrow("price")}</th>
                  <th>Categorii</th>
                  <th className="ot-sortable" onClick={() => toggleSort("imported_at")}>Importat{arrow("imported_at")}</th>
                  <th>Actiuni</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="admin-table__clickrow" onClick={() => { sessionStorage.setItem("admin_products_page", String(page)); sessionStorage.setItem("admin_products_filter", filterCat); sessionStorage.setItem("admin_products_search", search); window.location.href = `/admin/produse/${p.id}`; }}>
                    <td>
                      <img src={p.r2_image_url || p.image_url} alt="" className="admin-table__thumb" />
                    </td>
                    <td>
                      {editingId === p.id ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <input className="admin-inline-input" value={editName} onChange={(e) => setEditName(e.target.value)} />
                          <div style={{ display: "flex", gap: 4 }}>
                            <input className="admin-inline-input" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} style={{ width: 60 }} />
                            <button className="admin-inline-btn" onClick={saveEdit}>✓</button>
                            <button className="admin-inline-btn" onClick={() => setEditingId(null)}>✕</button>
                          </div>
                        </div>
                      ) : <span className="admin-table__name">{p.name}</span>}
                    </td>
                    <td><strong>{p.price} RON</strong></td>
                    <td className="admin-table__muted">{p.category_slugs?.join(", ")}</td>
                    <td className="admin-table__muted" style={{ whiteSpace: "nowrap" }}>
                      {p.imported_at ? new Date(p.imported_at).toLocaleDateString("ro-RO") : "\u2014"}
                    </td>
                    <td>
                      <div className="admin-actions">
                        <a className="admin-action-btn" href={`/admin/produse/${p.id}`} title="Editeaza">✎</a>
                        <button className="admin-action-btn admin-action-btn--danger" onClick={(e) => { e.stopPropagation(); deleteProd(p.id); }} title="Sterge">✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="pagination" style={{ marginTop: 16 }}>
              <button className="pagination__btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>←</button>
              <input type="number" min={1} max={totalPages} value={page} onChange={(e) => { const v = parseInt(e.target.value); if (v >= 1 && v <= totalPages) setPage(v); }}
                style={{ width: 48, textAlign: "center", fontSize: "0.82rem", padding: "4px 2px", border: "1px solid var(--color-border)", borderRadius: 4, fontFamily: "var(--font)" }} />
              <span className="pagination__info" style={{ fontSize: "0.78rem" }}>/ {totalPages}</span>
              <button className="pagination__btn" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>→</button>
            </div>
          )}
        </>
      )}
    </>
  );
}

// ===== SETTINGS PANEL =====
function SettingsPanel({ auth }: { auth: string }) {
  const [fcUser, setFcUser] = useState("");
  const [fcPass, setFcPass] = useState("");
  const [fcClientId, setFcClientId] = useState("");
  const [fcIban, setFcIban] = useState("");
  const [fcBanca, setFcBanca] = useState("");
  // Sameday
  const [sdUser, setSdUser] = useState("");
  const [sdPass, setSdPass] = useState("");
  const [sdPickup, setSdPickup] = useState("");
  const [sdService, setSdService] = useState("");
  const [sdLockerService, setSdLockerService] = useState("");
  const [sdTestMode, setSdTestMode] = useState(false);
  // Pixels
  const [fbPixel, setFbPixel] = useState("");
  const [tiktokPixel, setTiktokPixel] = useState("");
  const [gaId, setGaId] = useState("");
  const [gadsId, setGadsId] = useState("");
  const [gadsLabel, setGadsLabel] = useState("");
  const [snapPixel, setSnapPixel] = useState("");
  const [pinterestTag, setPinterestTag] = useState("");

  // FGO
  const [fgoCui, setFgoCui] = useState("");
  const [fgoApiKey, setFgoApiKey] = useState("");
  const [fgoSerie, setFgoSerie] = useState("");
  const [fgoPlatformUrl, setFgoPlatformUrl] = useState("");
  const [fgoCotaTva, setFgoCotaTva] = useState("0");
  const [fgoTestMode, setFgoTestMode] = useState(false);
  const [fgoTestResult, setFgoTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [fgoTesting, setFgoTesting] = useState(false);

  // WhatsApp templates - default general template (used for cross-sell or fallback)
  const DEFAULT_WA_TEMPLATE = `Bună {{nume_client}},
Sunt de la {{site_name}}.

Mulțumim pentru comanda dvs cu nr #{{id_comanda}} în sumă de {{valoare}} lei.

Produs: {{produs}}
Livrare: {{metoda_livrare}}
Adresa: {{adresa}}

Confirmați adresa de livrare și vă procesăm comanda rapid.`;
  // Legacy single-template field (used as fallback if no templates array)
  const [waTemplate, setWaTemplate] = useState(DEFAULT_WA_TEMPLATE);
  // New: array of templates with category assignment
  const [waTemplates, setWaTemplates] = useState<Array<{id: string; name: string; category_slugs: string[]; content: string}>>([]);
  const [waGeneralTemplate, setWaGeneralTemplate] = useState(DEFAULT_WA_TEMPLATE);
  const [waEditingId, setWaEditingId] = useState<string | null>(null);
  const [allCategories, setAllCategories] = useState<Array<{id: number; name: string; slug: string}>>([]);

  // Load categories for whatsapp template assignment
  useEffect(() => {
    fetch("/api/categories").then((r) => r.json()).then((d) => { if (Array.isArray(d)) setAllCategories(d); }).catch(() => {});
  }, []);

  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [settingsTab, setSettingsTab] = useState<"site" | "fancourier" | "sameday" | "fgo" | "pixels" | "whatsapp" | "addons" | "feed" | "mysnep">("site");
  const [mysnepCookies, setMysnepCookies] = useState("");

  // Feed stats
  const [feedStats, setFeedStats] = useState<Record<string, { items: number; skipped: number; generated_at: string } | null>>({ google: null, facebook: null, tiktok: null });
  const [feedRefreshing, setFeedRefreshing] = useState(false);
  const [feedMsg, setFeedMsg] = useState("");

  useEffect(() => {
    if (settingsTab !== "feed") return;
    fetch("/api/admin/feed", { headers: { Authorization: auth } })
      .then((r) => r.json())
      .then((d) => { if (d.stats) setFeedStats(d.stats); })
      .catch(() => {});
  }, [settingsTab, auth]);

  const refreshFeeds = async () => {
    setFeedRefreshing(true);
    setFeedMsg("");
    try {
      const res = await fetch("/api/admin/feed", { method: "POST", headers: { Authorization: auth } });
      const data = await res.json();
      if (data.results) {
        const newStats: typeof feedStats = { google: null, facebook: null, tiktok: null };
        for (const [p, r] of Object.entries(data.results)) {
          const result = r as { items?: number; skipped?: number; generated_at?: string; error?: string };
          if (result.items !== undefined && result.generated_at) {
            newStats[p] = { items: result.items, skipped: result.skipped || 0, generated_at: result.generated_at };
          }
        }
        setFeedStats(newStats);
        setFeedMsg("Feed-uri regenerate cu succes!");
      } else {
        setFeedMsg("Eroare la regenerare.");
      }
    } catch (e) {
      setFeedMsg("Eroare: " + String(e));
    } finally {
      setFeedRefreshing(false);
      setTimeout(() => setFeedMsg(""), 5000);
    }
  };

  // Addon groups
  const [addonGroups, setAddonGroups] = useState<{id:string;name:string;fields:{id:string;type:string;label:string;placeholder?:string;required?:boolean;options?:{label:string;value:string;image_url?:string;price_impact?:number}[]}[]}[]>([]);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  // Site config (defaults from DEFAULT_CONFIG)
  const dc = DEFAULT_CONFIG;
  const [siteName, setSiteName] = useState(dc.siteName);
  const [siteDomain, setSiteDomain] = useState(dc.domain);
  const [siteTagline, setSiteTagline] = useState(dc.tagline);
  const [siteLogoHtml, setSiteLogoHtml] = useState(dc.logoHtml);
  const [sitePrice, setSitePrice] = useState(String(dc.productPrice));
  const [siteCost, setSiteCost] = useState(String(dc.productionCost));
  const [companyName, setCompanyName] = useState(dc.companyName);
  const [companyCIF, setCompanyCIF] = useState(dc.companyCIF);
  const [companyAddress, setCompanyAddress] = useState(dc.companyAddress);
  const [companyCounty, setCompanyCounty] = useState(dc.companyCounty);
  const [companyLocality, setCompanyLocality] = useState(dc.companyLocality);
  const [sitePhone, setSitePhone] = useState(dc.phone);
  const [siteEmailOrders, setSiteEmailOrders] = useState(dc.emailOrders);
  const [siteEmailFrom, setSiteEmailFrom] = useState(dc.emailFrom);
  const [siteEmailAdmin, setSiteEmailAdmin] = useState(dc.emailAdmin);
  const [siteGravpoint, setSiteGravpoint] = useState(dc.gravpointApiUrl);
  const [siteIban, setSiteIban] = useState("");
  const [siteBanca, setSiteBanca] = useState("");
  const [siteShipping, setSiteShipping] = useState(String(dc.shippingCost));
  const [siteShippingLabel, setSiteShippingLabel] = useState(dc.shippingLabel);
  const [siteShippingTiers, setSiteShippingTiers] = useState<{ minValue: string; cost: string }[]>(
    dc.shippingTiers.map((t) => ({ minValue: String(t.minValue), cost: String(t.cost) }))
  );
  const [siteMetaTitle, setSiteMetaTitle] = useState(dc.metaTitle);
  const [siteMetaDesc, setSiteMetaDesc] = useState(dc.metaDescription);

  useEffect(() => {
    fetch("/api/admin/settings", { headers: { Authorization: auth } })
      .then((r) => r.json())
      .then((data) => {
        if (data.site_config) {
          const sc = data.site_config;
          if (sc.siteName) setSiteName(sc.siteName);
          if (sc.domain) setSiteDomain(sc.domain);
          if (sc.tagline) setSiteTagline(sc.tagline);
          if (sc.logoHtml) setSiteLogoHtml(sc.logoHtml);
          if (sc.productPrice) setSitePrice(String(sc.productPrice));
          if (sc.productionCost) setSiteCost(String(sc.productionCost));
          if (sc.shippingCost != null) setSiteShipping(String(sc.shippingCost));
          if (sc.shippingLabel) setSiteShippingLabel(sc.shippingLabel);
          if (Array.isArray(sc.shippingTiers)) {
            setSiteShippingTiers(sc.shippingTiers.map((t: { minValue: number; cost: number }) => ({
              minValue: String(t.minValue ?? 0),
              cost: String(t.cost ?? 0),
            })));
          }
          if (sc.companyName) setCompanyName(sc.companyName);
          if (sc.companyCIF) setCompanyCIF(sc.companyCIF);
          if (sc.companyAddress) setCompanyAddress(sc.companyAddress);
          if (sc.companyCounty) setCompanyCounty(sc.companyCounty);
          if (sc.companyLocality) setCompanyLocality(sc.companyLocality);
          if (sc.phone) setSitePhone(sc.phone);
          if (sc.emailOrders) setSiteEmailOrders(sc.emailOrders);
          if (sc.emailFrom) setSiteEmailFrom(sc.emailFrom);
          if (sc.emailAdmin) setSiteEmailAdmin(sc.emailAdmin);
          if (sc.gravpointApiUrl) setSiteGravpoint(sc.gravpointApiUrl);
          if (sc.iban) setSiteIban(sc.iban);
          if (sc.banca) setSiteBanca(sc.banca);
          if (sc.metaTitle) setSiteMetaTitle(sc.metaTitle);
          if (sc.metaDescription) setSiteMetaDesc(sc.metaDescription);
        }
        if (data.sameday) {
          setSdUser(data.sameday.username || "");
          setSdPass(data.sameday.password || "");
          setSdPickup(data.sameday.pickup_point_id || "");
          setSdService(data.sameday.service_id || "");
          setSdLockerService(data.sameday.locker_service_id || "");
          setSdTestMode(data.sameday.test_mode === "true");
        }
        if (data.fancourier) {
          setFcUser(data.fancourier.username || "");
          setFcPass(data.fancourier.password || "");
          setFcClientId(data.fancourier.client_id || "");
          setFcIban(data.fancourier.iban || "");
          setFcBanca(data.fancourier.banca || "");
        }
        if (data.whatsapp) {
          if (data.whatsapp.template) setWaTemplate(data.whatsapp.template);
          if (Array.isArray(data.whatsapp.templates)) setWaTemplates(data.whatsapp.templates);
          if (data.whatsapp.general_template) setWaGeneralTemplate(data.whatsapp.general_template);
          else if (data.whatsapp.template) setWaGeneralTemplate(data.whatsapp.template);
        }
        if (data.addon_groups && Array.isArray(data.addon_groups)) {
          setAddonGroups(data.addon_groups);
        }
        if (data.mysnep?.cookies) setMysnepCookies(data.mysnep.cookies);
        if (data.fgo) {
          setFgoCui(data.fgo.cui || "");
          setFgoApiKey(data.fgo.api_key || "");
          setFgoSerie(data.fgo.serie || "");
          setFgoPlatformUrl(data.fgo.platform_url || "");
          setFgoCotaTva(data.fgo.cota_tva ?? "0");
          setFgoTestMode(data.fgo.test_mode === true);
        }
        if (data.pixels) {
          setFbPixel(data.pixels.facebook || "");
          setTiktokPixel(data.pixels.tiktok || "");
          setGaId(data.pixels.google_analytics || "");
          setGadsId(data.pixels.google_ads_id || "");
          setGadsLabel(data.pixels.google_ads_label || "");
          setSnapPixel(data.pixels.snapchat || "");
          setPinterestTag(data.pixels.pinterest || "");
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [auth]);

  const save = async () => {
    setSaved(false);
    await fetch("/api/admin/settings", {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({
        site_config: {
          siteName, domain: siteDomain, tagline: siteTagline, logoHtml: siteLogoHtml,
          productPrice: Number(sitePrice), productionCost: Number(siteCost),
          shippingCost: Math.max(0, Number(siteShipping) || 0),
          shippingLabel: siteShippingLabel.trim() || dc.shippingLabel,
          shippingTiers: siteShippingTiers
            .map((t) => ({ minValue: Math.max(0, Number(t.minValue) || 0), cost: Math.max(0, Number(t.cost) || 0) }))
            .sort((a, b) => a.minValue - b.minValue),
          companyName, companyCIF, companyAddress, companyCounty, companyLocality,
          phone: sitePhone, emailOrders: siteEmailOrders, emailFrom: siteEmailFrom, emailAdmin: siteEmailAdmin,
          gravpointApiUrl: siteGravpoint, iban: siteIban, banca: siteBanca, metaTitle: siteMetaTitle, metaDescription: siteMetaDesc,
        },
        sameday: { username: sdUser, password: sdPass, pickup_point_id: sdPickup, service_id: sdService, locker_service_id: sdLockerService, test_mode: sdTestMode ? "true" : "false" },
        fancourier: { username: fcUser, password: fcPass, client_id: fcClientId },
        pixels: { facebook: fbPixel, tiktok: tiktokPixel, google_analytics: gaId, google_ads_id: gadsId, google_ads_label: gadsLabel, snapchat: snapPixel, pinterest: pinterestTag },
        fgo: { cui: fgoCui, api_key: fgoApiKey, serie: fgoSerie, platform_url: fgoPlatformUrl, cota_tva: Number(fgoCotaTva), test_mode: fgoTestMode },
        whatsapp: { template: waTemplate, templates: waTemplates, general_template: waGeneralTemplate },
        addon_groups: addonGroups,
        mysnep: { cookies: mysnepCookies.trim() },
      }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (loading) return <p className="admin-loading">Se incarca...</p>;

  return (
    <div className="admin-settings">
      <div className="admin-settings__tabs">
        <button className={`admin-settings__tab ${settingsTab === "site" ? "admin-settings__tab--active" : ""}`} onClick={() => setSettingsTab("site")}>Site</button>
        <button className={`admin-settings__tab ${settingsTab === "fancourier" ? "admin-settings__tab--active" : ""}`} onClick={() => setSettingsTab("fancourier")}>FanCourier</button>
        <button className={`admin-settings__tab ${settingsTab === "sameday" ? "admin-settings__tab--active" : ""}`} onClick={() => setSettingsTab("sameday")}>Sameday</button>
        <button className={`admin-settings__tab ${settingsTab === "fgo" ? "admin-settings__tab--active" : ""}`} onClick={() => setSettingsTab("fgo")}>FGO Facturare</button>
        <button className={`admin-settings__tab ${settingsTab === "pixels" ? "admin-settings__tab--active" : ""}`} onClick={() => setSettingsTab("pixels")}>Pixeli & Tracking</button>
        <button className={`admin-settings__tab ${settingsTab === "whatsapp" ? "admin-settings__tab--active" : ""}`} onClick={() => setSettingsTab("whatsapp")}>WhatsApp</button>
        <button className={`admin-settings__tab ${settingsTab === "addons" ? "admin-settings__tab--active" : ""}`} onClick={() => setSettingsTab("addons")}>Campuri Addons</button>
        <button className={`admin-settings__tab ${settingsTab === "feed" ? "admin-settings__tab--active" : ""}`} onClick={() => setSettingsTab("feed")}>Feed Produse</button>
        <button className={`admin-settings__tab ${settingsTab === "mysnep" ? "admin-settings__tab--active" : ""}`} onClick={() => setSettingsTab("mysnep")}>mysnep</button>
      </div>

      {settingsTab === "site" && (
        <>
          <div className="admin-settings__section">
            <h3>Branding</h3>
            <div className="admin-settings__grid">
              <div className="admin-settings__field"><label>Nume site</label><input type="text" value={siteName} onChange={(e) => setSiteName(e.target.value)} placeholder="olivox.ro" /></div>
              <div className="admin-settings__field"><label>Domeniu (cu https://)</label><input type="text" value={siteDomain} onChange={(e) => setSiteDomain(e.target.value)} placeholder="https://olivox.ro" /></div>
              <div className="admin-settings__field"><label>Tagline</label><input type="text" value={siteTagline} onChange={(e) => setSiteTagline(e.target.value)} placeholder="Creaza-ti husa unica..." /></div>
              <div className="admin-settings__field"><label>Logo HTML</label><input type="text" value={siteLogoHtml} onChange={(e) => setSiteLogoHtml(e.target.value)} placeholder='huse<span>personalizate</span>.ro' /></div>
            </div>
          </div>
          <div className="admin-settings__section">
            <h3>Preturi</h3>
            <div className="admin-settings__grid">
              <div className="admin-settings__field"><label>Pret produs (RON)</label><input type="number" value={sitePrice} onChange={(e) => setSitePrice(e.target.value)} /></div>
              <div className="admin-settings__field"><label>Cost productie (RON)</label><input type="number" value={siteCost} onChange={(e) => setSiteCost(e.target.value)} /></div>
              <div className="admin-settings__field"><label>Cost transport implicit (RON)</label><input type="number" min={0} value={siteShipping} onChange={(e) => setSiteShipping(e.target.value)} placeholder="30" /><small>Se foloseste doar daca nu se potriveste nicio plaja de mai jos. 0 = gratuit.</small></div>
              <div className="admin-settings__field"><label>Nume transport (eticheta)</label><input type="text" value={siteShippingLabel} onChange={(e) => setSiteShippingLabel(e.target.value)} placeholder="Curier" /><small>Apare in formular, email si pe factura (ex: Curier, Curier Sameday, Livrare easybox).</small></div>
            </div>
          </div>
          <div className="admin-settings__section">
            <h3>Plaje transport</h3>
            <p className="admin-settings__desc">
              Costul se alege dupa valoarea produselor (fara transport): se aplica plaja cu cel mai mare prag
              atins. Exemplu: „de la 0 &rarr; 60 lei" si „de la 150 &rarr; 30 lei" inseamna 60 lei sub 150 lei
              si 30 lei de la 150 lei in sus.
            </p>
            {siteShippingTiers.length === 0 && (
              <p className="admin-settings__desc">Nicio plaja — se foloseste costul implicit de mai sus.</p>
            )}
            {siteShippingTiers.map((tier, i) => (
              <div key={i} className="admin-tier-row">
                <div className="admin-settings__field">
                  <label>De la (RON)</label>
                  <input
                    type="number"
                    min={0}
                    value={tier.minValue}
                    onChange={(e) => setSiteShippingTiers(siteShippingTiers.map((t, j) => (j === i ? { ...t, minValue: e.target.value } : t)))}
                  />
                </div>
                <div className="admin-settings__field">
                  <label>{siteShippingLabel || "Transport"} (RON)</label>
                  <input
                    type="number"
                    min={0}
                    value={tier.cost}
                    onChange={(e) => setSiteShippingTiers(siteShippingTiers.map((t, j) => (j === i ? { ...t, cost: e.target.value } : t)))}
                  />
                </div>
                <button
                  type="button"
                  className="admin-tier-row__del"
                  onClick={() => setSiteShippingTiers(siteShippingTiers.filter((_, j) => j !== i))}
                >
                  Sterge
                </button>
              </div>
            ))}
            <button
              type="button"
              className="admin-inline-btn"
              onClick={() => setSiteShippingTiers([...siteShippingTiers, { minValue: "0", cost: "0" }])}
            >
              + Adauga plaja
            </button>
          </div>
          <div className="admin-settings__section">
            <h3>Date firma</h3>
            <div className="admin-settings__grid">
              <div className="admin-settings__field"><label>Nume firma</label><input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} /></div>
              <div className="admin-settings__field"><label>Cod distribuitor</label><input type="text" value={companyCIF} onChange={(e) => setCompanyCIF(e.target.value)} placeholder="Cod: 400178409" /></div>
              <div className="admin-settings__field"><label>Adresa</label><input type="text" value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} /></div>
              <div className="admin-settings__field"><label>Judet</label><input type="text" value={companyCounty} onChange={(e) => setCompanyCounty(e.target.value)} /></div>
              <div className="admin-settings__field"><label>Localitate</label><input type="text" value={companyLocality} onChange={(e) => setCompanyLocality(e.target.value)} /></div>
              <div className="admin-settings__field"><label>IBAN</label><input type="text" value={siteIban} onChange={(e) => setSiteIban(e.target.value)} placeholder="RO49AAAA1B31007593840000" /></div>
              <div className="admin-settings__field"><label>Banca</label><input type="text" value={siteBanca} onChange={(e) => setSiteBanca(e.target.value)} placeholder="ex: ING Bank" /></div>
            </div>
          </div>
          <div className="admin-settings__section">
            <h3>Contact & Email</h3>
            <div className="admin-settings__grid">
              <div className="admin-settings__field"><label>Telefon</label><input type="text" value={sitePhone} onChange={(e) => setSitePhone(e.target.value)} /></div>
              <div className="admin-settings__field"><label>Email comenzi (afisat pe site)</label><input type="text" value={siteEmailOrders} onChange={(e) => setSiteEmailOrders(e.target.value)} /></div>
              <div className="admin-settings__field"><label>Email admin (primeste notificari)</label><input type="text" value={siteEmailAdmin} onChange={(e) => setSiteEmailAdmin(e.target.value)} /></div>
              <div className="admin-settings__field"><label>Email From (Resend)</label><input type="text" value={siteEmailFrom} onChange={(e) => setSiteEmailFrom(e.target.value)} placeholder="Nume <no-reply@domeniu.ro>" /></div>
            </div>
          </div>
          <div className="admin-settings__section">
            <h3>Tehnic</h3>
            <div className="admin-settings__grid">
              <div className="admin-settings__field"><label>Gravpoint API URL</label><input type="text" value={siteGravpoint} onChange={(e) => setSiteGravpoint(e.target.value)} /></div>
            </div>
          </div>
          <div className="admin-settings__section">
            <h3>SEO</h3>
            <div className="admin-settings__grid">
              <div className="admin-settings__field"><label>Meta Title (homepage)</label><input type="text" value={siteMetaTitle} onChange={(e) => setSiteMetaTitle(e.target.value)} /></div>
              <div className="admin-settings__field"><label>Meta Description (homepage)</label><textarea rows={2} value={siteMetaDesc} onChange={(e) => setSiteMetaDesc(e.target.value)} /></div>
            </div>
          </div>
        </>
      )}

      {settingsTab === "fancourier" && (
        <div className="admin-settings__section">
          <h3>FanCourier</h3>
          <p className="admin-settings__desc">Credentiale pentru generare AWB automat si livrare prin FanCourier.</p>
          <div className="admin-settings__grid">
            <div className="admin-settings__field"><label>Username</label><input type="text" value={fcUser} onChange={(e) => setFcUser(e.target.value)} placeholder="Username FanCourier" /></div>
            <div className="admin-settings__field"><label>Parola</label><input type="password" value={fcPass} onChange={(e) => setFcPass(e.target.value)} placeholder="Parola FanCourier" /></div>
            <div className="admin-settings__field"><label>Client ID</label><input type="text" value={fcClientId} onChange={(e) => setFcClientId(e.target.value)} placeholder="ID numeric din contract" /></div>
          </div>

        </div>
      )}

      {settingsTab === "sameday" && (
        <div className="admin-settings__section">
          <h3>Sameday</h3>
          <p className="admin-settings__desc">Credentiale pentru generare AWB Sameday si livrare la Easybox.</p>
          <div className="admin-settings__grid">
            <div className="admin-settings__field"><label>Username</label><input type="text" value={sdUser} onChange={(e) => setSdUser(e.target.value)} placeholder="Username Sameday" /></div>
            <div className="admin-settings__field"><label>Parola</label><input type="password" value={sdPass} onChange={(e) => setSdPass(e.target.value)} placeholder="Parola Sameday" /></div>
            <div className="admin-settings__field"><label>Pickup Point ID</label><input type="text" value={sdPickup} onChange={(e) => setSdPickup(e.target.value)} placeholder="ID punct ridicare" /></div>
            <div className="admin-settings__field"><label>Service ID (standard)</label><input type="text" value={sdService} onChange={(e) => setSdService(e.target.value)} placeholder="ID serviciu livrare" /></div>
            <div className="admin-settings__field"><label>Service ID (locker/easybox)</label><input type="text" value={sdLockerService} onChange={(e) => setSdLockerService(e.target.value)} placeholder="ID serviciu easybox" /></div>
            <div className="admin-settings__field"><label>Mod test</label><div><input type="checkbox" checked={sdTestMode} onChange={(e) => setSdTestMode(e.target.checked)} /> Demo API</div></div>
          </div>
        </div>
      )}

      {settingsTab === "fgo" && (
        <div className="admin-settings__section">
          <h3>FGO.ro - Facturare</h3>
          <p className="admin-settings__desc">Setari pentru integrarea cu FGO.ro. Creaza un utilizator API in FGO &gt; Setari &gt; Utilizatori si copiaza cheia privata.</p>
          <div className="admin-settings__grid">
            <div className="admin-settings__field"><label>CUI firma</label><input type="text" value={fgoCui} onChange={(e) => setFgoCui(e.target.value)} placeholder="ex: 35859542" /></div>
            <div className="admin-settings__field"><label>Cheie privata API</label><input type="text" value={fgoApiKey} onChange={(e) => setFgoApiKey(e.target.value)} placeholder="Cheia din FGO > Setari > Utilizatori" /></div>
            <div className="admin-settings__field"><label>Serie factura</label><input type="text" value={fgoSerie} onChange={(e) => setFgoSerie(e.target.value)} placeholder="ex: VIT" /></div>
            <div className="admin-settings__field"><label>Cota TVA (%)</label><input type="number" value={fgoCotaTva} onChange={(e) => setFgoCotaTva(e.target.value)} placeholder="0 = neplatitor TVA" /></div>
            <div className="admin-settings__field"><label>URL platforma</label><input type="text" value={fgoPlatformUrl} onChange={(e) => setFgoPlatformUrl(e.target.value)} placeholder="ex: https://olivox.ro" /></div>
          </div>
          <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 12 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.82rem", cursor: "pointer" }}>
              <input type="checkbox" checked={fgoTestMode} onChange={(e) => setFgoTestMode(e.target.checked)} />
              Mod test (foloseste API-ul de test FGO)
            </label>
          </div>
          <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10 }}>
            <button className="admin-add-btn" disabled={fgoTesting || !fgoCui || !fgoApiKey} onClick={async () => {
              setFgoTesting(true); setFgoTestResult(null);
              try {
                const res = await fetch("/api/admin/fgo", {
                  method: "POST",
                  headers: { Authorization: auth, "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "test" }),
                });
                const data = await res.json();
                if (data.success) setFgoTestResult({ ok: true, msg: data.message || "Conexiune OK!" });
                else setFgoTestResult({ ok: false, msg: data.error || "Eroare necunoscuta" });
              } catch (e) { setFgoTestResult({ ok: false, msg: String(e) }); }
              finally { setFgoTesting(false); }
            }}>{fgoTesting ? "Se testeaza..." : "Testeaza conexiunea"}</button>
            {fgoTestResult && (
              <span style={{ fontSize: "0.8rem", fontWeight: 600, color: fgoTestResult.ok ? "var(--color-success)" : "#dc2626" }}>{fgoTestResult.msg}</span>
            )}
          </div>
        </div>
      )}

      {settingsTab === "pixels" && (
        <div className="admin-settings__section">
          <h3>Pixeli & Tracking</h3>
          <p className="admin-settings__desc">ID-urile pixelilor de tracking. Se activeaza automat pe toate paginile daca sunt completati.</p>
          <div className="admin-settings__grid">
            <div className="admin-settings__field"><label>Facebook Pixel ID</label><input type="text" value={fbPixel} onChange={(e) => setFbPixel(e.target.value)} placeholder="ex: 123456789012345" /></div>
            <div className="admin-settings__field"><label>TikTok Pixel ID</label><input type="text" value={tiktokPixel} onChange={(e) => setTiktokPixel(e.target.value)} placeholder="ex: C1234567890" /></div>
            <div className="admin-settings__field"><label>Google Analytics (GA4)</label><input type="text" value={gaId} onChange={(e) => setGaId(e.target.value)} placeholder="ex: G-XXXXXXXXXX" /></div>
            <div className="admin-settings__field"><label>Google Ads Conversion ID</label><input type="text" value={gadsId} onChange={(e) => setGadsId(e.target.value)} placeholder="ex: AW-123456789" /></div>
            <div className="admin-settings__field"><label>Google Ads Conv. Label</label><input type="text" value={gadsLabel} onChange={(e) => setGadsLabel(e.target.value)} placeholder="ex: AbCdEfGhIjK" /></div>
            <div className="admin-settings__field"><label>Snapchat Pixel ID</label><input type="text" value={snapPixel} onChange={(e) => setSnapPixel(e.target.value)} placeholder="ex: abc123-def456" /></div>
            <div className="admin-settings__field"><label>Pinterest Tag ID</label><input type="text" value={pinterestTag} onChange={(e) => setPinterestTag(e.target.value)} placeholder="ex: 1234567890" /></div>
          </div>
        </div>
      )}

      {settingsTab === "whatsapp" && (
        <div className="admin-settings__section">
          <h3>Template-uri WhatsApp confirmare comanda</h3>
          <p className="admin-settings__desc">
            Creeaza template-uri diferite pentru fiecare categorie de produs. La trimiterea confirmarii pe WhatsApp se va folosi template-ul asociat categoriei produsului comandat. Daca exista mai multe produse (cross-sell), se foloseste template-ul general.
          </p>
          <div style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", marginBottom: 16, lineHeight: 1.8 }}>
            <strong>Variabile disponibile:</strong><br />
            <code>{`{{nume_client}}`}</code> <code>{`{{id_comanda}}`}</code> <code>{`{{valoare}}`}</code> <code>{`{{produs}}`}</code> <code>{`{{brand}}`}</code> <code>{`{{model}}`}</code> <code>{`{{text_husa}}`}</code> <code>{`{{metoda_livrare}}`}</code> <code>{`{{adresa}}`}</code> <code>{`{{telefon}}`}</code> <code>{`{{site_name}}`}</code>
          </div>

          {/* Templates list */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <h4 style={{ fontSize: "0.9rem", margin: 0 }}>Template-uri pe categorii</h4>
              <button
                className="admin-add-btn"
                onClick={() => {
                  const id = "tpl_" + Date.now();
                  setWaTemplates([...waTemplates, { id, name: "Template nou", category_slugs: [], content: DEFAULT_WA_TEMPLATE }]);
                  setWaEditingId(id);
                }}
              >+ Adauga template</button>
            </div>

            {waTemplates.length === 0 ? (
              <p style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", fontStyle: "italic", padding: "12px 0" }}>
                Niciun template definit. Va fi folosit template-ul general pentru toate comenzile.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {waTemplates.map((tpl) => (
                  <div key={tpl.id} style={{ border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-bg)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", cursor: "pointer" }} onClick={() => setWaEditingId(waEditingId === tpl.id ? null : tpl.id)}>
                      <span style={{ flex: 1, fontWeight: 600, fontSize: "0.85rem" }}>{tpl.name || "(fara nume)"}</span>
                      <span style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>
                        {tpl.category_slugs.length} {tpl.category_slugs.length === 1 ? "categorie" : "categorii"}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); if (confirm("Stergi template-ul?")) setWaTemplates(waTemplates.filter((t) => t.id !== tpl.id)); }}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", fontSize: "1rem" }}
                      >✕</button>
                      <span style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>{waEditingId === tpl.id ? "▲" : "▼"}</span>
                    </div>

                    {waEditingId === tpl.id && (
                      <div style={{ padding: "0 12px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
                        <div className="admin-settings__field">
                          <label>Nume template</label>
                          <input
                            type="text"
                            value={tpl.name}
                            onChange={(e) => setWaTemplates(waTemplates.map((t) => t.id === tpl.id ? { ...t, name: e.target.value } : t))}
                            placeholder="ex: Huse telefon"
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: 6 }}>Categorii asociate</label>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 160, overflowY: "auto", padding: 8, border: "1px solid var(--color-border)", borderRadius: 6 }}>
                            {allCategories.length === 0 ? (
                              <span style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>Se incarca categoriile...</span>
                            ) : allCategories.map((cat) => {
                              const checked = tpl.category_slugs.includes(cat.slug);
                              return (
                                <label key={cat.id} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", border: `1px solid ${checked ? "var(--color-accent)" : "var(--color-border)"}`, borderRadius: 4, cursor: "pointer", fontSize: "0.74rem", background: checked ? "rgba(233,69,96,0.06)" : "transparent" }}>
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => {
                                      setWaTemplates(waTemplates.map((t) => {
                                        if (t.id !== tpl.id) return t;
                                        const slugs = checked ? t.category_slugs.filter((s) => s !== cat.slug) : [...t.category_slugs, cat.slug];
                                        return { ...t, category_slugs: slugs };
                                      }));
                                    }}
                                    style={{ margin: 0 }}
                                  />
                                  <span>{cat.name}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>

                        <div>
                          <label style={{ fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: 6 }}>Continut mesaj</label>
                          <textarea
                            value={tpl.content}
                            onChange={(e) => setWaTemplates(waTemplates.map((t) => t.id === tpl.id ? { ...t, content: e.target.value } : t))}
                            rows={14}
                            style={{ width: "100%", fontFamily: "var(--font)", fontSize: "0.82rem", padding: 12, border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-sm)", resize: "vertical", lineHeight: 1.6 }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* General fallback template */}
          <div>
            <h4 style={{ fontSize: "0.9rem", margin: "0 0 6px" }}>Template general (fallback)</h4>
            <p style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", marginBottom: 8 }}>
              Folosit cand comanda contine cross-sell sau cand categoria nu are template asignat.
            </p>
            <textarea
              value={waGeneralTemplate}
              onChange={(e) => setWaGeneralTemplate(e.target.value)}
              rows={14}
              style={{ width: "100%", fontFamily: "var(--font)", fontSize: "0.82rem", padding: 12, border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-sm)", resize: "vertical", lineHeight: 1.6 }}
            />
          </div>
        </div>
      )}

      {settingsTab === "addons" && (
        <div className="admin-settings__section">
          <h3>Grupuri de campuri personalizate (Addons)</h3>
          <p className="admin-settings__desc">Defineste grupuri de campuri reutilizabile. Ataseaza-le produselor din pagina de editare produs.</p>

          {addonGroups.map((group, gi) => (
            <div key={group.id} style={{ border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-sm)", marginBottom: 12, background: "var(--color-bg)" }}>
              {/* Group header */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", cursor: "pointer", background: expandedGroup === group.id ? "rgba(0,102,204,0.04)" : "transparent" }} onClick={() => setExpandedGroup(expandedGroup === group.id ? null : group.id)}>
                <span style={{ fontSize: "0.8rem", fontWeight: 700, flex: 1 }}>{group.name || "Grup nou"} <span style={{ fontWeight: 400, color: "var(--color-text-muted)", fontSize: "0.72rem" }}>({group.fields.length} campuri)</span></span>
                <button type="button" style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: "0.8rem", padding: "2px 6px" }} onClick={(e) => { e.stopPropagation(); setAddonGroups(addonGroups.filter((_, i) => i !== gi)); }}>Sterge</button>
                <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>{expandedGroup === group.id ? "▲" : "▼"}</span>
              </div>

              {/* Group content (expanded) */}
              {expandedGroup === group.id && (
                <div style={{ padding: "0 12px 12px", borderTop: "1px solid var(--color-border)" }}>
                  <div className="admin-settings__field" style={{ marginTop: 10, marginBottom: 12 }}>
                    <label>Nume grup</label>
                    <input type="text" value={group.name} placeholder="ex: Tablouri, Personalizare text..." onChange={(e) => {
                      const g = [...addonGroups]; g[gi] = { ...group, name: e.target.value }; setAddonGroups(g);
                    }} />
                  </div>

                  {/* Fields list */}
                  {group.fields.map((field, fi) => (
                    <div key={field.id} style={{ border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-sm)", padding: 12, marginBottom: 10, background: "#fff" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-muted)" }}>#{fi + 1} {field.label || "Camp nou"}</span>
                        <div style={{ display: "flex", gap: 4 }}>
                          {fi > 0 && <button type="button" style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.8rem" }} onClick={() => {
                            const g = [...addonGroups]; const fields = [...g[gi].fields];
                            [fields[fi - 1], fields[fi]] = [fields[fi], fields[fi - 1]];
                            g[gi] = { ...g[gi], fields }; setAddonGroups(g);
                          }}>↑</button>}
                          {fi < group.fields.length - 1 && <button type="button" style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.8rem" }} onClick={() => {
                            const g = [...addonGroups]; const fields = [...g[gi].fields];
                            [fields[fi], fields[fi + 1]] = [fields[fi + 1], fields[fi]];
                            g[gi] = { ...g[gi], fields }; setAddonGroups(g);
                          }}>↓</button>}
                          <button type="button" style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", fontSize: "0.8rem" }} onClick={() => {
                            const g = [...addonGroups]; g[gi] = { ...g[gi], fields: g[gi].fields.filter((_, i) => i !== fi) }; setAddonGroups(g);
                          }}>✕</button>
                        </div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <div className="admin-settings__field">
                          <label>Tip</label>
                          <select value={field.type} onChange={(e) => {
                            const g = [...addonGroups]; const fields = [...g[gi].fields];
                            fields[fi] = { ...field, type: e.target.value };
                            if (!["select", "image_select"].includes(e.target.value)) fields[fi].options = undefined;
                            else if (!fields[fi].options?.length) fields[fi].options = [{ label: "", value: "", price_impact: 0 }];
                            g[gi] = { ...g[gi], fields }; setAddonGroups(g);
                          }}>
                            <option value="text">Text</option>
                            <option value="textarea">Textarea</option>
                            <option value="image_upload">Upload imagine</option>
                            <option value="checkbox">Checkbox</option>
                            <option value="select">Selectie (dropdown)</option>
                            <option value="image_select">Selectie imagini</option>
                          </select>
                        </div>
                        <div className="admin-settings__field">
                          <label>Label</label>
                          <input type="text" value={field.label} placeholder="ex: Culoare rama" onChange={(e) => {
                            const g = [...addonGroups]; const fields = [...g[gi].fields];
                            fields[fi] = { ...field, label: e.target.value };
                            g[gi] = { ...g[gi], fields }; setAddonGroups(g);
                          }} />
                        </div>
                        <div className="admin-settings__field">
                          <label>Placeholder</label>
                          <input type="text" value={field.placeholder || ""} placeholder="Text ajutator..." onChange={(e) => {
                            const g = [...addonGroups]; const fields = [...g[gi].fields];
                            fields[fi] = { ...field, placeholder: e.target.value };
                            g[gi] = { ...g[gi], fields }; setAddonGroups(g);
                          }} />
                        </div>
                        <div className="admin-settings__field" style={{ display: "flex", alignItems: "center", gap: 6, paddingTop: 20 }}>
                          <input type="checkbox" checked={field.required || false} onChange={(e) => {
                            const g = [...addonGroups]; const fields = [...g[gi].fields];
                            fields[fi] = { ...field, required: e.target.checked };
                            g[gi] = { ...g[gi], fields }; setAddonGroups(g);
                          }} />
                          <label style={{ margin: 0, fontSize: "0.8rem" }}>Obligatoriu</label>
                        </div>
                      </div>

                      {/* Options for select / image_select */}
                      {(field.type === "select" || field.type === "image_select") && (
                        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--color-border)" }}>
                          <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--color-text-muted)", display: "block", marginBottom: 6 }}>Optiuni</label>
                          {(field.options || []).map((opt, oi) => (
                            <div key={oi} style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
                              <input type="text" value={opt.label} placeholder="Nume optiune" style={{ flex: 2, height: 32, padding: "0 8px", fontSize: "0.78rem", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-sm)" }} onChange={(e) => {
                                const g = [...addonGroups]; const fields = [...g[gi].fields];
                                const opts = [...(fields[fi].options || [])];
                                opts[oi] = { ...opt, label: e.target.value, value: e.target.value.toLowerCase().replace(/\s+/g, "_") };
                                fields[fi] = { ...fields[fi], options: opts };
                                g[gi] = { ...g[gi], fields }; setAddonGroups(g);
                              }} />
                              <input type="number" value={opt.price_impact || 0} placeholder="+/- RON" title="Impact pret (RON)" style={{ width: 70, height: 32, padding: "0 8px", fontSize: "0.78rem", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-sm)" }} onChange={(e) => {
                                const g = [...addonGroups]; const fields = [...g[gi].fields];
                                const opts = [...(fields[fi].options || [])];
                                opts[oi] = { ...opt, price_impact: Number(e.target.value) };
                                fields[fi] = { ...fields[fi], options: opts };
                                g[gi] = { ...g[gi], fields }; setAddonGroups(g);
                              }} />
                              {field.type === "image_select" && (
                                <input type="text" value={opt.image_url || ""} placeholder="URL imagine" style={{ flex: 2, height: 32, padding: "0 8px", fontSize: "0.78rem", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-sm)" }} onChange={(e) => {
                                  const g = [...addonGroups]; const fields = [...g[gi].fields];
                                  const opts = [...(fields[fi].options || [])];
                                  opts[oi] = { ...opt, image_url: e.target.value };
                                  fields[fi] = { ...fields[fi], options: opts };
                                  g[gi] = { ...g[gi], fields }; setAddonGroups(g);
                                }} />
                              )}
                              <button type="button" style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: "0.85rem", padding: "0 4px" }} onClick={() => {
                                const g = [...addonGroups]; const fields = [...g[gi].fields];
                                fields[fi] = { ...fields[fi], options: (fields[fi].options || []).filter((_, i) => i !== oi) };
                                g[gi] = { ...g[gi], fields }; setAddonGroups(g);
                              }}>✕</button>
                            </div>
                          ))}
                          <button type="button" style={{ fontSize: "0.72rem", color: "var(--color-primary)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }} onClick={() => {
                            const g = [...addonGroups]; const fields = [...g[gi].fields];
                            fields[fi] = { ...fields[fi], options: [...(fields[fi].options || []), { label: "", value: "", price_impact: 0 }] };
                            g[gi] = { ...g[gi], fields }; setAddonGroups(g);
                          }}>+ Adauga optiune</button>
                        </div>
                      )}
                    </div>
                  ))}

                  <button type="button" style={{ width: "100%", padding: "8px 0", fontSize: "0.78rem", color: "var(--color-primary)", background: "rgba(0,102,204,0.05)", border: "1.5px dashed var(--color-border)", borderRadius: "var(--radius-sm)", cursor: "pointer", fontWeight: 600 }} onClick={() => {
                    const g = [...addonGroups];
                    g[gi] = { ...g[gi], fields: [...g[gi].fields, { id: `cf_${Date.now()}`, type: "text", label: "", placeholder: "", required: false }] };
                    setAddonGroups(g);
                  }}>+ Adauga camp</button>
                </div>
              )}
            </div>
          ))}

          <button type="button" className="admin-add-btn" style={{ width: "100%", fontSize: "0.82rem", marginTop: 4 }} onClick={() => {
            const newId = `ag_${Date.now()}`;
            setAddonGroups([...addonGroups, { id: newId, name: "", fields: [] }]);
            setExpandedGroup(newId);
          }}>+ Adauga grup addon</button>
        </div>
      )}

      {settingsTab === "mysnep" && (
        <div className="admin-settings__section">
          <h3>Sesiune mysnep (reactualizare preturi)</h3>
          <p className="admin-settings__desc">
            Preturile de pe mysnep.com se vad doar cu contul de distribuitor logat, deci butonul
            &bdquo;⟳ Preturi&rdquo; din pagina Produse are nevoie de cookie-ul tau de sesiune.
            Cookie-ul expira din cand in cand — cand reactualizarea zice &bdquo;sesiune expirata&rdquo;,
            revino aici si pune unul nou.
          </p>
          <ol className="admin-settings__desc" style={{ paddingLeft: 18, lineHeight: 1.7 }}>
            <li>Intra pe mysnep.com si logheaza-te cu contul de distribuitor.</li>
            <li>Deschide DevTools (F12) &rarr; Application &rarr; Cookies &rarr; https://www.mysnep.com</li>
            <li>Copiaza valoarea cookie-ului <code>PHPSESSID</code>.</li>
            <li>Lipeste mai jos sub forma <code>PHPSESSID=valoarea_copiata</code> si apasa Salveaza.</li>
          </ol>
          <div className="admin-settings__field">
            <label>Cookie sesiune</label>
            <input
              type="text"
              placeholder="PHPSESSID=..."
              value={mysnepCookies}
              onChange={(e) => setMysnepCookies(e.target.value)}
            />
          </div>
        </div>
      )}

      {settingsTab === "feed" && (
        <div className="admin-settings__section">
          <h3>Feed-uri produse (Google Shopping, Meta, TikTok)</h3>
          <p className="admin-settings__desc">
            Feed-urile sunt generate automat din catalogul de produse si actualizate zilnic prin cron.
            Poti forta regenerarea cu butonul de mai jos.
          </p>

          <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
            {(["google", "facebook", "tiktok"] as const).map((platform) => {
              const s = feedStats[platform];
              const platformLabel = platform === "google" ? "Google Merchant Center" : platform === "facebook" ? "Meta Catalog (Facebook/Instagram)" : "TikTok Catalog";
              const feedUrl = `https://olivox.ro/feed/${platform}.xml`;
              return (
                <div key={platform} style={{ border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-sm)", padding: 14, background: "#fff" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <strong style={{ fontSize: "0.9rem" }}>{platformLabel}</strong>
                    <a href={`/feed/${platform}.xml`} target="_blank" rel="noreferrer" style={{ fontSize: "0.75rem", color: "var(--color-primary)", textDecoration: "none" }}>Deschide feed</a>
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", wordBreak: "break-all", marginBottom: 8, padding: "6px 8px", background: "var(--color-bg)", borderRadius: 4 }}>
                    {feedUrl}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, fontSize: "0.78rem" }}>
                    <div>
                      <div style={{ color: "var(--color-text-muted)", fontSize: "0.7rem" }}>Produse in feed</div>
                      <div style={{ fontWeight: 700, fontSize: "1rem" }}>{s ? s.items : "—"}</div>
                    </div>
                    <div>
                      <div style={{ color: "var(--color-text-muted)", fontSize: "0.7rem" }}>Omise (fara imagine/pret)</div>
                      <div style={{ fontWeight: 700, fontSize: "1rem", color: s?.skipped ? "#f59e0b" : undefined }}>{s ? s.skipped : "—"}</div>
                    </div>
                    <div>
                      <div style={{ color: "var(--color-text-muted)", fontSize: "0.7rem" }}>Ultima generare</div>
                      <div style={{ fontWeight: 600, fontSize: "0.78rem" }}>{s ? formatShortDate(s.generated_at) : "Niciodata"}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 20, padding: 14, background: "rgba(0,102,204,0.05)", borderRadius: "var(--radius-sm)", border: "1px solid rgba(0,102,204,0.15)" }}>
            <h4 style={{ margin: "0 0 8px", fontSize: "0.85rem" }}>Cum conectez feed-urile?</h4>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: "0.76rem", color: "var(--color-text-muted)", lineHeight: 1.7 }}>
              <li><strong>Google Merchant Center:</strong> Produse → Feed-uri → Adauga → URL programat → copiaza URL-ul Google</li>
              <li><strong>Meta Commerce Manager:</strong> Catalog → Fluxuri de date → URL programat → copiaza URL-ul Facebook</li>
              <li><strong>TikTok Ads Manager:</strong> Active → Catalog → Surse → URL feed → copiaza URL-ul TikTok</li>
            </ul>
          </div>

          <div style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "center" }}>
            <button
              type="button"
              className="admin-add-btn"
              onClick={refreshFeeds}
              disabled={feedRefreshing}
              style={{ opacity: feedRefreshing ? 0.6 : 1 }}
            >
              {feedRefreshing ? "Se regenereaza..." : "Regenereaza toate feed-urile acum"}
            </button>
            {feedMsg && <span style={{ fontSize: "0.8rem", color: feedMsg.startsWith("Eroare") ? "#dc2626" : "var(--color-success)", fontWeight: 600 }}>{feedMsg}</span>}
          </div>
        </div>
      )}

      {settingsTab !== "feed" && (
        <div style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "center" }}>
          <button className="admin-add-btn" onClick={save}>Salveaza setarile</button>
          {saved && <span style={{ color: "var(--color-success)", fontSize: "0.82rem", fontWeight: 600 }}>Salvat!</span>}
        </div>
      )}
    </div>
  );
}

// ===== HOMEPAGE PANEL =====
interface HomepageItem {
  id: number;
  type: "product" | "category";
  title: string;
  description: string;
  image_url: string;
  link_url: string;
  position: number;
  active: boolean;
  created_at: string;
}

function SortableHomepageCard({ item, onEdit, onDelete, onToggle }: { item: HomepageItem; onEdit: (item: HomepageItem) => void; onDelete: (id: number) => void; onToggle: (id: number, active: boolean) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className={`hp-card ${!item.active ? "hp-card--inactive" : ""}`}>
      <div className="hp-card__drag" {...attributes} {...listeners}>⠿</div>
      {item.image_url && <img src={item.image_url} alt="" className="hp-card__img" />}
      <div className="hp-card__body">
        <div className="hp-card__header">
          <span className={`hp-card__badge hp-card__badge--${item.type}`}>{item.type === "product" ? "Produs" : "Categorie"}</span>
          <span className="hp-card__title">{item.title || "(fara titlu)"}</span>
        </div>
        {item.description && <p className="hp-card__desc">{item.description}</p>}
        {item.link_url && <span className="hp-card__link">{item.link_url}</span>}
      </div>
      <div className="hp-card__actions">
        <label className="hp-card__toggle" title={item.active ? "Activ" : "Inactiv"}>
          <input type="checkbox" checked={item.active} onChange={(e) => onToggle(item.id, e.target.checked)} />
        </label>
        <button className="admin-action-btn" onClick={() => onEdit(item)} title="Editeaza">✎</button>
        <button className="admin-action-btn admin-action-btn--danger" onClick={() => onDelete(item.id)} title="Sterge">✕</button>
      </div>
    </div>
  );
}

function HomepagePanel({ auth }: { auth: string }) {
  const [items, setItems] = useState<HomepageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [homepageActive, setHomepageActive] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<HomepageItem | null>(null);
  const [formType, setFormType] = useState<"product" | "category">("product");
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formImage, setFormImage] = useState("");
  const [formLink, setFormLink] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [linkSearch, setLinkSearch] = useState("");
  const [linkResults, setLinkResults] = useState<Array<{ name: string; slug: string; image?: string }>>([]);
  const [linkSearching, setLinkSearching] = useState(false);
  const [showLinkDropdown, setShowLinkDropdown] = useState(false);
  const linkSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const linkDropdownRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/homepage", { headers: { Authorization: auth } });
    if (res.ok) {
      const data = await res.json();
      setItems(data);
    }
    setLoading(false);
  }, [auth]);

  // Load items + homepage_active setting
  useEffect(() => {
    fetchItems();
    fetch("/api/admin/settings", { headers: { Authorization: auth } })
      .then(r => r.json())
      .then(data => {
        if (data.homepage_active !== undefined) setHomepageActive(!!data.homepage_active);
      })
      .catch(() => {});
  }, [fetchItems, auth]);

  const toggleHomepage = async (active: boolean) => {
    setHomepageActive(active);
    await fetch("/api/admin/settings", {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ homepage_active: active }),
    });
  };

  const openAddForm = (type: "product" | "category") => {
    setEditingItem(null);
    setFormType(type);
    setFormTitle("");
    setFormDesc("");
    setFormImage("");
    setFormLink("");
    setShowForm(true);
  };

  const openEditForm = (item: HomepageItem) => {
    setEditingItem(item);
    setFormType(item.type);
    setFormTitle(item.title);
    setFormDesc(item.description);
    setFormImage(item.image_url);
    setFormLink(item.link_url);
    setShowForm(true);
  };

  const saveForm = async () => {
    setSaving(true);
    if (editingItem) {
      await fetch("/api/admin/homepage", {
        method: "PUT",
        headers: { Authorization: auth, "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingItem.id, type: formType, title: formTitle, description: formDesc, image_url: formImage, link_url: formLink }),
      });
    } else {
      await fetch("/api/admin/homepage", {
        method: "POST",
        headers: { Authorization: auth, "Content-Type": "application/json" },
        body: JSON.stringify({ type: formType, title: formTitle, description: formDesc, image_url: formImage, link_url: formLink }),
      });
    }
    setSaving(false);
    setShowForm(false);
    fetchItems();
  };

  const deleteItem = async (id: number) => {
    if (!confirm("Stergi acest item?")) return;
    await fetch(`/api/admin/homepage?id=${id}`, { method: "DELETE", headers: { Authorization: auth } });
    fetchItems();
  };

  const toggleItem = async (id: number, active: boolean) => {
    await fetch("/api/admin/homepage", {
      method: "PUT",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ id, active }),
    });
    setItems(prev => prev.map(i => i.id === id ? { ...i, active } : i));
  };

  // Image upload via file or drag & drop
  const uploadImage = async (file: File) => {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const r = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await r.json();
      if (data.url) setFormImage(data.url);
    } catch {}
    setUploading(false);
  };

  const handleImageDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) uploadImage(file);
  };

  // Link search - search products or categories
  const searchLinks = (query: string) => {
    setLinkSearch(query);
    setShowLinkDropdown(true);
    if (linkSearchTimeout.current) clearTimeout(linkSearchTimeout.current);
    if (!query.trim()) { setLinkResults([]); return; }
    linkSearchTimeout.current = setTimeout(async () => {
      setLinkSearching(true);
      try {
        const results: Array<{ name: string; slug: string; image?: string }> = [];
        if (formType === "category" || formType === "product") {
          // Search categories
          const catRes = await fetch("/api/categories");
          if (catRes.ok) {
            const cats = await catRes.json();
            const filtered = cats.filter((c: { name: string }) => c.name.toLowerCase().includes(query.toLowerCase()));
            for (const c of filtered.slice(0, 5)) {
              results.push({ name: c.name, slug: `/produse/${c.slug}`, image: c.image_url || c.r2_image_url });
            }
          }
          // Search products
          const prodRes = await fetch(`/api/products?search=${encodeURIComponent(query)}&per_page=5`);
          if (prodRes.ok) {
            const data = await prodRes.json();
            for (const p of (data.products || [])) {
              results.push({ name: p.name, slug: `/produse/${(p.category_slugs || [])[0] || "produs"}/${p.slug}`, image: p.r2_image_url || p.image_url });
            }
          }
        }
        setLinkResults(results);
      } catch {}
      setLinkSearching(false);
    }, 300);
  };

  const selectLink = (result: { name: string; slug: string; image?: string }) => {
    setFormLink(result.slug);
    if (!formTitle) setFormTitle(result.name);
    if (!formImage && result.image) setFormImage(result.image);
    setShowLinkDropdown(false);
    setLinkSearch("");
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (linkDropdownRef.current && !linkDropdownRef.current.contains(e.target as Node)) setShowLinkDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex(i => i.id === active.id);
    const newIndex = items.findIndex(i => i.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);
    setItems(reordered);

    // Save new positions
    const reorder = reordered.map((item, idx) => ({ id: item.id, position: idx }));
    await fetch("/api/admin/homepage", {
      method: "PUT",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ reorder }),
    });
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "16px" }}>
      {/* Toggle */}
      <div className="hp-toggle-row">
        <label className="hp-toggle">
          <input type="checkbox" checked={homepageActive} onChange={(e) => toggleHomepage(e.target.checked)} />
          <span className="hp-toggle__slider" />
        </label>
        <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>
          Activeaza Homepage {homepageActive ? <span style={{ color: "var(--color-success)" }}>(activ)</span> : <span style={{ color: "var(--color-text-muted)" }}>(inactiv)</span>}
        </span>
      </div>

      {/* Add buttons */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button className="admin-add-btn" onClick={() => openAddForm("product")}>
          <span className="admin-add-btn__plus">+</span> Adauga produs
        </button>
        <button className="admin-add-btn" onClick={() => openAddForm("category")}>
          <span className="admin-add-btn__plus">+</span> Adauga categorie
        </button>
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <div className="hp-form">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 style={{ fontSize: "0.9rem", margin: 0, fontWeight: 700 }}>{editingItem ? "Editeaza" : "Adauga"} {formType === "product" ? "produs" : "categorie"}</h3>
            <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", fontSize: "1.1rem", cursor: "pointer", color: "var(--color-text-muted)", padding: "0 4px" }}>✕</button>
          </div>

          <div className="hp-form__fields">
            {/* Type selector */}
            <div className="hp-form__type-selector">
              <button className={`hp-form__type-btn ${formType === "product" ? "hp-form__type-btn--active" : ""}`} onClick={() => setFormType("product")}>Produs</button>
              <button className={`hp-form__type-btn ${formType === "category" ? "hp-form__type-btn--active" : ""}`} onClick={() => setFormType("category")}>Categorie</button>
            </div>

            {/* Link search */}
            <div className="hp-form__row" style={{ position: "relative" }} ref={linkDropdownRef}>
              <label>Link</label>
              <div style={{ flex: 1, position: "relative" }}>
                <input
                  value={showLinkDropdown ? linkSearch : (formLink || "")}
                  onChange={(e) => searchLinks(e.target.value)}
                  onFocus={() => { setLinkSearch(""); setShowLinkDropdown(true); }}
                  placeholder="Cauta produs sau categorie..."
                  autoComplete="off"
                />
                {formLink && !showLinkDropdown && (
                  <button onClick={() => { setFormLink(""); setFormTitle(""); }} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: "0.8rem", color: "var(--color-text-muted)" }}>✕</button>
                )}
                {showLinkDropdown && (linkResults.length > 0 || linkSearching) && (
                  <div className="hp-form__dropdown">
                    {linkSearching && <div className="hp-form__dropdown-item hp-form__dropdown-item--loading">Se cauta...</div>}
                    {linkResults.map((r, i) => (
                      <button key={i} className="hp-form__dropdown-item" onClick={() => selectLink(r)}>
                        {r.image && <img src={r.image} alt="" style={{ width: 28, height: 28, objectFit: "cover", borderRadius: 4, flexShrink: 0 }} />}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: "0.78rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</div>
                          <div style={{ fontSize: "0.65rem", color: "var(--color-text-muted)" }}>{r.slug}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {formLink && <div style={{ fontSize: "0.68rem", color: "var(--color-text-muted)", marginTop: -4, paddingLeft: 80 }}>{formLink}</div>}

            {/* Title */}
            <div className="hp-form__row">
              <label>Titlu</label>
              <input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Titlu afisat pe homepage" />
            </div>

            {/* Description */}
            <div className="hp-form__row">
              <label>Descriere</label>
              <input value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="Descriere scurta (optional)" />
            </div>

            {/* Image upload with drag & drop */}
            <div className="hp-form__row" style={{ alignItems: "flex-start" }}>
              <label style={{ paddingTop: 8 }}>Imagine</label>
              <div style={{ flex: 1 }}>
                <div
                  className={`hp-form__dropzone ${dragging ? "hp-form__dropzone--active" : ""} ${formImage ? "hp-form__dropzone--has-image" : ""}`}
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleImageDrop}
                  onClick={() => { const inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*"; inp.onchange = (e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) uploadImage(f); }; inp.click(); }}
                >
                  {uploading ? (
                    <span style={{ fontSize: "0.78rem", color: "var(--color-text-muted)" }}>Se incarca...</span>
                  ) : formImage ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
                      <img src={formImage} alt="" style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 6 }} />
                      <span style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{formImage.split("/").pop()}</span>
                      <button onClick={(e) => { e.stopPropagation(); setFormImage(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", fontSize: "0.85rem", flexShrink: 0 }}>✕</button>
                    </div>
                  ) : (
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "1.5rem", marginBottom: 4, opacity: 0.4 }}>&#128247;</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Trage o imagine aici sau click pentru upload</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
              <button className="admin-inline-btn" onClick={() => setShowForm(false)}>Anuleaza</button>
              <button className="admin-add-btn" onClick={saveForm} disabled={saving || !formTitle} style={{ minWidth: 100 }}>{saving ? "Se salveaza..." : "Salveaza"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Items list with drag-and-drop */}
      {loading ? <p className="admin-loading">Se incarca...</p> : items.length === 0 ? (
        <p style={{ textAlign: "center", color: "var(--color-text-muted)", padding: 40, fontSize: "0.85rem" }}>Niciun item adaugat. Adauga produse sau categorii pentru homepage.</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
            <div className="hp-list">
              {items.map(item => (
                <SortableHomepageCard key={item.id} item={item} onEdit={openEditForm} onDelete={deleteItem} onToggle={toggleItem} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}



// ===== AWB SECTION =====
// ===== RAMBURS FIELD =====
function RambursField({ order, auth, onUpdate }: { order: Order; auth: string; onUpdate: () => void }) {
  const dbValue = order.ramburs != null ? order.ramburs : (order.order_value ?? 0);
  const [value, setValue] = useState(String(dbValue));
  const [saving, setSaving] = useState(false);

  // Sync with order data when it changes (after refresh)
  useEffect(() => {
    setValue(String(order.ramburs != null ? order.ramburs : (order.order_value ?? 0)));
  }, [order.ramburs, order.order_value]);

  const save = async (newVal: string) => {
    const num = parseFloat(newVal) || 0;
    setSaving(true);
    await fetch("/api/admin/orders", {
      method: "PATCH",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ id: order.id, ramburs: num }),
    });
    setSaving(false);
    onUpdate();
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ fontSize: "0.75rem", fontWeight: 600 }}>Ramburs:</span>
      <input type="number" value={value} onChange={(e) => setValue(e.target.value)}
        onBlur={(e) => save(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") save(value); }}
        style={{ width: 70, fontSize: "0.8rem", padding: "3px 6px", border: "1.5px solid var(--color-border)", borderRadius: 4, textAlign: "right", fontWeight: 700 }} />
      <span style={{ fontSize: "0.72rem", color: "var(--color-muted)" }}>RON{saving ? " ..." : ""}</span>
    </div>
  );
}

// ===== INVOICE SECTION =====
function InvoiceSection({ order, auth, onUpdate }: { order: Order; auth: string; onUpdate: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const emitere = async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/admin/fgo", {
        method: "POST",
        headers: { Authorization: auth, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "emitere", order_id: order.id }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else onUpdate();
    } catch (e) { setError("Eroare: " + String(e)); }
    finally { setLoading(false); }
  };

  const stornare = async () => {
    if (!confirm("Sigur vrei sa stornezi factura " + order.fgo_serie + " " + order.fgo_numar + "?")) return;
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/admin/fgo", {
        method: "POST",
        headers: { Authorization: auth, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stornare", order_id: order.id }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else onUpdate();
    } catch (e) { setError("Eroare: " + String(e)); }
    finally { setLoading(false); }
  };

  const hasInvoice = !!order.fgo_numar;

  return (
    <div>
      <h3 style={{ marginBottom: 8 }}>Factura</h3>
      {hasInvoice ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: "0.82rem", fontWeight: 600 }}>{order.fgo_serie} {order.fgo_numar}</span>
            {order.fgo_link && (
              <a href={order.fgo_link} target="_blank" rel="noopener" className="awb-btn" style={{ fontSize: "0.68rem", color: "var(--color-primary)" }}>Vezi PDF</a>
            )}
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <button className="awb-btn" onClick={emitere} disabled={true} style={{ fontSize: "0.68rem", opacity: 0.4 }}>Genereaza factura</button>
            <button className="awb-btn" onClick={stornare} disabled={loading} style={{ fontSize: "0.68rem", color: "#dc2626" }}>{loading ? "..." : "Storneaza factura"}</button>
          </div>
        </div>
      ) : (
        <button className="awb-btn" onClick={emitere} disabled={loading} style={{ fontSize: "0.72rem", padding: "6px 16px", background: "rgba(0,102,204,0.1)" }}>
          {loading ? "Se genereaza..." : "Genereaza factura"}
        </button>
      )}
      {error && <p style={{ color: "#dc2626", fontSize: "0.75rem", marginTop: 6 }}>{error}</p>}
    </div>
  );
}

function AwbSection({ order, auth, onUpdate }: { order: Order; auth: string; onUpdate: () => void }) {
  const [generating, setGenerating] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [showLockers, setShowLockers] = useState(false);
  const [lockers, setLockers] = useState<{lockerId: number; name: string; address: string; city: string}[]>([]);
  const [lockerSearch, setLockerSearch] = useState("");
  const [waTemplate, setWaTemplate] = useState("");
  const [waTemplates, setWaTemplates] = useState<Array<{id: string; name: string; category_slugs: string[]; content: string}>>([]);
  const [waGeneralTemplate, setWaGeneralTemplate] = useState("");
  const config = useConfig();

  // Load whatsapp templates
  useEffect(() => {
    fetch("/api/admin/settings", { headers: { Authorization: auth } })
      .then((r) => r.json())
      .then((data) => {
        if (data.whatsapp?.template) setWaTemplate(data.whatsapp.template);
        if (Array.isArray(data.whatsapp?.templates)) setWaTemplates(data.whatsapp.templates);
        if (data.whatsapp?.general_template) setWaGeneralTemplate(data.whatsapp.general_template);
        else if (data.whatsapp?.template) setWaGeneralTemplate(data.whatsapp.template);
      })
      .catch(() => {});
  }, [auth]);

  // Pick the right template based on order's product category
  const pickWaTemplate = () => {
    return waGeneralTemplate || waTemplate || "";
  };

  const buildWhatsAppMsg = () => {
    const shippingLabel = order.shipping_method === "easybox" ? "Easybox (Locker Sameday)" : order.shipping_method === "sameday" ? "Sameday (la adresa)" : "FanCourier (la adresa)";
    const prodName = order.product_name || "—";
    const tpl = pickWaTemplate() || `Bună {{nume_client}}, mulțumim pentru comanda #{{id_comanda}} în sumă de {{valoare}} lei. Produs: {{produs}}. Livrare: {{metoda_livrare}}, Adresa: {{adresa}}. Confirmă detaliile.`;
    return tpl
      .replace(/\{\{nume_client\}\}/g, order.customer_name || "")
      .replace(/\{\{id_comanda\}\}/g, String(order.id))
      .replace(/\{\{valoare\}\}/g, String(order.order_value || config.productPrice || 0))
      .replace(/\{\{produs\}\}/g, prodName)
      .replace(/\{\{metoda_livrare\}\}/g, shippingLabel)
      .replace(/\{\{adresa\}\}/g, order.address || "-")
      .replace(/\{\{telefon\}\}/g, order.customer_phone || "")
      .replace(/\{\{site_name\}\}/g, config.siteName || "");
  };

  const normalizePhone = (raw: string) => {
    let p = raw.replace(/[\s\-\(\)\.+]/g, "");
    if (p.startsWith("40") && p.length === 11) return p;
    if (p.startsWith("0") && p.length === 10) return "40" + p.slice(1);
    if (p.startsWith("4") && p.length === 11) return p;
    return "40" + p;
  };

  const openWhatsApp = () => {
    const phone = normalizePhone(order.customer_phone || "");
    const msg = encodeURIComponent(buildWhatsAppMsg());
    window.location.href = `whatsapp://send?phone=${phone}&text=${msg}`;
  };

  const authParam = encodeURIComponent(atob(auth.slice(6)).split(":")[1] || "");

  // Use separate columns, fallback to legacy awb_number based on shipping_method
  const hasNewCols = order.fan_awb !== undefined;
  const legacyAwb = order.awb_number || "";
  const legacyStatus = order.awb_status || "";
  const legacyMethod = order.shipping_method || "";

  const fanAwb = hasNewCols ? (order.fan_awb || "") : (legacyAwb && legacyMethod === "fancourier" ? legacyAwb : "");
  const fanStatus = hasNewCols ? (order.fan_status || "") : (fanAwb ? legacyStatus : "");
  const sdAwb = hasNewCols ? (order.sd_awb || "") : (legacyAwb && legacyMethod === "sameday" ? legacyAwb : "");
  const sdStatus = hasNewCols ? (order.sd_status || "") : (sdAwb ? legacyStatus : "");
  const ebAwb = hasNewCols ? (order.eb_awb || "") : (legacyAwb && legacyMethod === "easybox" ? legacyAwb : "");
  const ebStatus = hasNewCols ? (order.eb_status || "") : (ebAwb ? legacyStatus : "");

  const printPdf = (awb: string, isSd: boolean) => {
    const url = isSd
      ? `/api/admin/sameday?action=pdf&awb=${awb}&auth=${authParam}`
      : `/api/admin/awb?awb=${awb}&auth=${authParam}`;
    const w = window.open(url, "_blank");
    if (w) {
      w.onload = () => { setTimeout(() => { try { w.print(); } catch {} }, 500); };
      // Fallback if onload doesn't fire for PDF
      setTimeout(() => { try { w.print(); } catch {} }, 2000);
    }
  };

  const generateFan = async () => {
    if (fanAwb && !confirm("Exista deja un AWB FanCourier. Il inlocuiesti?")) return;
    setGenerating("fan"); setError("");
    try {
      const res = await fetch("/api/admin/awb", { method: "POST", headers: { Authorization: auth, "Content-Type": "application/json" }, body: JSON.stringify({ order_id: order.id }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Eroare FanCourier"); return; }
      onUpdate();
      if (data.awb) printPdf(data.awb, false);
    } catch (e) { setError(String(e)); }
    finally { setGenerating(""); }
  };

  const generateSameday = async () => {
    if (sdAwb && !confirm("Exista deja un AWB Sameday. Il inlocuiesti?")) return;
    setGenerating("sd"); setError("");
    try {
      const res = await fetch("/api/admin/sameday", { method: "POST", headers: { Authorization: auth, "Content-Type": "application/json" }, body: JSON.stringify({ order_id: order.id }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Eroare Sameday"); return; }
      onUpdate();
      if (data.awb) printPdf(data.awb, true);
    } catch (e) { setError(String(e)); }
    finally { setGenerating(""); }
  };

  const generateEasyboxAwb = async (lockerId: number) => {
    if (ebAwb && !confirm("Exista deja un AWB Easybox. Il inlocuiesti?")) return;
    setGenerating("eb"); setError("");
    try {
      const res = await fetch("/api/admin/sameday", { method: "POST", headers: { Authorization: auth, "Content-Type": "application/json" }, body: JSON.stringify({ order_id: order.id, locker_id: lockerId }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Eroare Easybox"); return; }
      setShowLockers(false);
      onUpdate();
      if (data.awb) printPdf(data.awb, true);
    } catch (e) { setError(String(e)); }
    finally { setGenerating(""); }
  };

  const hasLockerId = !!order.locker_id;

  const handleEasybox = async () => {
    if (hasLockerId) { generateEasyboxAwb(order.locker_id!); return; }
    setShowLockers(true);
    try {
      const res = await fetch("/api/lockers");
      const allLockers = await res.json();
      if (!Array.isArray(allLockers)) return;
      setLockers(allLockers.map((l: {id:number;name:string;address:string;city:string}) => ({
        lockerId: l.id, name: l.name, address: l.address, city: l.city,
      })));
    } catch {}
  };

  const deleteAwb = async (courier: "fan" | "sd" | "eb") => {
    const label = courier === "fan" ? "FanCourier" : courier === "sd" ? "Sameday" : "Easybox";
    if (!confirm(`Stergi AWB-ul ${label}?`)) return;
    try {
      const patch: Record<string, string> = courier === "fan"
        ? { fan_awb: "", fan_status: "" }
        : courier === "sd"
        ? { sd_awb: "", sd_status: "" }
        : { eb_awb: "", eb_status: "" };
      const legacyAwb = courier === "fan" ? fanAwb : courier === "sd" ? sdAwb : ebAwb;
      if (order.awb_number === legacyAwb) { patch.awb_number = ""; patch.awb_status = ""; }
      await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { Authorization: auth, "Content-Type": "application/json" },
        body: JSON.stringify({ id: order.id, ...patch }),
      });
      onUpdate();
    } catch (e) { setError(String(e)); }
  };

  const [copiedFan, setCopiedFan] = useState(false);
  const [copiedSd, setCopiedSd] = useState(false);
  const [copiedEb, setCopiedEb] = useState(false);

  const clientChose = order.shipping_method || "fancourier";

  const AwbActions = ({ awb, isSd, copiedState, setCopiedState, onDelete }: {
    awb: string; isSd: boolean; copiedState: boolean; setCopiedState: (v: boolean) => void; onDelete: () => void;
  }) => {
    const trackUrl = isSd ? `https://sameday.ro/status-colet/?awb=${awb}` : `https://www.fancourier.ro/awb-tracking/?tracking=${awb}`;
    return (
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        <button className="awb-btn" onClick={() => printPdf(awb, isSd)} title="PDF + Print">PDF</button>
        <a href={trackUrl} className="awb-btn" target="_blank" rel="noopener" title="Track">Track</a>
        <button className="awb-btn" onClick={() => { navigator.clipboard.writeText(trackUrl); setCopiedState(true); setTimeout(() => setCopiedState(false), 2000); }} title="Copy">{copiedState ? "✓" : "Copy"}</button>
        <button className="awb-btn" onClick={() => { window.location.href = `whatsapp://send?phone=${normalizePhone(order.customer_phone || "")}&text=${encodeURIComponent(`Salut! Urmareste coletul tau aici: ${trackUrl}`)}`; }} title="WhatsApp" style={{ color: "#25D366" }}>WA</button>
        <button className="awb-btn" onClick={onDelete} title="Sterge AWB" style={{ color: "#dc2626" }}>✕</button>
      </div>
    );
  };

  const statusClass = (s: string) => s.toLowerCase().includes("livrat") || s.toLowerCase().includes("delivered") ? "ot-green" : s.toLowerCase().includes("retur") || s.toLowerCase().includes("refuz") ? "ot-red" : "ot-muted";

  return (
    <div className="awb-section">
      <div className="admin-shipping-cards">
        {/* FanCourier card */}
        <div className="admin-shipping-card admin-shipping-card--active admin-shipping-card--fan">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <div className="admin-shipping-card__name">FanCourier{clientChose === "fancourier" ? " ★" : ""}</div>
            <button className="admin-add-btn" onClick={generateFan} disabled={!!generating} style={{ background: "#e94560", fontSize: "0.68rem", padding: "3px 10px" }}>{generating === "fan" ? "..." : fanAwb ? "Regenereaza" : "Genereaza AWB"}</button>
          </div>
          {fanAwb ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: "0.72rem", fontFamily: "monospace" }}>{fanAwb}</span>
                {fanStatus && <span className={statusClass(fanStatus)} style={{ fontSize: "0.65rem" }}>{fanStatus}</span>}
              </div>
              <AwbActions awb={fanAwb} isSd={false} copiedState={copiedFan} setCopiedState={setCopiedFan} onDelete={() => deleteAwb("fan")} />
            </>
          ) : (
            <div className="admin-shipping-card__desc">Livrare la adresa</div>
          )}
        </div>

        {/* Sameday card */}
        <div className="admin-shipping-card admin-shipping-card--active admin-shipping-card--sd">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <div className="admin-shipping-card__name">Sameday{clientChose === "sameday" ? " ★" : ""}</div>
            <button className="admin-add-btn" onClick={generateSameday} disabled={!!generating} style={{ background: "#0066cc", fontSize: "0.68rem", padding: "3px 10px" }}>{generating === "sd" ? "..." : sdAwb ? "Regenereaza" : "Genereaza AWB"}</button>
          </div>
          {sdAwb ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: "0.72rem", fontFamily: "monospace" }}>{sdAwb}</span>
                {sdStatus && <span className={statusClass(sdStatus)} style={{ fontSize: "0.65rem" }}>{sdStatus}</span>}
              </div>
              <AwbActions awb={sdAwb} isSd={true} copiedState={copiedSd} setCopiedState={setCopiedSd} onDelete={() => deleteAwb("sd")} />
            </>
          ) : (
            <div className="admin-shipping-card__desc">Livrare la adresa</div>
          )}
        </div>

        {/* Easybox card */}
        <div className="admin-shipping-card admin-shipping-card--active admin-shipping-card--sd">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <div className="admin-shipping-card__name">Easybox{clientChose === "easybox" ? " ★" : ""}</div>
            <button className="admin-add-btn" onClick={handleEasybox} disabled={!!generating} style={{ background: "#0066cc", fontSize: "0.68rem", padding: "3px 10px" }}>{generating === "eb" ? "..." : ebAwb ? "Regenereaza" : hasLockerId ? "Genereaza AWB" : "Alege locker"}</button>
          </div>
          {ebAwb ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: "0.72rem", fontFamily: "monospace" }}>{ebAwb}</span>
                {ebStatus && <span className={statusClass(ebStatus)} style={{ fontSize: "0.65rem" }}>{ebStatus}</span>}
              </div>
              <AwbActions awb={ebAwb} isSd={true} copiedState={copiedEb} setCopiedState={setCopiedEb} onDelete={() => deleteAwb("eb")} />
            </>
          ) : (
            <div className="admin-shipping-card__desc">Locker Sameday</div>
          )}
          {showLockers && (
            <div style={{ marginTop: 8 }}>
              <input className="admin-search" placeholder="Cauta locker..." value={lockerSearch} onChange={(e) => setLockerSearch(e.target.value)} style={{ marginBottom: 6, height: 30, fontSize: "0.75rem" }} />
              <div style={{ maxHeight: 200, overflowY: "auto", border: "1px solid var(--color-border)", borderRadius: 6 }}>
                {lockers.filter((l) => !lockerSearch || `${l.name} ${l.address} ${l.city}`.toLowerCase().includes(lockerSearch.toLowerCase())).map((l) => (
                  <button key={l.lockerId} onClick={() => generateEasyboxAwb(l.lockerId)} disabled={!!generating} style={{ display: "block", width: "100%", textAlign: "left", padding: "6px 8px", border: "none", borderBottom: "1px solid #f3f4f6", background: "transparent", cursor: "pointer", fontSize: "0.72rem", fontFamily: "var(--font)" }}>
                    <strong>{l.name}</strong> — {l.address}, {l.city}
                  </button>
                ))}
                {lockers.length === 0 && <p style={{ padding: 8, fontSize: "0.72rem", color: "var(--color-text-muted)" }}>Se incarca...</p>}
              </div>
            </div>
          )}
        </div>

        {/* Factura card - a 4-a casuta */}
        <div className="admin-shipping-card admin-shipping-card--active" style={{ borderColor: "#10b981" }}>
          <InvoiceSection order={order} auth={auth} onUpdate={onUpdate} />
        </div>
      </div>

      {/* WA Confirmare - comun */}
      <div style={{ marginTop: 8 }}>
        <button className="awb-btn" onClick={openWhatsApp} style={{ color: "#25D366", fontWeight: 700 }} title="Trimite confirmare WhatsApp">WA Confirmare comanda</button>
      </div>

      {error && <p style={{ color: "#dc2626", fontSize: "0.78rem", marginTop: 8 }}>{error}</p>}
    </div>
  );
}

// ===== DASHBOARD PANEL =====
function DashboardPanel({ orders, onNavigate }: { orders: Order[]; onNavigate: (tab: Tab) => void }) {
  const config = useConfig();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const monthOrders = orders.filter((o) => new Date(o.created_at) >= monthStart);
  const activeOrders = monthOrders.filter((o) => o.status !== "anulata");
  const netSales = activeOrders.length * (config.productPrice ?? 0) - activeOrders.length * (config.productionCost ?? 0);
  const processing = monthOrders.filter((o) => o.status === "in procesare").length;
  const finalized = monthOrders.filter((o) => o.status === "finalizata").length;
  const cancelled = monthOrders.filter((o) => o.status === "anulata").length;

  // Top 3 products this month
  const productCounts: Record<string, number> = {};
  activeOrders.forEach((o) => {
    const key = o.product_name || "Produs necunoscut";
    productCounts[key] = (productCounts[key] || 0) + 1;
  });
  const topProducts = Object.entries(productCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const monthName = now.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });

  return (
    <div className="dash">
      <div className="dash-hero" onClick={() => onNavigate("statistici")} style={{ cursor: "pointer" }}>
        <div className="dash-hero__icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40">
            <path d="M3 3v18h18" /><path d="M7 16l4-4 4 4 6-6" />
          </svg>
        </div>
        <div className="dash-hero__value">{netSales.toLocaleString("ro-RO")} RON</div>
        <div className="dash-hero__label">Vanzari nete — {monthName}</div>
        <div className="dash-hero__sub">{activeOrders.length} comenzi active · click pentru statistici</div>
      </div>

      <div className="dash-stats">
        <div className="dash-stat" onClick={() => onNavigate("comenzi")}>
          <div className="dash-stat__dot" style={{ background: "#f59e0b" }}></div>
          <div className="dash-stat__num">{processing}</div>
          <div className="dash-stat__label">In procesare</div>
        </div>
        <div className="dash-stat" onClick={() => onNavigate("comenzi")}>
          <div className="dash-stat__dot" style={{ background: "#10b981" }}></div>
          <div className="dash-stat__num">{finalized}</div>
          <div className="dash-stat__label">Finalizate</div>
        </div>
        <div className="dash-stat" onClick={() => onNavigate("comenzi")}>
          <div className="dash-stat__dot" style={{ background: "#6b7280" }}></div>
          <div className="dash-stat__num">{cancelled}</div>
          <div className="dash-stat__label">Anulate</div>
        </div>
      </div>

      {topProducts.length > 0 && (
        <>
          <div className="dash-sep"></div>
          <div className="dash-top">
            <h3>Top produse luna aceasta</h3>
            {topProducts.map(([name, count], i) => (
              <div key={name} className="dash-top__item">
                <span className="dash-top__rank">{i + 1}</span>
                <span className="dash-top__name">{name}</span>
                <span className="dash-top__count">{count} buc</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ===== STATISTICS PANEL =====
function StatisticsPanel({ orders }: { orders: Order[] }) {
  const config = useConfig();
  const now = new Date();
  const toISO = (d: Date) => d.toISOString().split("T")[0];
  const today = toISO(now);
  const yearStart = toISO(new Date(now.getFullYear(), 0, 1));
  const monthStart = toISO(new Date(now.getFullYear(), now.getMonth(), 1));
  const lastMonthStart = toISO(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const lastMonthEnd = toISO(new Date(now.getFullYear(), now.getMonth(), 0));
  const weekAgo = toISO(new Date(now.getTime() - 7 * 86400000));

  const [dateFrom, setDateFrom] = useState(monthStart);
  const [dateTo, setDateTo] = useState(today);

  const setPreset = (from: string, to: string) => { setDateFrom(from); setDateTo(to); };

  const filtered = orders.filter((o) => {
    const d = o.created_at.split("T")[0];
    return d >= dateFrom && d <= dateTo;
  });

  const active = filtered.filter((o) => o.status !== "anulata");
  const totalBrut = active.length * (config.productPrice ?? 0);
  const totalCost = active.length * (config.productionCost ?? 0);
  const totalNet = totalBrut - totalCost;
  const byStatus: Record<string, number> = {};
  filtered.forEach((o) => { byStatus[o.status] = (byStatus[o.status] || 0) + 1; });

  // By source
  const bySource: Record<string, number> = {};
  filtered.forEach((o) => {
    let label = "direct";
    try { const s = JSON.parse(o.order_source || "{}"); label = s.label || "direct"; } catch {}
    bySource[label] = (bySource[label] || 0) + 1;
  });

  // Top products
  const productCounts: Record<string, number> = {};
  active.forEach((o) => {
    const key = o.product_name || "Produs necunoscut";
    productCounts[key] = (productCounts[key] || 0) + 1;
  });
  const topProducts = Object.entries(productCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);

  return (
    <div className="stats">
      <div className="stats-presets">
        <button className={`stats-preset ${dateFrom === yearStart && dateTo === today ? "stats-preset--active" : ""}`} onClick={() => setPreset(yearStart, today)}>An curent</button>
        <button className={`stats-preset ${dateFrom === lastMonthStart && dateTo === lastMonthEnd ? "stats-preset--active" : ""}`} onClick={() => setPreset(lastMonthStart, lastMonthEnd)}>Luna trecuta</button>
        <button className={`stats-preset ${dateFrom === monthStart && dateTo === today ? "stats-preset--active" : ""}`} onClick={() => setPreset(monthStart, today)}>Luna curenta</button>
        <button className={`stats-preset ${dateFrom === weekAgo && dateTo === today ? "stats-preset--active" : ""}`} onClick={() => setPreset(weekAgo, today)}>Sapt. trecuta</button>
      </div>
      <div className="stats-period">
        <label className="stats-date-label">De la</label>
        <input type="date" className="stats-date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <label className="stats-date-label">pana la</label>
        <input type="date" className="stats-date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
      </div>

      <div className="stats-grid">
        <div className="stats-card">
          <div className="stats-card__label">Vanzari brute</div>
          <div className="stats-card__value">{totalBrut.toLocaleString("ro-RO")} RON</div>
        </div>
        <div className="stats-card">
          <div className="stats-card__label">Cost Livrare</div>
          <div className="stats-card__value">{totalCost.toLocaleString("ro-RO")} RON</div>
        </div>
        <div className="stats-card stats-card--accent">
          <div className="stats-card__label">Vanzari nete</div>
          <div className="stats-card__value">{totalNet.toLocaleString("ro-RO")} RON</div>
        </div>
        <div className="stats-card">
          <div className="stats-card__label">Nr comenzi</div>
          <div className="stats-card__value">{filtered.length}</div>
        </div>
      </div>

      <div className="stats-section">
        <h3>Per status</h3>
        <div className="stats-bars">
          {Object.entries(byStatus).sort((a, b) => b[1] - a[1]).map(([status, count]) => (
            <div key={status} className="stats-bar">
              <span className="stats-bar__label">{status}</span>
              <div className="stats-bar__track"><div className="stats-bar__fill" style={{ width: `${(count / filtered.length) * 100}%`, background: STATUS_COLORS[status] || "#6b7280" }}></div></div>
              <span className="stats-bar__count">{count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="stats-section">
        <h3>Per sursa</h3>
        <div className="stats-bars">
          {Object.entries(bySource).sort((a, b) => b[1] - a[1]).map(([source, count]) => (
            <div key={source} className="stats-bar">
              <span className="stats-bar__label">{source}</span>
              <div className="stats-bar__track"><div className="stats-bar__fill" style={{ width: `${(count / filtered.length) * 100}%`, background: "#3b82f6" }}></div></div>
              <span className="stats-bar__count">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {topProducts.length > 0 && (
        <div className="stats-section">
          <h3>Top 10 produse</h3>
          {topProducts.map(([name, count], i) => (
            <div key={name} className="dash-top__item">
              <span className="dash-top__rank">{i + 1}</span>
              <span className="dash-top__name">{name}</span>
              <span className="dash-top__count">{count} buc</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ===== ORDER DETAILS (editable) =====
function OrderDetails({ order, auth, onUpdate }: { order: Order; auth: string; onUpdate: () => void }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({
    customer_name: order.customer_name,
    customer_phone: order.customer_phone,
    customer_email: order.customer_email || "",
    birth_date: order.birth_date || "",
    postal_code: order.postal_code || "",
    observations: order.observations || "",
    custom_field_values: order.custom_field_values || {},
    order_value: order.order_value || 0,
    locker_id: order.locker_id || null,
  });
  // Produsul comandat: ne trebuie sku-ul si source_url-ul (originalul mysnep),
  // care nu se salveaza pe comanda.
  const [productInfo, setProductInfo] = useState<OrderProductInfo | null>(null);
  const [judetName, setJudetName] = useState("");
  const [localitateVal, setLocalitateVal] = useState("");
  const [stradaVal, setStradaVal] = useState("");
  const [judete, setJudete] = useState<{id:number;name:string}[]>([]);
  const [localitati, setLocalitati] = useState<string[]>([]);
  const [judetId, setJudetId] = useState("");
  // Easybox locker editing
  const [lockers, setLockers] = useState<{id:number;name:string;address:string;city:string;county:string}[]>([]);
  const [loadingLockers, setLoadingLockers] = useState(false);
  const [lockerSearch, setLockerSearch] = useState("");
  const [selectedLockerName, setSelectedLockerName] = useState("");
  const isEasybox = order.shipping_method === "easybox";

  useEffect(() => {
    const param = order.product_id
      ? `id=${order.product_id}`
      : order.product_slug
      ? `slug=${encodeURIComponent(order.product_slug)}`
      : "";
    if (!param) { setProductInfo(null); return; }
    let cancelled = false;
    fetch(`/api/admin/products?${param}`, { headers: { Authorization: auth } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (!cancelled && data && !data.error) setProductInfo(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [order.product_id, order.product_slug, auth]);

  // Parse address
  useEffect(() => {
    if (isEasybox && order.address?.startsWith("Easybox:")) {
      const lockerPart = order.address.replace("Easybox:", "").trim();
      setSelectedLockerName(lockerPart);
      // For easybox, strada shows the full easybox address; judet/localitate empty so admin can fill if switching to home delivery
      setStradaVal(order.address);
    } else {
      const parts = order.address?.split(",").map((s: string) => s.trim()) || [];
      setStradaVal(parts[0] || "");
      setLocalitateVal(parts[1] || "");
      setJudetName(parts[2] || "");
    }
  }, [order.address, isEasybox]);

  // Load lockers when editing any order
  useEffect(() => {
    if (!editing || lockers.length > 0) return;
    setLoadingLockers(true);
    fetch("/api/lockers").then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setLockers(data); })
      .catch(() => {})
      .finally(() => setLoadingLockers(false));
  }, [editing, lockers.length]);

  useEffect(() => {
    if (!editing) return;
    fetch("/api/judete").then((r) => r.json()).then((data) => {
      if (Array.isArray(data)) {
        setJudete(data);
        const found = data.find((j: {name:string}) => j.name === judetName);
        if (found) setJudetId(String(found.id));
      }
    }).catch(() => {});
  }, [editing, judetName]);

  // Load localitati when judet changes
  useEffect(() => {
    if (!judetId || !editing) return;
    fetch(`/api/localitati?judetId=${judetId}`).then((r) => r.json()).then(setLocalitati).catch(() => {});
  }, [judetId, editing]);

  const handleJudetChange = (val: string) => {
    setJudetId(val);
    const j = judete.find((x) => x.id === Number(val));
    setJudetName(j?.name || "");
    setLocalitateVal("");
  };

  const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[ăâ]/g, "a").replace(/[șş]/g, "s").replace(/[țţ]/g, "t").replace(/[îi]/g, "i");

  // Auto-detect judet from current locker for easybox orders (pre-populate address judet)
  useEffect(() => {
    if (!isEasybox || !selectedLockerName || lockers.length === 0 || judete.length === 0 || judetId) return;
    const currentName = selectedLockerName.split(",")[0]?.trim().toLowerCase();
    const match = lockers.find((l) => l.name.toLowerCase() === currentName);
    if (match?.county) {
      const nCounty = normalize(match.county);
      const found = judete.find((j) => normalize(j.name) === nCounty);
      if (found) {
        setJudetId(String(found.id));
        setJudetName(found.name);
      }
    }
  }, [isEasybox, selectedLockerName, lockers, judete, judetId]);

  const filteredLockers = lockers.filter((l) => {
    // Filter by address judet
    if (judetName) {
      const nj = normalize(judetName);
      const nc = normalize(l.county || "");
      const nCity = normalize(l.city || "");
      if (!nc.includes(nj) && !nj.includes(nc) && !nCity.includes(nj) && !nj.includes(nCity)) return false;
    }
    const q = normalize(lockerSearch);
    return !q || normalize(l.name).includes(q) || normalize(l.address).includes(q) || normalize(l.city).includes(q);
  });

  const saveDetails = async () => {
    setSaving(true);
    // If admin filled judet+localitate, build normal address (overrides easybox)
    const address = (localitateVal && judetName) ? [stradaVal, localitateVal, judetName].filter(Boolean).join(", ") : stradaVal;
    const { custom_field_values, order_value, locker_id, ...rest } = f;
    await fetch("/api/admin/orders", {
      method: "PATCH",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ id: order.id, ...rest, address, custom_field_values, order_value: Number(order_value) || 0, locker_id: locker_id ? String(locker_id) : null }),
    });
    setSaving(false);
    setEditing(false);
    onUpdate();
  };

  const productName = order.product_name || "";
  // Link catre pagina de produs de pe site. Categoria vine din produs; daca nu
  // se poate afla, nu punem link (URL-ul /produse/<categorie>/<slug> ar fi gresit).
  const productSlug = productInfo?.slug || order.product_slug || "";
  const productCategory = productInfo?.category_slugs?.[0] || "";
  const productUrl = productSlug && productCategory ? `/produse/${productCategory}/${productSlug}` : "";
  const productSku = productInfo?.sku || "";
  const productSourceUrl = productInfo?.source_url || "";
  const productImage = productInfo?.r2_image_url || productInfo?.image_url || "";

  if (!editing) {
    return (
      <>
        {/*
          Antetul comenzii: miniatura produsului in stanga, iar in dreapta numele
          (link catre produsul de pe site), codul (link catre originalul de pe
          mysnep) si randul "Detalii". Imaginea se intinde pe toate trei, de aceea
          butonul de editare sta pe acelasi rand cu "Detalii", nu deasupra.
        */}
        <div className="ord-head">
          {productImage && (
            <img
              className="ord-head__thumb"
              src={productImage}
              alt=""
              loading="lazy"
              decoding="async"
            />
          )}
          <div className="ord-head__col">
            {productName && (
              <>
                {productUrl ? (
                  <a
                    className="ord-head__name"
                    href={productUrl}
                    target="_blank"
                    rel="noopener"
                    title="Deschide produsul pe site"
                  >
                    {productName}
                  </a>
                ) : (
                  <span className="ord-head__name">{productName}</span>
                )}
                {productSku && (
                  <div className="ord-head__sku">
                    Cod:{" "}
                    {productSourceUrl ? (
                      <a
                        href={productSourceUrl}
                        target="_blank"
                        rel="noopener"
                        title="Deschide produsul original pe mysnep"
                      >
                        {productSku}
                      </a>
                    ) : (
                      <strong>{productSku}</strong>
                    )}
                  </div>
                )}
              </>
            )}
            <div className="ord-head__row">
              <h3>Detalii</h3>
              <button className="admin-action-btn" onClick={() => setEditing(true)} title="Editeaza">✎</button>
            </div>
          </div>
        </div>
        <table><tbody>
          <tr><td>Nume</td><td>{order.customer_name}</td></tr>
          <tr><td>Telefon</td><td><a href={`tel:${order.customer_phone}`}>{order.customer_phone}</a></td></tr>
          {order.customer_email && <tr><td>Email</td><td>{order.customer_email}</td></tr>}
          {order.birth_date && <tr><td>Data nasterii</td><td>{order.birth_date}</td></tr>}
          {judetName && <tr><td>Județ</td><td>{judetName}</td></tr>}
          {localitateVal && <tr><td>Localitate</td><td>{localitateVal}</td></tr>}
          <tr><td>Adresa</td><td>{order.address}</td></tr>
          {order.postal_code && <tr><td>Cod postal</td><td>{order.postal_code}</td></tr>}
          <tr><td>Valoare</td><td><strong style={{ color: "var(--color-accent)" }}>{order.order_value || 0} RON</strong>{order.shipping_cost ? <span style={{ color: "var(--color-text-muted)", fontSize: "0.75rem" }}> (din care {order.shipping_cost} RON transport)</span> : null}</td></tr>
          {order.observations && <tr><td>Obs</td><td>{order.observations}</td></tr>}
          {order.custom_field_values && Object.entries(order.custom_field_values).map(([key, cf]) => (
            <tr key={key}><td>{cf.label}</td><td>
              {cf.type === "checkbox" ? (cf.value ? "Da" : "Nu") :
               cf.type === "image_upload" ? <a href={String(cf.value)} target="_blank" rel="noopener" style={{ color: "var(--color-primary)" }}>Vezi imagine</a> :
               cf.option_label || String(cf.value)}
              {cf.price_impact ? <span style={{ color: "var(--color-accent)", marginLeft: 4, fontSize: "0.75rem" }}>({cf.price_impact > 0 ? "+" : ""}{cf.price_impact} RON)</span> : null}
            </td></tr>
          ))}
        </tbody></table>
      </>
    );
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
        <h3>Editeaza detalii</h3>
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          <button className="admin-add-btn" onClick={saveDetails} disabled={saving}>{saving ? "..." : "Salveaza"}</button>
          <button className="admin-action-btn" onClick={() => setEditing(false)} title="Anuleaza">✕</button>
        </div>
      </div>
      <div className="order-edit-fields">
        <div className="order-edit-row">
          <label>Nume</label>
          <input value={f.customer_name} onChange={(e) => setF({ ...f, customer_name: e.target.value })} />
        </div>
        <div className="order-edit-row">
          <label>Telefon</label>
          <input value={f.customer_phone} onChange={(e) => setF({ ...f, customer_phone: e.target.value })} />
        </div>
        <div className="order-edit-row">
          <label>Email</label>
          <input value={f.customer_email} onChange={(e) => setF({ ...f, customer_email: e.target.value })} />
        </div>
        <div className="order-edit-row">
          <label>Data nasterii</label>
          <input placeholder="zz.ll.aaaa" maxLength={10} value={f.birth_date} onChange={(e) => setF({ ...f, birth_date: maskBirthDate(e.target.value) })} />
        </div>
        {/* Judet/Localitate/Strada - shown first so locker filtering uses selected judet */}
        <div className="order-edit-row">
          <label>Judet</label>
          <select value={judetId} onChange={(e) => handleJudetChange(e.target.value)}>
            <option value="">Selecteaza</option>
            {judete.map((j) => <option key={j.id} value={j.id}>{j.name}</option>)}
          </select>
        </div>
        <div className="order-edit-row">
          <label>Localitate</label>
          <select value={localitateVal} onChange={(e) => setLocalitateVal(e.target.value)}>
            <option value="">{localitati.length ? "Selecteaza" : localitateVal || "..."}</option>
            {localitati.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div className="order-edit-row">
          <label>Strada</label>
          <input value={stradaVal} onChange={(e) => setStradaVal(e.target.value)} />
        </div>
        <div className="order-edit-row">
          <label>Cod postal</label>
          <input inputMode="numeric" maxLength={6} value={f.postal_code} onChange={(e) => setF({ ...f, postal_code: e.target.value.replace(/\D/g, "").slice(0, 6) })} />
        </div>
        {/* Easybox locker picker - filters by address judet */}
        <div style={{ border: "1.5px solid #0066cc", borderRadius: "var(--radius-sm)", padding: 10, marginBottom: 4, background: "rgba(0,102,204,0.03)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: selectedLockerName ? 0 : 6 }}>
            <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "#0066cc", margin: 0 }}>Easybox locker</label>
            {selectedLockerName ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>{selectedLockerName}</span>
                <button type="button" onClick={() => { setSelectedLockerName(""); setF((prev) => ({ ...prev, locker_id: null })); }} style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: "0.75rem", padding: 0 }}>✕</button>
              </div>
            ) : (
              <span style={{ fontSize: "0.68rem", color: "var(--color-text-muted)" }}>niciun locker</span>
            )}
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            <input type="text" placeholder="Cauta locker..." value={lockerSearch} onChange={(e) => setLockerSearch(e.target.value)} style={{ flex: 1, height: 30, fontSize: "0.75rem", padding: "0 8px", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-sm)" }} />
          </div>
          {judetName && <div style={{ fontSize: "0.65rem", color: "var(--color-text-muted)", marginTop: 3 }}>Filtrate dupa judetul: {judetName}</div>}
          {lockerSearch && (
            <div style={{ maxHeight: 160, overflowY: "auto", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-sm)", marginTop: 6 }}>
              {loadingLockers ? (
                <div style={{ padding: 10, fontSize: "0.75rem", color: "var(--color-text-muted)", textAlign: "center" }}>Se incarca...</div>
              ) : filteredLockers.length === 0 ? (
                <div style={{ padding: 10, fontSize: "0.75rem", color: "var(--color-text-muted)", textAlign: "center" }}>Niciun locker gasit</div>
              ) : (
                filteredLockers.slice(0, 30).map((l) => (
                  <div key={l.id} onClick={() => {
                    setStradaVal(`Easybox: ${l.name}, ${l.address}, ${l.city}`);
                    setSelectedLockerName(`${l.name}, ${l.address}, ${l.city}`);
                    setF((prev) => ({ ...prev, locker_id: l.id }));
                    setLockerSearch("");
                  }} style={{ padding: "6px 8px", cursor: "pointer", borderBottom: "1px solid var(--color-border)", fontSize: "0.72rem" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,102,204,0.05)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <div style={{ fontWeight: 700 }}>{l.name}</div>
                    <div style={{ color: "var(--color-text-muted)", fontSize: "0.65rem" }}>{l.address}, {l.city}</div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
        <div className="order-edit-row">
          <label>Valoare (RON)</label>
          <input type="number" value={f.order_value || 0} onChange={(e) => setF({ ...f, order_value: Number(e.target.value) })} style={{ width: 100 }} />
        </div>
        <div className="order-edit-row">
          <label>Observatii</label>
          <input value={f.observations} onChange={(e) => setF({ ...f, observations: e.target.value })} />
        </div>
        {f.custom_field_values && Object.entries(f.custom_field_values).length > 0 && (
          <>
            <div style={{ borderTop: "1px solid var(--color-border)", margin: "8px 0", paddingTop: 8 }}>
              <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--color-text-muted)" }}>Campuri custom</label>
            </div>
            {Object.entries(f.custom_field_values).map(([key, cf]) => (
              <div className="order-edit-row" key={key}>
                <label>{cf.label}</label>
                {cf.type === "checkbox" ? (
                  <input type="checkbox" checked={!!cf.value} onChange={(e) => {
                    setF((prev) => ({ ...prev, custom_field_values: { ...prev.custom_field_values, [key]: { ...cf, value: e.target.checked } } }));
                  }} />
                ) : cf.type === "image_upload" ? (
                  <a href={String(cf.value)} target="_blank" rel="noopener" style={{ color: "var(--color-primary)", fontSize: "0.8rem" }}>Vezi imagine</a>
                ) : (
                  <input value={cf.option_label || String(cf.value || "")} onChange={(e) => {
                    setF((prev) => ({ ...prev, custom_field_values: { ...prev.custom_field_values, [key]: { ...cf, value: e.target.value, option_label: undefined } } }));
                  }} />
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </>
  );
}

// ===== CLIENT HISTORY =====
function ClientHistory({ history, onOpen }: { history: Order[]; onOpen?: (id: number) => void }) {
  if (history.length === 0) return null;

  const getStyle = (status: string): React.CSSProperties => {
    switch (status) {
      case "finalizata": case "livrat": return { color: "#10b981", fontWeight: 600 };
      case "retur": return { color: "#dc2626", fontWeight: 600 };
      case "anulata": case "anulat": return { color: "#1a1a2e", textDecoration: "line-through" };
      default: return { color: "#1a1a2e", fontWeight: 500 };
    }
  };

  return (
    <div className="client-history">
      {history.map((o) => (
        <span key={o.id} style={{ ...getStyle(o.status), cursor: onOpen ? "pointer" : "default" }} title={`#${o.id} - ${o.status}`} onClick={(e) => { if (onOpen) { e.stopPropagation(); onOpen(o.id); } }}>
          #{o.id}
        </span>
      ))}
    </div>
  );
}

// ===== REVIEWS PANEL =====
interface AdminReview {
  id: number;
  product_id: number;
  product_name: string;
  customer_name: string;
  rating: number;
  comment: string;
  email: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

function ReviewsPanel({ auth }: { auth: string }) {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"pending" | "approved" | "rejected">("pending");

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`/api/admin/reviews?status=${statusFilter}`, { headers: { Authorization: auth } });
    if (r.ok) {
      const data = await r.json();
      if (Array.isArray(data)) setReviews(data);
    }
    setLoading(false);
  }, [auth, statusFilter]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const moderate = async (id: number, status: "approved" | "rejected" | "pending") => {
    await fetch("/api/admin/reviews", {
      method: "PATCH",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    fetchReviews();
  };

  const deleteReview = async (id: number) => {
    if (!confirm("Stergi recenzia permanent?")) return;
    await fetch(`/api/admin/reviews?id=${id}`, { method: "DELETE", headers: { Authorization: auth } });
    fetchReviews();
  };

  const stars = (n: number) => "\u2605".repeat(n) + "\u2606".repeat(5 - n);

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button className={`ot-sf ${statusFilter === "pending" ? "ot-sf--active" : ""}`} style={statusFilter === "pending" ? { background: "#f59e0b", color: "#fff" } : {}} onClick={() => setStatusFilter("pending")}>In asteptare</button>
        <button className={`ot-sf ${statusFilter === "approved" ? "ot-sf--active" : ""}`} style={statusFilter === "approved" ? { background: "#10b981", color: "#fff" } : {}} onClick={() => setStatusFilter("approved")}>Aprobate</button>
        <button className={`ot-sf ${statusFilter === "rejected" ? "ot-sf--active" : ""}`} style={statusFilter === "rejected" ? { background: "#dc2626", color: "#fff" } : {}} onClick={() => setStatusFilter("rejected")}>Respinse</button>
      </div>

      {loading ? <p>Se incarca...</p> : reviews.length === 0 ? (
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem", padding: 20, textAlign: "center" }}>Nicio recenzie in aceasta categorie.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {reviews.map((r) => (
            <div key={r.id} style={{ border: "1px solid var(--color-border)", borderRadius: 8, padding: 12, background: "var(--color-surface)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                <strong style={{ fontSize: "0.9rem" }}>{r.customer_name}</strong>
                <span style={{ color: "#f59e0b", letterSpacing: 1 }}>{stars(r.rating)}</span>
                <span style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>{new Date(r.created_at).toLocaleString("ro-RO")}</span>
                <span style={{ marginLeft: "auto", fontSize: "0.72rem", color: "var(--color-text-muted)" }}>{r.product_name}</span>
              </div>
              {r.comment && <p style={{ fontSize: "0.85rem", lineHeight: 1.5, margin: "0 0 8px", color: "var(--color-text)" }}>{r.comment}</p>}
              {r.email && <p style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", margin: "0 0 8px" }}>Email (privat): {r.email}</p>}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {r.status !== "approved" && <button className="admin-add-btn" onClick={() => moderate(r.id, "approved")} style={{ background: "#10b981", padding: "4px 10px", fontSize: "0.75rem" }}>Aproba</button>}
                {r.status !== "rejected" && <button className="admin-add-btn" onClick={() => moderate(r.id, "rejected")} style={{ background: "#dc2626", padding: "4px 10px", fontSize: "0.75rem" }}>Respinge</button>}
                {r.status !== "pending" && <button className="admin-inline-btn" onClick={() => moderate(r.id, "pending")} style={{ fontSize: "0.75rem" }}>Reseteaza</button>}
                <button className="admin-inline-btn" onClick={() => deleteReview(r.id)} style={{ color: "#dc2626", fontSize: "0.75rem" }}>Sterge</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ===== ABANDONED CARTS PANEL =====
function AbandonedCartsPanel({ auth, onCountUpdate }: { auth: string; onCountUpdate: (n: number) => void }) {
  const [rows, setRows] = useState<AbandonedCart[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"open" | "resolved" | "all">("open");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const onCountRef = useRef(onCountUpdate);
  onCountRef.current = onCountUpdate;

  const fetchRows = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/admin/abandoned-carts", { headers: { Authorization: auth } });
    if (r.ok) {
      const data = await r.json();
      if (Array.isArray(data)) {
        setRows(data);
        onCountRef.current(data.filter((f: AbandonedCart) => !f.resolved_at).length);
      }
    }
    setLoading(false);
  }, [auth]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const toggleResolved = async (id: number, currentlyResolved: boolean) => {
    await fetch("/api/admin/abandoned-carts", {
      method: "PATCH",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ id, resolved: !currentlyResolved }),
    });
    fetchRows();
  };

  const deleteRow = async (id: number) => {
    if (!confirm("Stergi inregistrarea permanent?")) return;
    await fetch("/api/admin/abandoned-carts", {
      method: "DELETE",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchRows();
  };

  const filtered = rows.filter((f) => {
    if (statusFilter === "open" && f.resolved_at) return false;
    if (statusFilter === "resolved" && !f.resolved_at) return false;
    return true;
  });

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.round(diff / 60000);
    if (mins < 1) return "acum";
    if (mins < 60) return `${mins} min`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours} h`;
    const days = Math.round(hours / 24);
    return `${days} zile`;
  };

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <button className={`ot-sf ${statusFilter === "open" ? "ot-sf--active" : ""}`} style={statusFilter === "open" ? { background: "#f59e0b", color: "#fff" } : {}} onClick={() => setStatusFilter("open")}>De sunat</button>
        <button className={`ot-sf ${statusFilter === "resolved" ? "ot-sf--active" : ""}`} style={statusFilter === "resolved" ? { background: "#10b981", color: "#fff" } : {}} onClick={() => setStatusFilter("resolved")}>Rezolvate</button>
        <button className={`ot-sf ${statusFilter === "all" ? "ot-sf--active" : ""}`} style={statusFilter === "all" ? { background: "#374151", color: "#fff" } : {}} onClick={() => setStatusFilter("all")}>Toate</button>
        <div style={{ marginLeft: "auto" }}>
          <button className="admin-inline-btn admin-inline-btn--text" onClick={fetchRows} style={{ fontSize: "0.8rem" }}>Reincarca</button>
        </div>
      </div>

      {loading ? <p>Se incarca...</p> : filtered.length === 0 ? (
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem", padding: 20, textAlign: "center" }}>Niciun cos abandonat in aceasta categorie.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((f) => {
            const isOpen = expandedId === f.id;
            return (
              <div key={f.id} style={{ border: `1px solid ${f.resolved_at ? "var(--color-border)" : "#fde68a"}`, borderRadius: 8, padding: 12, background: f.resolved_at ? "var(--color-surface)" : "#fffbeb" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                  <strong style={{ fontSize: "0.9rem" }}>#{f.id}</strong>
                  <span style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>Ultima activitate: {timeAgo(f.last_seen_at)}</span>
                  {f.resolved_at && <span style={{ fontSize: "0.72rem", color: "#10b981" }}>✓ Rezolvat {formatShortDate(f.resolved_at)}</span>}
                  <span style={{ marginLeft: "auto", fontSize: "0.8rem", fontWeight: 600 }}>{f.customer_name || "(fara nume)"}</span>
                </div>

                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: "0.82rem", color: "var(--color-text)", marginBottom: 6 }}>
                  {f.customer_phone && <a href={`tel:${f.customer_phone}`} style={{ color: "#2563eb", textDecoration: "none" }}>{f.customer_phone}</a>}
                  {f.customer_email && <a href={`mailto:${f.customer_email}`} style={{ color: "#2563eb", textDecoration: "none" }}>{f.customer_email}</a>}
                  {f.product_name && <span style={{ color: "var(--color-text-muted)" }}>{f.product_name}</span>}
                </div>

                {f.address && (
                  <div style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", marginBottom: 8 }}>
                    {f.address}
                  </div>
                )}

                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {!f.resolved_at && <button className="admin-add-btn" onClick={() => toggleResolved(f.id, false)} style={{ background: "#10b981", padding: "4px 10px", fontSize: "0.75rem" }}>Marcheaza rezolvat</button>}
                  {f.resolved_at && <button className="admin-inline-btn admin-inline-btn--text" onClick={() => toggleResolved(f.id, true)} style={{ fontSize: "0.75rem" }}>Redeschide</button>}
                  <button className="admin-inline-btn admin-inline-btn--text" onClick={() => setExpandedId(isOpen ? null : f.id)} style={{ fontSize: "0.75rem" }}>{isOpen ? "Ascunde detalii" : "Detalii"}</button>
                  {f.url && (
                    <a className="admin-inline-btn admin-inline-btn--text" href={f.url} target="_blank" rel="noopener" style={{ fontSize: "0.75rem", textDecoration: "none" }}>Deschide pagina</a>
                  )}
                  <button className="admin-inline-btn admin-inline-btn--text" onClick={() => deleteRow(f.id)} style={{ color: "#dc2626", fontSize: "0.75rem", marginLeft: "auto" }}>Sterge</button>
                </div>

                {isOpen && (
                  <div style={{ marginTop: 10, fontSize: "0.78rem", color: "var(--color-text)", display: "grid", gap: 6 }}>
                    <div><strong>Creat:</strong> {formatShortDate(f.created_at)}</div>
                    <div><strong>Sesiune:</strong> <code style={{ fontSize: "0.7rem" }}>{f.session_id}</code></div>
                    {f.user_agent && <div style={{ color: "var(--color-text-muted)", fontSize: "0.72rem" }}><strong>UA:</strong> {f.user_agent}</div>}
                    {f.snapshot && (
                      <details>
                        <summary style={{ cursor: "pointer", color: "var(--color-text-muted)" }}>Snapshot (JSON)</summary>
                        <pre style={{ background: "#0f172a", color: "#e2e8f0", padding: 10, borderRadius: 4, fontSize: "0.7rem", overflow: "auto", maxHeight: 300 }}>{JSON.stringify(f.snapshot, null, 2)}</pre>
                      </details>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
