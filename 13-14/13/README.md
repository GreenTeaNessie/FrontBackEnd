# Практика 13 - Service Worker

## Запуск

```bash
cd 13-14/13
npx http-server -p 3013
```

Открыть `http://localhost:3013`.

## Проверка

- Добавить несколько заметок и перезагрузить страницу.
- Открыть DevTools -> Application -> Service Workers и убедиться, что `sw.js` зарегистрирован.
- Открыть Cache Storage и проверить кэш `notes-practice-13-v1`.
- Включить Offline в DevTools Network и перезагрузить страницу.
