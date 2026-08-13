import { supabaseAdmin as supabase } from "./supabase-admin";

export interface Order {
  id: number;
  product_id?: number | null;
  product_name: string;
  product_slug?: string;
  quantity: number;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  address: string;
  observations: string;
  status: string;
  order_value?: number;
  /** Transportul inclus in order_value. */
  shipping_cost?: number;
  shipping_method?: string;
  locker_id?: string | null;
  order_source?: string;
  custom_field_values?: Record<string, unknown>;
  /** Data nasterii clientului, in format dd.mm.yyyy (text, exact cum e ceruta in formular). */
  birth_date?: string;
  postal_code?: string;
  created_at: string;
}

/**
 * Coloane adaugate prin migrari din scripts/sql/ care pot lipsi inca din baza.
 * Daca insertul pica pentru ca una lipseste, o scoatem si reincercam, ca sa nu
 * pierdem comanda din cauza schemei.
 */
const PENDING_MIGRATION_COLUMNS = ["shipping_cost", "birth_date", "postal_code"] as const;

const MIGRATION_HINT: Record<string, string> = {
  shipping_cost: "scripts/sql/add-shipping-cost.sql",
  birth_date: "scripts/sql/add-birthdate-postalcode.sql",
  postal_code: "scripts/sql/add-birthdate-postalcode.sql",
};

export async function createOrder(order: {
  product_id?: number | null;
  product_name: string;
  product_slug?: string;
  quantity?: number;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  address: string;
  observations: string;
  order_value?: number;
  shipping_cost?: number;
  shipping_method?: string;
  locker_id?: string | null;
  order_source?: string;
  custom_field_values?: Record<string, unknown>;
  birth_date?: string;
  postal_code?: string;
}): Promise<Order> {
  let payload: Record<string, unknown> = { ...order, status: "in procesare" };
  const dropped = new Set<string>();

  // Cate o reincercare pentru fiecare coloana care poate lipsi din schema.
  for (let attempt = 0; attempt <= PENDING_MIGRATION_COLUMNS.length; attempt++) {
    const { data, error } = await supabase
      .from("orders")
      .insert(payload)
      .select()
      .single();

    if (!error) return data;

    const schemaError = error.code === "PGRST204" || error.code === "42703";
    if (!schemaError) throw error;

    // Scoatem coloana numita in eroare; daca Supabase nu o numeste, scoatem
    // prima candidata ramasa si mai incercam o data.
    const named = PENDING_MIGRATION_COLUMNS.find(
      (c) => !dropped.has(c) && c in payload && new RegExp(c, "i").test(error.message || "")
    );
    const toDrop = named || PENDING_MIGRATION_COLUMNS.find((c) => !dropped.has(c) && c in payload);
    if (!toDrop) throw error;

    console.error(`orders.${toDrop} lipseste — ruleaza ${MIGRATION_HINT[toDrop]}`);
    dropped.add(toDrop);
    const { [toDrop]: _omit, ...rest } = payload;
    void _omit;
    payload = rest;
  }

  throw new Error("Comanda nu a putut fi salvata: schema orders nu se potriveste.");
}

export async function getOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function updateOrderStatus(id: number, status: string): Promise<Order> {
  const { data, error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteOrder(id: number): Promise<void> {
  const { error } = await supabase.from("orders").delete().eq("id", id);
  if (error) throw error;
}
