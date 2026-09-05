# TUKE Student Hub

Бесплатный студенческий хаб для TUKE (Košice) — меню столовой, калькулятор ISIC-дотаций, скидки на карте, DPMK.

## 🚀 Быстрый старт (GitHub Pages)

1. Создайте новый репозиторий на GitHub
2. Загрузите все файлы из этой папки
3. Включите GitHub Pages: **Settings → Pages → Source: Deploy from a branch → main / root**
4. Через 2 минуты сайт будет доступен по адресу `https://yourname.github.io/repo-name/`

## 🤖 Автообновление меню

GitHub Actions каждый будний день в 08:00 по словацкому времени:
- Парсит `jedalen.tuke.sk`
- Сохраняет результат в `data/menu.json`
- Коммитит изменения

**Запуск вручную:** Actions → Update TUKE Menu → Run workflow

## 📁 Структура

```
.
├── index.html                  # Главный сайт (единый файл)
├── data/
│   └── menu.json               # Автообновляемое меню
├── scripts/
│   └── fetch-menu.mjs          # Парсер для GitHub Actions
└── .github/workflows/
    └── update-menu.yml         # Cron-задача
```

## 🛠 Технологии

- **Фронтенд:** Vanilla HTML/CSS/JS, Leaflet (карты)
- **Хостинг:** GitHub Pages (бесплатно, HTTPS, CDN)
- **CI:** GitHub Actions (Node.js 20, fetch API)
- **Данные:** JSON в репозитории (zero backend)

## 📝 Лицензия

MIT — свободно используйте и модифицируйте.
