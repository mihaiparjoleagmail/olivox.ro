/**
 * Genereaza toate variantele de logo/favicon/og-image din olivox.png (sursa,
 * 1254x1254 RGBA, in radacina repo-ului).
 *
 *   node scripts/build-brand-assets.mjs
 *
 * Ce scrie:
 *   public/logo.png          512x512  transparent — folosit in JSON-LD (Organization.logo)
 *   public/logo.webp         256x256  transparent — marca din header/footer
 *   public/logo-64.webp       64x64   transparent — varianta 1x pentru header
 *   src/app/icon.png         512x512  favicon PNG (Next.js pune singur <link rel="icon">)
 *   src/app/apple-icon.png   180x180  fundal crem (iOS nu suporta transparenta)
 *   public/favicon.ico       16+32+48 ICO clasic, pentru crawlere si taburi vechi
 *   public/og-default.jpg   1200x630  og:image implicit (pagini care nu sunt produs/catalog)
 *
 * Rularea e idempotenta: se poate da oricand din nou peste fisierele existente.
 */
import sharp from "sharp";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = resolve(ROOT, "olivox.png");

// Paleta din globals.css, ca asset-urile sa nu iasa din tonul site-ului.
const CREAM = "#faf7ee";
const OLIVE = "#2f4a36";
const GOLD = "#b8873a";
const MUTED = "#6d7669";

const out = (p) => {
  const full = resolve(ROOT, p);
  mkdirSync(dirname(full), { recursive: true });
  return full;
};

/** Sursa fara marginea transparenta din jur, ca logo-ul sa umple cadrul. */
async function trimmedMark() {
  return sharp(SRC).trim({ threshold: 1 }).png().toBuffer();
}

// Sursa nu e patrata dupa trim (981x1050), asa ca peste tot se foloseste
// fit "contain" pe fundal transparent — "cover" (default in sharp) ar taia din
// frunza si din cercul de masline.
const FIT = { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } };

/** Marca redimensionata patrat, pastrand transparenta si proportiile. */
async function markAt(size, buf) {
  return sharp(buf).resize(size, size, FIT).png({ compressionLevel: 9 }).toBuffer();
}

/**
 * ICO scris de mana: header + cate o intrare per dimensiune, fiecare cu un PNG
 * inauntru (formatul accepta PNG de la Vista incoace, si e mult mai mic decat BMP).
 */
function buildIco(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type = icon
  header.writeUInt16LE(pngs.length, 4);

  const entries = [];
  let offset = 6 + pngs.length * 16;
  for (const { size, data } of pngs) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0); // latime (0 = 256)
    e.writeUInt8(size >= 256 ? 0 : size, 1); // inaltime
    e.writeUInt8(0, 2);  // fara paleta
    e.writeUInt8(0, 3);  // reserved
    e.writeUInt16LE(1, 4);  // color planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    entries.push(e);
    offset += data.length;
  }

  return Buffer.concat([header, ...entries, ...pngs.map((p) => p.data)]);
}

async function main() {
  const mark = await trimmedMark();
  const meta = await sharp(mark).metadata();
  console.log(`sursa dupa trim: ${meta.width}x${meta.height}`);

  // ---- logo transparent, pentru site si pentru schema.org ----
  await sharp(await markAt(512, mark)).toFile(out("public/logo.png"));
  await sharp(mark).resize(256, 256, FIT).webp({ quality: 90 }).toFile(out("public/logo.webp"));
  await sharp(mark).resize(64, 64, FIT).webp({ quality: 90 }).toFile(out("public/logo-64.webp"));

  // ---- favicon ----
  await sharp(await markAt(512, mark)).toFile(out("src/app/icon.png"));

  // iOS aseaza icoana pe un fundal opac oricum; punem crem, nu negru.
  await sharp({ create: { width: 180, height: 180, channels: 4, background: CREAM } })
    .composite([{ input: await markAt(156, mark), gravity: "center" }])
    .png()
    .toFile(out("src/app/apple-icon.png"));

  const icoSizes = [16, 32, 48];
  const icoPngs = [];
  for (const size of icoSizes) {
    icoPngs.push({ size, data: await markAt(size, mark) });
  }
  writeFileSync(out("public/favicon.ico"), buildIco(icoPngs));

  // ---- og:image implicit ----
  const W = 1200;
  const H = 630;
  const MARK = 320;
  const MARK_LEFT = 140;
  // Marginea din dreapta: retelele sociale mai si taie din margini, asa ca tot
  // textul se opreste inainte de 1120px.
  const TEXT_X = 530;

  // Textul e desenat ca SVG: Georgia exista pe Windows si e cel mai aproape de
  // Cormorant Garamond din site; restul cade pe serif-ul de sistem.
  const textSvg = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="${CREAM}"/>
  <rect x="0" y="${H - 10}" width="${W}" height="10" fill="${GOLD}"/>
  <text x="${TEXT_X}" y="268" font-family="Georgia, 'Times New Roman', serif" font-size="88" fill="${OLIVE}">olivox<tspan fill="${GOLD}">.ro</tspan></text>
  <text x="${TEXT_X + 3}" y="320" font-family="Segoe UI, Arial, sans-serif" font-size="25" letter-spacing="4" fill="${GOLD}">PRODUSE NATURISTE SNEP</text>
  <rect x="${TEXT_X + 3}" y="352" width="70" height="3" fill="${GOLD}"/>
  <text x="${TEXT_X + 3}" y="410" font-family="Segoe UI, Arial, sans-serif" font-size="28" fill="${MUTED}">Suplimente si cosmetice naturale Snep</text>
  <text x="${TEXT_X + 3}" y="450" font-family="Segoe UI, Arial, sans-serif" font-size="28" fill="${MUTED}">Distribuitor autorizat in Romania</text>
</svg>`);

  await sharp(textSvg)
    .composite([
      {
        input: await markAt(MARK, mark),
        left: MARK_LEFT,
        top: Math.round((H - MARK) / 2),
      },
    ])
    .jpeg({ quality: 88, chromaSubsampling: "4:4:4" })
    .toFile(out("public/og-default.jpg"));

  console.log("gata: logo.png, logo.webp, logo-64.webp, icon.png, apple-icon.png, favicon.ico, og-default.jpg");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
