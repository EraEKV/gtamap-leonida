"use client";

const IGN_MAP_URL = "https://www.ign.com/maps/gta-6/leonida";

/** IGN has no per-marker deep links, so copy the name (to paste into their search) and open the map. */
export async function findOnIgn(name: string) {
  try {
    await navigator.clipboard.writeText(name);
  } catch {}
  window.open(IGN_MAP_URL, "_blank", "noopener,noreferrer");
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
