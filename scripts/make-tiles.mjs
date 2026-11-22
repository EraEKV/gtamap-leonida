// Cuts the Rockstar poster into a Leaflet tile pyramid: public/tiles/{z}/{x}/{y}.webp
// Zoom MAX_Z = native resolution (1 image px = 1 map px). Lower zooms halve each step.
// Usage: node scripts/make-tiles.mjs [source.jpg]
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";

const SRC = process.argv[2] ?? "source/Leonida_Map_Poster_Printable.jpg";
const OUT = "public/tiles";
const TILE = 256;
const MAX_Z = 5;

sharp.cache(false);
const base = sharp(SRC, { limitInputPixels: false });
const { width, height } = await base.metadata();
console.log(`source ${width}x${height}`);
await fs.rm(OUT, { recursive: true, force: true });

let total = 0;
for (let z = MAX_Z; z >= 0; z--) {
  const scale = 2 ** (z - MAX_Z);
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  const level = await sharp(SRC, { limitInputPixels: false })
    .resize(w, h, { kernel: "lanczos3" })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const cols = Math.ceil(w / TILE);
  const rows = Math.ceil(h / TILE);
  for (let x = 0; x < cols; x++) {
    await fs.mkdir(path.join(OUT, String(z), String(x)), { recursive: true });
    for (let y = 0; y < rows; y++) {
      const left = x * TILE;
      const top = y * TILE;
      const tw = Math.min(TILE, w - left);
      const th = Math.min(TILE, h - top);
      // edge tiles are padded with transparency so nothing shows past the poster edge
      await sharp(level.data, { raw: level.info })
        .extract({ left, top, width: tw, height: th })
        .ensureAlpha()
        .extend({ right: TILE - tw, bottom: TILE - th, background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .webp({ quality: 78, effort: 5 })
        .toFile(path.join(OUT, String(z), String(x), `${y}.webp`));
      total++;
    }
  }
  console.log(`z${z}: ${w}x${h} -> ${cols}x${rows} tiles`);
}
await fs.writeFile(
  path.join(OUT, "meta.json"),
  JSON.stringify({ width, height, tileSize: TILE, maxZoom: MAX_Z }, null, 1),
);
console.log(`done: ${total} tiles`);
