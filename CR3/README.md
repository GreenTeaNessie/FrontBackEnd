# Контрольная работа 3 - EstateHub PWA

Доработанная версия контрольной работы из `11-12`: RBAC-панель недвижимости с JWT-аутентификацией, управлением объявлениями и пользователями, Service Worker, Web App Manifest, App Shell, Socket.IO, Push API и напоминаниями.

## Что добавлено по практикам 13-17

- **Service Worker:** `frontend/public/sw.js` кэширует App Shell и runtime-ресурсы, принимает `push` и обрабатывает действие уведомления.
- **Web App Manifest:** `frontend/public/manifest.json`, meta-теги и PNG-иконки в `frontend/public/icons`.
- **App Shell:** React-интерфейс работает как оболочка приложения, а данные загружаются через API.
- **WebSocket:** backend поднимает Socket.IO и рассылает события `propertyCreated`, `propertyUpdated`, `propertyDeleted`, `reminderScheduled`, `reminderDue`, `reminderSnoozed`.
- **Push:** авторизованный пользователь может включить/отключить подписку; сервер отправляет push при изменении объявлений и при срабатывании напоминаний.
- **Напоминания:** по выбранному объекту можно создать напоминание с `datetime-local`; уведомление можно отложить на 5 минут.

## Структура

```text
CR3/
├── backend/
│   ├── app.js
│   ├── package.json
│   └── requests.http
├── frontend/
│   ├── public/
│   │   ├── icons/
│   │   ├── manifest.json
│   │   └── sw.js
│   └── src/
│       ├── App.js
│       ├── App.css
│       └── api/client.js
```

## Запуск

Требуется Node.js 18+.

### Backend

```bash
cd CR3/backend
npm install
npm start
```

API и Socket.IO будут доступны на `http://localhost:3018`.

### Frontend

```bash
cd CR3/frontend
npm install
npm start
```

Интерфейс откроется на `http://localhost:3019`.

## Демо-аккаунты

| Логин | Пароль | Роль |
|---|---|---|
| `admin` | `admin123` | Администратор |
| `realtor` | `realtor123` | Риелтор |
| `buyer` | `buyer123` | Покупатель |

## Основные API

Базовый URL: `http://localhost:3018/api`.

- `GET /health` - проверка backend.
- `GET /config` - public config для PWA: VAPID public key и Socket.IO URL.
- `POST /auth/login`, `POST /auth/register`, `POST /auth/refresh`, `GET /auth/me` - аутентификация.
- `GET /properties`, `POST /properties`, `PUT /properties/:id`, `DELETE /properties/:id` - объявления.
- `GET /users`, `PUT /users/:id`, `DELETE /users/:id` - управление пользователями для `admin`.
- `POST /push/subscribe`, `POST /push/unsubscribe` - Push-подписка.
- `GET /reminders`, `POST /reminders`, `DELETE /reminders/:id` - напоминания.
- `POST /snooze?reminderId=...` - отложить напоминание на 5 минут из Service Worker.

## Проверка

1. Запустить backend и frontend.
2. Войти под `admin` или `realtor`.
3. В DevTools -> Application проверить Manifest, Service Worker и Cache Storage.
4. Нажать `Push on` и разрешить уведомления.
5. Открыть приложение во второй вкладке, создать или обновить объявление и проверить Socket.IO-обновление.
6. Выбрать объект, создать напоминание на ближайшее время и дождаться Push-уведомления.
7. В уведомлении нажать `Отложить на 5 минут` и проверить повторное планирование.

## Переменные окружения

| Переменная | По умолчанию | Описание |
|---|---|---|
| `PORT` | `3018` | Порт backend |
| `FRONTEND_ORIGIN` | `http://localhost:3019` | Origin frontend для CORS |
| `ACCESS_SECRET` | `practice_11_12_access_secret` | JWT access secret |
| `REFRESH_SECRET` | `practice_11_12_refresh_secret` | JWT refresh secret |
| `VAPID_PUBLIC_KEY` | встроенный demo key | Public key для Push |
| `VAPID_PRIVATE_KEY` | встроенный demo key | Private key для Push |
