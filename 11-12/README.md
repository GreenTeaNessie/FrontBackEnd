# Практики 11-12

Папка `11-12` приведена к ролевой версии интернет-магазина электроники с JWT-аутентификацией, refresh token и RBAC.

## Что реализовано

- Регистрация пользователя по `email`, `first_name`, `last_name`, `password`.
- Публичная регистрация всегда создает роль `user`.
- JWT access token + refresh token.
- Роли `user`, `seller`, `admin`.
- Блокировка пользователя через `DELETE /api/users/:id`.
- Единый контракт товаров: `GET/POST /api/products`, `GET/PUT/DELETE /api/products/:id`.
- React-клиент с ролевым интерфейсом.

## Ролевая модель

- `user` — просмотр товаров.
- `seller` — просмотр, создание и редактирование товаров.
- `admin` — полный доступ к товарам и управление пользователями.

Заблокированный пользователь:

- не может войти;
- не может обновить access token через refresh token;
- не может обращаться к защищенным маршрутам.

## Демо-аккаунты

- `admin@electro.local` / `Admin1234`
- `seller@electro.local` / `Seller1234`
- `user@electro.local` / `User1234`

## Структура

- `backend` — Express API.
- `frontend` — React SPA.

## Запуск

### Backend

```bash
cd backend
npm install
npm start
```

Сервер запускается на `http://localhost:3002`.

### Frontend

```bash
cd frontend
npm install
npm start
```

Клиент запускается на `http://localhost:3003`.

## Основные маршруты API

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `GET /api/auth/me`
- `GET /api/products`
- `GET /api/products/:id`
- `POST /api/products`
- `PUT /api/products/:id`
- `DELETE /api/products/:id`
- `GET /api/users`
- `GET /api/users/:id`
- `PUT /api/users/:id`
- `DELETE /api/users/:id`

## Проверка RBAC

1. Войти под `user` и убедиться, что доступны только просмотр и чтение товаров.
2. Войти под `seller` и проверить создание и редактирование товара.
3. Войти под `admin` и проверить удаление товара, список пользователей, смену роли и блокировку.
4. Заблокировать пользователя и убедиться, что повторный вход и refresh завершаются ошибкой.
5. Проверить, что `admin` не может заблокировать самого себя.
