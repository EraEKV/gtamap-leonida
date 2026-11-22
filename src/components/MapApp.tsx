"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Eye, Map as MapIcon, PanelLeft, Plus, X } from "lucide-react";
import { CUSTOM_CAT, baseMarkers, categoryById, groupById, gridRef, type Marker } from "@/lib/mapData";
import { categoryHint } from "@/lib/categoryInfo";
import { useUserData } from "@/lib/useUserData";
import type { FlyTarget, MapContextEvent } from "./LeafletMap";
import Sidebar from "./Sidebar";
import MarkerPanel from "./MarkerPanel";
import AuthModal from "./AuthModal";
import ContextMenu from "./ContextMenu";
import MapSettings, { type Settings } from "./MapSettings";
import MapLegend from "./MapLegend";
import MarkerPicker from "./MarkerPicker";
import ShortcutsDialog from "./ShortcutsDialog";
import WelcomeDialog, { shouldShowWelcome } from "./WelcomeDialog";

const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-white/60">Загружаю карту…</div>,
});

/** Set to true once the label-free tile set exists (public/tiles-clean). */
export const CLEAN_MAP_AVAILABLE = false;

const PREFS_KEY = "leonida:hidden:v1";
const DEFAULT_SETTINGS: Settings = { legend: true, iconLegend: false, clusters: true, hideDone: false, iconScale: 1, cleanMap: false };

type Prefs = { hidden?: string[]; hiddenMarkers?: string[]; hideDone?: boolean; settings?: Partial<Settings> };
/** Per-device UI prefs. This component is client-only. */
function readPrefs(): Prefs {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) ?? "null") ?? {};
  } catch {
    return {};
  }
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const isTyping = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
};

export default function MapApp() {
  const rawApi = useUserData();
  const { data } = rawApi;
  const markerNameRef = useRef<(id: string) => string>(() => "");

  // same API, but check-marks show a toast with "Отменить" so a misclick is never scary
  const api = useMemo(() => {
    const a = rawApi.actions;
    const toggleDone = (id: string, value?: boolean) => {
      const on = value ?? !rawApi.data.done[id];
      a.toggleDone(id, on);
      toast(on ? `✓ Выполнено: ${markerNameRef.current(id)}` : `Отметка снята: ${markerNameRef.current(id)}`, {
        id: "done-toast",
        action: { label: "Отменить", onClick: () => a.toggleDone(id, !on) },
      });
    };
    const toggleTrophy = (id: string, value?: boolean) => {
      const on = value ?? !rawApi.data.trophies?.[id];
      a.toggleTrophy(id, on);
      toast(on ? "🏆 Трофей получен" : "Отметка трофея снята", {
        id: "trophy-toast",
        action: { label: "Отменить", onClick: () => a.toggleTrophy(id, !on) },
      });
    };
    return { ...rawApi, actions: { ...a, toggleDone, toggleTrophy } };
  }, [rawApi]);

  const [hidden, setHidden] = useState<Set<string>>(() => new Set(readPrefs().hidden ?? []));
  const [hiddenMarkers, setHiddenMarkers] = useState<Set<string>>(() => new Set(readPrefs().hiddenMarkers ?? []));
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
  const [picker, setPicker] = useState<{ ids: string[]; x: number; y: number } | null>(null);
  const [uiHidden, setUiHidden] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(shouldShowWelcome);

  // persist per-device prefs
  useEffect(() => {
    localStorage.setItem(
      PREFS_KEY,
      JSON.stringify({ hidden: [...hidden], hiddenMarkers: [...hiddenMarkers], hideDone: settings.hideDone, settings }),
    );
  }, [hidden, hiddenMarkers, settings]);

  const updateHidden = useCallback((fn: (prev: Set<string>) => Set<string>) => setHidden((prev) => fn(prev)), []);
  const toggleCat = useCallback(
    (id: string) =>
      setHidden((prev) => {
        const n = new Set(prev);
        if (n.has(id)) n.delete(id);
        else n.add(id);
        return n;
      }),
    [],
  );
  const updateSettings = useCallback((patch: Partial<Settings>) => setSettings((prev) => ({ ...prev, ...patch })), []);

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
  useEffect(() => {
    markerNameRef.current = (id) => markerById.get(id)?.name ?? "";
  }, [markerById]);

  const visibleMarkers = useMemo(() => {
    const list = listFilter ? (data.lists[listFilter]?.items ?? {}) : null;
    const hideDone = settings.hideDone;
    return allMarkers.filter((m) => {
      if (m.id === selectedId) return true; // always show what's selected
      if (hiddenMarkers.has(m.id)) return false;
      if (list) return !!list[m.id] && !(hideDone && data.done[m.id]);
      if (trophyFilter) return trophyFilter.cats.has(m.cat) && !(hideDone && data.done[m.id]);
      if (hidden.has(m.cat) || (m.custom && hidden.has(CUSTOM_CAT))) return false;
      if (hideDone && data.done[m.id]) return false;
      return true;
    });
  }, [allMarkers, hidden, hiddenMarkers, settings.hideDone, listFilter, trophyFilter, data.lists, data.done, selectedId]);

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

  const hideMarker = (id: string) => {
    setHiddenMarkers((prev) => new Set(prev).add(id));
    if (selectedId === id) setSelectedId(null);
  };

  // ---- global hotkeys (single keys, ignored while typing) -----------------------
  const { toggleDone } = api.actions;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      const k = e.key;
      if (k === "Escape") {
        setCtx(null);
        setPicker(null);
        setAddMode(false);
        setSelectedId(null);
        return;
      }
      if (k === "h" || k === "H" || k === "р" || k === "Р") setUiHidden((v) => !v);
      else if (k === "l" || k === "L" || k === "д" || k === "Д") setSettings((s) => ({ ...s, iconLegend: !s.iconLegend }));
      else if (k === "g" || k === "G" || k === "п" || k === "П") setSettings((s) => ({ ...s, clusters: !s.clusters }));
      else if (k === "?" || (k === "/" && e.shiftKey)) setShortcutsOpen(true);
      else if (k === "/") {
        e.preventDefault();
        setUiHidden(false);
        setSettings((s) => ({ ...s, legend: true }));
        setSidebarOpen(true);
        setTimeout(() => document.querySelector<HTMLInputElement>("input[data-search]")?.focus(), 50);
      } else if (
        (k === "d" || k === "D" || k === "в" || k === "В" || (k === " " && (e.target as HTMLElement)?.tagName !== "BUTTON")) &&
        selectedId
      ) {
        e.preventDefault();
        toggleDone(selectedId);
      } else return;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, toggleDone]);

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
        <div class="mk-tip-foot">клик — открыть · ПКМ — действия · D — выполнено</div>
      </div>`;
    },
    [markerById, data.done, data.lists, data.notes, data.photos],
  );

  const selected = selectedId ? (markerById.get(selectedId) ?? null) : null;
  const floatBtn = "pointer-events-auto flex items-center gap-1.5 rounded-xl border border-border bg-card/90 px-3 py-2 text-sm font-semibold shadow-lg backdrop-blur hover:bg-accent";

  return (
    <div className="relative flex h-dvh w-full overflow-hidden bg-background text-foreground">
      {!uiHidden && (
        <Sidebar
          api={api}
          allMarkers={allMarkers}
          customMarkers={customMarkers}
          hidden={hidden}
          updateHidden={updateHidden}
          onShowShortcuts={() => setShortcutsOpen(true)}
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
      )}

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
          onPickMany={(ids, x, y) => setPicker({ ids, x, y })}
        />

        {uiHidden ? (
          <button onClick={() => setUiHidden(false)} className={`absolute left-3 top-3 z-[500] ${floatBtn} opacity-70 hover:opacity-100`}>
            <Eye size={15} /> Показать интерфейс <span className="text-xs text-muted-foreground">H</span>
          </button>
        ) : (
          <>
            {/* top-left: panel toggle, legend, active filters, legend overlay */}
            <div className="pointer-events-none absolute left-3 top-3 z-[500] flex max-w-[calc(100%-11rem)] flex-col items-start gap-2">
              <div className="flex flex-wrap gap-2">
                <button
                  className={`${floatBtn} ${settings.legend ? "md:hidden" : ""}`}
                  onClick={() => (window.innerWidth >= 768 ? updateSettings({ legend: true }) : setSidebarOpen(true))}
                >
                  <PanelLeft size={15} /> Фильтры
                </button>
                <button className={`${floatBtn} ${settings.iconLegend ? "border-primary/60 text-primary" : ""}`} onClick={() => updateSettings({ iconLegend: !settings.iconLegend })}>
                  <MapIcon size={15} /> Что значат иконки
                </button>
                {trophyFilter && (
                  <button className={`${floatBtn} border-indigo-400/50 bg-indigo-500/90 text-white hover:bg-indigo-500`} onClick={() => setTrophyFilter(null)}>
                    🏆 {trophyFilter.name} <X size={14} />
                  </button>
                )}
                {listFilter && data.lists[listFilter] && (
                  <button className={`${floatBtn} border-primary/50 bg-primary text-primary-foreground hover:bg-primary/90`} onClick={() => setListFilter(null)}>
                    Список: {data.lists[listFilter].name} <X size={14} />
                  </button>
                )}
              </div>
              {settings.iconLegend && <MapLegend hidden={hidden} onToggleCat={toggleCat} onClose={() => updateSettings({ iconLegend: false })} />}
            </div>

            {/* add-point button */}
            <div className="absolute right-3 top-3 z-[500] flex flex-col items-end gap-2">
              <button className={`${floatBtn} ${addMode ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90" : ""}`} onClick={() => setAddMode((v) => !v)}>
                {addMode ? (
                  <>
                    <X size={15} /> Отмена
                  </>
                ) : (
                  <>
                    <Plus size={15} /> Своя точка
                  </>
                )}
              </button>
              {addMode && <div className="rounded-lg bg-black/70 px-3 py-1.5 text-xs text-white">Нажми на карту (или ПКМ → «Своя точка здесь»)</div>}
            </div>

            {!selected && (
              <MapSettings
                settings={settings}
                onChange={updateSettings}
                hiddenMarkers={hiddenMarkers.size}
                onResetHiddenMarkers={() => setHiddenMarkers(new Set())}
                onHideUi={() => setUiHidden(true)}
                onShowShortcuts={() => setShortcutsOpen(true)}
                cleanMapAvailable={CLEAN_MAP_AVAILABLE}
              />
            )}

            {selected && <MarkerPanel key={selected.id} marker={selected} api={api} onClose={() => setSelectedId(null)} onHide={hideMarker} />}
          </>
        )}

        {picker && (
          <MarkerPicker
            markers={picker.ids.map((id) => markerById.get(id)).filter((m): m is Marker => !!m)}
            done={data.done}
            clientX={picker.x}
            clientY={picker.y}
            onPick={(id) => {
              setPicker(null);
              setSelectedId(id);
            }}
            onClose={() => setPicker(null)}
          />
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
            onHideMarker={hideMarker}
            uiHidden={uiHidden}
            onToggleUi={() => setUiHidden((v) => !v)}
            onToggleLegend={() => updateSettings({ iconLegend: !settings.iconLegend })}
          />
        )}
      </main>

      {authOpen && <AuthModal api={api} onClose={() => setAuthOpen(false)} />}
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      {welcomeOpen && (
        <WelcomeDialog onClose={() => setWelcomeOpen(false)} onSignIn={() => setAuthOpen(true)} signedIn={rawApi.auth.status === "signed-in"} />
      )}
    </div>
  );
}
