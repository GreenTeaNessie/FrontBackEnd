# Практики 9-10

Папка `9-10` приведена к единому заданию по интернет-магазину электроники.

## Что реализовано

- `backend` на Express.js с регистрацией по `email`, логином, JWT access token и refresh token.
- `backend` использует единый контракт товаров: `GET/POST /api/products`, `GET/PUT/DELETE /api/products/:id`.
- `frontend` на React.js с формами регистрации и входа, каталогом товаров, просмотром карточки товара, созданием, редактированием и удалением.
- В клиенте настроен `axios` interceptor для автоматического обновления access token через `POST /api/auth/refresh`.

## Структура

- `backend` — API на Express.js.
- `frontend` — клиентское приложение на React.js.

## Запуск

### Backend

```bash
cd backend
npm install
npm start
```

Сервер запускается на `http://localhost:3000`.

### Frontend

```bash
cd frontend
npm install
npm start
```

Клиент запускается на `http://localhost:3001`.

## Маршруты API

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `GET /api/auth/me`
- `GET /api/products`
- `POST /api/products`
- `GET /api/products/:id`
- `PUT /api/products/:id`
- `DELETE /api/products/:id`

## Модель пользователя

```json
{
  "email": "student@example.com",
  "first_name": "Алексей",
  "last_name": "Смирнов",
  "password": "qwerty123"
}
```

## Модель товара

```json
{
  "title": "Игровой ноутбук Storm 16",
  "category": "Ноутбуки",
  "description": "Модель с видеокартой RTX и экраном 165 Гц.",
  "price": 119990
}
```

## Проверка refresh token

- Основной способ передачи refresh token: заголовок `x-refresh-token`.
- Дополнительно backend принимает `refreshToken` в теле запроса для удобства ручной проверки.
- Рекомендуемый сценарий проверки:
  1. Выполнить `POST /api/auth/login`.
  2. Вызвать защищенный маршрут с access token.
  3. Выполнить `POST /api/auth/refresh`.
  4. Повторить защищенный маршрут с новым access token.
