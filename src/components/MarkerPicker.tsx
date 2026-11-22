"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { categoryById, iconStyle, type Marker } from "@/lib/mapData";

type Props = {
  markers: Marker[];
  done: Record<string, true>;
  clientX: number;
  clientY: number;
  onPick: (id: string) => void;
  onClose: () => void;
};

/** Shown when several icons overlap under the cursor: pick one from a list (also works with ↑/↓ + Enter). */
export default function MarkerPicker({ markers, done, clientX, clientY, onPick, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.left = `${Math.max(8, Math.min(clientX + 12, window.innerWidth - r.width - 8))}px`;
    el.style.top = `${Math.max(8, Math.min(clientY - 12, window.innerHeight - r.height - 8))}px`;
    (el.querySelector("button[data-item]") as HTMLButtonElement | null)?.focus();
  }, [clientX, clientY]);

  useEffect(() => {
    const away = (e: Event) => {
      if (ref.current && e.target instanceof Node && ref.current.contains(e.target)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        e.stopImmediatePropagation(); // don't move the map selection meanwhile
        const items = [...(ref.current?.querySelectorAll<HTMLButtonElement>("button[data-item]") ?? [])];
        const i = items.indexOf(document.activeElement as HTMLButtonElement);
        items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
      }
    };
    window.addEventListener("pointerdown", away, true);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("pointerdown", away, true);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      style={{ left: clientX, top: clientY }}
      className="fixed z-[2000] w-64 rounded-xl border border-border bg-popover/97 p-1.5 shadow-2xl backdrop-blur animate-in fade-in-0 zoom-in-95"
    >
      <div className="px-2.5 pb-1.5 pt-1 text-xs font-semibold text-muted-foreground">Здесь несколько точек — выбери</div>
      <div className="max-h-72 overflow-y-auto">
        {markers.map((m) => (
          <button
            key={m.id}
            data-item
            onClick={() => onPick(m.id)}
            className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left outline-none hover:bg-accent focus-visible:bg-accent"
          >
            {m.icon ? (
              <span className="shrink-0" style={iconStyle(m.icon, 26)} />
            ) : (
              <span className="mk-custom shrink-0" style={{ width: 26, height: 26 }}>
                ★
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className={`block truncate text-[13px] ${done[m.id] ? "text-muted-foreground line-through" : ""}`}>{m.name}</span>
              <span className="block truncate text-[11px] text-muted-foreground">{categoryById.get(m.cat)?.name ?? "Моя точка"}</span>
            </span>
            {done[m.id] && <span className="text-xs text-emerald-400">✓</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
