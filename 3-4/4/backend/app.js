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

let properties = [
  {
    id: nanoid(6),
    name: "Студия 27 м2, Мурино",
    category: "Квартира",
    description: "Компактная студия у метро Девяткино, после ремонта.",
    price: 5100000,
    stock: 1
  },
  {
    id: nanoid(6),
    name: "2-комнатная 58 м2, Кудрово",
    category: "Квартира",
    description: "Светлая квартира с кухней-гостиной в новом ЖК.",
    price: 8900000,
    stock: 1
  },
  {
    id: nanoid(6),
    name: "Апартаменты 42 м2, Васильевский остров",
    category: "Апартаменты",
    description: "Готовые апартаменты под аренду рядом с набережной.",
    price: 11200000,
    stock: 1
  },
  {
    id: nanoid(6),
    name: "3-комнатная 86 м2, Приморский район",
    category: "Квартира",
    description: "Семейная квартира с видом на парк и подземным паркингом.",
    price: 17400000,
    stock: 1
  },
  {
    id: nanoid(6),
    name: "Таунхаус 120 м2, Парголово",
    category: "Таунхаус",
    description: "Двухэтажный таунхаус с террасой и собственным участком.",
    price: 19800000,
    stock: 1
  },
  {
    id: nanoid(6),
    name: "Дом 165 м2, Всеволожский район",
    category: "Дом",
    description: "Дом для постоянного проживания, участок 8 соток.",
    price: 23500000,
    stock: 1
  },
  {
    id: nanoid(6),
    name: "Коммерческое помещение 95 м2, центр",
    category: "Коммерция",
    description: "Первый этаж, высокий пешеходный трафик, витринные окна.",
    price: 27600000,
    stock: 1
  },
  {
    id: nanoid(6),
    name: "Пентхаус 140 м2, Петроградская",
    category: "Пентхаус",
    description: "Панорамные окна, терраса 35 м2, премиальная отделка.",
    price: 48900000,
    stock: 1
  },
  {
    id: nanoid(6),
    name: "Участок 12 соток, Репино",
    category: "Земельный участок",
    description: "Ровный участок под ИЖС, все коммуникации по границе.",
    price: 9900000,
    stock: 1
  },
  {
    id: nanoid(6),
    name: "Склад 600 м2, Шушары",
    category: "Склад",
    description: "Отапливаемый склад класса B, удобный подъезд для фур.",
    price: 35200000,
    stock: 1
  }
];

app.use((req, res, next) => {
  res.on("finish", () => {
    console.log(`[${new Date().toISOString()}] [${req.method}] ${res.statusCode} ${req.path}`);

    if (req.method === "POST" || req.method === "PUT" || req.method === "PATCH") {
      console.log("Body:", req.body);
    }
  });

  next();
});

function findPropertyOr404(id, res) {
  const property = properties.find((p) => p.id == id);

  if (!property) {
    res.status(404).json({ error: "Объект недвижимости не найден" });
    return null;
  }

  return property;
}

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
    return res.status(400).json({ error: "Количество на складе должно быть целым числом от 0" });
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
  res.status(201).json(newProperty);
});

app.get("/api/properties", (req, res) => {
  res.json(properties);
});

app.get("/api/properties/:id", (req, res) => {
  const property = findPropertyOr404(req.params.id, res);

  if (!property) {
    return;
  }

  res.json(property);
});

app.patch("/api/properties/:id", (req, res) => {
  const property = findPropertyOr404(req.params.id, res);

  if (!property) {
    return;
  }

  if (
    req.body?.name === undefined &&
    req.body?.category === undefined &&
    req.body?.description === undefined &&
    req.body?.price === undefined &&
    req.body?.stock === undefined
  ) {
    return res.status(400).json({ error: "Нет данных для обновления" });
  }

  const { name, category, description, price, stock } = req.body;

  if (name !== undefined) {
    property.name = String(name).trim();
  }

  if (category !== undefined) {
    property.category = String(category).trim();
  }

  if (description !== undefined) {
    property.description = String(description).trim();
  }

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
      return res.status(400).json({ error: "Количество на складе должно быть целым числом от 0" });
    }
    property.stock = parsedStock;
  }

  res.json(property);
});

app.delete("/api/properties/:id", (req, res) => {
  const exists = properties.some((p) => p.id === req.params.id);

  if (!exists) {
    return res.status(404).json({ error: "Объект недвижимости не найден" });
  }

  properties = properties.filter((p) => p.id !== req.params.id);
  res.status(204).send();
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
