"use client";

/**
 * Open the marker on MapGenie (the engine behind IGN's map) — it supports deep links by location id,
 * so the page opens right on that point with its photos/description. Only for imported markers.
 */
export function openOnMapGenie(markerId: string) {
  const url = `https://mapgenie.io/grand-theft-auto-6/maps/leonida?locationIds=${encodeURIComponent(markerId)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
