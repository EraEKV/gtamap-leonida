"use client";

import { useState } from "react";

export type Settings = { legend: boolean; clusters: boolean; hideDone: boolean; iconScale: number };

function Toggle({ on, onClick, label, hint }: { on: boolean; onClick: () => void; label: string; hint?: string }) {
  return (
    <button onClick={onClick} className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-white/5">
      <span>
        <span className="block text-[13px]">{label}</span>
        {hint && <span className="block text-[11px] text-slate-500">{hint}</span>}
      </span>
      <span className={`relative h-5 w-9 shrink-0 rounded-full transition ${on ? "bg-pink-500" : "bg-white/15"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
      </span>
    </button>
  );
}

/** Collapsible map settings card in the bottom-right corner (open by default on desktop). */
export default function MapSettings({ settings, onChange }: { settings: Settings; onChange: (p: Partial<Settings>) => void }) {
  const [open, setOpen] = useState(() => typeof window !== "undefined" && window.innerWidth >= 768);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="absolute bottom-4 right-3 z-[600] rounded-xl bg-[#161a2b]/90 px-3 py-2 text-sm font-semibold shadow-lg backdrop-blur hover:bg-[#1d2238]"
      >
        ⚙ Карта
      </button>
    );
  }

  return (
    <div className="absolute bottom-4 right-3 z-[600] w-60 rounded-2xl border border-white/10 bg-[#12152a]/92 p-2 shadow-2xl backdrop-blur">
      <div className="flex items-center justify-between px-2 pb-1 pt-0.5">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Карта</span>
        <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white" aria-label="Свернуть">
          ▾
        </button>
      </div>
      <div className="hidden md:block">
        <Toggle on={settings.legend} onClick={() => onChange({ legend: !settings.legend })} label="Легенда" hint="панель категорий слева" />
      </div>
      <Toggle on={settings.clusters} onClick={() => onChange({ clusters: !settings.clusters })} label="Группировать точки" hint="числа вместо каши на отдалении" />
      <Toggle on={settings.hideDone} onClick={() => onChange({ hideDone: !settings.hideDone })} label="Скрыть выполненные" />
      <div className="px-2 pb-1 pt-2">
        <div className="mb-1.5 text-[13px]">Размер иконок</div>
        <div className="grid grid-cols-3 gap-1 rounded-lg bg-black/30 p-0.5 text-xs">
          {[
            ["S", 0.8],
            ["M", 1],
            ["L", 1.25],
          ].map(([label, v]) => (
            <button
              key={label}
              onClick={() => onChange({ iconScale: v as number })}
              className={`rounded-md py-1 ${settings.iconScale === v ? "bg-pink-500 text-white" : "text-slate-300 hover:bg-white/5"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
