const express = require("express");
const cors = require("cors");
const { nanoid } = require("nanoid");

const app = express();
const port = process.env.PORT || 3000;

app.use(
  cors({
    origin: "http://localhost:3001",
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);
app.use(express.json());

function createSeedProducts() {
  return [
    {
      id: nanoid(6),
      title: "Ноутбук NovaBook Air 14",
      category: "Ноутбуки",
      description: "Легкий ноутбук для учебы и работы с экраном 14 дюймов и SSD 512 ГБ.",
      price: 74990,
      stock: 6
    },
    {
      id: nanoid(6),
      title: "Смартфон Pulse X12",
      category: "Смартфоны",
      description: "Смартфон с AMOLED-дисплеем, камерой 50 Мп и аккумулятором 5000 мАч.",
      price: 42990,
      stock: 18
    },
    {
      id: nanoid(6),
      title: "Планшет ViewTab 11",
      category: "Планшеты",
      description: "Планшет для мультимедиа и заметок с поддержкой стилуса.",
      price: 36990,
      stock: 9
    },
    {
      id: nanoid(6),
      title: "Монитор PixelView 27",
      category: "Мониторы",
      description: "27-дюймовый IPS-монитор с частотой обновления 144 Гц.",
      price: 28990,
      stock: 11
    },
    {
      id: nanoid(6),
      title: "Механическая клавиатура KeyForge TKL",
      category: "Периферия",
      description: "Компактная клавиатура с RGB-подсветкой и горячей заменой переключателей.",
      price: 9990,
      stock: 23
    },
    {
      id: nanoid(6),
      title: "Игровая мышь Vector Pro",
      category: "Периферия",
      description: "Легкая мышь с сенсором 26000 DPI и шестью программируемыми кнопками.",
      price: 5490,
      stock: 30
    },
    {
      id: nanoid(6),
      title: "Беспроводные наушники SoundBeat One",
      category: "Аудио",
      description: "Полноразмерные наушники с шумоподавлением и автономностью до 40 часов.",
      price: 15990,
      stock: 14
    },
    {
      id: nanoid(6),
      title: "Смарт-часы Motion Watch S",
      category: "Носимые устройства",
      description: "Часы с GPS, пульсометром и поддержкой уведомлений со смартфона.",
      price: 18990,
      stock: 12
    },
    {
      id: nanoid(6),
      title: "Портативная колонка Sonic Mini",
      category: "Аудио",
      description: "Компактная Bluetooth-колонка с защитой от влаги IPX7.",
      price: 6990,
      stock: 17
    },
    {
      id: nanoid(6),
      title: "Внешний SSD FlashCore 1TB",
      category: "Накопители",
      description: "Скоростной USB-C SSD для резервных копий и работы с видео.",
      price: 12990,
      stock: 20
    }
  ];
}

let products = createSeedProducts();

app.use((req, res, next) => {
  res.on("finish", () => {
    console.log(`[${new Date().toISOString()}] [${req.method}] ${res.statusCode} ${req.path}`);

    if (req.method === "POST" || req.method === "PATCH") {
      console.log("Body:", req.body);
    }
  });

  next();
});

function validateTextField(value, fieldLabel) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return `${fieldLabel} обязательно`;
  }

  return null;
}

function normalizeProductPayload(payload) {
  return {
    title: payload.title !== undefined ? String(payload.title).trim() : undefined,
    category: payload.category !== undefined ? String(payload.category).trim() : undefined,
    description: payload.description !== undefined ? String(payload.description).trim() : undefined,
    price: payload.price !== undefined ? Number(payload.price) : undefined,
    stock: payload.stock !== undefined ? Number(payload.stock) : undefined
  };
}

function validateProductPayload(payload, { partial = false } = {}) {
  const normalized = normalizeProductPayload(payload);

  if (!partial) {
    const requiredFields = ["title", "category", "description", "price", "stock"];
    const hasMissingField = requiredFields.some((field) => normalized[field] === undefined);

    if (hasMissingField) {
      return { error: "Все поля обязательны" };
    }
  } else {
    const hasNoFields =
      normalized.title === undefined &&
      normalized.category === undefined &&
      normalized.description === undefined &&
      normalized.price === undefined &&
      normalized.stock === undefined;

    if (hasNoFields) {
      return { error: "Нет данных для обновления" };
    }
  }

  if (normalized.title !== undefined) {
    const error = validateTextField(normalized.title, "Название товара");
    if (error) {
      return { error };
    }
  }

  if (normalized.category !== undefined) {
    const error = validateTextField(normalized.category, "Категория");
    if (error) {
      return { error };
    }
  }

  if (normalized.description !== undefined) {
    const error = validateTextField(normalized.description, "Описание");
    if (error) {
      return { error };
    }
  }

  if (normalized.price !== undefined && (!Number.isFinite(normalized.price) || normalized.price <= 0)) {
    return { error: "Цена должна быть положительным числом" };
  }

  if (
    normalized.stock !== undefined &&
    (!Number.isInteger(normalized.stock) || normalized.stock < 0)
  ) {
    return { error: "Количество на складе должно быть целым числом от 0" };
  }

  return { value: normalized };
}

function findProductOr404(id, res) {
  const product = products.find((item) => item.id === id);

  if (!product) {
    res.status(404).json({ error: "Товар не найден" });
    return null;
  }

  return product;
}

app.get("/api/products", (req, res) => {
  res.json(products);
});

app.get("/api/products/:id", (req, res) => {
  const product = findProductOr404(req.params.id, res);

  if (!product) {
    return;
  }

  res.json(product);
});

app.post("/api/products", (req, res) => {
  const result = validateProductPayload(req.body);

  if (result.error) {
    return res.status(400).json({ error: result.error });
  }

  const newProduct = {
    id: nanoid(6),
    ...result.value
  };

  products.push(newProduct);
  return res.status(201).json(newProduct);
});

app.patch("/api/products/:id", (req, res) => {
  const product = findProductOr404(req.params.id, res);

  if (!product) {
    return;
  }

  const result = validateProductPayload(req.body, { partial: true });

  if (result.error) {
    return res.status(400).json({ error: result.error });
  }

  Object.assign(product, result.value);
  return res.json(product);
});

app.delete("/api/products/:id", (req, res) => {
  const productExists = products.some((item) => item.id === req.params.id);

  if (!productExists) {
    return res.status(404).json({ error: "Товар не найден" });
  }

  products = products.filter((item) => item.id !== req.params.id);
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
  console.log(`Server started at http://localhost:${port}`);
});
