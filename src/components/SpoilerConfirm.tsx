"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { TIER_META, type Trophy } from "@/data/trophies";

type Props = {
  trophy: Trophy;
  intent: "view" | "earn";
  onConfirm: (markEarned: boolean) => void;
  onCancel: () => void;
};

/** Spoiler gate: the trophy's title/description stay hidden until the user confirms they've done it. */
export default function SpoilerConfirm({ trophy, intent, onConfirm, onCancel }: Props) {
  const sp = trophy.spoiler!;
  const tier = TIER_META[trophy.tier];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  // portal: the sidebar is transformed, which would trap a fixed overlay inside it
  return createPortal(
    <div className="fixed inset-0 z-[3500] grid place-items-center bg-black/70 p-4 backdrop-blur-sm animate-[fadeIn_.15s_ease]" onClick={onCancel}>
      <div
        className="w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-[#12152a] shadow-2xl animate-[popIn_.18s_ease]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="relative bg-gradient-to-br from-amber-500/25 via-pink-500/15 to-transparent px-5 pb-4 pt-5">
          <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-amber-400/20 text-2xl ring-1 ring-amber-300/40">⚠️</div>
          <h2 className="text-lg font-bold">Осторожно, спойлер</h2>
          <p className="mt-1 text-sm text-slate-300">
            Этот трофей связан с {sp.kind === "story" ? "основным сюжетом" : "линейкой побочных заданий"}.
          </p>
        </div>

        <div className="px-5 py-4">
          <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-base" style={{ background: `${tier.color}33`, color: tier.color }}>
              🏆
            </span>
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-wider text-slate-400">{sp.kind === "story" ? "Сюжет" : "Побочные задания"}</div>
              <div className="font-semibold">{sp.label}</div>
              <div className="text-xs" style={{ color: tier.color }}>
                {tier.label}
              </div>
            </div>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            Название и описание откроются, только если ты уже прошёл это. {intent === "earn" ? "Отметить трофей как полученный?" : "Показать?"}
          </p>
        </div>

        <div className="flex flex-col gap-2 px-5 pb-5">
          <button
            autoFocus
            onClick={() => onConfirm(true)}
            className="w-full rounded-xl bg-pink-500 py-2.5 text-sm font-bold text-white hover:bg-pink-400"
          >
            ✓ Да, я прошёл — отметить и показать
          </button>
          <button onClick={() => onConfirm(false)} className="w-full rounded-xl bg-white/10 py-2.5 text-sm font-semibold hover:bg-white/15">
            Я прошёл — только показать
          </button>
          <button onClick={onCancel} className="w-full rounded-xl py-2 text-sm text-slate-400 hover:text-white">
            Отмена, не спойлерить
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
