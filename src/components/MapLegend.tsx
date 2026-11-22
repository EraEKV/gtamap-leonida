"use client";

import { X } from "lucide-react";
import { CATEGORY_PRIORITY, GROUP_PRIORITY, categoryHint } from "@/lib/categoryInfo";
import { categoriesByGroup, groupById, iconStyle } from "@/lib/mapData";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type Props = {
  hidden: Set<string>;
  onToggleCat: (id: string) => void;
  onClose: () => void;
};

/** Icon key over the map: what each icon means, most important first. Click an icon to show/hide it. */
export default function MapLegend({ hidden, onToggleCat, onClose }: Props) {
  return (
    <div className="pointer-events-auto flex max-h-[calc(100dvh-10rem)] w-[300px] flex-col rounded-2xl border border-border bg-card/92 shadow-2xl backdrop-blur animate-in fade-in-0 slide-in-from-left-2">
      <div className="flex items-center justify-between px-3.5 pb-1 pt-3">
        <div>
          <div className="text-sm font-bold">Легенда</div>
          <div className="text-[11px] text-muted-foreground">Клик по иконке — скрыть/показать на карте</div>
        </div>
        <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Закрыть легенду">
          <X size={16} />
        </button>
      </div>
      <div className="overflow-y-auto overscroll-contain px-2.5 pb-3">
        {GROUP_PRIORITY.map((gid) => {
          const g = groupById.get(gid);
          const cats = [...(categoriesByGroup.get(gid) ?? [])].sort(
            (a, b) => Number(CATEGORY_PRIORITY.has(b.id)) - Number(CATEGORY_PRIORITY.has(a.id)),
          );
          if (!g || !cats.length) return null;
          return (
            <section key={gid} className="mt-2.5">
              <div className="mb-1 px-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{g.name}</div>
              <div className="grid grid-cols-2 gap-0.5">
                {cats.map((c) => {
                  const off = hidden.has(c.id);
                  const hint = categoryHint(c.id);
                  return (
                    <Tooltip key={c.id}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => onToggleCat(c.id)}
                          className={`flex min-w-0 items-center gap-1.5 rounded-lg px-1.5 py-1 text-left hover:bg-accent ${off ? "opacity-35" : ""}`}
                        >
                          <span className="shrink-0" style={iconStyle(c.icon, 22)} />
                          <span className="truncate text-[12px] leading-tight">{c.name}</span>
                        </button>
                      </TooltipTrigger>
                      {hint && (
                        <TooltipContent side="right" className="max-w-56 text-xs">
                          {hint}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
