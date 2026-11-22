"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
import { CUSTOM_CAT, baseMarkers, categoryById, type Marker } from "@/lib/mapData";
import { useUserData } from "@/lib/useUserData";
import type { FlyTarget } from "./LeafletMap";
import Sidebar from "./Sidebar";
import MarkerPanel from "./MarkerPanel";

const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center bg-[#00b1cd] text-white/80">Загружаю карту…</div>,
});

const HIDDEN_KEY = "leonida:hidden:v1";

/** Per-device UI prefs (which categories are hidden). This component is client-only. */
function readPrefs(): { hidden?: string[]; hideDone?: boolean } {
  try {
    return JSON.parse(localStorage.getItem(HIDDEN_KEY) ?? "null") ?? {};
  } catch {
    return {};
  }
}

export default function MapApp() {
  const api = useUserData();
  const { data } = api;

  const [hidden, setHidden] = useState<Set<string>>(() => new Set(readPrefs().hidden ?? []));
  const [hideDone, setHideDone] = useState(() => !!readPrefs().hideDone);
  const [listFilter, setListFilter] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addMode, setAddMode] = useState(false);
  const [flyTo, setFlyTo] = useState<FlyTarget | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const savePrefs = (h: Set<string>, hd: boolean) =>
    localStorage.setItem(HIDDEN_KEY, JSON.stringify({ hidden: [...h], hideDone: hd }));

  const updateHidden = useCallback(
    (fn: (prev: Set<string>) => Set<string>) =>
      setHidden((prev) => {
        const next = fn(prev);
        savePrefs(next, hideDone);
        return next;
      }),
    [hideDone],
  );
  const toggleHideDone = () =>
    setHideDone((v) => {
      savePrefs(hidden, !v);
      return !v;
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
    const list = listFilter ? data.lists[listFilter]?.items ?? {} : null;
    return allMarkers.filter((m) => {
      if (m.id === selectedId) return true; // always show what's selected
      if (list) return !!list[m.id] && !(hideDone && data.done[m.id]);
      if (hidden.has(m.cat) || (m.custom && hidden.has(CUSTOM_CAT))) return false;
      if (hideDone && data.done[m.id]) return false;
      return true;
    });
  }, [allMarkers, hidden, hideDone, listFilter, data.lists, data.done, selectedId]);

  const focusMarker = (id: string) => {
    const m = markerById.get(id);
    if (!m) return;
    setSelectedId(id);
    setFlyTo({ x: m.x, y: m.y, zoom: 4, key: Date.now() });
    setSidebarOpen(false);
  };

  const onAddAt = (x: number, y: number) => {
    const id = api.actions.addCustom({ x, y, name: "Новая точка", cat: null });
    setAddMode(false);
    setSelectedId(id);
  };

  const selected = selectedId ? markerById.get(selectedId) ?? null : null;

  return (
    <div className="relative flex h-dvh w-full overflow-hidden bg-[#0d0f1a] text-slate-100">
      <Sidebar
        api={api}
        allMarkers={allMarkers}
        customMarkers={customMarkers}
        hidden={hidden}
        updateHidden={updateHidden}
        hideDone={hideDone}
        toggleHideDone={toggleHideDone}
        listFilter={listFilter}
        setListFilter={setListFilter}
        onFocus={focusMarker}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="relative min-w-0 flex-1">
        <LeafletMap
          markers={visibleMarkers}
          done={data.done}
          selectedId={selectedId}
          onSelect={setSelectedId}
          addMode={addMode}
          onAddAt={onAddAt}
          flyTo={flyTo}
        />

        {/* top-left controls */}
        <div className="pointer-events-none absolute left-3 top-3 z-[500] flex gap-2">
          <button
            className="pointer-events-auto rounded-xl bg-[#161a2b]/90 px-3 py-2 text-sm font-semibold shadow-lg backdrop-blur md:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            ☰ Категории
          </button>
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
            <div className="rounded-lg bg-black/70 px-3 py-1.5 text-xs text-white">Нажми на карту, чтобы поставить точку</div>
          )}
        </div>

        {selected && (
          <MarkerPanel key={selected.id} marker={selected} api={api} onClose={() => setSelectedId(null)} />
        )}
      </main>
    </div>
  );
}
