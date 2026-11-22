"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
import { CUSTOM_CAT, baseMarkers, categoryById, groupById, gridRef, type Marker } from "@/lib/mapData";
import { categoryHint } from "@/lib/categoryInfo";
import { useUserData } from "@/lib/useUserData";
import type { FlyTarget, MapContextEvent } from "./LeafletMap";
import Sidebar from "./Sidebar";
import MarkerPanel from "./MarkerPanel";
import AuthModal from "./AuthModal";
import ContextMenu from "./ContextMenu";
import MapSettings, { type Settings } from "./MapSettings";

const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-white/60">Загружаю карту…</div>,
});

const PREFS_KEY = "leonida:hidden:v1";
const DEFAULT_SETTINGS: Settings = { legend: true, clusters: true, hideDone: false, iconScale: 1 };

type Prefs = { hidden?: string[]; hideDone?: boolean; settings?: Partial<Settings> };
/** Per-device UI prefs. This component is client-only. */
function readPrefs(): Prefs {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) ?? "null") ?? {};
  } catch {
    return {};
  }
}
function writePrefs(p: Prefs) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(p));
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export default function MapApp() {
  const api = useUserData();
  const { data } = api;

  const [hidden, setHidden] = useState<Set<string>>(() => new Set(readPrefs().hidden ?? []));
  const [settings, setSettings] = useState<Settings>(() => {
    const p = readPrefs();
    return { ...DEFAULT_SETTINGS, hideDone: !!p.hideDone, ...p.settings };
  });
  const [listFilter, setListFilter] = useState<string | null>(null);
  const [trophyFilter, setTrophyFilter] = useState<{ name: string; cats: Set<string> } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addMode, setAddMode] = useState(false);
  const [flyTo, setFlyTo] = useState<FlyTarget | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [ctx, setCtx] = useState<MapContextEvent | null>(null);

  const persist = (h: Set<string>, s: Settings) => writePrefs({ hidden: [...h], hideDone: s.hideDone, settings: s });
  const updateHidden = useCallback(
    (fn: (prev: Set<string>) => Set<string>) =>
      setHidden((prev) => {
        const next = fn(prev);
        persist(next, settings);
        return next;
      }),
    [settings],
  );
  const updateSettings = (patch: Partial<Settings>) =>
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      persist(hidden, next);
      return next;
    });

  const customMarkers: Marker[] = useMemo(
    () =>
      Object.entries(data.custom).map(([id, c]) => ({
        id,
        cat: c.cat ?? CUSTOM_CAT,
        x: c.x,
        y: c.y,
        name: c.name,
        icon: c.cat ? (categoryById.get(c.cat)?.icon ?? "") : "",
        custom: true,
      })),
    [data.custom],
  );
  const allMarkers = useMemo(() => [...baseMarkers, ...customMarkers], [customMarkers]);
  const markerById = useMemo(() => new Map(allMarkers.map((m) => [m.id, m])), [allMarkers]);

  const visibleMarkers = useMemo(() => {
    const list = listFilter ? (data.lists[listFilter]?.items ?? {}) : null;
    const hideDone = settings.hideDone;
    return allMarkers.filter((m) => {
      if (m.id === selectedId) return true; // always show what's selected
      if (list) return !!list[m.id] && !(hideDone && data.done[m.id]);
      if (trophyFilter) return trophyFilter.cats.has(m.cat) && !(hideDone && data.done[m.id]);
      if (hidden.has(m.cat) || (m.custom && hidden.has(CUSTOM_CAT))) return false;
      if (hideDone && data.done[m.id]) return false;
      return true;
    });
  }, [allMarkers, hidden, settings.hideDone, listFilter, trophyFilter, data.lists, data.done, selectedId]);

  const focusMarker = useCallback(
    (id: string) => {
      const m = markerById.get(id);
      if (!m) return;
      setSelectedId(id);
      setFlyTo({ x: m.x, y: m.y, zoom: 4.5, key: Date.now() });
      setSidebarOpen(false);
    },
    [markerById],
  );

  const onAddAt = (x: number, y: number) => {
    const id = api.actions.addCustom({ x, y, name: "Новая точка", cat: null });
    setAddMode(false);
    setSelectedId(id);
  };

  // hover card for markers (plain HTML for Leaflet tooltips)
  const tooltipHtml = useCallback(
    (id: string) => {
      const m = markerById.get(id);
      if (!m) return "";
      const cat = categoryById.get(m.cat);
      const group = cat ? groupById.get(cat.group) : null;
      const hint = categoryHint(m.cat);
      const isDone = !!data.done[id];
      const lists = Object.values(data.lists).filter((l) => l.items?.[id]);
      const note = data.notes[id];
      const photos = Object.keys(data.photos?.[id] ?? {}).length;
      const grid = gridRef(m.x, m.y);
      return `<div class="mk-tip-card">
        <div class="mk-tip-title">${esc(m.name)}${isDone ? ' <span class="mk-tip-done">✓</span>' : ""}</div>
        <div class="mk-tip-sub">${group ? `${esc(group.name)} › ${esc(cat!.name)}` : "Моя точка"}${grid ? ` · ${grid}` : ""}</div>
        ${hint ? `<div class="mk-tip-hint">${esc(hint)}</div>` : ""}
        ${lists.length ? `<div class="mk-tip-lists">${lists.map((l) => `<span style="background:${l.color}">${esc(l.name)}</span>`).join("")}</div>` : ""}
        ${note ? `<div class="mk-tip-note">📝 ${esc(note.length > 90 ? note.slice(0, 90) + "…" : note)}</div>` : ""}
        ${photos ? `<div class="mk-tip-sub">📷 ${photos} фото</div>` : ""}
        <div class="mk-tip-foot">клик — открыть · ПКМ — действия</div>
      </div>`;
    },
    [markerById, data.done, data.lists, data.notes, data.photos],
  );

  const selected = selectedId ? (markerById.get(selectedId) ?? null) : null;

  return (
    <div className="relative flex h-dvh w-full overflow-hidden bg-[#0d0f1a] text-slate-100">
      <Sidebar
        api={api}
        allMarkers={allMarkers}
        customMarkers={customMarkers}
        hidden={hidden}
        updateHidden={updateHidden}
        hideDone={settings.hideDone}
        toggleHideDone={() => updateSettings({ hideDone: !settings.hideDone })}
        listFilter={listFilter}
        setListFilter={(id) => {
          setListFilter(id);
          if (id) setTrophyFilter(null);
        }}
        onFocus={focusMarker}
        open={sidebarOpen}
        desktopVisible={settings.legend}
        onClose={() => setSidebarOpen(false)}
        onOpenAuth={() => setAuthOpen(true)}
        onShowTrophy={(t) => {
          if (!t.map) return;
          setListFilter(null);
          setTrophyFilter({ name: t.name, cats: new Set(t.map.cats) });
          setSidebarOpen(false);
        }}
      />

      <main className="relative min-w-0 flex-1" onContextMenu={(e) => e.preventDefault()}>
        <LeafletMap
          markers={visibleMarkers}
          done={data.done}
          selectedId={selectedId}
          onSelect={setSelectedId}
          addMode={addMode}
          onAddAt={onAddAt}
          onContext={setCtx}
          tooltipHtml={tooltipHtml}
          flyTo={flyTo}
          clusters={settings.clusters}
          iconScale={settings.iconScale}
        />

        {/* top-left controls */}
        <div className="pointer-events-none absolute left-3 top-3 z-[500] flex gap-2">
          <button
            className={`pointer-events-auto rounded-xl bg-[#161a2b]/90 px-3 py-2 text-sm font-semibold shadow-lg backdrop-blur ${
              settings.legend ? "md:hidden" : ""
            }`}
            onClick={() => (window.innerWidth >= 768 ? updateSettings({ legend: true }) : setSidebarOpen(true))}
          >
            ☰ Легенда
          </button>
          {trophyFilter && (
            <button
              className="pointer-events-auto rounded-xl bg-indigo-500 px-3 py-2 text-sm font-semibold text-white shadow-lg"
              onClick={() => setTrophyFilter(null)}
            >
              🏆 {trophyFilter.name} ✕
            </button>
          )}
          {listFilter && data.lists[listFilter] && (
            <button
              className="pointer-events-auto rounded-xl bg-pink-500 px-3 py-2 text-sm font-semibold text-white shadow-lg"
              onClick={() => setListFilter(null)}
            >
              Список: {data.lists[listFilter].name} ✕
            </button>
          )}
        </div>

        {/* add-point button */}
        <div className="absolute right-3 top-3 z-[500] flex flex-col items-end gap-2">
          <button
            className={`rounded-xl px-3 py-2 text-sm font-semibold shadow-lg ${
              addMode ? "bg-pink-500 text-white" : "bg-[#161a2b]/90 text-slate-100 backdrop-blur"
            }`}
            onClick={() => setAddMode((v) => !v)}
          >
            {addMode ? "Отмена" : "＋ Своя точка"}
          </button>
          {addMode && (
            <div className="rounded-lg bg-black/70 px-3 py-1.5 text-xs text-white">
              Нажми на карту (или ПКМ → «Своя точка здесь»)
            </div>
          )}
        </div>

        {!selected && <MapSettings settings={settings} onChange={updateSettings} />}

        {selected && (
          <MarkerPanel key={selected.id} marker={selected} api={api} onClose={() => setSelectedId(null)} />
        )}

        {ctx && (
          <ContextMenu
            event={ctx}
            api={api}
            marker={ctx.kind === "marker" ? (markerById.get(ctx.id) ?? null) : null}
            onClose={() => setCtx(null)}
            onOpen={(id) => setSelectedId(id)}
            onAddHere={onAddAt}
            onCenter={(x, y) => setFlyTo({ x, y, zoom: 0, key: Date.now() })}
          />
        )}
      </main>

      {authOpen && <AuthModal api={api} onClose={() => setAuthOpen(false)} />}
    </div>
  );
}
