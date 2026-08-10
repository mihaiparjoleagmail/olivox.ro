-- Run in Supabase SQL Editor (Project: olivox)
-- Adauga transportul salvat pe comanda. order_value ramane totalul platit de
-- client (produse + transport); shipping_cost e partea de transport, folosita
-- de factura FGO ca sa emita linie separata.
--
-- Pana la rularea acestui script, /api/orders salveaza comanda fara coloana
-- (vezi createOrder in src/lib/db.ts) — nu se pierd comenzi, dar factura nu
-- poate separa transportul.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_cost numeric NOT NULL DEFAULT 0;
