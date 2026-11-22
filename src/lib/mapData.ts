import type { CSSProperties } from "react";
import raw from "@/data/map-data.json";
import iconData from "@/data/icons.json";

export const POSTER = { width: 5775, height: 7900, maxZoom: 5, tileSize: 256 } as const;

export type Section = { id: string; name: string };
export type Group = { id: string; name: string; section: string };
export type Category = { id: string; name: string; group: string; icon: string };
export type Marker = {
  id: string;
  cat: string;
  x: number; // poster px (full-res)
  y: number;
  name: string;
  icon: string;
  custom?: boolean;
};

type RawRow = [string, string, number, number, string, string?];

export const sections: Section[] = raw.sections;
export const groups: Group[] = raw.groups;
export const categories: Category[] = raw.categories;
export const categoryById = new Map(categories.map((c) => [c.id, c]));
export const groupById = new Map(groups.map((g) => [g.id, g]));

export const baseMarkers: Marker[] = (raw.markers as RawRow[]).map(([id, cat, x, y, name, icon]) => ({
  id,
  cat,
  x,
  y,
  name,
  icon: icon ?? categoryById.get(cat)?.icon ?? "",
}));

export const categoriesByGroup = new Map<string, Category[]>();
for (const c of categories) {
  const list = categoriesByGroup.get(c.group) ?? [];
  list.push(c);
  categoriesByGroup.set(c.group, list);
}

/** Total markers per category (base data only). */
export const baseCountByCat = new Map<string, number>();
for (const m of baseMarkers) baseCountByCat.set(m.cat, (baseCountByCat.get(m.cat) ?? 0) + 1);

// ---- icon sprite ---------------------------------------------------------
const SHEET = iconData.sheet as [number, number];
const RATIO = iconData.ratio;
const ICONS = iconData.icons as unknown as Record<string, [number, number, number, number]>;

/** CSS for drawing an atlas icon at `size` css px. */
export function iconStyle(key: string, size: number): CSSProperties {
  const r = ICONS[key];
  if (!r) return { width: size, height: size };
  const [x, y, w] = r;
  const k = size / (w / RATIO);
  return {
    width: size,
    height: size,
    backgroundImage: "url(/icons/atlas@2x.png)",
    backgroundSize: `${(SHEET[0] / RATIO) * k}px ${(SHEET[1] / RATIO) * k}px`,
    backgroundPosition: `-${(x / RATIO) * k}px -${(y / RATIO) * k}px`,
  };
}

export function iconCss(key: string, size: number): string {
  const s = iconStyle(key, size);
  return `width:${s.width}px;height:${s.height}px;background-image:${s.backgroundImage ?? "none"};background-size:${s.backgroundSize ?? "auto"};background-position:${s.backgroundPosition ?? "0 0"}`;
}

// ---- poster grid (A–M rows, 1–9 cols as printed on the poster) ----------
const GRID = { x0: 197, x1: 5583, y0: 197, y1: 7702, cols: 9, rows: 13 };
export function gridRef(x: number, y: number): string | null {
  const c = Math.floor(((x - GRID.x0) / (GRID.x1 - GRID.x0)) * GRID.cols);
  const r = Math.floor(((y - GRID.y0) / (GRID.y1 - GRID.y0)) * GRID.rows);
  if (c < 0 || c >= GRID.cols || r < 0 || r >= GRID.rows) return null;
  return `${String.fromCharCode(65 + r)}${c + 1}`;
}

/** Group colour, used for low-zoom dots and accents. */
const GROUP_COLORS: Record<string, string> = {};
const PALETTE = ["#f472b6", "#60a5fa", "#34d399", "#fbbf24", "#a78bfa", "#f87171", "#22d3ee", "#fb923c", "#a3e635", "#e879f9", "#2dd4bf", "#facc15", "#818cf8"];
groups.forEach((g, i) => (GROUP_COLORS[g.id] = PALETTE[i % PALETTE.length]));
export const groupColor = (groupId: string) => GROUP_COLORS[groupId] ?? "#f472b6";
export const CUSTOM_COLOR = "#ff4fa3";
/** Pseudo-category id for user-added points without a category. */
export const CUSTOM_CAT = "custom";
