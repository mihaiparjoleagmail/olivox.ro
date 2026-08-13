/**
 * Sesiunea de admin, pastrata intre taburi si intre reporniri de browser.
 *
 * Inainte se folosea `sessionStorage`, care e legat de un singur tab. Butonul
 * "Site" din admin deschide prima pagina cu `target="_blank" rel="noopener"`,
 * iar `noopener` porneste tabul nou cu sessionStorage gol — deci daca de acolo
 * intrai pe /admin, trebuia sa te loghezi din nou. Acum e `localStorage`, cu
 * termen de valabilitate, ca sa nu ramana logat la nesfarsit.
 */

const KEY = "admin_auth";
/** Cat tine o sesiune fara relogare. */
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

interface Stored {
  auth: string;
  exp: number;
}

/** Headerul Authorization salvat, sau "" daca nu exista ori a expirat. */
export function getAdminAuth(): string {
  if (typeof window === "undefined") return "";
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      // Formatul vechi era chiar headerul, nu JSON — il acceptam si il rescriem.
      if (!raw.startsWith("{")) {
        setAdminAuth(raw);
        return raw;
      }
      const parsed = JSON.parse(raw) as Stored;
      if (parsed?.auth && parsed.exp > Date.now()) return parsed.auth;
      localStorage.removeItem(KEY);
    }
    // Sesiuni ramase din varianta veche: le mutam, ca sa nu ceara relogare.
    const legacy = sessionStorage.getItem(KEY);
    if (legacy) {
      setAdminAuth(legacy);
      return legacy;
    }
  } catch {
    /* stocare indisponibila (private mode) — se cere logare */
  }
  return "";
}

export function setAdminAuth(auth: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ auth, exp: Date.now() + MAX_AGE_MS } satisfies Stored));
    // Tinut si aici, ca paginile deschise inainte de schimbare sa mearga.
    sessionStorage.setItem(KEY, auth);
  } catch {
    /* ignoram */
  }
}

export function clearAdminAuth(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY);
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignoram */
  }
}
