# Практика 15 - HTTPS + App Shell

## Запуск на localhost

```bash
cd 15-16/15
npx http-server -p 3015
```

Открыть `http://localhost:3015`. Для Service Worker `localhost` считается безопасным контекстом.

## Запуск по HTTPS через mkcert

```bash
mkcert -install
mkcert localhost 127.0.0.1 ::1
npx http-server --ssl --cert localhost.pem --key localhost-key.pem -p 3015
```

Открыть `https://localhost:3015`.

## Проверка

- Переключить вкладки "Главная" и "О приложении" без перезагрузки страницы.
- Проверить кэши `notes-practice-15-shell-v1` и `notes-practice-15-dynamic-v1`.
- Открыть DevTools Network, включить Offline и перезагрузить приложение.
