import { supabase } from "./supabase";

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

  if (error) throw error;
  return data;
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
