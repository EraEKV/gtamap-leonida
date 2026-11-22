"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { gridRef, type Marker } from "@/lib/mapData";
import { copyText, findOnIgn } from "@/lib/ign";
import type { UserDataApi } from "@/lib/useUserData";
import type { MapContextEvent } from "./LeafletMap";

type Props = {
  event: MapContextEvent;
  marker: Marker | null;
  api: UserDataApi;
  onClose: () => void;
  onOpen: (id: string) => void;
  onAddHere: (x: number, y: number) => void;
  onCenter: (x: number, y: number) => void;
};

function Item({ onClick, children, danger }: { onClick: () => void; children: React.ReactNode; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px] ${
        danger ? "text-red-300 hover:bg-red-500/15" : "hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

export default function ContextMenu({ event, marker, api, onClose, onOpen, onAddHere, onCenter }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [newList, setNewList] = useState("");
  const { data, actions } = api;

  // keep the menu inside the viewport (direct style write, no re-render needed)
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.left = `${Math.max(8, Math.min(event.clientX, window.innerWidth - r.width - 8))}px`;
    el.style.top = `${Math.max(8, Math.min(event.clientY, window.innerHeight - r.height - 8))}px`;
  }, [event]);

  useEffect(() => {
    const close = (e: Event) => {
      if (ref.current && e.target instanceof Node && ref.current.contains(e.target)) return;
      onClose();
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("pointerdown", close, true);
    window.addEventListener("keydown", esc);
    window.addEventListener("resize", onClose);
    return () => {
      window.removeEventListener("pointerdown", close, true);
      window.removeEventListener("keydown", esc);
      window.removeEventListener("resize", onClose);
    };
  }, [onClose]);

  const act = (fn: () => void) => () => {
    fn();
    onClose();
  };
  const lists = Object.entries(data.lists).sort((a, b) => a[1].createdAt - b[1].createdAt);

  return (
    <div
      ref={ref}
      style={{ left: event.clientX, top: event.clientY }}
      className="fixed z-[2000] w-60 rounded-xl border border-white/10 bg-[#161a2b]/97 p-1.5 shadow-2xl backdrop-blur"
      onContextMenu={(e) => e.preventDefault()}
    >
      {event.kind === "marker" && marker ? (
        <>
          <div className="truncate px-2.5 pb-1.5 pt-1 text-xs font-semibold text-slate-400">{marker.name}</div>
          <Item onClick={act(() => onOpen(marker.id))}>📋 Открыть карточку</Item>
          <Item onClick={act(() => actions.toggleDone(marker.id))}>
            {data.done[marker.id] ? "↩ Снять отметку" : "✓ Отметить выполненным"}
          </Item>
          <div className="my-1 h-px bg-white/10" />
          <div className="px-2.5 pb-1 text-[11px] uppercase tracking-wider text-slate-500">В список</div>
          {lists.map(([id, l]) => {
            const on = !!l.items?.[marker.id];
            return (
              <Item key={id} onClick={() => actions.toggleInList(id, marker.id)}>
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: l.color }} />
                <span className="flex-1 truncate">{l.name}</span>
                {on && <span className="text-emerald-400">✓</span>}
              </Item>
            );
          })}
          <form
            className="flex gap-1 px-1 py-1"
            onSubmit={(e) => {
              e.preventDefault();
              if (!newList.trim()) return;
              const id = actions.createList(newList.trim());
              actions.toggleInList(id, marker.id);
              setNewList("");
            }}
          >
            <input
              value={newList}
              onChange={(e) => setNewList(e.target.value)}
              placeholder="+ новый список"
              className="min-w-0 flex-1 rounded-md bg-black/30 px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-pink-400"
            />
          </form>
          <div className="my-1 h-px bg-white/10" />
          <Item onClick={act(() => copyText(marker.name))}>⧉ Скопировать название</Item>
          {!marker.custom && <Item onClick={act(() => findOnIgn(marker.name))}>↗ Найти на IGN (фото, описание)</Item>}
          {marker.custom && (
            <Item danger onClick={act(() => actions.deleteCustom(marker.id))}>
              🗑 Удалить точку
            </Item>
          )}
        </>
      ) : event.kind === "map" ? (
        <>
          <div className="px-2.5 pb-1.5 pt-1 text-xs font-semibold text-slate-400">
            Квадрат {gridRef(event.x, event.y) ?? "—"}
          </div>
          <Item onClick={act(() => onAddHere(event.x, event.y))}>★ Своя точка здесь</Item>
          <Item onClick={act(() => onCenter(event.x, event.y))}>⊕ Центрировать здесь</Item>
          <Item onClick={act(() => copyText(gridRef(event.x, event.y) ?? `${event.x}, ${event.y}`))}>⧉ Скопировать квадрат</Item>
          <Item onClick={act(() => copyText(`${event.x}, ${event.y}`))}>⧉ Скопировать координаты</Item>
        </>
      ) : null}
    </div>
  );
}
