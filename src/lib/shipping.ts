// Reguli de transport — modul pur (fara Supabase), ca sa poata fi importat si
// din componente client, nu doar din cod de server.

/** O plaja de transport: de la ce valoare a produselor se aplica si cat costa. */
export interface ShippingTier {
  /** Valoarea minima a produselor (fara transport) de la care se aplica plaja. */
  minValue: number;
  /** Costul transportului pentru plaja. 0 = gratuit. */
  cost: number;
}

/**
 * Curata plajele venite din admin: pastreaza doar numere valide, sorteaza
 * crescator dupa minValue si elimina duplicatele de prag. Lista goala e valida
 * (inseamna "foloseste shippingCost pentru orice comanda").
 */
export function normalizeTiers(raw: unknown): ShippingTier[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<number>();
  return raw
    .map((t) => ({
      minValue: Number((t as ShippingTier)?.minValue),
      cost: Number((t as ShippingTier)?.cost),
    }))
    .filter((t) => Number.isFinite(t.minValue) && t.minValue >= 0 && Number.isFinite(t.cost) && t.cost >= 0)
    .sort((a, b) => a.minValue - b.minValue)
    .filter((t) => (seen.has(t.minValue) ? false : (seen.add(t.minValue), true)));
}

/**
 * Costul transportului pentru o valoare a produselor (fara transport).
 * Se aplica plaja cu cel mai mare prag <= valoare; daca nu exista plaje sau
 * valoarea e sub primul prag, se foloseste shippingCost.
 */
export function resolveShippingCost(
  productsValue: number,
  config: { shippingCost?: number; shippingTiers?: ShippingTier[] }
): number {
  const tiers = normalizeTiers(config.shippingTiers);
  const value = Number(productsValue) || 0;
  let cost = Number(config.shippingCost) || 0;
  for (const tier of tiers) {
    if (value >= tier.minValue) cost = tier.cost;
    else break;
  }
  return cost;
}

/** Text scurt pentru pagini publice: "60 lei sub 150 lei, 30 lei peste". */
export function describeTiers(tiers: ShippingTier[], fallback: number): string {
  const list = normalizeTiers(tiers);
  if (list.length === 0) return fallback > 0 ? `${fallback} lei, tarif fix` : "gratuit";
  return list
    .map((t, i) => {
      const next = list[i + 1];
      const price = t.cost > 0 ? `${t.cost} lei` : "gratuit";
      if (next) {
        return t.minValue > 0
          ? `${price} pentru comenzi de la ${t.minValue} la ${next.minValue} lei`
          : `${price} pentru comenzi sub ${next.minValue} lei`;
      }
      if (t.minValue === 0) return `${price} pentru orice comanda`;
      return `${price} pentru comenzi de la ${t.minValue} lei in sus`;
    })
    .join(", ");
}
