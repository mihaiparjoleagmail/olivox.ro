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
  created_at: string;
}

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
}): Promise<Order> {
  const { data, error } = await supabase
    .from("orders")
    .insert({ ...order, status: "in procesare" })
    .select()
    .single();

  if (!error) return data;

  // Migrarea scripts/sql/add-shipping-cost.sql nu a fost inca rulata: salvam
  // comanda fara coloana noua, ca sa nu pierdem comenzi din cauza schemei.
  const missingColumn = /shipping_cost/i.test(error.message || "") || error.code === "PGRST204" || error.code === "42703";
  if (missingColumn && order.shipping_cost != null) {
    console.error("orders.shipping_cost lipseste — ruleaza scripts/sql/add-shipping-cost.sql");
    const { shipping_cost: _omit, ...withoutShipping } = order;
    void _omit;
    const retry = await supabase
      .from("orders")
      .insert({ ...withoutShipping, status: "in procesare" })
      .select()
      .single();
    if (retry.error) throw retry.error;
    return retry.data;
  }

  throw error;
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
