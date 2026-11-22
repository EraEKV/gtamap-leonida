"use client";

import { useMemo, useRef, useState } from "react";
import {
  CUSTOM_CAT,
  categoriesByGroup,
  categoryById,
  gridRef,
  groupColor,
  groups,
  iconStyle,
  sections,
  type Marker,
} from "@/lib/mapData";
import { categoryHint } from "@/lib/categoryInfo";
import { TROPHIES, type Trophy } from "@/data/trophies";
import TrophiesView from "./TrophiesView";
import type { UserDataApi } from "@/lib/useUserData";

type Props = {
  api: UserDataApi;
  allMarkers: Marker[];
  customMarkers: Marker[];
  hidden: Set<string>;
  updateHidden: (fn: (prev: Set<string>) => Set<string>) => void;
  hideDone: boolean;
  toggleHideDone: () => void;
  listFilter: string | null;
  setListFilter: (id: string | null) => void;
  onFocus: (id: string) => void;
  open: boolean;
  desktopVisible: boolean;
  onClose: () => void;
  onOpenAuth: () => void;
  onShowTrophy: (t: Trophy) => void;
};

function Bar({ done, total, color = "#f472b6" }: { done: number; total: number; color?: string }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="M3 3l18 18" />}
    </svg>
  );
}

/** Legend drill-in: all points of one category with "go to" and quick done toggles. */
function CategoryView(p: {
  catId: string;
  markers: Marker[];
  done: Record<string, true>;
  hidden: boolean;
  onToggleHidden: () => void;
  onBack: () => void;
  onFocus: (id: string) => void;
  onToggleDone: (id: string) => void;
  onAllDone: (ids: string[], on: boolean) => void;
}) {
  const cat = categoryById.get(p.catId);
  const hint = categoryHint(p.catId);
  const d = p.markers.filter((m) => p.done[m.id]).length;
  const sorted = [...p.markers].sort((a, b) => Number(!!p.done[a.id]) - Number(!!p.done[b.id]) || a.name.localeCompare(b.name));
  return (
    <div className="p-3">
      <button onClick={p.onBack} className="mb-3 text-xs text-slate-400 hover:text-white">
        ← Все категории
      </button>
      <div className="flex items-center gap-3">
        {cat && <span className="shrink-0" style={iconStyle(cat.icon, 36)} />}
        <div className="min-w-0 flex-1">
          <div className="font-bold">{cat?.name ?? "Мои точки"}</div>
          <div className="text-xs text-slate-400">
            {d} / {p.markers.length} выполнено
          </div>
        </div>
        <button onClick={p.onToggleHidden} className={`rounded-md p-1.5 hover:bg-white/10 ${p.hidden ? "text-slate-600" : "text-slate-300"}`} title="Показать/скрыть на карте">
          <EyeIcon off={p.hidden} />
        </button>
      </div>
      {hint && <p className="mt-2 rounded-lg bg-white/5 p-2 text-xs leading-relaxed text-slate-300">{hint}</p>}
      <div className="mt-2">
        <Bar done={d} total={p.markers.length} color={cat ? groupColor(cat.group) : undefined} />
      </div>
      <ul className="mt-3 space-y-0.5">
        {sorted.map((m) => {
          const isDone = !!p.done[m.id];
          return (
            <li key={m.id} className="flex items-center gap-1 rounded-lg hover:bg-white/5">
              <button
                onClick={() => p.onToggleDone(m.id)}
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border text-xs ${
                  isDone ? "border-emerald-500 bg-emerald-500 text-white" : "border-white/20 text-transparent hover:border-white/50"
                }`}
                title={isDone ? "Снять отметку" : "Отметить выполненным"}
              >
                ✓
              </button>
              <button onClick={() => p.onFocus(m.id)} className="flex min-w-0 flex-1 items-center justify-between gap-2 px-1.5 py-1.5 text-left text-[13px]">
                <span className={`truncate ${isDone ? "text-slate-500 line-through" : ""}`}>{m.name}</span>
                <span className="shrink-0 text-[11px] text-slate-500">{gridRef(m.x, m.y) ?? ""} ↗</span>
              </button>
            </li>
          );
        })}
      </ul>
      {p.markers.length > 1 && (
        <div className="mt-3 flex gap-2 text-xs">
          <button
            onClick={() => p.onAllDone(p.markers.map((m) => m.id), d < p.markers.length)}
            className="flex-1 rounded-lg bg-white/5 py-2 hover:bg-white/10"
          >
            {d < p.markers.length ? "Отметить все" : "Снять все отметки"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function Sidebar(p: Props) {
  const { data, auth, actions, signOut, syncError, clearSyncError } = p.api;
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [newList, setNewList] = useState("");
  const [openCat, setOpenCat] = useState<string | null>(null);
  const [tab, setTab] = useState<"map" | "trophies">("map");
  const fileRef = useRef<HTMLInputElement>(null);

  // per-category totals (base + custom points that have a category)
  const stats = useMemo(() => {
    const total = new Map<string, number>();
    const done = new Map<string, number>();
    for (const m of p.allMarkers) {
      total.set(m.cat, (total.get(m.cat) ?? 0) + 1);
      if (data.done[m.id]) done.set(m.cat, (done.get(m.cat) ?? 0) + 1);
    }
    return { total, done };
  }, [p.allMarkers, data.done]);

  const groupStats = (gid: string) => {
    let d = 0,
      t = 0;
    for (const c of categoriesByGroup.get(gid) ?? []) {
      d += stats.done.get(c.id) ?? 0;
      t += stats.total.get(c.id) ?? 0;
    }
    return { d, t };
  };
  const overallDone = p.allMarkers.filter((m) => data.done[m.id]).length;

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return p.allMarkers
      .filter((m) => m.name.toLowerCase().includes(q) || categoryById.get(m.cat)?.name.toLowerCase().includes(q))
      .slice(0, 40);
  }, [query, p.allMarkers]);

  const toggleCat = (id: string) =>
    p.updateHidden((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const setGroupHidden = (gid: string, hide: boolean) =>
    p.updateHidden((prev) => {
      const n = new Set(prev);
      for (const c of categoriesByGroup.get(gid) ?? []) {
        if (hide) n.add(c.id);
        else n.delete(c.id);
      }
      return n;
    });
  const setAllHidden = (hide: boolean) =>
    p.updateHidden(() => (hide ? new Set([...categoryById.keys(), CUSTOM_CAT]) : new Set()));

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 1)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `leonida-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const importData = async (file: File) => {
    try {
      actions.importData(JSON.parse(await file.text()));
    } catch {
      alert("Не удалось прочитать файл");
    }
  };

  const lists = Object.entries(data.lists).sort((a, b) => a[1].createdAt - b[1].createdAt);

  return (
    <>
      {p.open && <div className="fixed inset-0 z-[900] bg-black/50 md:hidden" onClick={p.onClose} />}
      <aside
        className={`fixed inset-y-0 left-0 z-[1000] flex w-[86vw] max-w-[360px] flex-col border-r border-white/5 bg-[#12152a] transition-transform md:static md:w-[340px] md:translate-x-0 ${
          p.open ? "translate-x-0" : "-translate-x-full"
        } ${p.desktopVisible ? "" : "md:hidden"}`}
      >
        {/* header */}
        <div className="border-b border-white/5 p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-pink-400">GTA VI</div>
              <h1 className="text-lg font-bold leading-tight">Leonida Map</h1>
            </div>
            {auth.status === "signed-in" && auth.user ? (
              <div className="flex min-w-0 items-center gap-2">
                {auth.user.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={auth.user.photoURL} alt="" className="h-7 w-7 shrink-0 rounded-full" referrerPolicy="no-referrer" />
                ) : (
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-pink-500 text-xs font-bold">
                    {(auth.user.displayName || auth.user.email || "?").slice(0, 1).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0 text-right">
                  <div className="max-w-[120px] truncate text-xs">{auth.user.displayName || auth.user.email}</div>
                  <button onClick={signOut} className="text-[11px] text-slate-400 hover:text-white">
                    Выйти
                  </button>
                </div>
              </div>
            ) : auth.status === "loading" ? null : (
              <button onClick={p.onOpenAuth} className="rounded-lg bg-pink-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-pink-400">
                Войти / Регистрация
              </button>
            )}
          </div>
          {auth.status !== "signed-in" && auth.status !== "loading" && (
            <p className="mt-2 text-[11px] text-slate-500">
              {auth.status === "local" ? "Аккаунты не подключены — " : "Без входа "}прогресс хранится только в этом браузере.
            </p>
          )}
          {syncError && (
            <div className="mt-2 rounded bg-red-500/20 p-2 text-xs text-red-200" onClick={clearSyncError}>
              Ошибка синхронизации: {syncError}
            </div>
          )}
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-xs text-slate-400">
              <span>Общий прогресс</span>
              <span>
                {overallDone} / {p.allMarkers.length}
              </span>
            </div>
            <Bar done={overallDone} total={p.allMarkers.length} />
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск точек…  ( / )"
            data-search
            className="mt-3 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-pink-400"
          />
        </div>

        <div className="flex border-b border-white/5 px-3 pt-2 text-sm">
          {(
            [
              ["map", "🗺 Карта"],
              ["trophies", `🏆 Трофеи ${TROPHIES.filter((t) => data.trophies?.[t.id]).length}/${TROPHIES.length}`],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`-mb-px flex-1 border-b-2 px-2 pb-2 font-semibold transition ${
                tab === k ? "border-pink-500 text-white" : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain">
          {tab === "trophies" ? (
            <TrophiesView api={p.api} stats={stats} onShowCats={p.onShowTrophy} />
          ) : openCat && results.length === 0 ? (
            <CategoryView
              catId={openCat}
              markers={p.allMarkers.filter((m) => m.cat === openCat)}
              done={data.done}
              hidden={p.hidden.has(openCat)}
              onToggleHidden={() => toggleCat(openCat)}
              onBack={() => setOpenCat(null)}
              onFocus={p.onFocus}
              onToggleDone={(id) => actions.toggleDone(id)}
              onAllDone={(ids, on) => actions.setManyDone(ids, on)}
            />
          ) : results.length > 0 ? (
            <ul className="p-2">
              {results.map((m) => (
                <li key={m.id}>
                  <button
                    onClick={() => p.onFocus(m.id)}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-white/5"
                  >
                    <span className="shrink-0" style={iconStyle(m.icon, 22)} />
                    <span className={`flex-1 truncate ${data.done[m.id] ? "text-slate-500 line-through" : ""}`}>{m.name}</span>
                    <span className="text-[11px] text-slate-500">{categoryById.get(m.cat)?.name ?? "Моя точка"}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <>
              {/* view options */}
              <div className="flex flex-wrap gap-2 px-4 pt-3 text-xs">
                <button onClick={p.toggleHideDone} className={`rounded-full px-3 py-1 ${p.hideDone ? "bg-pink-500 text-white" : "bg-white/5"}`}>
                  {p.hideDone ? "✓ Скрыты выполненные" : "Скрыть выполненные"}
                </button>
                <button onClick={() => setAllHidden(false)} className="rounded-full bg-white/5 px-3 py-1">
                  Показать всё
                </button>
                <button onClick={() => setAllHidden(true)} className="rounded-full bg-white/5 px-3 py-1">
                  Скрыть всё
                </button>
              </div>

              {/* my lists */}
              <section className="px-4 pt-4">
                <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Мои списки</h2>
                <ul className="space-y-1">
                  {lists.map(([id, l]) => {
                    const ids = Object.keys(l.items ?? {});
                    const d = ids.filter((i) => data.done[i]).length;
                    const active = p.listFilter === id;
                    return (
                      <li key={id} className={`group rounded-lg p-2 ${active ? "bg-pink-500/15 ring-1 ring-pink-400/50" : "hover:bg-white/5"}`}>
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: l.color }} />
                          <button className="flex-1 truncate text-left text-sm" onClick={() => p.setListFilter(active ? null : id)} title="Показать только этот список">
                            {l.name}
                          </button>
                          <span className="text-xs text-slate-400">
                            {d}/{ids.length}
                          </span>
                          <button
                            className="text-xs text-slate-500 opacity-60 hover:text-slate-200 md:opacity-0 md:group-hover:opacity-100"
                            onClick={() => {
                              const name = prompt("Новое название списка", l.name);
                              if (name?.trim()) actions.renameList(id, name.trim());
                            }}
                          >
                            ✎
                          </button>
                          <button
                            className="text-xs text-slate-500 opacity-60 hover:text-red-300 md:opacity-0 md:group-hover:opacity-100"
                            onClick={() => {
                              if (confirm(`Удалить список «${l.name}»? Точки останутся на карте.`)) {
                                if (active) p.setListFilter(null);
                                actions.deleteList(id);
                              }
                            }}
                          >
                            ✕
                          </button>
                        </div>
                        <div className="mt-1.5">
                          <Bar done={d} total={ids.length} color={l.color} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <form
                  className="mt-2 flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (newList.trim()) actions.createList(newList.trim());
                    setNewList("");
                  }}
                >
                  <input
                    value={newList}
                    onChange={(e) => setNewList(e.target.value)}
                    placeholder="Новый список (напр. Лут, Оружие)"
                    className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-sm outline-none focus:border-pink-400"
                  />
                  <button className="rounded-lg bg-white/10 px-3 text-sm">＋</button>
                </form>
                {p.customMarkers.length > 0 && (
                  <button
                    onClick={() => toggleCat(CUSTOM_CAT)}
                    className={`mt-2 flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-white/5 ${p.hidden.has(CUSTOM_CAT) ? "opacity-40" : ""}`}
                  >
                    <span>★ Мои точки</span>
                    <span className="text-xs text-slate-400">{p.customMarkers.length}</span>
                  </button>
                )}
              </section>

              {/* categories */}
              {sections.map((s) => (
                <section key={s.id} className="px-4 pt-5">
                  <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">{s.name}</h2>
                  {groups
                    .filter((g) => g.section === s.id)
                    .map((g) => {
                      const { d, t } = groupStats(g.id);
                      const isCollapsed = collapsed.has(g.id);
                      const cats = categoriesByGroup.get(g.id) ?? [];
                      const allHidden = cats.every((c) => p.hidden.has(c.id));
                      return (
                        <div key={g.id} className="mb-3 rounded-xl bg-white/[0.03] p-2">
                          <div className="flex items-center gap-2 px-1">
                            <button
                              className="flex flex-1 items-center gap-1.5 text-left text-sm font-semibold"
                              onClick={() =>
                                setCollapsed((prev) => {
                                  const n = new Set(prev);
                                  if (n.has(g.id)) n.delete(g.id);
                                  else n.add(g.id);
                                  return n;
                                })
                              }
                            >
                              <span className={`text-[10px] text-slate-500 transition-transform ${isCollapsed ? "" : "rotate-90"}`}>▶</span>
                              {g.name}
                            </button>
                            <span className="text-xs text-slate-400">
                              {d}/{t}
                            </span>
                            <button className="text-[11px] text-slate-400 hover:text-white" onClick={() => setGroupHidden(g.id, !allHidden)}>
                              {allHidden ? "показать" : "скрыть"}
                            </button>
                          </div>
                          <div className="mt-1.5 px-1">
                            <Bar done={d} total={t} color={groupColor(g.id)} />
                          </div>
                          {!isCollapsed && (
                            <ul className="mt-2 grid grid-cols-1 gap-0.5">
                              {cats.map((c) => {
                                const cd = stats.done.get(c.id) ?? 0;
                                const ct = stats.total.get(c.id) ?? 0;
                                const off = p.hidden.has(c.id);
                                return (
                                  <li key={c.id} className="flex items-center gap-1">
                                    <button
                                      onClick={() => setOpenCat(c.id)}
                                      title={categoryHint(c.id) ?? "Открыть список точек"}
                                      className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1.5 py-1 text-left hover:bg-white/5 ${off ? "opacity-35" : ""}`}
                                    >
                                      <span className="shrink-0" style={iconStyle(c.icon, 22)} />
                                      <span className="min-w-0 flex-1">
                                        <span className="flex items-center justify-between gap-2 text-[13px]">
                                          <span className="truncate">{c.name}</span>
                                          <span className={`shrink-0 text-[11px] ${cd === ct && ct > 0 ? "text-emerald-400" : "text-slate-400"}`}>
                                            {cd}/{ct}
                                          </span>
                                        </span>
                                        <span className="mt-1 block">
                                          <Bar done={cd} total={ct} color={groupColor(g.id)} />
                                        </span>
                                      </span>
                                    </button>
                                    <button
                                      onClick={() => toggleCat(c.id)}
                                      title={off ? "Показать на карте" : "Скрыть с карты"}
                                      className={`grid h-7 w-7 shrink-0 place-items-center rounded-md text-sm hover:bg-white/10 ${off ? "text-slate-600" : "text-slate-300"}`}
                                    >
                                      <EyeIcon off={off} />
                                    </button>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                      );
                    })}
                </section>
              ))}

              {/* backup */}
              <section className="flex gap-2 px-4 py-5 text-xs">
                <button onClick={exportData} className="flex-1 rounded-lg bg-white/5 py-2 hover:bg-white/10">
                  Экспорт JSON
                </button>
                <button onClick={() => fileRef.current?.click()} className="flex-1 rounded-lg bg-white/5 py-2 hover:bg-white/10">
                  Импорт JSON
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])}
                />
              </section>
              <p className="px-4 pb-6 text-[11px] leading-relaxed text-slate-500">
                Карта: официальный постер Rockstar Games. Расположение точек — по данным IGN/MapGenie. Некоммерческий фан-проект.
              </p>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
