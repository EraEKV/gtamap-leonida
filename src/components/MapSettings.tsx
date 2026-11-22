"use client";

import { useState } from "react";
import { ChevronDown, EyeOff, Keyboard, Settings2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Kbd } from "@/components/ui/kbd";

export type Settings = {
  legend: boolean; // categories panel (sidebar) on desktop
  iconLegend: boolean; // icon key over the map
  clusters: boolean;
  hideDone: boolean;
  iconScale: number;
  cleanMap: boolean; // poster without labels (when available)
};

type Props = {
  settings: Settings;
  onChange: (p: Partial<Settings>) => void;
  hiddenMarkers: number;
  onResetHiddenMarkers: () => void;
  onHideUi: () => void;
  onShowShortcuts: () => void;
  cleanMapAvailable: boolean;
};

function Row({ label, hint, kbd, checked, onChange }: { label: string; hint?: string; kbd?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-accent/60">
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 text-[13px]">
          {label}
          {kbd && <Kbd className="h-4 min-w-4 px-1 text-[10px]">{kbd}</Kbd>}
        </span>
        {hint && <span className="block text-[11px] text-muted-foreground">{hint}</span>}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

/** Collapsible map settings card in the bottom-right corner (open by default on desktop). */
export default function MapSettings(p: Props) {
  const { settings: s, onChange } = p;
  const [open, setOpen] = useState(() => typeof window !== "undefined" && window.innerWidth >= 768);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="absolute bottom-4 right-3 z-[600] flex items-center gap-1.5 rounded-xl border border-border bg-card/90 px-3 py-2 text-sm font-semibold shadow-lg backdrop-blur hover:bg-accent"
      >
        <Settings2 size={15} /> Карта
      </button>
    );
  }

  return (
    <div className="absolute bottom-4 right-3 z-[600] w-64 rounded-2xl border border-border bg-card/92 p-2 shadow-2xl backdrop-blur animate-in fade-in-0 slide-in-from-bottom-2">
      <button onClick={() => setOpen(false)} className="flex w-full items-center justify-between px-2 pb-1 pt-0.5 text-muted-foreground hover:text-foreground">
        <span className="text-xs font-bold uppercase tracking-wider">Карта</span>
        <ChevronDown size={16} />
      </button>
      {p.cleanMapAvailable && (
        <Row label="Без надписей" hint="постер без названий городов" checked={s.cleanMap} onChange={(v) => onChange({ cleanMap: v })} />
      )}
      <Row label="Легенда иконок" hint="что означает каждая иконка" kbd="L" checked={s.iconLegend} onChange={(v) => onChange({ iconLegend: v })} />
      <div className="hidden md:block">
        <Row label="Панель категорий" hint="прогресс и списки слева" checked={s.legend} onChange={(v) => onChange({ legend: v })} />
      </div>
      <Row label="Группировать точки" hint="числа вместо каши на отдалении" checked={s.clusters} onChange={(v) => onChange({ clusters: v })} />
      <Row label="Скрыть выполненные" checked={s.hideDone} onChange={(v) => onChange({ hideDone: v })} />

      <div className="px-2 pb-1 pt-2">
        <div className="mb-1.5 text-[13px]">Размер иконок</div>
        <div className="grid grid-cols-3 gap-1 rounded-lg bg-black/30 p-0.5 text-xs">
          {(
            [
              ["S", 0.8],
              ["M", 1],
              ["L", 1.25],
            ] as const
          ).map(([label, v]) => (
            <button
              key={label}
              onClick={() => onChange({ iconScale: v })}
              className={`rounded-md py-1 ${s.iconScale === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {p.hiddenMarkers > 0 && (
        <button onClick={p.onResetHiddenMarkers} className="mt-1 w-full rounded-lg px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-accent hover:text-foreground">
          Скрыто точек вручную: {p.hiddenMarkers} — <span className="text-primary">показать</span>
        </button>
      )}

      <div className="mt-1 grid grid-cols-2 gap-1 border-t border-border pt-1.5">
        <button onClick={p.onHideUi} className="flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground">
          <EyeOff size={13} /> Скрыть UI <Kbd className="h-4 min-w-4 px-1 text-[10px]">H</Kbd>
        </button>
        <button onClick={p.onShowShortcuts} className="flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground">
          <Keyboard size={13} /> Клавиши <Kbd className="h-4 min-w-4 px-1 text-[10px]">?</Kbd>
        </button>
      </div>
    </div>
  );
}
