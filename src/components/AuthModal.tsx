"use client";

import { useState } from "react";
import { firebaseEnabled } from "@/lib/firebase";
import type { UserDataApi } from "@/lib/useUserData";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Mode = "signin" | "signup" | "reset";

export default function AuthModal({ api, onClose }: { api: UserDataApi; onClose: () => void }) {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>, okInfo?: string) => {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      await fn();
      if (okInfo) setInfo(okInfo);
      else onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "signin") run(() => api.signInEmail(email, password));
    else if (mode === "signup") run(() => api.signUpEmail(email, password, name));
    else run(() => api.resetPassword(email), "Письмо для сброса пароля отправлено, проверь почту.");
  };

  const input =
    "w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-pink-400";

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-lg">{mode === "signin" ? "Вход" : mode === "signup" ? "Регистрация" : "Сброс пароля"}</DialogTitle>
          <DialogDescription>
            {mode === "reset" ? "Пришлём письмо со ссылкой для нового пароля." : "Чтобы прогресс был одинаковым на телефоне и ноутбуке."}
          </DialogDescription>
        </DialogHeader>

        {!firebaseEnabled ? (
          <p className="text-sm leading-relaxed text-slate-300">
            Аккаунты пока не подключены: в сборке нет ключей Firebase. Добавь переменные <code className="text-pink-300">NEXT_PUBLIC_FIREBASE_*</code> в
            Vercel → Settings → Environment Variables и сделай Redeploy. Сейчас прогресс сохраняется только в этом браузере.
          </p>
        ) : (
          <>
            {mode !== "reset" && (
              <>
                <button
                  disabled={busy}
                  onClick={() => run(api.signInGoogle)}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-white py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100 disabled:opacity-60"
                >
                  <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
                    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
                    <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
                    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
                  </svg>
                  Продолжить с Google
                </button>
                <div className="my-4 flex items-center gap-3 text-[11px] uppercase tracking-wider text-slate-500">
                  <span className="h-px flex-1 bg-white/10" />
                  или email
                  <span className="h-px flex-1 bg-white/10" />
                </div>
              </>
            )}

            <form onSubmit={submit} className="space-y-2.5">
              {mode === "signup" && (
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ник (необязательно)" className={input} autoComplete="nickname" />
              )}
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className={input}
                autoComplete="email"
              />
              {mode !== "reset" && (
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Пароль (мин. 6 символов)"
                  className={input}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                />
              )}
              {error && <p className="rounded bg-red-500/15 px-2 py-1.5 text-xs text-red-200">{error}</p>}
              {info && <p className="rounded bg-emerald-500/15 px-2 py-1.5 text-xs text-emerald-200">{info}</p>}
              <button disabled={busy} className="w-full rounded-lg bg-pink-500 py-2 text-sm font-bold text-white hover:bg-pink-400 disabled:opacity-60">
                {busy ? "…" : mode === "signin" ? "Войти" : mode === "signup" ? "Создать аккаунт" : "Отправить письмо"}
              </button>
            </form>

            <div className="mt-4 flex justify-between text-xs text-slate-400">
              {mode === "signin" ? (
                <>
                  <button onClick={() => setMode("signup")} className="hover:text-white">
                    Нет аккаунта? <span className="text-pink-300">Регистрация</span>
                  </button>
                  <button onClick={() => setMode("reset")} className="hover:text-white">
                    Забыл пароль
                  </button>
                </>
              ) : (
                <button onClick={() => setMode("signin")} className="hover:text-white">
                  ← Уже есть аккаунт? <span className="text-pink-300">Войти</span>
                </button>
              )}
            </div>
            <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
              Прогресс, сделанный до входа, перенесётся в аккаунт автоматически.
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
