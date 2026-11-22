// Builds the app's static data from the raw IGN/MapGenie export.
//   data/raw/leonida-ign-data.json  -> src/data/map-data.json (categories + markers in poster px)
//   data/raw/atlas@2x.{png,json}    -> public/icons/atlas@2x.png + src/data/icons.json (only used icons)
// Coordinates: MapGenie lng/lat -> full-res poster pixels via the affine fit in data/calib.json.
import fs from "node:fs/promises";

const raw = JSON.parse(await fs.readFile("data/raw/leonida-ign-data.json", "utf8"));
const calib = JSON.parse(await fs.readFile("data/calib.json", "utf8"));
const atlas = JSON.parse(await fs.readFile("data/raw/atlas@2x.json", "utf8"));

const toPx = (lng, lat) => [
  +(calib.x[0] * lng + calib.x[1] * lat + calib.x[2]).toFixed(1),
  +(calib.y[0] * lng + calib.y[1] * lat + calib.y[2]).toFixed(1),
];

const sections = raw.sections.map((s) => ({ id: s.sectionSlug, name: s.sectionName }));
const parents = raw.types.filter((t) => !t.parent);
const groups = parents.map((g) => ({ id: g.slug, name: g.name, section: g.section }));
const categories = raw.types
  .filter((t) => t.parent)
  .map((t) => ({ id: t.slug, name: t.name, group: t.parent, icon: t.icon }));

const markers = raw.markers.map((m) => {
  const [x, y] = toPx(m.lng, m.lat);
  // [id, categoryId, x, y, name, iconKey-if-different-from-category]
  const cat = categories.find((c) => c.id === m.type);
  const row = [m.id, m.type, x, y, m.name];
  if (cat && m.icon && m.icon !== cat.icon) row.push(m.icon);
  return row;
});

const used = new Set([...categories.map((c) => c.icon), ...markers.map((m) => m[5]).filter(Boolean)]);
const icons = Object.fromEntries(
  [...used].filter((k) => atlas[k]).map((k) => [k, [atlas[k].x, atlas[k].y, atlas[k].width, atlas[k].height]]),
);

await fs.mkdir("src/data", { recursive: true });
await fs.mkdir("public/icons", { recursive: true });
await fs.copyFile("data/raw/atlas@2x.png", "public/icons/atlas@2x.png");
await fs.writeFile("src/data/icons.json", JSON.stringify({ sheet: [1344, 1296], ratio: 2, icons }));
await fs.writeFile("src/data/map-data.json", JSON.stringify({ sections, groups, categories, markers }));
console.log(`sections ${sections.length}, groups ${groups.length}, categories ${categories.length}, markers ${markers.length}, icons ${Object.keys(icons).length}`);
