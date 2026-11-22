"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";

const ROWS: [string[], string][] = [
  [["←", "↑", "→", "↓"], "Перейти к ближайшей точке в этом направлении"],
  [["D"], "Отметить выбранную точку выполненной / снять"],
  [["Space"], "То же, что D"],
  [["Esc"], "Закрыть карточку / меню / снять выбор"],
  [["H"], "Скрыть / показать весь интерфейс"],
  [["L"], "Легенда иконок"],
  [["G"], "Группировка точек вкл/выкл"],
  [["/"], "Поиск точек"],
  [["?"], "Эта справка"],
  [["ПКМ"], "Меню действий (на телефоне — долгое нажатие)"],
];

export default function ShortcutsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Горячие клавиши</DialogTitle>
          <DialogDescription>Работают, когда курсор не в поле ввода.</DialogDescription>
        </DialogHeader>
        <ul className="space-y-1.5">
          {ROWS.map(([keys, text]) => (
            <li key={text} className="flex items-center justify-between gap-4 text-sm">
              <span className="text-muted-foreground">{text}</span>
              <span className="flex shrink-0 gap-1">
                {keys.map((k) => (
                  <Kbd key={k}>{k}</Kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
