"use client";

import { useState } from "react";
import { Check, ChevronDown, ExternalLink, Image as ImageIcon, ListPlus, MoreHorizontal, NotebookPen, Star, Trash2, X, Copy, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { categories, categoryById, groupById, gridRef, iconStyle, type Marker } from "@/lib/mapData";
import { categoryHint } from "@/lib/categoryInfo";
import { copyText, openOnMapGenie } from "@/lib/ign";
import type { UserDataApi } from "@/lib/useUserData";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Props = { marker: Marker; api: UserDataApi; onClose: () => void; onHide: (id: string) => void };

function Section({ title, icon, count, defaultOpen, children }: { title: string; icon: React.ReactNode; count?: number; defaultOpen?: boolean; children: React.ReactNode }) {
  return (
    <Collapsible defaultOpen={defaultOpen} className="border-t border-border">
      <CollapsibleTrigger className="group flex w-full items-center gap-2 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground">
        {icon}
        <span className="flex-1">{title}</span>
        {!!count && <span className="rounded-full bg-white/10 px-1.5 text-[10px] normal-case tracking-normal">{count}</span>}
        <ChevronDown size={15} className="transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="pb-3">{children}</CollapsibleContent>
    </Collapsible>
  );
}

export default function MarkerPanel({ marker: m, api, onClose, onHide }: Props) {
  const { data, actions } = api;
  const cat = categoryById.get(m.cat);
  const group = cat ? groupById.get(cat.group) : null;
  const isDone = !!data.done[m.id];
  const [note, setNote] = useState(data.notes[m.id] ?? "");
  const [name, setName] = useState(m.name);
  const [newList, setNewList] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [noteOpen, setNoteOpen] = useState(!!data.notes[m.id]);
  const lists = Object.entries(data.lists).sort((a, b) => a[1].createdAt - b[1].createdAt);
  const inLists = lists.filter(([, l]) => l.items?.[m.id]);
  const grid = gridRef(m.x, m.y);
  const hint = categoryHint(m.cat);
  const photos = Object.entries(data.photos?.[m.id] ?? {});

  const action = "flex flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[11px] font-medium transition";

  return (
    <div
      className="absolute inset-x-0 bottom-0 z-[800] max-h-[72dvh] overflow-y-auto rounded-t-2xl border-t border-border bg-card/96 px-4 pb-3 pt-3 shadow-2xl backdrop-blur animate-in slide-in-from-bottom-4 md:inset-x-auto md:bottom-auto md:right-3 md:top-16 md:max-h-[calc(100dvh-5rem)] md:w-[340px] md:rounded-2xl md:border md:slide-in-from-right-4"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-white/15 md:hidden" />

      {/* header */}
      <div className="flex items-start gap-3">
        {m.icon ? (
          <span className="mt-0.5 shrink-0" style={iconStyle(m.icon, 42)} />
        ) : (
          <span className="mk-custom mt-0.5 grid shrink-0" style={{ width: 42, height: 42, fontSize: 20 }}>
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
          <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span>{group ? `${group.name} › ${cat?.name}` : "Моя точка"}</span>
            {grid && <span className="rounded bg-white/10 px-1.5 py-px text-[10px] text-foreground/80">{grid}</span>}
          </p>
        </div>
        <button onClick={onClose} className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Закрыть">
          <X size={16} />
        </button>
      </div>

      {hint && <p className="mt-2.5 text-[13px] leading-relaxed text-muted-foreground">{hint}</p>}

      {inLists.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {inLists.map(([id, l]) => (
            <span key={id} className="rounded-full px-2 py-0.5 text-[11px] text-white" style={{ background: l.color }}>
              {l.name}
            </span>
          ))}
        </div>
      )}

      {/* primary actions */}
      <div className="mt-3 flex gap-1.5">
        <button
          onClick={() => actions.toggleDone(m.id)}
          className={`${action} ${isDone ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/40" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}
        >
          <Check size={18} /> {isDone ? "Выполнено" : "Отметить"}
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger className={`${action} bg-white/5 hover:bg-white/10`}>
            <ListPlus size={18} /> В список
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-60">
            <DropdownMenuLabel className="text-xs text-muted-foreground">Списки</DropdownMenuLabel>
            {lists.length === 0 && <div className="px-2 pb-1 text-xs text-muted-foreground">Пока нет — создай ниже</div>}
            {lists.map(([id, l]) => (
              <DropdownMenuCheckboxItem
                key={id}
                checked={!!l.items?.[m.id]}
                onCheckedChange={() => actions.toggleInList(id, m.id)}
                onSelect={(e) => e.preventDefault()}
              >
                <span className="size-2 rounded-full" style={{ background: l.color }} />
                {l.name}
              </DropdownMenuCheckboxItem>
            ))}
            <DropdownMenuSeparator />
            <form
              className="flex gap-1 p-1"
              onSubmit={(e) => {
                e.preventDefault();
                if (!newList.trim()) return;
                const id = actions.createList(newList.trim());
                actions.toggleInList(id, m.id);
                toast.success(`Добавлено в «${newList.trim()}»`);
                setNewList("");
              }}
            >
              <Input
                value={newList}
                onChange={(e) => setNewList(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                placeholder="+ новый список"
                className="h-8 text-xs"
              />
            </form>
          </DropdownMenuContent>
        </DropdownMenu>

        <button onClick={() => setNoteOpen((v) => !v)} className={`${action} ${noteOpen ? "bg-white/10" : "bg-white/5 hover:bg-white/10"}`}>
          <NotebookPen size={18} /> Заметка
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger className={`${action} bg-white/5 hover:bg-white/10`}>
            <MoreHorizontal size={18} /> Ещё
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem
              onSelect={() => {
                copyText(m.name);
                toast("Название скопировано");
              }}
            >
              <Copy /> Скопировать название
            </DropdownMenuItem>
            {!m.custom && (
              <DropdownMenuItem onSelect={() => openOnMapGenie(m.id)}>
                <ExternalLink /> Открыть на MapGenie (фото, описание)
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onSelect={() => {
                onHide(m.id);
                toast("Точка скрыта — вернуть можно в блоке «Карта»");
              }}
            >
              <EyeOff /> Скрыть эту точку
            </DropdownMenuItem>
            {m.custom && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}>
                  <Trash2 /> Удалить точку
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {noteOpen && (
        <textarea
          autoFocus={!data.notes[m.id]}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => note !== (data.notes[m.id] ?? "") && actions.setNote(m.id, note)}
          rows={3}
          placeholder="Что тут есть, что взять, как добраться… (сохраняется автоматически)"
          className="mt-3 w-full resize-y rounded-lg border border-input bg-black/30 px-2.5 py-2 text-sm outline-none focus:border-ring"
        />
      )}

      <div className="mt-3">
        {m.custom && (
          <Section title="Категория" icon={<Star size={13} />} defaultOpen>
            <select
              value={categoryById.has(m.cat) ? m.cat : ""}
              onChange={(e) => actions.updateCustom(m.id, { cat: e.target.value || null })}
              className="w-full rounded-lg border border-input bg-black/40 px-2 py-1.5 text-sm text-foreground"
            >
              <option value="">★ Без категории (Мои точки)</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {groupById.get(c.group)?.name} › {c.name}
                </option>
              ))}
            </select>
          </Section>
        )}

        <Section title="Фото" icon={<ImageIcon size={13} />} count={photos.length} defaultOpen={photos.length > 0}>
          {photos.length > 0 && (
            <div className="mb-2 grid grid-cols-3 gap-1.5">
              {photos.map(([pid, url]) => (
                <div key={pid} className="group relative aspect-video overflow-hidden rounded-md bg-black/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="size-full cursor-zoom-in object-cover" onClick={() => setPreview(url)} referrerPolicy="no-referrer" />
                  <button
                    onClick={() => actions.removePhoto(m.id, pid)}
                    className="absolute right-0.5 top-0.5 hidden rounded bg-black/70 p-0.5 text-white group-hover:block"
                    title="Убрать фото"
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const url = photoUrl.trim();
              if (/^https?:\/\/\S+$/i.test(url)) {
                actions.addPhoto(m.id, url);
                setPhotoUrl("");
              } else toast.error("Нужна ссылка вида https://…");
            }}
          >
            <Input value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="Ссылка на картинку (https://…)" className="h-8 text-xs" />
            <button className="rounded-md bg-white/10 px-3 text-xs hover:bg-white/15">＋</button>
          </form>
        </Section>
      </div>

      {preview && (
        <div className="fixed inset-0 z-[3000] grid place-items-center bg-black/85 p-4" onClick={() => setPreview(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="" className="max-h-full max-w-full rounded-lg" referrerPolicy="no-referrer" />
        </div>
      )}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить «{m.name}»?</AlertDialogTitle>
            <AlertDialogDescription>Точка, её заметка, фото и место в списках будут удалены.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                actions.deleteCustom(m.id);
                onClose();
              }}
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
