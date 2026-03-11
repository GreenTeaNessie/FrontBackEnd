const express = require("express");
const cors = require("cors");
const { nanoid } = require("nanoid");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const app = express();
const port = process.env.PORT || 3000;

app.use(
  cors({
    origin: "http://localhost:3001",
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type"]
  })
);
app.use(express.json());

app.use((req, res, next) => {
  res.on("finish", () => {
    console.log(`[${new Date().toISOString()}] [${req.method}] ${res.statusCode} ${req.path}`);
    if (req.method === "POST" || req.method === "PUT" || req.method === "PATCH") {
      console.log("Body:", req.body);
    }
  });
  next();
});

let properties = [
  { id: nanoid(6), name: "Студия 27 м², Мурино", category: "Квартира", description: "Компактная студия у метро Девяткино, после ремонта.", price: 5100000, stock: 1 },
  { id: nanoid(6), name: "2-комнатная 58 м², Кудрово", category: "Квартира", description: "Светлая квартира с кухней-гостиной в новом ЖК.", price: 8900000, stock: 1 },
  { id: nanoid(6), name: "Апартаменты 42 м², Васильевский остров", category: "Апартаменты", description: "Готовые апартаменты под аренду рядом с набережной.", price: 11200000, stock: 1 },
  { id: nanoid(6), name: "3-комнатная 86 м², Приморский район", category: "Квартира", description: "Семейная квартира с видом на парк и подземным паркингом.", price: 17400000, stock: 1 },
  { id: nanoid(6), name: "Таунхаус 120 м², Парголово", category: "Таунхаус", description: "Двухэтажный таунхаус с террасой и собственным участком.", price: 19800000, stock: 1 },
  { id: nanoid(6), name: "Дом 165 м², Всеволожский район", category: "Дом", description: "Дом для постоянного проживания, участок 8 соток.", price: 23500000, stock: 1 },
  { id: nanoid(6), name: "Коммерческое помещение 95 м², центр", category: "Коммерция", description: "Первый этаж, высокий пешеходный трафик, витринные окна.", price: 27600000, stock: 1 },
  { id: nanoid(6), name: "Пентхаус 140 м², Петроградская", category: "Пентхаус", description: "Панорамные окна, терраса 35 м², премиальная отделка.", price: 48900000, stock: 1 },
  { id: nanoid(6), name: "Участок 12 соток, Репино", category: "Земельный участок", description: "Ровный участок под ИЖС, все коммуникации по границе.", price: 9900000, stock: 1 },
  { id: nanoid(6), name: "Склад 600 м², Шушары", category: "Склад", description: "Отапливаемый склад класса B, удобный подъезд для фур.", price: 35200000, stock: 1 }
];

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "API продажи недвижимости",
      version: "1.0.0",
      description: "REST API для управления объектами недвижимости"
    },
    servers: [
      {
        url: `http://localhost:${port}`,
        description: "Локальный сервер"
      }
    ]
  },
  apis: ["./app.js"]
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

function findPropertyOr404(id, res) {
  const property = properties.find((p) => p.id === id);
  if (!property) {
    res.status(404).json({ error: "Объект недвижимости не найден" });
    return null;
  }
  return property;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     Property:
 *       type: object
 *       required:
 *         - name
 *         - category
 *         - description
 *         - price
 *         - stock
 *       properties:
 *         id:
 *           type: string
 *           description: Автоматически сгенерированный ID объекта
 *         name:
 *           type: string
 *           description: Название объекта недвижимости
 *         category:
 *           type: string
 *           description: Категория (Квартира, Дом, Участок и т.д.)
 *         description:
 *           type: string
 *           description: Описание объекта
 *         price:
 *           type: number
 *           description: Цена в рублях
 *         stock:
 *           type: integer
 *           description: Количество на складе
 *       example:
 *         id: abc123
 *         name: "Студия 27 м², Мурино"
 *         category: "Квартира"
 *         description: "Компактная студия у метро Девяткино"
 *         price: 5100000
 *         stock: 1
 */

/**
 * @swagger
 * /api/properties:
 *   post:
 *     summary: Создать новый объект недвижимости
 *     tags: [Properties]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - category
 *               - description
 *               - price
 *               - stock
 *             properties:
 *               name:
 *                 type: string
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               stock:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Объект создан
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Property'
 *       400:
 *         description: Ошибка валидации
 */
app.post("/api/properties", (req, res) => {
  const { name, category, description, price, stock } = req.body;

  if (!name || !category || !description || price === undefined || stock === undefined) {
    return res.status(400).json({ error: "Все поля обязательны" });
  }

  const parsedPrice = Number(price);
  const parsedStock = Number(stock);

  if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
    return res.status(400).json({ error: "Цена должна быть положительным числом" });
  }

  if (!Number.isInteger(parsedStock) || parsedStock < 0) {
    return res.status(400).json({ error: "Количество должно быть целым числом от 0" });
  }

  const newProperty = {
    id: nanoid(6),
    name: String(name).trim(),
    category: String(category).trim(),
    description: String(description).trim(),
    price: parsedPrice,
    stock: parsedStock
  };

  properties.push(newProperty);
  return res.status(201).json(newProperty);
});

/**
 * @swagger
 * /api/properties:
 *   get:
 *     summary: Получить все объекты недвижимости
 *     tags: [Properties]
 *     responses:
 *       200:
 *         description: Список объектов
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Property'
 */
app.get("/api/properties", (req, res) => {
  res.json(properties);
});

/**
 * @swagger
 * /api/properties/{id}:
 *   get:
 *     summary: Получить объект по ID
 *     tags: [Properties]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID объекта
 *     responses:
 *       200:
 *         description: Данные объекта
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Property'
 *       404:
 *         description: Объект не найден
 */
app.get("/api/properties/:id", (req, res) => {
  const property = findPropertyOr404(req.params.id, res);
  if (!property) {
    return;
  }
  res.json(property);
});

/**
 * @swagger
 * /api/properties/{id}:
 *   patch:
 *     summary: Обновить данные объекта
 *     tags: [Properties]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID объекта
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               stock:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Обновлённый объект
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Property'
 *       400:
 *         description: Нет данных для обновления
 *       404:
 *         description: Объект не найден
 */
app.patch("/api/properties/:id", (req, res) => {
  const property = findPropertyOr404(req.params.id, res);
  if (!property) {
    return;
  }

  const { name, category, description, price, stock } = req.body;

  if (
    name === undefined &&
    category === undefined &&
    description === undefined &&
    price === undefined &&
    stock === undefined
  ) {
    return res.status(400).json({ error: "Нет данных для обновления" });
  }

  if (name !== undefined) property.name = String(name).trim();
  if (category !== undefined) property.category = String(category).trim();
  if (description !== undefined) property.description = String(description).trim();

  if (price !== undefined) {
    const parsedPrice = Number(price);
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      return res.status(400).json({ error: "Цена должна быть положительным числом" });
    }
    property.price = parsedPrice;
  }

  if (stock !== undefined) {
    const parsedStock = Number(stock);
    if (!Number.isInteger(parsedStock) || parsedStock < 0) {
      return res.status(400).json({ error: "Количество должно быть целым числом от 0" });
    }
    property.stock = parsedStock;
  }

  return res.json(property);
});

/**
 * @swagger
 * /api/properties/{id}:
 *   delete:
 *     summary: Удалить объект недвижимости
 *     tags: [Properties]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID объекта
 *     responses:
 *       204:
 *         description: Объект удалён
 *       404:
 *         description: Объект не найден
 */
app.delete("/api/properties/:id", (req, res) => {
  const index = properties.findIndex((p) => p.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: "Объект недвижимости не найден" });
  }
  properties.splice(index, 1);
  return res.status(204).send();
});

app.use((req, res) => {
  res.status(404).json({ error: "Маршрут не найден" });
});

app.use((err, req, res, next) => {
  console.error("Необработанная ошибка:", err);
  res.status(500).json({ error: "Внутренняя ошибка сервера" });
});

app.listen(port, () => {
  console.log(`Сервер запущен на http://localhost:${port}`);
  console.log(`Swagger UI: http://localhost:${port}/api-docs`);
});
