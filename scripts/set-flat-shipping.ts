/**
 * One-off: transport tarif fix 60 lei, fara plaje pe valoare.
 *
 * Usage:
 *   cd E:/olivox
 *   npx tsx scripts/set-flat-shipping.ts          # dry-run, arata diff-ul
 *   npx tsx scripts/set-flat-shipping.ts --apply  # scrie in settings.site_config
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const envFile = resolve(process.cwd(), ".env.local");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

const APPLY = process.argv.includes("--apply");

async function main() {
  const { data, error } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "site_config")
    .single();

  if (error) {
    console.error("Nu pot citi settings.site_config:", error.message);
    process.exit(1);
  }

  const current = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
  console.log("Inainte:", {
    shippingCost: current.shippingCost,
    shippingTiers: current.shippingTiers,
  });

  const next = { ...current, shippingCost: 60, shippingTiers: [] };
  console.log("Dupa:   ", { shippingCost: next.shippingCost, shippingTiers: next.shippingTiers });

  if (!APPLY) {
    console.log("\nDry-run. Ruleaza cu --apply ca sa salvezi.");
    return;
  }

  const { error: upErr } = await supabase
    .from("settings")
    .update({ value: next })
    .eq("key", "site_config");

  if (upErr) {
    console.error("Update esuat:", upErr.message);
    process.exit(1);
  }
  console.log("\nSalvat. Cache-ul site-ului expira in max 5 minute.");
}

main();
