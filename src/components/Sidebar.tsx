"use client";

import { useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronRight,
  Cloud,
  Download,
  Eye,
  EyeOff,
  HardDrive,
  Keyboard,
  ListPlus,
  LogIn,
  LogOut,
  MapPin,
  MoreHorizontal,
  Pencil,
  Search,
  Star,
  Trash2,
  Trophy as TrophyIcon,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { CUSTOM_CAT, categoriesByGroup, categoryById, gridRef, groupById, groupColor, iconStyle, type Marker } from "@/lib/mapData";
import { GROUP_PRIORITY, categoryHint } from "@/lib/categoryInfo";
import { TROPHIES, type Trophy } from "@/data/trophies";
import type { UserDataApi } from "@/lib/useUserData";
import TrophiesView from "./TrophiesView";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Props = {
  api: UserDataApi;
  allMarkers: Marker[];
  customMarkers: Marker[];
  hidden: Set<string>;
  updateHidden: (fn: (prev: Set<string>) => Set<string>) => void;
  listFilter: string | null;
  setListFilter: (id: string | null) => void;
  onFocus: (id: string) => void;
  open: boolean;
  desktopVisible: boolean;
  onClose: () => void;
  onOpenAuth: () => void;
  onShowTrophy: (t: Trophy) => void;
  onShowShortcuts: () => void;
};

export function Bar({ done, total, color = "var(--primary)", className = "h-1.5" }: { done: number; total: number; color?: string; className?: string }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className={`w-full overflow-hidden rounded-full bg-white/10 ${className}`}>
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

const iconBtn = "grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground";

// ---------------------------------------------------------------------------------------------
/** Drill-in: all points of one category with "go to" and quick done toggles. */
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
      <button onClick={p.onBack} className="mb-3 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft size={14} /> Все категории
      </button>
      <div className="flex items-center gap-3">
        {cat && <span className="shrink-0" style={iconStyle(cat.icon, 36)} />}
        <div className="min-w-0 flex-1">
          <div className="font-bold">{cat?.name ?? "Мои точки"}</div>
          <div className="text-xs text-muted-foreground">
            {d} / {p.markers.length} выполнено
          </div>
        </div>
        <button onClick={p.onToggleHidden} className={iconBtn} title={p.hidden ? "Показать на карте" : "Скрыть с карты"}>
          {p.hidden ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {hint && <p className="mt-2 rounded-lg bg-white/5 p-2 text-xs leading-relaxed text-muted-foreground">{hint}</p>}
      <div className="mt-2">
        <Bar done={d} total={p.markers.length} color={cat ? groupColor(cat.group) : undefined} />
      </div>
      <ul className="mt-3 space-y-0.5">
        {sorted.map((m) => {
          const isDone = !!p.done[m.id];
          return (
            <li key={m.id} className="flex items-center gap-1 rounded-lg hover:bg-accent/60">
              <button
                onClick={() => p.onToggleDone(m.id)}
                className={`ml-1 grid size-5 shrink-0 place-items-center rounded-md border text-[11px] ${
                  isDone ? "border-emerald-500 bg-emerald-500 text-white" : "border-white/20 text-transparent hover:border-white/50"
                }`}
                title={isDone ? "Снять отметку" : "Отметить выполненным"}
              >
                ✓
              </button>
              <button onClick={() => p.onFocus(m.id)} className="flex min-w-0 flex-1 items-center justify-between gap-2 px-1.5 py-1.5 text-left text-[13px]">
                <span className={`truncate ${isDone ? "text-muted-foreground line-through" : ""}`}>{m.name}</span>
                <span className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
                  {gridRef(m.x, m.y) ?? ""} <MapPin size={12} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {p.markers.length > 1 && (
        <button
          onClick={() => p.onAllDone(p.markers.map((m) => m.id), d < p.markers.length)}
          className="mt-3 w-full rounded-lg bg-white/5 py-2 text-xs hover:bg-white/10"
        >
          {d < p.markers.length ? "Отметить все" : "Снять все отметки"}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
export default function Sidebar(p: Props) {
  const { data, auth, actions, signOut, syncError, clearSyncError } = p.api;
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [newList, setNewList] = useState("");
  const [openCat, setOpenCat] = useState<string | null>(null);
  const [openList, setOpenList] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState<{ id: string; name: string } | null>(null);
  const [tab, setTab] = useState("categories");
  const [avatarFailed, setAvatarFailed] = useState(false);
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
  const trophiesGot = TROPHIES.filter((t) => data.trophies?.[t.id]).length;

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return p.allMarkers
      .filter((m) => m.name.toLowerCase().includes(q) || categoryById.get(m.cat)?.name.toLowerCase().includes(q))
      .slice(0, 50);
  }, [query, p.allMarkers]);

  const toggleCat = (id: string) =>
    p.updateHidden((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const setGroupHidden = (gid: string, hide: boolean) => {
    // a fully hidden group folds up; it only opens again when you click it
    if (hide)
      setExpanded((prev) => {
        const n = new Set(prev);
        n.delete(gid);
        return n;
      });
    p.updateHidden((prev) => {
      const n = new Set(prev);
      for (const c of categoriesByGroup.get(gid) ?? []) {
        if (hide) n.add(c.id);
        else n.delete(c.id);
      }
      return n;
    });
  };
  const setAllHidden = (hide: boolean) => {
    if (hide) setExpanded(new Set());
    p.updateHidden(() => (hide ? new Set([...categoryById.keys(), CUSTOM_CAT]) : new Set()));
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 1)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `leonida-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("Прогресс сохранён в файл");
  };
  const importData = async (file: File) => {
    try {
      actions.importData(JSON.parse(await file.text()));
      toast.success("Прогресс импортирован");
    } catch {
      toast.error("Не удалось прочитать файл");
    }
  };

  const lists = Object.entries(data.lists).sort((a, b) => a[1].createdAt - b[1].createdAt);
  const signedIn = auth.status === "signed-in" && !!auth.user;
  const userName = auth.user?.displayName || auth.user?.email || "";

  return (
    <>
      {p.open && <div className="fixed inset-0 z-[900] bg-black/50 md:hidden" onClick={p.onClose} />}
      <aside
        className={`fixed inset-y-0 left-0 z-[1000] flex w-[88vw] max-w-[360px] flex-col border-r border-border bg-card transition-transform md:static md:w-[340px] md:translate-x-0 ${
          p.open ? "translate-x-0" : "-translate-x-full"
        } ${p.desktopVisible ? "" : "md:hidden"}`}
      >
        {/* ---------------- header ---------------- */}
        <div className="space-y-3 border-b border-border p-4 pb-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-primary">GTA VI</div>
              <h1 className="text-lg font-bold leading-tight">Leonida Map</h1>
            </div>
            <div className="flex items-center gap-1">
              {!signedIn && auth.status !== "loading" && (
                <button onClick={p.onOpenAuth} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
                  <LogIn size={14} /> Войти
                </button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className={signedIn ? "rounded-full ring-2 ring-transparent hover:ring-primary/50" : iconBtn} aria-label="Меню">
                    {signedIn ? (
                      auth.user!.photoURL && !avatarFailed ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={auth.user!.photoURL}
                          alt=""
                          className="size-8 rounded-full bg-primary"
                          referrerPolicy="no-referrer"
                          onError={() => setAvatarFailed(true)}
                        />
                      ) : (
                        <span className="grid size-8 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                          {userName.slice(0, 1).toUpperCase()}
                        </span>
                      )
                    ) : (
                      <MoreHorizontal size={18} />
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {signedIn && (
                    <>
                      <DropdownMenuLabel className="truncate font-normal text-muted-foreground">{userName}</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem onSelect={exportData}>
                    <Download /> Экспорт прогресса
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => fileRef.current?.click()}>
                    <Upload /> Импорт из файла
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={p.onShowShortcuts}>
                    <Keyboard /> Горячие клавиши
                  </DropdownMenuItem>
                  {signedIn && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={signOut} variant="destructive">
                        <LogOut /> Выйти
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              <input
                ref={fileRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])}
              />
            </div>
          </div>

          {/* save status */}
          {syncError ? (
            <button onClick={clearSyncError} className="w-full rounded-lg bg-destructive/15 p-2 text-left text-xs text-red-200">
              {syncError}
            </button>
          ) : (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              {signedIn ? (
                <>
                  <Cloud size={12} className="text-emerald-400" /> Сохраняется в аккаунт
                </>
              ) : (
                <>
                  <HardDrive size={12} /> Сохраняется только в этом браузере
                  {auth.status === "signed-out" && (
                    <button onClick={p.onOpenAuth} className="text-primary hover:underline">
                      — войти
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          <div>
            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
              <span>Отмечено точек</span>
              <span className="tabular-nums">
                {overallDone} / {p.allMarkers.length}
              </span>
            </div>
            <Bar done={overallDone} total={p.allMarkers.length} />
          </div>

          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Поиск точки или категории…" className="h-9 pl-8 pr-8" data-search />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Очистить">
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* ---------------- search results ---------------- */}
        {query.trim().length >= 2 ? (
          <div className="flex-1 overflow-y-auto overscroll-contain p-2">
            {results.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">Ничего не нашлось</p>
            ) : (
              <ul>
                {results.map((m) => (
                  <li key={m.id}>
                    <button onClick={() => p.onFocus(m.id)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-accent">
                      <span className="shrink-0" style={iconStyle(m.icon, 22)} />
                      <span className={`flex-1 truncate ${data.done[m.id] ? "text-muted-foreground line-through" : ""}`}>{m.name}</span>
                      <span className="text-[11px] text-muted-foreground">{categoryById.get(m.cat)?.name ?? "Моя точка"}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col gap-0">
            <TabsList className="mx-3 mt-2 grid h-9 w-auto grid-cols-3">
              <TabsTrigger value="categories" className="text-xs">
                Категории
              </TabsTrigger>
              <TabsTrigger value="lists" className="text-xs">
                Списки{lists.length ? ` · ${lists.length}` : ""}
              </TabsTrigger>
              <TabsTrigger value="trophies" className="gap-1 text-xs">
                <TrophyIcon size={12} /> {trophiesGot}/{TROPHIES.length}
              </TabsTrigger>
            </TabsList>

            {/* ---------------- categories ---------------- */}
            <TabsContent value="categories" className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {openCat ? (
                <CategoryView
                  catId={openCat}
                  markers={p.allMarkers.filter((m) => m.cat === openCat)}
                  done={data.done}
                  hidden={p.hidden.has(openCat)}
                  onToggleHidden={() => toggleCat(openCat)}
                  onBack={() => setOpenCat(null)}
                  onFocus={p.onFocus}
                  onToggleDone={(id) => actions.toggleDone(id)}
                  onAllDone={(ids, on) => {
                    actions.setManyDone(ids, on);
                    toast(on ? `Отмечено: ${ids.length}` : "Отметки сняты", {
                      action: { label: "Отменить", onClick: () => actions.setManyDone(ids, !on) },
                    });
                  }}
                />
              ) : (
                <div className="p-3">
                  <div className="mb-2 flex items-center justify-between px-1">
                    <p className="text-[11px] text-muted-foreground">Нажми на категорию — список точек. Глаз — показать/скрыть.</p>
                  </div>
                  <div className="mb-2 flex gap-1.5 text-xs">
                    <button onClick={() => setAllHidden(false)} className="flex items-center gap-1 rounded-md bg-white/5 px-2 py-1 hover:bg-white/10">
                      <Eye size={13} /> Все
                    </button>
                    <button onClick={() => setAllHidden(true)} className="flex items-center gap-1 rounded-md bg-white/5 px-2 py-1 hover:bg-white/10">
                      <EyeOff size={13} /> Никаких
                    </button>
                    <button
                      onClick={() => setExpanded((e) => (e.size ? new Set() : new Set(GROUP_PRIORITY)))}
                      className="ml-auto rounded-md px-2 py-1 text-muted-foreground hover:bg-white/5 hover:text-foreground"
                    >
                      {expanded.size ? "Свернуть всё" : "Развернуть всё"}
                    </button>
                  </div>

                  {p.customMarkers.length > 0 && (
                    <div className="mb-1.5 flex items-center gap-2 rounded-xl bg-white/[0.03] p-2">
                      <span className="mk-custom grid size-6 shrink-0 text-[11px]">★</span>
                      <span className="flex-1 text-sm font-semibold">Мои точки</span>
                      <span className="text-xs text-muted-foreground">{p.customMarkers.length}</span>
                      <button onClick={() => toggleCat(CUSTOM_CAT)} className={iconBtn}>
                        {p.hidden.has(CUSTOM_CAT) ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  )}

                  {GROUP_PRIORITY.map((gid) => {
                    const g = groupById.get(gid);
                    if (!g) return null;
                    const { d, t } = groupStats(gid);
                    const cats = categoriesByGroup.get(gid) ?? [];
                    const allHidden = cats.every((c) => p.hidden.has(c.id));
                    const isOpen = expanded.has(gid);
                    return (
                      <div key={gid} className="mb-1.5 rounded-xl bg-white/[0.03]">
                        <div className="flex items-center gap-2 p-2">
                          <button
                            className="flex min-w-0 flex-1 items-center gap-2 text-left"
                            onClick={() =>
                              setExpanded((prev) => {
                                const n = new Set(prev);
                                if (n.has(gid)) n.delete(gid);
                                else n.add(gid);
                                return n;
                              })
                            }
                          >
                            <ChevronRight size={15} className={`shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-90" : ""}`} />
                            <span className="shrink-0" style={iconStyle(cats[0]?.icon ?? "", 20)} />
                            <span className={`min-w-0 flex-1 ${allHidden ? "opacity-40" : ""}`}>
                              <span className="flex items-center justify-between gap-2">
                                <span className="truncate text-sm font-semibold">{g.name}</span>
                                <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                                  {d}/{t}
                                </span>
                              </span>
                              <span className="mt-1 block">
                                <Bar done={d} total={t} color={groupColor(gid)} className="h-1" />
                              </span>
                            </span>
                          </button>
                          <button onClick={() => setGroupHidden(gid, !allHidden)} className={iconBtn} title={allHidden ? "Показать группу" : "Скрыть группу"}>
                            {allHidden ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                        {isOpen && (
                          <ul className="px-1.5 pb-1.5">
                            {cats.map((c) => {
                              const cd = stats.done.get(c.id) ?? 0;
                              const ct = stats.total.get(c.id) ?? 0;
                              const off = p.hidden.has(c.id);
                              return (
                                <li key={c.id} className="flex items-center gap-1">
                                  <button
                                    onClick={() => setOpenCat(c.id)}
                                    title={categoryHint(c.id) ?? undefined}
                                    className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1.5 py-1 text-left hover:bg-accent/60 ${off ? "opacity-40" : ""}`}
                                  >
                                    <span className="shrink-0" style={iconStyle(c.icon, 22)} />
                                    <span className="min-w-0 flex-1">
                                      <span className="flex items-center justify-between gap-2 text-[13px]">
                                        <span className="truncate">{c.name}</span>
                                        <span className={`shrink-0 text-[11px] tabular-nums ${cd === ct && ct > 0 ? "text-emerald-400" : "text-muted-foreground"}`}>
                                          {cd}/{ct}
                                        </span>
                                      </span>
                                      <span className="mt-1 block">
                                        <Bar done={cd} total={ct} color={groupColor(gid)} className="h-1" />
                                      </span>
                                    </span>
                                  </button>
                                  <button onClick={() => toggleCat(c.id)} className={iconBtn} title={off ? "Показать на карте" : "Скрыть с карты"}>
                                    {off ? <EyeOff size={15} /> : <Eye size={15} />}
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                  <p className="px-1 pb-4 pt-3 text-[10px] leading-relaxed text-muted-foreground/70">
                    Карта: официальный постер Rockstar Games. Расположение точек — по данным IGN/MapGenie. Некоммерческий фан-проект.
                  </p>
                </div>
              )}
            </TabsContent>

            {/* ---------------- lists ---------------- */}
            <TabsContent value="lists" className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newList.trim()) return;
                  actions.createList(newList.trim());
                  toast.success(`Список «${newList.trim()}» создан`);
                  setNewList("");
                }}
              >
                <Input value={newList} onChange={(e) => setNewList(e.target.value)} placeholder="Новый список: Лут, Оружие…" className="h-9" />
                <button className="flex shrink-0 items-center gap-1 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
                  <ListPlus size={14} /> Создать
                </button>
              </form>

              {lists.length === 0 ? (
                <div className="mt-6 rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                  <ListPlus className="mx-auto mb-2 opacity-60" />
                  Списки — твои подборки точек: «Лут», «Оружие», «Куда съездить».
                  <br />
                  <span className="text-xs">Добавлять: правый клик по точке → «В список», или в карточке точки.</span>
                </div>
              ) : (
                <ul className="mt-3 space-y-1.5">
                  {lists.map(([id, l]) => {
                    const ids = Object.keys(l.items ?? {});
                    const d = ids.filter((i) => data.done[i]).length;
                    const active = p.listFilter === id;
                    const isOpen = openList === id;
                    return (
                      <li key={id} className={`rounded-xl p-2.5 ${active ? "bg-primary/10 ring-1 ring-primary/40" : "bg-white/[0.03]"}`}>
                        <div className="flex items-center gap-2">
                          <span className="size-2.5 shrink-0 rounded-full" style={{ background: l.color }} />
                          {renaming?.id === id ? (
                            <form
                              className="flex-1"
                              onSubmit={(e) => {
                                e.preventDefault();
                                if (renaming.name.trim()) actions.renameList(id, renaming.name.trim());
                                setRenaming(null);
                              }}
                            >
                              <Input
                                autoFocus
                                value={renaming.name}
                                onChange={(e) => setRenaming({ id, name: e.target.value })}
                                onBlur={() => setRenaming(null)}
                                className="h-7 text-sm"
                              />
                            </form>
                          ) : (
                            <button className="flex min-w-0 flex-1 items-center gap-1 text-left text-sm font-semibold" onClick={() => setOpenList(isOpen ? null : id)}>
                              <ChevronRight size={14} className={`shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-90" : ""}`} />
                              <span className="truncate">{l.name}</span>
                            </button>
                          )}
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {d}/{ids.length}
                          </span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className={iconBtn} aria-label="Действия со списком">
                                <MoreHorizontal size={15} />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => setRenaming({ id, name: l.name })}>
                                <Pencil /> Переименовать
                              </DropdownMenuItem>
                              <DropdownMenuItem variant="destructive" onSelect={() => setDeleting({ id, name: l.name })}>
                                <Trash2 /> Удалить
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <div className="mt-2">
                          <Bar done={d} total={ids.length} color={l.color} />
                        </div>
                        <button
                          onClick={() => p.setListFilter(active ? null : id)}
                          disabled={!ids.length}
                          className={`mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs disabled:opacity-40 ${
                            active ? "bg-primary text-primary-foreground" : "bg-white/5 hover:bg-white/10"
                          }`}
                        >
                          <MapPin size={13} /> {active ? "Показан на карте — убрать фильтр" : "Показать только этот список"}
                        </button>
                        {isOpen && (
                          <ul className="mt-2 space-y-0.5">
                            {ids.length === 0 && <li className="px-1 text-xs text-muted-foreground">Пусто. ПКМ по точке → «В список».</li>}
                            {ids.map((mid) => {
                              const m = p.allMarkers.find((x) => x.id === mid);
                              if (!m) return null;
                              return (
                                <li key={mid} className="flex items-center gap-1.5 rounded-lg hover:bg-accent/60">
                                  <button onClick={() => p.onFocus(mid)} className="flex min-w-0 flex-1 items-center gap-2 px-1.5 py-1 text-left text-[13px]">
                                    {m.icon ? <span className="shrink-0" style={iconStyle(m.icon, 18)} /> : <Star size={14} className="text-primary" />}
                                    <span className={`truncate ${data.done[mid] ? "text-muted-foreground line-through" : ""}`}>{m.name}</span>
                                  </button>
                                  <button onClick={() => actions.toggleInList(id, mid)} className={iconBtn} title="Убрать из списка">
                                    <X size={13} />
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </TabsContent>

            {/* ---------------- trophies ---------------- */}
            <TabsContent value="trophies" className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <TrophiesView api={p.api} stats={stats} onShowCats={p.onShowTrophy} />
            </TabsContent>
          </Tabs>
        )}
      </aside>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить список «{deleting?.name}»?</AlertDialogTitle>
            <AlertDialogDescription>Точки останутся на карте и сохранят отметки — исчезнет только подборка.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deleting) {
                  if (p.listFilter === deleting.id) p.setListFilter(null);
                  actions.deleteList(deleting.id);
                }
                setDeleting(null);
              }}
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
