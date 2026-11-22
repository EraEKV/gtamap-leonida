"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ASSET_BASE, CUSTOM_COLOR, POSTER, categoryById, groupById, groupColor, iconCss, type Marker } from "@/lib/mapData";
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
  /** several icons overlap where the user clicked: let them pick */
  onPickMany: (ids: string[], clientX: number, clientY: number) => void;
};

const DOT_ZOOM = 3; // without clustering: canvas dots below this zoom
const CLUSTER_UNTIL = 4; // with clustering: clusters below this zoom
const CELL = 60; // cluster grid cell, screen px
const MAX_ICONS = 350; // more DOM icons than this in view -> draw clusters/dots instead
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
      keyboard: false, // arrow keys are used to jump between markers instead
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
        const ev = e as L.LeafletMouseEvent;
        L.DomEvent.stopPropagation(ev);
        const p = propsRef.current;
        // icons that overlap the clicked one on screen -> offer a picker instead of guessing
        const m0 = p.markers.find((m) => m.id === id);
        if (m0 && map.getZoom() >= (p.clusters ? CLUSTER_UNTIL : DOT_ZOOM)) {
          const c0 = map.latLngToContainerPoint(toLL(m0.x, m0.y));
          const r = (baseIconSize(map.getZoom()) * p.iconScale) * 0.75;
          const near = p.markers.filter((m) => {
            const c = map.latLngToContainerPoint(toLL(m.x, m.y));
            return Math.abs(c.x - c0.x) < r && Math.abs(c.y - c0.y) < r;
          });
          if (near.length > 1) {
            p.onPickMany(
              [id, ...near.map((m) => m.id).filter((x) => x !== id)],
              ev.originalEvent.clientX,
              ev.originalEvent.clientY,
            );
            return;
          }
        }
        p.onSelect(id);
      });
      lyr.on("contextmenu", (e: L.LeafletEvent) => {
        const ev = e as L.LeafletMouseEvent;
        L.DomEvent.stop(ev);
        (lyr as L.Marker).closeTooltip();
        propsRef.current.onContext({ kind: "marker", id, clientX: ev.originalEvent.clientX, clientY: ev.originalEvent.clientY });
      });
    };

    // LatLng per marker, computed once (markers are immutable objects)
    const llCache = new WeakMap<Marker, L.LatLng>();
    const llOf = (m: Marker) => {
      let ll = llCache.get(m);
      if (!ll) {
        ll = toLL(m.x, m.y);
        llCache.set(m, ll);
      }
      return ll;
    };

    // Which way to draw: clusters / canvas dots / DOM icons. DOM icons are capped — hundreds of them
    // make every zoom frame expensive, so a dense view falls back to clusters (or dots) automatically.
    type Mode = "cluster" | "dots" | "icons";
    const computeMode = (): Mode => {
      const { markers, clusters } = propsRef.current;
      const z = map.getZoom();
      if (clusters && z < CLUSTER_UNTIL) return "cluster";
      if (!clusters && z < DOT_ZOOM) return "dots";
      const b = map.getBounds().pad(0.1);
      let n = 0;
      for (const m of markers) if (b.contains(llOf(m)) && ++n > MAX_ICONS) return clusters ? "cluster" : "dots";
      return "icons";
    };
    let lastMode: Mode | null = null;

    const redraw = () => {
      const { markers, done, selectedId, iconScale } = propsRef.current;
      const z = map.getZoom();
      const mode = computeMode();
      lastMode = mode;
      const clusterMode = mode === "cluster";
      const dots = mode === "dots";
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
          const ll = llOf(m);
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
            iconMarker(ms[0], llOf(ms[0]), Math.round(22 * iconScale));
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
          // ring = pie of what's inside (each group its own colour), centre tinted by the dominant group
          const parts = [...counts.entries()].sort((a, b) => b[1] - a[1]);
          const colorOf = (g: string) => (g === "custom" ? CUSTOM_COLOR : groupColor(g));
          let acc = 0;
          const stops = parts
            .map(([g, n]) => {
              const from = (acc / ms.length) * 360;
              acc += n;
              const to = (acc / ms.length) * 360;
              return `${colorOf(g)} ${from.toFixed(1)}deg ${to.toFixed(1)}deg`;
            })
            .join(",");
          const main = colorOf(parts[0][0]);
          const d = ms.length < 10 ? 30 : ms.length < 50 ? 36 : ms.length < 150 ? 42 : 48;
          put(`cl:${zKey}:${cell}`, `${ms.length}|${left}|${stops}`, () => {
            const lyr = L.marker(toLL(cx, cy), {
              icon: L.divIcon({
                className: "mk-cluster-wrap",
                html: `<div class="mk-cluster${left === 0 ? " all-done" : ""}" style="width:${d}px;height:${d}px;--c:${main};--ring:conic-gradient(${stops})"><span>${left === 0 ? "✓" : left}</span></div>`,
                iconSize: [d, d],
                iconAnchor: [d / 2, d / 2],
              }),
              keyboard: false,
            });
            const legend = parts
              .slice(0, 4)
              .map(([g, n]) => `<div class="mk-tip-row"><i style="background:${colorOf(g)}"></i>${g === "custom" ? "Мои точки" : (groupById.get(g)?.name ?? "")} <b>${n}</b></div>`)
              .join("");
            lyr.bindTooltip(
              `<b>${ms.length} точек</b>${left !== ms.length ? ` · осталось ${left}` : ""}${legend}<div class="mk-tip-sub" style="margin-top:5px">клик — приблизить</div>`,
              { direction: "top", offset: [0, -d / 2], className: "mk-tip", opacity: 1 },
            );
            lyr.on("click", () => map.flyTo(toLL(cx, cy), Math.min(Math.max(z + 1.25, CLUSTER_UNTIL + 0.25), map.getMaxZoom()), { duration: 0.5 }));
            return lyr;
          });
        }
      } else {
        for (const m of markers) {
          const ll = llOf(m);
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
    // while zooming (smooth wheel / flyTo), switch away from heavy DOM icons as soon as the view gets
    // too dense — otherwise Leaflet repositions hundreds of icons on every animation frame
    let lastCheck = 0;
    map.on("zoom", () => {
      const now = performance.now();
      if (now - lastCheck < 100) return;
      lastCheck = now;
      if (lastMode === "icons" && computeMode() !== "icons") redraw();
    });
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

    // ---- arrow keys: jump to the nearest marker in that direction ---------------
    const DIRS: Record<string, [number, number]> = {
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
    };
    const onKey = (e: KeyboardEvent) => {
      const dir = DIRS[e.key];
      if (!dir || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      e.preventDefault();
      const { markers, selectedId, onSelect } = propsRef.current;
      const size = map.getSize();
      const sel = selectedId ? markers.find((m) => m.id === selectedId) : null;
      const origin = sel ? map.latLngToContainerPoint(toLL(sel.x, sel.y)) : size.divideBy(2);
      let best: { id: string; score: number; ll: L.LatLng } | null = null;
      for (const m of markers) {
        if (m.id === selectedId) continue;
        const ll = toLL(m.x, m.y);
        const c = map.latLngToContainerPoint(ll);
        const vx = c.x - origin.x,
          vy = c.y - origin.y;
        const along = vx * dir[0] + vy * dir[1];
        if (!sel && Math.hypot(vx, vy) < 1) {
          best = { id: m.id, score: -1, ll };
          break;
        }
        if (along <= 1) continue;
        const perp = Math.abs(vx * dir[1] - vy * dir[0]);
        if (perp > along * 1.6) continue; // ~60° cone
        const score = along + perp * 2.2;
        if (!best || score < best.score) best = { id: m.id, score, ll };
      }
      if (!best) return;
      onSelect(best.id);
      const c = map.latLngToContainerPoint(best.ll);
      if (c.x < 60 || c.y < 60 || c.x > size.x - 60 || c.y > size.y - 60) map.panTo(best.ll, { animate: true, duration: 0.25 });
    };
    window.addEventListener("keydown", onKey);

    // the container changes size when the sidebar / UI is hidden or shown: tell Leaflet, keeping the
    // same point in the middle of the screen (otherwise the view jumps, as if the zoom was reset)
    // Keep the map visually still: invalidateSize({pan:false}) pins the container's top-left corner,
    // then shift by however much that corner moved on screen (e.g. sidebar hidden → left edge 340px → 0).
    let last = elRef.current.getBoundingClientRect();
    const ro = new ResizeObserver(() => {
      const r = map.getContainer().getBoundingClientRect();
      if (r.width === last.width && r.height === last.height && r.left === last.left && r.top === last.top) return;
      const dx = r.left - last.left;
      const dy = r.top - last.top;
      last = r;
      map.invalidateSize({ pan: false, animate: false });
      if (dx || dy) map.panBy([dx, dy], { animate: false });
    });
    ro.observe(elRef.current);

    const rendered = renderedRef.current;
    return () => {
      ro.disconnect();
      window.removeEventListener("keydown", onKey);
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
