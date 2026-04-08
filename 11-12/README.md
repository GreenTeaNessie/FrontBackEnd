# Практики 11-12

Проект объединяет требования практических занятий 11 и 12:

- backend на Express.js с JWT-авторизацией, refresh token и системой ролей `user`, `seller`, `admin`;
- frontend на React.js с разграничением прав по ролям;
- управление товарами и пользователями из одного интерфейса;
- готовый README и набор тестовых сценариев для контрольной работы №2.

## Структура

- `backend` - API на Express.js
- `frontend` - клиентское приложение на React.js
- `backend/requests.http` - примеры запросов для ручной проверки

## Запуск

### Backend

```bash
cd backend
npm install
npm start
```

Сервер поднимается на `http://localhost:3002`.

### Frontend

```bash
cd frontend
npm install
npm start
```

Клиент запускается на `http://localhost:3003`.

## Тестовые аккаунты

- `admin / admin123`
- `seller / seller123`
- `user / user123`

## Маршруты API

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `GET /api/auth/me`
- `GET /api/users`
- `GET /api/users/:id`
- `PUT /api/users/:id`
- `DELETE /api/users/:id`
- `GET /api/products`
- `POST /api/products`
- `GET /api/products/:id`
- `PUT /api/products/:id`
- `DELETE /api/products/:id`

## Матрица доступа

- `user` - просмотр списка товаров и карточки товара
- `seller` - права `user` плюс создание и редактирование товаров
- `admin` - права `seller` плюс удаление товаров и управление пользователями

## Что проверено для практики 12

- вход под тремя ролями;
- получение нового `access token` через `refresh token`;
- просмотр товаров для `user`;
- создание и редактирование товаров для `seller`;
- управление пользователями и удаление товаров для `admin`.
