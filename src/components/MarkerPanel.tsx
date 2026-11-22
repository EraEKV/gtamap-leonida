"use client";

import { useState } from "react";
import { categories, categoryById, groupById, gridRef, iconStyle, type Marker } from "@/lib/mapData";
import type { UserDataApi } from "@/lib/useUserData";

type Props = { marker: Marker; api: UserDataApi; onClose: () => void };

export default function MarkerPanel({ marker: m, api, onClose }: Props) {
  const { data, actions } = api;
  const cat = categoryById.get(m.cat);
  const group = cat ? groupById.get(cat.group) : null;
  const isDone = !!data.done[m.id];
  const [note, setNote] = useState(data.notes[m.id] ?? "");
  const [name, setName] = useState(m.name);
  const [newList, setNewList] = useState("");
  const lists = Object.entries(data.lists).sort((a, b) => a[1].createdAt - b[1].createdAt);
  const grid = gridRef(m.x, m.y);

  return (
    <div
      className="absolute inset-x-0 bottom-0 z-[800] max-h-[70dvh] overflow-y-auto rounded-t-2xl border-t border-white/10 bg-[#12152a]/95 p-4 shadow-2xl backdrop-blur md:inset-x-auto md:bottom-auto md:right-3 md:top-16 md:w-[340px] md:rounded-2xl md:border"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-start gap-3">
        {m.icon ? (
          <span className="mt-0.5 shrink-0" style={iconStyle(m.icon, 40)} />
        ) : (
          <span className="mk-custom mt-0.5 shrink-0" style={{ width: 40, height: 40, fontSize: 20 }}>
            ★
          </span>
        )}
        <div className="min-w-0 flex-1">
          {m.custom ? (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => name.trim() && name !== m.name && actions.updateCustom(m.id, { name: name.trim() })}
              className="w-full rounded bg-transparent text-base font-bold outline-none focus:bg-black/30"
            />
          ) : (
            <h3 className="text-base font-bold leading-snug">{m.name}</h3>
          )}
          <p className="text-xs text-slate-400">
            {group ? `${group.name} › ${cat?.name}` : "Моя точка"}
            {grid && <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-slate-300">квадрат {grid}</span>}
          </p>
        </div>
        <button onClick={onClose} className="text-xl leading-none text-slate-400 hover:text-white" aria-label="Закрыть">
          ×
        </button>
      </div>

      <button
        onClick={() => actions.toggleDone(m.id)}
        className={`mt-4 w-full rounded-xl py-2.5 text-sm font-bold transition ${
          isDone ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/40" : "bg-pink-500 text-white hover:bg-pink-400"
        }`}
      >
        {isDone ? "✓ Выполнено — снять отметку" : "Отметить выполненным"}
      </button>

      {m.custom && (
        <label className="mt-3 block text-xs text-slate-400">
          Категория
          <select
            value={categoryById.has(m.cat) ? m.cat : ""}
            onChange={(e) => actions.updateCustom(m.id, { cat: e.target.value || null })}
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-slate-100"
          >
            <option value="">★ Без категории (Мои точки)</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {groupById.get(c.group)?.name} › {c.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="mt-4">
        <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">В списках</div>
        <div className="flex flex-wrap gap-1.5">
          {lists.map(([id, l]) => {
            const on = !!l.items?.[m.id];
            return (
              <button
                key={id}
                onClick={() => actions.toggleInList(id, m.id)}
                className={`rounded-full px-2.5 py-1 text-xs ring-1 transition ${on ? "text-white" : "text-slate-300 ring-white/15 hover:ring-white/40"}`}
                style={on ? { background: l.color, boxShadow: "none" } : undefined}
              >
                {on ? "✓ " : "+ "}
                {l.name}
              </button>
            );
          })}
        </div>
        <form
          className="mt-2 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!newList.trim()) return;
            const id = actions.createList(newList.trim());
            actions.toggleInList(id, m.id);
            setNewList("");
          }}
        >
          <input
            value={newList}
            onChange={(e) => setNewList(e.target.value)}
            placeholder="Новый список и добавить сюда"
            className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-xs outline-none focus:border-pink-400"
          />
          <button className="rounded-lg bg-white/10 px-3 text-xs">＋</button>
        </form>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">Заметка</div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => note !== (data.notes[m.id] ?? "") && actions.setNote(m.id, note)}
          rows={3}
          placeholder="Что тут есть, что взять, как добраться…"
          className="w-full resize-y rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-sm outline-none focus:border-pink-400"
        />
      </div>

      {m.custom && (
        <button
          onClick={() => {
            if (confirm("Удалить эту точку?")) {
              actions.deleteCustom(m.id);
              onClose();
            }
          }}
          className="mt-3 w-full rounded-lg py-2 text-xs text-red-300 hover:bg-red-500/10"
        >
          Удалить точку
        </button>
      )}
    </div>
  );
}
