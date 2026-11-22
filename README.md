# Leonida Map (GTA VI)

Личная интерактивная карта Леониды: прогресс по каждой категории, свои списки, свои точки и заметки. Синхронизация через Firebase.

## Запуск

```bash
npm install
npm run dev          # http://localhost:3000
```

Без `.env` приложение работает в локальном режиме: всё хранится в браузере. С `.env` (см. `.env.example`) работает вход через Google, а прогресс хранится в Firestore (`users/{uid}`).

## Firebase (один раз)

1. **Authentication → Sign-in method** → включить **Google**.
2. **Authentication → Settings → Authorized domains** → добавить домен Vercel (например `leonida-map.vercel.app`).
3. **Firestore Database** → создать базу, во вкладке **Rules** вставить содержимое `firestore.rules`.

## Деплой на Vercel

Импортировать проект и добавить те же `NEXT_PUBLIC_FIREBASE_*` переменные в *Settings → Environment Variables*.

## Данные

| Что | Откуда | Скрипт |
| --- | --- | --- |
| Тайлы `public/tiles` | `source/Leonida_Map_Poster_Printable.jpg` (постер Rockstar) | `npm run tiles` |
| Точки и категории `src/data/map-data.json` | `data/raw/leonida-ign-data.json` (выгрузка с IGN) + `data/calib.json` | `npm run data` |
| Иконки `public/icons/atlas@2x.png` | `data/raw/atlas@2x.png` | `npm run data` |

`data/calib.json` содержит аффинное преобразование координат IGN/MapGenie (lng/lat) в пиксели постера. Оно подобрано совмещением береговой линии (корреляция ≈ 0.98).
