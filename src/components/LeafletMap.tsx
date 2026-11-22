"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ASSET_BASE, CUSTOM_COLOR, POSTER, categoryById, groupColor, iconCss, type Marker } from "@/lib/mapData";

export type FlyTarget = { x: number; y: number; zoom?: number; key: number };

type Props = {
  markers: Marker[]; // already filtered for visibility
  done: Record<string, true>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  addMode: boolean;
  onAddAt: (x: number, y: number) => void;
  flyTo: FlyTarget | null;
};

const DOT_ZOOM = 3; // below this: canvas dots; at/above: icon markers
const iconSize = (z: number) => (z < 4 ? 22 : z < 5 ? 28 : 34);

export default function LeafletMap({ markers, done, selectedId, onSelect, addMode, onAddAt, flyTo }: Props) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const renderedRef = useRef(new Map<string, { layer: L.Layer; sig: string }>());
  const propsRef = useRef({ markers, done, selectedId, onSelect, addMode, onAddAt });
  const redrawRef = useRef<() => void>(() => {});

  useEffect(() => {
    propsRef.current = { markers, done, selectedId, onSelect, addMode, onAddAt };
  });

  // ---- create the map once ------------------------------------------------
  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const map = L.map(elRef.current, {
      crs: L.CRS.Simple,
      minZoom: 0,
      maxZoom: POSTER.maxZoom + 2,
      zoomSnap: 0.25,
      zoomDelta: 0.5,
      wheelPxPerZoomLevel: 90,
      attributionControl: false,
      zoomControl: false,
      preferCanvas: true,
    });
    const toLL = (x: number, y: number) => map.unproject([x, y], POSTER.maxZoom);
    const bounds = L.latLngBounds(toLL(0, POSTER.height), toLL(POSTER.width, 0));
    L.tileLayer(`${ASSET_BASE}/tiles/{z}/{x}/{y}.webp`, {
      tileSize: POSTER.tileSize,
      minZoom: 0,
      maxNativeZoom: POSTER.maxZoom,
      maxZoom: POSTER.maxZoom + 2,
      noWrap: true,
      bounds,
      keepBuffer: 4,
    }).addTo(map);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    map.setMaxBounds(bounds.pad(0.15));
    map.fitBounds(bounds);
    map.setMinZoom(Math.max(0, map.getZoom() - 0.5));

    const layer = L.layerGroup().addTo(map);
    layerRef.current = layer;
    mapRef.current = map;

    const redraw = () => {
      const { markers, done, selectedId } = propsRef.current;
      const z = map.getZoom();
      const dots = z < DOT_ZOOM;
      const view = map.getBounds().pad(0.25);
      const size = iconSize(z);
      const rendered = renderedRef.current;
      const want = new Set<string>();

      for (const m of markers) {
        const ll = toLL(m.x, m.y);
        if (!dots && !view.contains(ll)) continue;
        const isDone = !!done[m.id];
        const isSel = m.id === selectedId;
        const sig = `${dots ? "d" : "i" + size}|${isDone ? 1 : 0}|${isSel ? 1 : 0}|${m.icon}|${m.x},${m.y}`;
        want.add(m.id);
        const prev = rendered.get(m.id);
        if (prev && prev.sig === sig) continue;
        if (prev) layer.removeLayer(prev.layer);

        let lyr: L.Layer;
        if (dots) {
          const color = m.custom ? CUSTOM_COLOR : groupColor(categoryById.get(m.cat)?.group ?? "");
          lyr = L.circleMarker(ll, {
            radius: isSel ? 7 : 3.5,
            weight: isSel ? 3 : 1,
            color: isSel ? "#fff" : "#0b1020",
            fillColor: isDone ? "#94a3b8" : color,
            fillOpacity: isDone ? 0.35 : 0.95,
            opacity: isDone ? 0.4 : 0.9,
          });
        } else {
          const inner =
            m.custom && !m.icon
              ? `<div class="mk-custom" style="width:${size}px;height:${size}px">★</div>`
              : `<div class="mk-img" style="${iconCss(m.icon, size)}"></div>`;
          lyr = L.marker(ll, {
            icon: L.divIcon({
              className: `mk${isDone ? " mk-done" : ""}${isSel ? " mk-sel" : ""}`,
              html: inner + (isDone ? '<span class="mk-check">✓</span>' : ""),
              iconSize: [size, size],
              iconAnchor: [size / 2, size / 2],
            }),
            title: m.name,
            keyboard: false,
            zIndexOffset: isSel ? 1000 : isDone ? -100 : 0,
          });
        }
        lyr.on("click", (e: L.LeafletEvent) => {
          L.DomEvent.stopPropagation(e as L.LeafletMouseEvent);
          propsRef.current.onSelect(m.id);
        });
        layer.addLayer(lyr);
        rendered.set(m.id, { layer: lyr, sig });
      }
      for (const [id, r] of rendered) {
        if (!want.has(id)) {
          layer.removeLayer(r.layer);
          rendered.delete(id);
        }
      }
    };
    redrawRef.current = redraw;
    map.on("moveend zoomend", redraw);
    map.on("click", (e: L.LeafletMouseEvent) => {
      const p = propsRef.current;
      if (p.addMode) {
        const pt = map.project(e.latlng, POSTER.maxZoom);
        p.onAddAt(Math.round(pt.x), Math.round(pt.y));
      } else {
        p.onSelect(null);
      }
    });
    redraw();

    const rendered = renderedRef.current;
    return () => {
      map.remove();
      mapRef.current = null;
      rendered.clear();
    };
  }, []);

  // ---- redraw on data changes ---------------------------------------------
  useEffect(() => {
    redrawRef.current();
  }, [markers, done, selectedId]);

  useEffect(() => {
    elRef.current?.classList.toggle("adding", addMode);
  }, [addMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !flyTo) return;
    const ll = map.unproject([flyTo.x, flyTo.y], POSTER.maxZoom);
    map.flyTo(ll, Math.max(map.getZoom(), flyTo.zoom ?? 4), { duration: 0.6 });
  }, [flyTo]);

  return <div ref={elRef} className="h-full w-full" />;
}
