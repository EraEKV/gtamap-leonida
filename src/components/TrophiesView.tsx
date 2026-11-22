"use client";

import { useState } from "react";
import { TIER_META, TROPHIES, type Trophy } from "@/data/trophies";
import { categoryById } from "@/lib/mapData";
import type { UserDataApi } from "@/lib/useUserData";
import SpoilerConfirm from "./SpoilerConfirm";

type CatStats = { total: Map<string, number>; done: Map<string, number> };
type Props = {
  api: UserDataApi;
  stats: CatStats;
  onShowCats: (trophy: Trophy) => void;
};

/** Progress derived from map check-marks for trophies linked to map categories. */
export function mapProgress(t: Trophy, s: CatStats): { cur: number; target: number } | null {
  const m = t.map;
  if (!m || m.mode === "where") return null;
  const done = m.cats.reduce((a, c) => a + (s.done.get(c) ?? 0), 0);
  const total = m.cats.reduce((a, c) => a + (s.total.get(c) ?? 0), 0);
  if (m.mode === "count") return { cur: Math.min(done, m.target ?? total), target: m.target ?? total };
  if (m.mode === "all") return { cur: done, target: total };
  return { cur: m.cats.filter((c) => (s.done.get(c) ?? 0) > 0).length, target: m.cats.length };
}

type Filter = "all" | "todo" | "map";
const SECTIONS: { key: string; title: string; test: (t: Trophy) => boolean; note?: string }[] = [
  { key: "open", title: "Открытый мир", test: (t) => !t.spoiler && !t.hidden },
  { key: "hidden", title: "Скрытые на PSN (без спойлеров)", test: (t) => !t.spoiler && t.hidden, note: "Скрыты в игре, но к сюжету не относятся — показываем." },
  { key: "story", title: "Сюжет", test: (t) => t.spoiler?.kind === "story", note: "Название откроется после подтверждения." },
  { key: "side", title: "Побочные линейки", test: (t) => t.spoiler?.kind === "side", note: "Название откроется после подтверждения." },
];

function Medal({ t, dim }: { t: Trophy; dim?: boolean }) {
  const meta = TIER_META[t.tier];
  return (
    <span
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-base ring-1 ${dim ? "opacity-50 grayscale" : ""}`}
      style={{ background: `${meta.color}26`, color: meta.color, boxShadow: `inset 0 0 0 1px ${meta.color}55` }}
      title={meta.label}
    >
      🏆
    </span>
  );
}

export default function TrophiesView({ api, stats, onShowCats }: Props) {
  const { data, actions } = api;
  const earned = data.trophies ?? {};
  const revealed = data.revealed ?? {};
  const [filter, setFilterState] = useState<Filter>("all");
  // ids that were not earned when "Не получены" was chosen: keep them listed (with a check) after marking,
  // so a freshly earned trophy doesn't vanish from under the cursor
  const [todoSnapshot, setTodoSnapshot] = useState<Set<string>>(new Set());
  const setFilter = (f: Filter) => {
    if (f === "todo") setTodoSnapshot(new Set(TROPHIES.filter((t) => !earned[t.id]).map((t) => t.id)));
    setFilterState(f);
  };
  const [confirm, setConfirm] = useState<{ t: Trophy; intent: "view" | "earn" } | null>(null);

  const total = TROPHIES.length;
  const got = TROPHIES.filter((t) => earned[t.id]).length;
  const platinum = TROPHIES.find((t) => t.tier === "platinum")!;

  const visible = TROPHIES.filter((t) => {
    if (filter === "todo") return todoSnapshot.has(t.id);
    if (filter === "map") return !!t.map;
    return true;
  });

  const card = (t: Trophy) => {
    const isEarned = !!earned[t.id];
    const locked = !!t.spoiler && !revealed[t.id];
    const prog = mapProgress(t, stats);
    const meta = TIER_META[t.tier];

    if (locked) {
      return (
        <li key={t.id} className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-2.5">
          <div className="flex items-center gap-3">
            <Medal t={t} dim={!isEarned} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-[13px] font-semibold">
                <span className="select-none blur-[5px]" aria-hidden>
                  ████████ ████
                </span>
                {isEarned && <span className="text-emerald-400">✓</span>}
              </div>
              <div className="text-[11px] text-amber-300/90">
                {t.spoiler!.kind === "story" ? "Сюжет" : "Побочное"} · {t.spoiler!.label} · <span style={{ color: meta.color }}>{meta.label}</span>
              </div>
            </div>
          </div>
          <div className="mt-2 flex gap-1.5">
            <button onClick={() => setConfirm({ t, intent: "view" })} className="flex-1 rounded-lg bg-white/5 py-1.5 text-xs hover:bg-white/10">
              👁 Показать
            </button>
            <button
              onClick={() => (isEarned ? actions.toggleTrophy(t.id, false) : setConfirm({ t, intent: "earn" }))}
              className={`flex-1 rounded-lg py-1.5 text-xs ${isEarned ? "bg-emerald-500/20 text-emerald-300" : "bg-white/5 hover:bg-white/10"}`}
            >
              {isEarned ? "✓ Получен" : "Отметить"}
            </button>
          </div>
        </li>
      );
    }

    return (
      <li key={t.id} className={`rounded-xl p-2.5 ${isEarned ? "bg-emerald-500/[0.07] ring-1 ring-emerald-400/20" : "bg-white/[0.03]"}`}>
        <div className="flex items-start gap-3">
          <Medal t={t} dim={!isEarned} />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className={`text-[13px] font-semibold leading-snug ${isEarned ? "text-emerald-200" : ""}`}>{t.name}</div>
              <button
                onClick={() => actions.toggleTrophy(t.id)}
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border text-xs ${
                  isEarned ? "border-emerald-500 bg-emerald-500 text-white" : "border-white/20 text-transparent hover:border-white/50"
                }`}
                title={isEarned ? "Снять отметку" : "Отметить полученным"}
              >
                ✓
              </button>
            </div>
            <div className="mt-0.5 text-xs leading-snug text-slate-300">{t.ru}</div>
            <div className="mt-0.5 text-[11px] italic text-slate-500">{t.desc}</div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
              <span style={{ color: meta.color }}>{meta.label}</span>
              {t.hidden && <span className="rounded bg-white/10 px-1.5 py-0.5 text-slate-400">скрытый на PSN</span>}
              {t.spoiler && (
                <button onClick={() => actions.hideTrophy(t.id)} className="rounded bg-white/10 px-1.5 py-0.5 text-slate-400 hover:text-white">
                  спрятать снова
                </button>
              )}
            </div>
            {t.map && (
              <div className="mt-2">
                {prog && (
                  <>
                    <div className="mb-1 flex justify-between text-[11px] text-slate-400">
                      <span>По отметкам на карте</span>
                      <span className={prog.cur >= prog.target ? "text-emerald-400" : ""}>
                        {prog.cur}/{prog.target}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-pink-500 transition-all" style={{ width: `${Math.min(100, (prog.cur / Math.max(1, prog.target)) * 100)}%` }} />
                    </div>
                  </>
                )}
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <button onClick={() => onShowCats(t)} className="rounded-md bg-white/5 px-2 py-1 text-[11px] hover:bg-white/10" title={t.map.cats.map((c) => categoryById.get(c)?.name).join(", ")}>
                    🗺 Показать на карте
                  </button>
                  {prog && prog.cur >= prog.target && !isEarned && (
                    <button onClick={() => actions.toggleTrophy(t.id, true)} className="rounded-md bg-emerald-500/20 px-2 py-1 text-[11px] text-emerald-300 hover:bg-emerald-500/30">
                      Всё собрано — отметить трофей
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </li>
    );
  };

  return (
    <div className="p-3">
      {/* summary */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-500/20 via-pink-500/10 to-transparent p-3 ring-1 ring-white/10">
        <div className="flex items-center gap-3">
          <Medal t={platinum} dim={!earned[platinum.id]} />
          <div className="flex-1">
            <div className="text-sm font-bold">Трофеи GTA VI</div>
            <div className="text-xs text-slate-400">
              {got} / {total} получено
            </div>
          </div>
          <div className="text-lg font-bold text-pink-300">{Math.round((got / total) * 100)}%</div>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-pink-500 to-indigo-400 transition-all" style={{ width: `${(got / total) * 100}%` }} />
        </div>
        <div className="mt-2 grid grid-cols-4 gap-1 text-center text-[10px]">
          {(["platinum", "gold", "silver", "bronze"] as const).map((tier) => {
            const all = TROPHIES.filter((t) => t.tier === tier);
            return (
              <div key={tier} className="rounded-md bg-black/20 py-1">
                <div style={{ color: TIER_META[tier].color }}>{TIER_META[tier].label}</div>
                <div className="text-slate-300">
                  {all.filter((t) => earned[t.id]).length}/{all.length}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex gap-1.5 text-xs">
        {(
          [
            ["all", "Все"],
            ["todo", "Не получены"],
            ["map", "С картой"],
          ] as const
        ).map(([k, label]) => (
          <button key={k} onClick={() => setFilter(k)} className={`rounded-full px-3 py-1 ${filter === k ? "bg-pink-500 text-white" : "bg-white/5 hover:bg-white/10"}`}>
            {label}
          </button>
        ))}
      </div>

      {SECTIONS.map((s) => {
        const all = TROPHIES.filter(s.test);
        const items = visible.filter(s.test);
        if (!items.length) return null;
        return (
          <section key={s.key} className="mt-4">
            <div className="mb-1.5 flex items-baseline justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">{s.title}</h3>
              <span className="text-[11px] text-slate-500">
                {all.filter((t) => earned[t.id]).length}/{all.length}
              </span>
            </div>
            {s.note && <p className="mb-1.5 text-[11px] text-slate-500">{s.note}</p>}
            <ul className="space-y-1.5">{items.map(card)}</ul>
          </section>
        );
      })}

      <p className="mt-5 text-[10px] leading-relaxed text-slate-600">
        Список трофеев — по данным gamerfuzion.com, gtaside.com, cultr.com, leonipedia.com (ноябрь 2026).
      </p>

      {confirm && (
        <SpoilerConfirm
          trophy={confirm.t}
          intent={confirm.intent}
          onCancel={() => setConfirm(null)}
          onConfirm={(mark) => {
            actions.revealTrophy(confirm.t.id, mark);
            setConfirm(null);
          }}
        />
      )}
    </div>
  );
}
