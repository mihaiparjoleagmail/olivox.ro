-- Run in Supabase SQL Editor (Project: olivox)
-- Adauga pe comanda data nasterii si codul postal, ambele obligatorii in
-- formularul de comanda (vezi OrderForm.tsx / api/orders).
--
-- birth_date e text, nu date, pentru ca se salveaza exact in formatul cerut
-- de client: dd.mm.yyyy. Validarea formatului se face in /api/orders.
--
-- Pana la rularea acestui script, createOrder (src/lib/db.ts) salveaza
-- comanda fara coloanele noi — nu se pierd comenzi, dar datele nu ajung in
-- baza si nu apar in admin.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS birth_date text NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS postal_code text NOT NULL DEFAULT '';
