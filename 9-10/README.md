# Практики 9-10

Проект объединяет требования практических занятий 9 и 10:

- backend на Express.js с регистрацией, входом, JWT access token, refresh token и CRUD товаров;
- frontend на React.js с формами входа и регистрации, списком товаров, детальной карточкой, созданием, обновлением и удалением товаров;
- автоматическое обновление access token через `axios` interceptors при ответе `401`.

## Структура

- `backend` - API на Express.js
- `frontend` - клиентское приложение на React.js

## Запуск

### Backend

```bash
cd backend
npm install
npm start
```

Сервер поднимается на `http://localhost:3000`.

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

## Проверка refresh token

Маршрут `POST /api/auth/refresh` принимает refresh token из заголовка `x-refresh-token` и дополнительно поддерживает `refreshToken` в теле запроса.
