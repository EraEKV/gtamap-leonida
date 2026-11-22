"use client";

import { TriangleAlert, Trophy as TrophyIcon } from "lucide-react";
import { TIER_META, type Trophy } from "@/data/trophies";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

  return (
    <AlertDialog open onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent className="overflow-hidden border border-border p-0 sm:max-w-sm data-[size=default]:max-w-[calc(100%-2rem)] data-[size=default]:sm:max-w-sm">
        <div className="bg-linear-to-br from-amber-500/25 via-pink-500/15 to-transparent px-5 pb-1 pt-5">
          <AlertDialogHeader className="place-items-start text-left">
            <AlertDialogMedia className="bg-amber-400/20 text-amber-300 ring-1 ring-amber-300/40">
              <TriangleAlert />
            </AlertDialogMedia>
            <AlertDialogTitle className="text-lg">Осторожно, спойлер</AlertDialogTitle>
            <AlertDialogDescription>
              Этот трофей связан с {sp.kind === "story" ? "основным сюжетом" : "линейкой побочных заданий"}. Название и описание откроются, только если ты
              уже прошёл это.
            </AlertDialogDescription>
          </AlertDialogHeader>
        </div>

        <div className="px-5">
          <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
            <span className="grid size-9 shrink-0 place-items-center rounded-full" style={{ background: `${tier.color}26`, color: tier.color }}>
              <TrophyIcon size={18} />
            </span>
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{sp.kind === "story" ? "Сюжет" : "Побочные задания"}</div>
              <div className="font-semibold">{sp.label}</div>
              <div className="text-xs" style={{ color: tier.color }}>
                {tier.label}
              </div>
            </div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{intent === "earn" ? "Отметить трофей как полученный?" : "Показать название и описание?"}</p>
        </div>

        <AlertDialogFooter className="flex-col gap-2 px-5 pb-5 sm:flex-col">
          <AlertDialogAction className="h-10 w-full" onClick={() => onConfirm(true)}>
            ✓ Да, я прошёл — отметить и показать
          </AlertDialogAction>
          <AlertDialogAction variant="secondary" className="h-10 w-full" onClick={() => onConfirm(false)}>
            Я прошёл — только показать
          </AlertDialogAction>
          <AlertDialogCancel variant="ghost" className="w-full text-muted-foreground">
            Отмена, не спойлерить
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
