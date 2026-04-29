const express = require("express");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

let nextId = 4;
let products = [
  { id: 1, title: "Ноутбук Vector 14", price: 94990 },
  { id: 2, title: "Беспроводные наушники ArcSound X5", price: 12990 },
  { id: 3, title: "Игровая мышь HyperClick Pro", price: 4990 }
];

function validateProductPayload(payload, { partial = false } = {}) {
  const errors = [];
  const data = {};

  if (!partial || payload.title !== undefined) {
    const title = String(payload.title ?? "").trim();
    if (!title) {
      errors.push("Поле title обязательно");
    } else {
      data.title = title;
    }
  }

  if (!partial || payload.price !== undefined) {
    const price = Number(payload.price);
    if (!Number.isFinite(price) || price <= 0) {
      errors.push("Поле price должно быть положительным числом");
    } else {
      data.price = price;
    }
  }

  return {
    errors,
    data
  };
}

function findProductById(id) {
  return products.find((product) => product.id === Number(id));
}

app.get("/", (req, res) => {
  res.json({
    message: "API товаров для практического занятия №2",
    routes: ["GET /products", "GET /products/:id", "POST /products", "PATCH /products/:id", "DELETE /products/:id"]
  });
});

app.get("/products", (req, res) => {
  res.json(products);
});

app.get("/products/:id", (req, res) => {
  const product = findProductById(req.params.id);

  if (!product) {
    return res.status(404).json({ error: "Товар не найден" });
  }

  return res.json(product);
});

app.post("/products", (req, res) => {
  const { errors, data } = validateProductPayload(req.body);

  if (errors.length) {
    return res.status(400).json({ errors });
  }

  const newProduct = {
    id: nextId++,
    ...data
  };

  products.push(newProduct);
  return res.status(201).json(newProduct);
});

app.patch("/products/:id", (req, res) => {
  const product = findProductById(req.params.id);

  if (!product) {
    return res.status(404).json({ error: "Товар не найден" });
  }

  if (req.body.title === undefined && req.body.price === undefined) {
    return res.status(400).json({
      error: "Нечего обновлять: передайте title и/или price"
    });
  }

  const { errors, data } = validateProductPayload(req.body, { partial: true });

  if (errors.length) {
    return res.status(400).json({ errors });
  }

  Object.assign(product, data);
  return res.json(product);
});

app.delete("/products/:id", (req, res) => {
  const product = findProductById(req.params.id);

  if (!product) {
    return res.status(404).json({ error: "Товар не найден" });
  }

  products = products.filter((item) => item.id !== product.id);
  return res.status(204).send();
});

app.use((req, res) => {
  res.status(404).json({ error: "Маршрут не найден" });
});

app.listen(port, () => {
  console.log(`Сервер запущен на http://localhost:${port}`);
});
