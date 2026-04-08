# Практики 11-12

Проект объединяет требования практических занятий 11 и 12 в тематике недвижимости:

- backend на Express.js с JWT-авторизацией, refresh token и системой ролей `user`, `seller`, `admin`;
- frontend на React.js с разграничением прав по ролям;
- управление объявлениями недвижимости и пользователями из одного интерфейса;
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
- `realtor / realtor123`
- `buyer / buyer123`

## Маршруты API

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `GET /api/auth/me`
- `GET /api/users`
- `GET /api/users/:id`
- `PUT /api/users/:id`
- `DELETE /api/users/:id`
- `GET /api/properties`
- `POST /api/properties`
- `GET /api/properties/:id`
- `PUT /api/properties/:id`
- `DELETE /api/properties/:id`

## Поля объявления

- `title` - заголовок объявления
- `propertyType` - тип объекта
- `address` - адрес
- `description` - описание
- `price` - стоимость
- `area` - площадь в квадратных метрах

## Матрица доступа

- `user` - покупатель, может просматривать список объектов и карточку объявления
- `seller` - риелтор, имеет права `user` плюс создание и редактирование объявлений
- `admin` - имеет права `seller` плюс удаление объявлений и управление пользователями

## Что проверено для практики 12

- вход под тремя ролями;
- получение нового `access token` через `refresh token`;
- просмотр объектов для `user`;
- создание и редактирование объявлений для `seller`;
- управление пользователями и удаление объявлений для `admin`.
