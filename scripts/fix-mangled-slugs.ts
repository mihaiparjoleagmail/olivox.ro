/**
 * Repara slug-urile stricate la import si lasa in urma redirecturi 301.
 *
 * Slugifierul vechi a facut doua feluri de stricaciuni:
 *
 * 1. **Litere cu diacritice sterse in loc de transliterate.** „față" a devenit
 *    „fa", „duș" a devenit „du", „bețișoare" a devenit „beisoare", „brățări" a
 *    devenit „brri". Rezulta URL-uri pe care nu le poti citi la telefon.
 * 2. **Ramasite de entitati HTML.** „Thè" a devenit „thegrave", „Morinda Più" a
 *    devenit „morinda-piugrave", „Olivò" a devenit „olivograve".
 *
 * Unele dintre ele sunt deja clasate in Google (`crem-pentru-fa-de-zi-
 * biostimulatoare` statea pe pozitia 7,9 cu 23 de afisari in 28 de zile), deci
 * nu se pot doar redenumi — au nevoie de 301 din vechi in nou. Scriptul scrie
 * harta in `src/lib/slug-redirects.ts`, de unde o citeste middleware-ul.
 *
 * NU atinge diferentele cosmetice: `liplift-30` e mai curat decat `liplift-3-0`,
 * deci ramane cum e. Se schimba doar ce e efectiv stricat.
 *
 * Usage:
 *   npx tsx scripts/fix-mangled-slugs.ts           # dry-run
 *   npx tsx scripts/fix-mangled-slugs.ts --apply   # scrie in DB + genereaza harta
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync, writeFileSync } from "fs";
import { resolve } from "path";

const envFile = resolve(process.cwd(), ".env.local");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

const APPLY = process.argv.includes("--apply");
const REDIRECTS_FILE = "src/lib/slug-redirects.ts";

/** Slugifier corect: transliterare, nu stergere. */
function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[    ]/g, " ")
    .replace(/[șş]/g, "s")
    .replace(/[țţ]/g, "t")
    .replace(/[ăâ]/g, "a")
    .replace(/î/g, "i")
    .replace(/[èéêë]/g, "e")
    .replace(/[ùú]/g, "u")
    .replace(/[ìí]/g, "i")
    .replace(/[òó]/g, "o")
    .replace(/[àá]/g, "a")
    .replace(/&amp;/g, "and")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}

/** Ramasite de entitati HTML lipite in slug. */
const ENTITY_REMNANT = /(grave|acute|circ|uml|tilde|cedil|ndash|nbsp|amp)/;

/**
 * Slug stricat = ori are ramasite de entitati, ori e mai scurt decat forma
 * corecta pentru ca s-au pierdut litere. Diferentele in care slug-ul actual e
 * la fel de lung sau mai lung (formatari de cifre, „3.0" -> „30") sunt
 * cosmetice si se lasa in pace.
 */
function isMangled(current: string, correct: string): boolean {
  if (current === correct) return false;
  if (ENTITY_REMNANT.test(current)) return true;
  const strip = (s: string) => s.replace(/-/g, "");
  return strip(correct).length > strip(current).length;
}

async function main() {
  const { data, error } = await supabase
    .from("products")
    .select("id, slug, name, category_slugs")
    .order("id");

  if (error) {
    console.error("Nu pot citi produsele:", error.message);
    process.exit(1);
  }

  const rows = data || [];
  const taken = new Set(rows.map((p) => p.slug));
  const changes: { id: number; from: string; to: string; name: string; cat: string }[] = [];

  for (const p of rows) {
    const correct = slugify(p.name);
    if (!correct || !isMangled(p.slug, correct)) continue;

    // Unicitate: daca slug-ul corect e deja luat de alt produs, se lasa cel vechi
    // si se raporteaza — un 301 spre pagina altui produs ar fi mai rau decat un
    // URL urat.
    if (taken.has(correct)) {
      console.log(`⚠ ${p.slug} -> ${correct} — deja folosit, se sare peste`);
      continue;
    }
    taken.delete(p.slug);
    taken.add(correct);
    changes.push({
      id: p.id,
      from: p.slug,
      to: correct,
      name: p.name,
      cat: (p.category_slugs || [])[0] || "",
    });
  }

  for (const c of changes) {
    console.log(`${c.from}\n  -> ${c.to}\n     (${c.name})`);
  }
  console.log(`\n${changes.length} slug-uri stricate din ${rows.length}`);

  if (!APPLY) {
    console.log("\nDry-run. Ruleaza cu --apply ca sa scrii in DB si sa generezi redirecturile.");
    return;
  }

  for (const c of changes) {
    const { error: upErr } = await supabase
      .from("products")
      .update({ slug: c.to })
      .eq("id", c.id);
    if (upErr) {
      console.error(`Esec pe ${c.from}:`, upErr.message);
      process.exit(1);
    }
  }

  // Harta se acumuleaza: daca se mai repara slug-uri pe viitor, redirecturile
  // vechi trebuie sa ramana in picioare.
  const existing: Record<string, string> = {};
  if (existsSync(REDIRECTS_FILE)) {
    const src = readFileSync(REDIRECTS_FILE, "utf8");
    for (const m of src.matchAll(/^\s*"([^"]+)":\s*"([^"]+)",$/gm)) {
      existing[m[1]] = m[2];
    }
  }
  // Un slug care era deja tinta unui redirect vechi se muta pe noua tinta, ca
  // sa nu ramana lanturi de redirect.
  for (const c of changes) {
    for (const [old, target] of Object.entries(existing)) {
      if (target === c.from) existing[old] = c.to;
    }
    existing[c.from] = c.to;
  }

  const entries = Object.entries(existing)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([from, to]) => `  "${from}": "${to}",`)
    .join("\n");

  writeFileSync(
    REDIRECTS_FILE,
    `/**
 * Slug-uri vechi -> slug-uri noi, pentru 301.
 *
 * Generat de \`scripts/fix-mangled-slugs.ts\`. Nu se editeaza de mana.
 *
 * Slug-urile stricate la import (diacritice sterse, ramasite de entitati HTML)
 * apucasera sa se claseze in Google, deci redenumirea singura ar fi rupt niste
 * pozitii deja castigate. Middleware-ul citeste harta si raspunde 301.
 */
export const SLUG_REDIRECTS: Record<string, string> = {
${entries}
};
`,
    "utf8"
  );

  console.log(`\nGata: ${changes.length} slug-uri schimbate, ${Object.keys(existing).length} redirecturi in ${REDIRECTS_FILE}.`);
}

main();
