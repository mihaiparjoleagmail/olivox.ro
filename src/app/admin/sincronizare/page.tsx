"use client";

/**
 * Sincronizare catalog cu mysnep — pagina proprie, nu modal.
 *
 * Rezultatul scanarii se salveaza in baza de date, deci se poate trece intre
 * taburi, aplica preturile si reveni la "ce e nou" fara sa se rescaneze. O
 * scanare noua se cere explicit, din buton.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { getAdminAuth } from "@/lib/admin-auth";

interface PriceChange { id: number; name: string; sku: string; oldDisplay: number; newDisplay: number; newPrice: number }
interface StockChange { id: number; name: string; sku: string; from: string; to: string }
interface NewProduct { sku: string; name: string; url: string; price: number | null; slug: string; category: string; available: boolean }
interface MissingProduct { id: number; name: string; sku: string | null; slug?: string; category?: string; price: number | null; alreadyOut: boolean; renamedTo?: string | null }
interface ScanResult {
  scannedAt: string;
  /** true = vreo pagina de listare n-a raspuns, deci catalogul citit e incomplet. */
  partial?: boolean;
  failures?: string[];
  supplierTotal: number;
  ourTotal: number;
  unchanged: number;
  priceChanges: PriceChange[];
  stockChanges: StockChange[];
  newProducts: NewProduct[];
  missingProducts: MissingProduct[];
}

type Tab = "prices" | "stock" | "new" | "missing";

const REASONS: Record<string, string> = {
  expired: "sesiune expirata",
  not_found: "pret negasit",
  http_error: "pagina inaccesibila",
  network: "eroare de retea",
};

export default function SincronizarePage() {
  const [auth, setAuth] = useState("");
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<"idle" | "scanning" | "applying">("idle");
  const [progress, setProgress] = useState({ done: 0, total: 0, label: "" });
  const [tab, setTab] = useState<Tab>("prices");
  const [pickPrices, setPickPrices] = useState<Set<number>>(new Set());
  const [pickStock, setPickStock] = useState<Set<number>>(new Set());
  const [pickNew, setPickNew] = useState<Set<string>>(new Set());
  const [pickMissing, setPickMissing] = useState<Set<number>>(new Set());
  const [missingMode, setMissingMode] = useState<"out_of_stock" | "delete">("out_of_stock");
  const [errorMsg, setErrorMsg] = useState("");
  const [summary, setSummary] = useState<{ pricesUpdated: number; stockUpdated: number; newCreated: number; alreadyThere: number; missingHandled: number; warnings: Array<{ name: string; warnings: string[] }>; failed: Array<{ ref: string; error: string }> } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const a = getAdminAuth();
    setAuth(a);
    if (!a) { setLoading(false); return; }
    fetch("/api/admin/sync", { headers: { Authorization: a } })
      .then((r) => r.json())
      .then((d) => { if (d?.scan) {
        setScan(d.scan);
        setPickPrices(new Set(d.scan.priceChanges.map((c: PriceChange) => c.id)));
        setPickStock(new Set((d.scan.stockChanges || []).map((c: StockChange) => c.id)));
      } })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);

  /** Citeste un raspuns NDJSON linie cu linie si trimite fiecare eveniment mai departe. */
  const readStream = useCallback(async (res: Response, onEvent: (ev: Record<string, unknown>) => void) => {
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() || "";
      for (const line of lines) {
        if (!line.trim()) continue;
        try { onEvent(JSON.parse(line)); } catch {}
      }
    }
  }, []);

  const scanNow = async () => {
    setPhase("scanning"); setErrorMsg(""); setSummary(null);
    setProgress({ done: 0, total: 0, label: "Se citeste catalogul furnizorului..." });
    const ac = new AbortController(); abortRef.current = ac;
    try {
      const res = await fetch("/api/admin/sync", { method: "POST", headers: { Authorization: auth }, signal: ac.signal });
      if (!res.ok || !res.body) {
        const d = await res.json().catch(() => ({}));
        setErrorMsg(d?.error || `Eroare ${res.status}`); setPhase("idle"); return;
      }
      await readStream(res, (ev) => {
        if (ev.type === "progress") setProgress({ done: Number(ev.pages) || 0, total: 0, label: String(ev.label || "") });
        else if (ev.type === "error") { setErrorMsg(String(ev.error)); setPhase("idle"); }
        else if (ev.type === "done") {
          const r = ev as unknown as ScanResult;
          setScan(r);
          setPickPrices(new Set(r.priceChanges.map((c) => c.id)));
          setPickStock(new Set((r.stockChanges || []).map((c) => c.id)));
          setPickNew(new Set()); setPickMissing(new Set());
          setTab(r.priceChanges.length ? "prices" : r.newProducts.length ? "new" : "missing");
          setPhase("idle");
        }
      });
    } catch (e) {
      if ((e as Error).name !== "AbortError") { setErrorMsg(String(e)); setPhase("idle"); }
    }
  };

  const apply = async () => {
    if (!scan) return;
    setPhase("applying"); setErrorMsg(""); setSummary(null);
    setProgress({ done: 0, total: 0, label: "" });
    try {
      const res = await fetch("/api/admin/sync/apply", {
        method: "POST",
        headers: { Authorization: auth, "Content-Type": "application/json" },
        body: JSON.stringify({
          prices: scan.priceChanges.filter((c) => pickPrices.has(c.id)),
          stock: (scan.stockChanges || []).filter((c) => pickStock.has(c.id)),
          newProducts: scan.newProducts.filter((n) => pickNew.has(n.sku)),
          missing: scan.missingProducts.filter((m) => pickMissing.has(m.id)),
          missingMode,
        }),
      });
      if (!res.ok || !res.body) {
        const d = await res.json().catch(() => ({}));
        setErrorMsg(d?.error || `Eroare ${res.status}`); setPhase("idle"); return;
      }
      await readStream(res, (ev) => {
        if (ev.type === "start") setProgress({ done: 0, total: Number(ev.total) || 0, label: "" });
        else if (ev.type === "progress") setProgress({ done: Number(ev.done) || 0, total: Number(ev.total) || 0, label: `${ev.stage}: ${ev.label}` });
        else if (ev.type === "error") { setErrorMsg(String(ev.error)); setPhase("idle"); }
        else if (ev.type === "done") {
          setSummary(ev as never);
          setPhase("idle");
          // Ce s-a aplicat nu mai e o diferenta: scoatem randurile din scan.
          setScan((prev) => prev && ({
            ...prev,
            priceChanges: prev.priceChanges.filter((c) => !pickPrices.has(c.id)),
            stockChanges: (prev.stockChanges || []).filter((c) => !pickStock.has(c.id)),
            newProducts: prev.newProducts.filter((n) => !pickNew.has(n.sku)),
            missingProducts: missingMode === "delete"
              ? prev.missingProducts.filter((m) => !pickMissing.has(m.id))
              : prev.missingProducts.map((m) => (pickMissing.has(m.id) ? { ...m, alreadyOut: true } : m)),
          }));
          setPickPrices(new Set()); setPickStock(new Set()); setPickNew(new Set()); setPickMissing(new Set());
        }
      });
    } catch (e) { setErrorMsg(String(e)); setPhase("idle"); }
  };

  if (loading) return <div className="admin-wrap"><p className="admin-loading">Se incarca...</p></div>;
  if (!auth) return <div className="admin-wrap"><p className="admin-loading">Intra intai in <a href="/admin">panoul de administrare</a>.</p></div>;

  const busy = phase !== "idle";
  const picked = pickPrices.size + pickStock.size + pickNew.size + pickMissing.size;
  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="admin-wrap">
      <div className="sync-head">
        <div>
          <a href="/admin" className="admin-inline-btn" style={{ textDecoration: "none", padding: "4px 10px" }}>&larr; Admin</a>
          <h2 style={{ margin: "10px 0 2px" }}>Sincronizare catalog cu mysnep</h2>
          <p className="price-sync__lead" style={{ margin: 0 }}>
            {scan
              ? <>Ultima scanare: <strong>{new Date(scan.scannedAt).toLocaleString("ro-RO")}</strong> &middot;{" "}
                  {scan.supplierTotal} produse la furnizor, {scan.ourTotal} la noi, {scan.unchanged} cu pretul neschimbat</>
              : "Nu s-a facut nicio scanare inca."}
          </p>
        </div>
        <button className="admin-add-btn" onClick={scanNow} disabled={busy}>
          {phase === "scanning" ? "Se scaneaza..." : scan ? "Scaneaza din nou" : "Porneste scanarea"}
        </button>
      </div>

      {errorMsg && <div className="price-sync__error">{errorMsg}</div>}

      {scan?.partial && (
        <div className="price-sync__error">
          Scanare incompleta: {scan.failures?.length} pagini de listare nu au raspuns
          ({scan.failures?.slice(0, 3).join(", ")}{(scan.failures?.length || 0) > 3 ? ", ..." : ""}).
          Preturile, stocul si produsele noi sunt corecte, dar lista &bdquo;nu mai sunt la ei&rdquo;
          nu se calculeaza &mdash; ar aparea acolo produse pe care doar nu am apucat sa le citim.
          Da o scanare noua.
        </div>
      )}

      {busy && (
        <>
          <div className="price-sync__bar">
            <div className={`price-sync__fill ${progress.total ? "" : "price-sync__fill--indet"}`}
              style={progress.total ? { width: `${pct}%` } : undefined} />
          </div>
          <div className="price-sync__status">
            {phase === "scanning"
              ? <><strong>{progress.done}</strong> pagini citite &mdash; {progress.label}</>
              : <><strong>{progress.done}/{progress.total}</strong> ({pct}%) &mdash; {progress.label}</>}
          </div>
        </>
      )}

      {summary && (
        <div className="sync-summary">
          <strong>{summary.pricesUpdated}</strong> preturi &middot;{" "}
          <strong>{summary.stockUpdated}</strong> stocuri corectate &middot;{" "}
          <strong>{summary.newCreated}</strong> produse importate &middot;{" "}
          <strong>{summary.missingHandled}</strong> {missingMode === "delete" ? "sterse" : "marcate indisponibil"}
          {summary.alreadyThere > 0 && <> &middot; <strong>{summary.alreadyThere}</strong> erau deja in catalog</>}
          {summary.newCreated > 0 && (
            <> &middot; <a href="/admin?tab=produse">vezi produsele importate</a></>
          )}
          {summary.warnings.length > 0 && (
            <details style={{ marginTop: 6 }}>
              <summary>{summary.warnings.length} produse importate cu lipsuri</summary>
              {summary.warnings.map((w) => (
                <div key={w.name} className="price-sync__errrow">{w.name} — {w.warnings.join(", ")}</div>
              ))}
            </details>
          )}
          {summary.failed.length > 0 && (
            <details style={{ marginTop: 6 }}>
              <summary style={{ color: "#dc2626" }}>{summary.failed.length} esuate</summary>
              {summary.failed.map((f, i) => (
                <div key={i} className="price-sync__errrow">{f.ref} — {REASONS[f.error] || f.error}</div>
              ))}
            </details>
          )}
        </div>
      )}

      {scan && (
        <>
          <div className="price-sync__tabs">
            <button className={`price-sync__tab ${tab === "prices" ? "is-active" : ""}`} onClick={() => setTab("prices")}>
              Preturi ({scan.priceChanges.length})
            </button>
            <button className={`price-sync__tab ${tab === "stock" ? "is-active" : ""}`} onClick={() => setTab("stock")}>
              Stoc ({(scan.stockChanges || []).length})
            </button>
            <button className={`price-sync__tab ${tab === "new" ? "is-active" : ""}`} onClick={() => setTab("new")}>
              Noi la furnizor ({scan.newProducts.length})
            </button>
            <button className={`price-sync__tab ${tab === "missing" ? "is-active" : ""}`} onClick={() => setTab("missing")}>
              Nu mai sunt la ei ({scan.missingProducts.length})
            </button>
          </div>

          {tab === "prices" && (
            scan.priceChanges.length === 0 ? <p className="price-sync__lead">Toate preturile sunt la zi.</p> : (
              <>
                <button className="price-sync__all" onClick={() => setPickPrices(pickPrices.size === scan.priceChanges.length ? new Set() : new Set(scan.priceChanges.map((c) => c.id)))}>
                  {pickPrices.size === scan.priceChanges.length ? "Deselecteaza tot" : "Selecteaza tot"}
                </button>
                <div className="price-sync__list">
                  {scan.priceChanges.map((c) => (
                    <label key={c.id} className="price-sync__row">
                      <input type="checkbox" checked={pickPrices.has(c.id)} onChange={() => setPickPrices(toggle(pickPrices, c.id))} />
                      <span className="price-sync__name">{c.name} &middot; {c.sku}</span>
                      <span className="price-sync__old">{c.oldDisplay}</span>
                      <span className="price-sync__arrow">&rarr;</span>
                      <span className={`price-sync__new ${c.newDisplay > c.oldDisplay ? "is-up" : "is-down"}`}>{c.newDisplay} RON</span>
                    </label>
                  ))}
                </div>
              </>
            )
          )}

          {tab === "stock" && (
            (scan.stockChanges || []).length === 0 ? <p className="price-sync__lead">Stocul e la fel ca la furnizor.</p> : (
              <>
                <p className="price-sync__lead">
                  Disponibilitatea din listarea furnizorului, comparata cu a noastra. Se schimba doar
                  produsele pentru care furnizorul spune clar; unde nu scrie nimic, stocul ramane cum e.
                </p>
                <button className="price-sync__all" onClick={() => setPickStock(pickStock.size === scan.stockChanges.length ? new Set() : new Set(scan.stockChanges.map((c) => c.id)))}>
                  {pickStock.size === scan.stockChanges.length ? "Deselecteaza tot" : "Selecteaza tot"}
                </button>
                <div className="price-sync__list">
                  {scan.stockChanges.map((c) => (
                    <label key={c.id} className="price-sync__row">
                      <input type="checkbox" checked={pickStock.has(c.id)} onChange={() => setPickStock(toggle(pickStock, c.id))} />
                      <span className="price-sync__name">{c.name} &middot; {c.sku}</span>
                      <span className="price-sync__old">{c.from === "out_of_stock" ? "indisponibil" : "in stoc"}</span>
                      <span className="price-sync__arrow">&rarr;</span>
                      <span className={`price-sync__new ${c.to === "in_stock" ? "is-down" : "is-up"}`}>
                        {c.to === "in_stock" ? "in stoc" : "indisponibil"}
                      </span>
                    </label>
                  ))}
                </div>
              </>
            )
          )}

          {tab === "new" && (
            scan.newProducts.length === 0 ? <p className="price-sync__lead">Nu au produse noi fata de noi.</p> : (
              <>
                <p className="price-sync__lead">
                  La import se preiau de pe mysnep descrierea, ingredientele, modul de utilizare, avertismentele,
                  certificarile, cantitatea si punctele; imaginea si fisa PDF se urca pe R2, iar meta se completeaza
                  din sablon. Numele deschide pagina produsului la furnizor.
                </p>
                <button className="price-sync__all" onClick={() => setPickNew(pickNew.size === scan.newProducts.length ? new Set() : new Set(scan.newProducts.map((n) => n.sku)))}>
                  {pickNew.size === scan.newProducts.length ? "Deselecteaza tot" : "Selecteaza tot"}
                </button>
                <div className="price-sync__list">
                  {scan.newProducts.map((n) => (
                    <label key={n.sku} className="price-sync__row">
                      <input type="checkbox" checked={pickNew.has(n.sku)} onChange={() => setPickNew(toggleStr(pickNew, n.sku))} />
                      <span className="price-sync__name">
                        <a href={n.url} target="_blank" rel="noopener" title="Deschide la furnizor">{n.name}</a> &middot; {n.sku}
                      </span>
                      <span className="price-sync__cat">{n.category || "fara categorie"}</span>
                      <span className="price-sync__new">{n.price != null ? `${Math.ceil(n.price)} RON` : "—"}</span>
                    </label>
                  ))}
                </div>
              </>
            )
          )}

          {tab === "missing" && (
            scan.missingProducts.length === 0 ? <p className="price-sync__lead">Toate produsele noastre exista si la furnizor.</p> : (
              <>
                <p className="price-sync__lead">
                  Nu apar in listarile furnizorului. Numele deschide pagina de pe site-ul nostru, ca sa vezi ce pierzi.
                  Cele marcate &bdquo;probabil redenumit&rdquo; au primit alt cod la furnizor (4000236K &rarr; 4000236)
                  si apar si in tabul &bdquo;Noi la furnizor&rdquo; &mdash; pe alea nu le sterge.
                </p>
                <div className="price-sync__mode">
                  <label>
                    <input type="radio" checked={missingMode === "out_of_stock"} onChange={() => setMissingMode("out_of_stock")} />
                    Marcheaza indisponibil (pastreaza pagina si link-urile)
                  </label>
                  <label>
                    <input type="radio" checked={missingMode === "delete"} onChange={() => setMissingMode("delete")} />
                    Sterge definitiv
                  </label>
                </div>
                <button className="price-sync__all" onClick={() => setPickMissing(pickMissing.size === scan.missingProducts.length ? new Set() : new Set(scan.missingProducts.map((m) => m.id)))}>
                  {pickMissing.size === scan.missingProducts.length ? "Deselecteaza tot" : "Selecteaza tot"}
                </button>
                <div className="price-sync__list">
                  {scan.missingProducts.map((m) => (
                    <label key={m.id} className="price-sync__row">
                      <input type="checkbox" checked={pickMissing.has(m.id)} onChange={() => setPickMissing(toggle(pickMissing, m.id))} />
                      <span className="price-sync__name">
                        {m.slug && m.category
                          ? <a href={`/produse/${m.category}/${m.slug}`} target="_blank" rel="noopener" title="Deschide pe site-ul nostru">{m.name}</a>
                          : m.name}
                        {" "}&middot; {m.sku}
                      </span>
                      <span className="price-sync__cat">
                        {m.renamedTo ? `probabil redenumit in ${m.renamedTo}` : m.alreadyOut ? "deja indisponibil" : ""}
                      </span>
                      <span className="price-sync__old">{m.price != null ? `${Math.ceil(Number(m.price))} RON` : "—"}</span>
                    </label>
                  ))}
                </div>
              </>
            )
          )}

          <div className="price-sync__actions">
            <button className="admin-add-btn" onClick={apply} disabled={picked === 0 || busy}>
              Aplica {picked > 0 ? `(${picked})` : ""}
            </button>
            <span className="price-sync__picked">
              {pickPrices.size} preturi &middot; {pickStock.size} stoc &middot; {pickNew.size} de importat &middot; {pickMissing.size} {missingMode === "delete" ? "de sters" : "indisponibile"}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

function toggle(set: Set<number>, key: number): Set<number> {
  const next = new Set(set);
  if (next.has(key)) next.delete(key); else next.add(key);
  return next;
}
function toggleStr(set: Set<string>, key: string): Set<string> {
  const next = new Set(set);
  if (next.has(key)) next.delete(key); else next.add(key);
  return next;
}
