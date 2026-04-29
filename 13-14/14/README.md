# Практика 14 - Web App Manifest

## Запуск

```bash
cd 13-14/14
npx http-server -p 3014
```

Открыть `http://localhost:3014`.

## Проверка

- DevTools -> Application -> Manifest показывает название, цвета и иконки.
- Cache Storage содержит `notes-practice-14-v1`, включая manifest и PNG-иконки.
- Lighthouse -> PWA не должен ругаться на отсутствие manifest.
