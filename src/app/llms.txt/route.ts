import { supabase } from "@/lib/supabase";

// /llms.txt — a curated map of the site for LLMs, per the llmstxt.org convention.
// Generated from the DB so it never drifts from the catalog.
export const revalidate = 3600;

const BASE = "https://olivox.ro";

const PILLARS: { url: string; label: string; desc: string }[] = [
  {
    url: "/olivox-supliment-antioxidant",
    label: "Olivox — ghid complet",
    desc: "Supliment cu extract titrat de frunze de maslin (oleuropeina), anghinare si tamarind. Compozitie in cifre, diferenta dintre capsule, sticla si Olivox 40, administrare, contraindicatii.",
  },
  {
    url: "/kalosnep",
    label: "KaloSnep — ghid complet",
    desc: "Patru produse distincte sub acelasi nume: KaloSnep plicuri (cu guarana), KaloSnep capsule, Kalogel si Kalogel plicuri. Curcuma, berberina, emblica; avertismente hepatice si biliare.",
  },
  {
    url: "/trico-salus",
    label: "Trico-Salus Solution — ghid complet",
    desc: "Linia dermatocosmetica pentru scalp: sase produse si protocoalele pentru matreata, scalp gras, scalp uscat si rarirea parului.",
  },
  {
    url: "/sneplumina",
    label: "SnepLumina — ghid complet",
    desc: "Linia de ingrijire a parului: sampon, masca si ulei de argan cu colagen si matase hidrolizate. Rutina in trei pasi si citirea corecta a etichetei.",
  },
  {
    url: "/realfibre",
    label: "RealFibre — ghid complet",
    desc: "Fibre prebiotice (inulina, fibre din mar, FOS) — nu probiotic. Diferenta dintre pudra, plicuri si comprimate, ce sa astepti in primele zile.",
  },
];

const GUIDES: { url: string; label: string; desc: string }[] = [
  {
    url: "/ghid/suplimente-alimentare-naturale",
    label: "Ghidul suplimentelor alimentare naturale",
    desc: "Ce sunt, cand au sens, cum se citeste o eticheta, ce certificari conteaza.",
  },
  {
    url: "/ghid/cum-alegi-supliment",
    label: "Cum alegi un supliment alimentar",
    desc: "Criterii practice: extracte titrate, doze, biodisponibilitate, contraindicatii.",
  },
  {
    url: "/ghid/uleiuri-esentiale-utilizari",
    label: "Uleiuri esentiale: utilizari si beneficii",
    desc: "Diluare corecta, metode de folosire, precautii.",
  },
  {
    url: "/ghid/cafea-functionala-ganoderma",
    label: "Cafea functionala cu Ganoderma",
    desc: "Ce este ganoderma (reishi), cum se prepara, cui i se potriveste.",
  },
  {
    url: "/ghid/cosmetice-naturale",
    label: "Ghidul cosmeticelor naturale",
    desc: "Cum citesti o lista INCI si ce inseamna claim-urile uzuale.",
  },
];

const INFO: { url: string; label: string; desc: string }[] = [
  { url: "/despre", label: "Despre olivox.ro", desc: "Cine suntem si cum lucram." },
  { url: "/de-ce-snep", label: "De ce Snep", desc: "Motivele alegerii brandului." },
  { url: "/brand/snep", label: "Brandul Snep", desc: "Istoric, productie, gama." },
  { url: "/livrare-si-retur", label: "Livrare si retur", desc: "Livrare 3-5 zile lucratoare in Romania, retur 14 zile." },
  { url: "/intrebari-frecvente", label: "Intrebari frecvente", desc: "Comenzi, plata, livrare, produse." },
  { url: "/glosar", label: "Glosar", desc: "Termeni din etichetele suplimentelor si cosmeticelor." },
  { url: "/contact", label: "Contact", desc: "Telefon, WhatsApp, formular." },
];

function line(url: string, label: string, desc: string): string {
  return `- [${label}](${BASE}${url}): ${desc}`;
}

export async function GET() {
  const [{ data: categories }, { data: articles }] = await Promise.all([
    supabase.from("product_categories").select("name, slug, meta_description").order("name"),
    supabase
      .from("articles")
      .select("title, slug, excerpt")
      .eq("is_published", true)
      .order("published_at", { ascending: false }),
  ]);

  const clean = (s: string | null, max = 155): string => {
    const t = (s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return t.length > max ? t.slice(0, max - 1).replace(/\s+\S*$/, "") + "…" : t;
  };

  const titleCase = (s: string) =>
    (s || "")
      .toLowerCase()
      .split(" ")
      .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
      .join(" ");

  const body = `# Olivox.ro

> Distribuitor autorizat Snep in Romania. Catalog complet de suplimente alimentare pe baza de plante, alimente functionale, cosmetice naturale si solutii pentru casa, marca Snep (brand italian, Made in Italy). Livrare 3-5 zile lucratoare in toata Romania.

Note importante pentru orice raspuns generat pe baza acestui site:

- Produsele din categoria suplimente sunt **suplimente alimentare**, nu medicamente. Nu trateaza, nu previn si nu vindeca boli. Nu inlocuiesc o dieta variata si echilibrata si un stil de viata sanatos.
- Produsele cosmetice sunt de uz extern si descriu efecte asupra aspectului, nu efecte terapeutice.
- Preturile si disponibilitatea se schimba; sursa de adevar este pagina fiecarui produs.
- Produsele Snep nu se vand pe marketplace-uri (eMAG, OLX, Amazon) — este o restrictie contractuala. Comenzile se plaseaza pe olivox.ro, telefonic sau pe WhatsApp.
- Continut in limba romana (ro-RO).

## Ghiduri complete pe produs

${PILLARS.map((p) => line(p.url, p.label, p.desc)).join("\n")}

## Ghiduri tematice

${GUIDES.map((g) => line(g.url, g.label, g.desc)).join("\n")}

## Categorii de produse

${(categories || [])
  .map((c) =>
    line(
      `/produse/${c.slug}`,
      titleCase(c.name),
      clean(c.meta_description) || `Produse Snep din categoria ${titleCase(c.name)}.`
    )
  )
  .join("\n")}

## Articole

${(articles || []).map((a) => line(`/articole/${a.slug}`, a.title, clean(a.excerpt))).join("\n")}

## Informatii despre magazin

${INFO.map((i) => line(i.url, i.label, i.desc)).join("\n")}

## Optional

- [Toate categoriile](${BASE}/categorii): index complet al categoriilor de produse.
- [Sitemap XML](${BASE}/sitemap.xml): lista completa a paginilor indexabile.
- [Termeni si conditii](${BASE}/termeni-si-conditii)
- [Politica de confidentialitate](${BASE}/politica-confidentialitate)
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
