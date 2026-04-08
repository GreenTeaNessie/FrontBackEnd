# Практики 9-10

Проект объединяет требования практических занятий 9 и 10 в тематике недвижимости:

- backend на Express.js с регистрацией, входом, JWT access token, refresh token и CRUD объявлений недвижимости;
- frontend на React.js с формами входа и регистрации, списком объектов, детальной карточкой, созданием, обновлением и удалением объявлений;
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

## Проверка refresh token

Маршрут `POST /api/auth/refresh` принимает refresh token из заголовка `x-refresh-token` и дополнительно поддерживает `refreshToken` в теле запроса.
