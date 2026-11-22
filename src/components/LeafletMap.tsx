"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ASSET_BASE, CUSTOM_COLOR, POSTER, categoryById, groupColor, iconCss, type Marker } from "@/lib/mapData";
import { enableSmoothWheelZoom } from "@/lib/smoothWheelZoom";

export type FlyTarget = { x: number; y: number; zoom?: number; key: number };
export type MapContextEvent =
  | { kind: "map"; clientX: number; clientY: number; x: number; y: number }
  | { kind: "marker"; clientX: number; clientY: number; id: string };

type Props = {
  markers: Marker[]; // already filtered for visibility
  done: Record<string, true>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  addMode: boolean;
  onAddAt: (x: number, y: number) => void;
  onContext: (e: MapContextEvent) => void;
  tooltipHtml: (id: string) => string;
  flyTo: FlyTarget | null;
  clusters: boolean;
  iconScale: number;
};

const DOT_ZOOM = 3; // without clustering: canvas dots below this zoom
const CLUSTER_UNTIL = 4; // with clustering: clusters below this zoom
const CELL = 60; // cluster grid cell, screen px
const baseIconSize = (z: number) => (z < 4 ? 22 : z < 5 ? 28 : 34);

export default function LeafletMap(props: Props) {
  const { markers, done, selectedId, addMode, flyTo, clusters, iconScale } = props;
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const renderedRef = useRef(new Map<string, { layer: L.Layer; sig: string }>());
  const propsRef = useRef(props);
  const redrawRef = useRef<() => void>(() => {});

  useEffect(() => {
    propsRef.current = props;
  });

  // ---- create the map once ------------------------------------------------
  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const map = L.map(elRef.current, {
      crs: L.CRS.Simple,
      minZoom: 0,
      maxZoom: POSTER.maxZoom + 2,
      zoomSnap: 0,
      zoomDelta: 0.75,
      attributionControl: false,
      zoomControl: false,
      preferCanvas: true,
      inertiaDeceleration: 2500,
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
      keepBuffer: 6,
      updateWhenZooming: false,
    }).addTo(map);
    L.control.zoom({ position: "bottomleft" }).addTo(map);
    map.setMaxBounds(bounds.pad(0.15));
    map.fitBounds(bounds);
    map.setMinZoom(Math.max(0, map.getZoom() - 0.5));
    const disposeWheel = enableSmoothWheelZoom(map);

    const layer = L.layerGroup().addTo(map);
    mapRef.current = map;

    const bindCommon = (lyr: L.Layer, id: string) => {
      (lyr as L.Marker).bindTooltip(() => propsRef.current.tooltipHtml(id), {
        direction: "top",
        offset: [0, -12],
        opacity: 1,
        className: "mk-tip",
      });
      lyr.on("click", (e: L.LeafletEvent) => {
        L.DomEvent.stopPropagation(e as L.LeafletMouseEvent);
        propsRef.current.onSelect(id);
      });
      lyr.on("contextmenu", (e: L.LeafletEvent) => {
        const ev = e as L.LeafletMouseEvent;
        L.DomEvent.stop(ev);
        (lyr as L.Marker).closeTooltip();
        propsRef.current.onContext({ kind: "marker", id, clientX: ev.originalEvent.clientX, clientY: ev.originalEvent.clientY });
      });
    };

    const redraw = () => {
      const { markers, done, selectedId, clusters, iconScale } = propsRef.current;
      const z = map.getZoom();
      const clusterMode = clusters && z < CLUSTER_UNTIL;
      const dots = !clusters && z < DOT_ZOOM;
      const view = map.getBounds().pad(0.3);
      const size = Math.round(baseIconSize(z) * iconScale);
      const rendered = renderedRef.current;
      const want = new Set<string>();

      const put = (key: string, sig: string, make: () => L.Layer) => {
        want.add(key);
        const prev = rendered.get(key);
        if (prev && prev.sig === sig) return;
        if (prev) layer.removeLayer(prev.layer);
        const lyr = make();
        layer.addLayer(lyr);
        rendered.set(key, { layer: lyr, sig });
      };

      const iconMarker = (m: Marker, ll: L.LatLng, sz: number) => {
        const isDone = !!done[m.id];
        const isSel = m.id === selectedId;
        put(m.id, `i${sz}|${+isDone}|${+isSel}|${m.icon}|${m.x},${m.y}`, () => {
          const inner =
            m.custom && !m.icon
              ? `<div class="mk-custom" style="width:${sz}px;height:${sz}px;font-size:${Math.round(sz * 0.45)}px">★</div>`
              : `<div class="mk-img" style="${iconCss(m.icon, sz)}"></div>`;
          const lyr = L.marker(ll, {
            icon: L.divIcon({
              className: `mk${isDone ? " mk-done" : ""}${isSel ? " mk-sel" : ""}`,
              html: inner + (isDone ? '<span class="mk-check">✓</span>' : ""),
              iconSize: [sz, sz],
              iconAnchor: [sz / 2, sz / 2],
            }),
            keyboard: false,
            zIndexOffset: isSel ? 1000 : isDone ? -100 : 0,
          });
          bindCommon(lyr, m.id);
          return lyr;
        });
      };

      if (clusterMode) {
        // grid clustering in absolute pixel space (stable while panning)
        const cells = new Map<string, Marker[]>();
        for (const m of markers) {
          const ll = toLL(m.x, m.y);
          if (!view.contains(ll) && m.id !== selectedId) continue;
          if (m.id === selectedId) {
            iconMarker(m, ll, size);
            continue;
          }
          const p = map.project(ll, z);
          const key = `${Math.floor(p.x / CELL)},${Math.floor(p.y / CELL)}`;
          const arr = cells.get(key);
          if (arr) arr.push(m);
          else cells.set(key, [m]);
        }
        const zKey = z.toFixed(2);
        for (const [cell, ms] of cells) {
          if (ms.length === 1) {
            iconMarker(ms[0], toLL(ms[0].x, ms[0].y), Math.round(22 * iconScale));
            continue;
          }
          const left = ms.filter((m) => !done[m.id]).length;
          let sx = 0,
            sy = 0;
          for (const m of ms) {
            sx += m.x;
            sy += m.y;
          }
          const cx = sx / ms.length,
            cy = sy / ms.length;
          // dominant group colour
          const counts = new Map<string, number>();
          for (const m of ms) {
            const g = m.custom ? "custom" : (categoryById.get(m.cat)?.group ?? "");
            counts.set(g, (counts.get(g) ?? 0) + 1);
          }
          const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
          const color = top === "custom" ? CUSTOM_COLOR : groupColor(top);
          const d = ms.length < 10 ? 30 : ms.length < 50 ? 36 : ms.length < 150 ? 42 : 48;
          put(`cl:${zKey}:${cell}`, `${ms.length}|${left}|${color}`, () => {
            const lyr = L.marker(toLL(cx, cy), {
              icon: L.divIcon({
                className: "mk-cluster-wrap",
                html: `<div class="mk-cluster${left === 0 ? " all-done" : ""}" style="width:${d}px;height:${d}px;--c:${color}">${left === 0 ? "✓" : left}</div>`,
                iconSize: [d, d],
                iconAnchor: [d / 2, d / 2],
              }),
              keyboard: false,
            });
            lyr.bindTooltip(
              `<b>${ms.length} точек</b>${left !== ms.length ? ` · осталось ${left}` : ""}<br><span class="mk-tip-sub">клик — приблизить</span>`,
              { direction: "top", offset: [0, -d / 2], className: "mk-tip", opacity: 1 },
            );
            lyr.on("click", () => map.flyTo(toLL(cx, cy), Math.min(z + 1.5, CLUSTER_UNTIL + 0.25), { duration: 0.5 }));
            return lyr;
          });
        }
      } else {
        for (const m of markers) {
          const ll = toLL(m.x, m.y);
          if (!dots && !view.contains(ll) && m.id !== selectedId) continue;
          if (dots) {
            const isDone = !!done[m.id];
            const isSel = m.id === selectedId;
            put(m.id, `d|${+isDone}|${+isSel}`, () => {
              const color = m.custom ? CUSTOM_COLOR : groupColor(categoryById.get(m.cat)?.group ?? "");
              const lyr = L.circleMarker(ll, {
                radius: isSel ? 7 : 3.5,
                weight: isSel ? 3 : 1,
                color: isSel ? "#fff" : "#0b1020",
                fillColor: isDone ? "#94a3b8" : color,
                fillOpacity: isDone ? 0.35 : 0.95,
                opacity: isDone ? 0.4 : 0.9,
              });
              bindCommon(lyr, m.id);
              return lyr;
            });
          } else {
            iconMarker(m, ll, size);
          }
        }
      }

      for (const [key, r] of rendered) {
        if (!want.has(key)) {
          layer.removeLayer(r.layer);
          rendered.delete(key);
        }
      }
    };
    redrawRef.current = redraw;
    map.on("moveend", redraw);
    map.on("click", (e: L.LeafletMouseEvent) => {
      const p = propsRef.current;
      if (p.addMode) {
        const pt = map.project(e.latlng, POSTER.maxZoom);
        p.onAddAt(Math.round(pt.x), Math.round(pt.y));
      } else {
        p.onSelect(null);
      }
    });
    map.on("contextmenu", (e: L.LeafletMouseEvent) => {
      const pt = map.project(e.latlng, POSTER.maxZoom);
      propsRef.current.onContext({
        kind: "map",
        x: Math.round(pt.x),
        y: Math.round(pt.y),
        clientX: e.originalEvent.clientX,
        clientY: e.originalEvent.clientY,
      });
    });
    redraw();

    const rendered = renderedRef.current;
    return () => {
      disposeWheel();
      map.remove();
      mapRef.current = null;
      rendered.clear();
    };
  }, []);

  // ---- redraw on data / settings changes ------------------------------------
  useEffect(() => {
    redrawRef.current();
  }, [markers, done, selectedId, clusters, iconScale]);

  useEffect(() => {
    elRef.current?.classList.toggle("adding", addMode);
  }, [addMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !flyTo) return;
    const ll = map.unproject([flyTo.x, flyTo.y], POSTER.maxZoom);
    map.flyTo(ll, Math.max(map.getZoom(), flyTo.zoom ?? 4.5), { duration: 0.6 });
  }, [flyTo]);

  return <div ref={elRef} className="h-full w-full" />;
}
