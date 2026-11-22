"use client";

import { useState } from "react";
import { CheckCircle2, ListPlus, MousePointerClick, Trophy } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";

const KEY = "leonida:welcome:v1";
export const shouldShowWelcome = () => {
  try {
    return !localStorage.getItem(KEY);
  } catch {
    return false;
  }
};

const STEPS = [
  {
    icon: <CheckCircle2 className="text-emerald-400" />,
    title: "Отмечай, что уже сделал",
    text: "Нажми на иконку на карте → «Отметить». Прогресс считается по каждой категории — смотри в «Фильтры» слева.",
    tip: (
      <>
        Быстро: выбери точку и нажми <Kbd>D</Kbd>, стрелками — к соседней. Иконки слиплись — кликни, появится список.
      </>
    ),
  },
  {
    icon: <ListPlus className="text-sky-400" />,
    title: "Собирай свои списки",
    text: "«Лут», «Оружие», «Куда съездить» — любая подборка точек со своим прогрессом. Можно показать на карте только её.",
    tip: (
      <>
        Правый клик по точке → «В список». Свою точку — правый клик по карте → «Своя точка здесь».
      </>
    ),
  },
  {
    icon: <Trophy className="text-amber-400" />,
    title: "Трофеи без спойлеров",
    text: "Все 55 трофеев с прогрессом. Сюжетные скрыты: название откроется только после подтверждения, что ты это прошёл.",
    tip: (
      <>
        <Kbd>H</Kbd> — спрятать интерфейс, <Kbd>L</Kbd> — что значат иконки, <Kbd>?</Kbd> — все клавиши.
      </>
    ),
  },
];

export default function WelcomeDialog({ onClose, onSignIn, signedIn }: { onClose: () => void; onSignIn: () => void; signedIn: boolean }) {
  const [step, setStep] = useState(0);
  const s = STEPS[step];
  const last = step === STEPS.length - 1;
  const close = () => {
    localStorage.setItem(KEY, "1");
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            <MousePointerClick size={14} /> Leonida Map · {step + 1}/{STEPS.length}
          </div>
          <DialogTitle className="flex items-center gap-2 text-lg">
            {s.icon} {s.title}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">{s.text}</DialogDescription>
        </DialogHeader>
        <div className="rounded-lg bg-white/5 p-3 text-xs leading-relaxed text-muted-foreground">{s.tip}</div>
        <div className="flex items-center gap-1.5 pt-1">
          {STEPS.map((_, i) => (
            <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-5 bg-primary" : "w-1.5 bg-white/20"}`} />
          ))}
          <div className="ml-auto flex gap-2">
            {step > 0 ? (
              <button onClick={() => setStep(step - 1)} className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">
                Назад
              </button>
            ) : (
              <button onClick={close} className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">
                Пропустить
              </button>
            )}
            {last && !signedIn ? (
              <>
                <button onClick={close} className="rounded-md bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15">
                  Начать
                </button>
                <button
                  onClick={() => {
                    close();
                    onSignIn();
                  }}
                  className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  Войти и синхронизировать
                </button>
              </>
            ) : (
              <button
                onClick={() => (last ? close() : setStep(step + 1))}
                className="rounded-md bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                {last ? "Начать" : "Далее"}
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
