# Практические работы 5-6

Папка `5-6` приведена к единому заданию по интернет-магазину электроники.

## Что реализовано

- `5/backend`: REST API для товаров по маршрутам `GET/POST /api/products` и `GET/PATCH/DELETE /api/products/:id`.
- `5/backend`: Swagger UI на `http://localhost:3000/api-docs`.
- `5/backend`: JSDoc-аннотации для всего CRUD по товарам.
- `5/backend`: `components.schemas.Product` и дополнительная `components.schemas.User`.
- `5/frontend`: React-интерфейс для просмотра, создания, редактирования и удаления товаров.

## Структура

- `5/backend/app.js` — Express API и Swagger-конфигурация.
- `5/backend/requests.http` — готовые запросы для ручной проверки.
- `5/frontend/src` — клиентская часть на React.

## Запуск backend

1. Перейти в `C:\Development\FrontBackEnd\5-6\5\backend`.
2. Установить зависимости: `npm install`.
3. Запустить сервер: `npm start`.
4. Проверить API:
   - `http://localhost:3000/api/products`
   - `http://localhost:3000/api-docs`

## Запуск frontend

1. Перейти в `C:\Development\FrontBackEnd\5-6\5\frontend`.
2. Установить зависимости: `npm install`.
3. Запустить приложение: `npm start`.
4. Открыть `http://localhost:3001`.

## Ручная проверка

1. Открыть Swagger UI и выполнить `GET /api/products`.
2. Выполнить `POST /api/products` из Swagger или `requests.http`.
3. Выполнить `PATCH /api/products/{id}` и проверить изменение цены или остатка.
4. Выполнить `DELETE /api/products/{id}` и убедиться, что товар удален.
5. На frontend проверить сценарий `list -> create -> edit -> delete`.

## Checklist перед сдачей

- Backend запускается без ошибок.
- `GET /api/products` возвращает seeded-список товаров.
- Swagger UI доступен на `/api-docs`.
- Все CRUD-операции работают из Swagger.
- Frontend отображает список товаров и обновляет данные после операций.
- `requests.http` содержит актуальные примеры для проверки.
