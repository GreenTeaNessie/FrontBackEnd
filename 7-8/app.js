const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { nanoid } = require("nanoid");

const app = express();
const port = process.env.PORT || 3000;

const JWT_SECRET = process.env.ACCESS_SECRET || "practice_7_8_access_secret";
const ACCESS_EXPIRES_IN = "15m";

app.use(express.json());

function createSeedProducts() {
  return [
    {
      id: nanoid(6),
      title: "Ноутбук NovaBook Air 14",
      category: "Ноутбуки",
      description: "Легкий ноутбук для учебы и работы с SSD 512 ГБ.",
      price: 74990
    },
    {
      id: nanoid(6),
      title: "Смартфон Pulse X12",
      category: "Смартфоны",
      description: "Смартфон с AMOLED-дисплеем, камерой 50 Мп и быстрой зарядкой.",
      price: 42990
    },
    {
      id: nanoid(6),
      title: "Планшет ViewTab 11",
      category: "Планшеты",
      description: "Планшет для мультимедиа и заметок с поддержкой стилуса.",
      price: 36990
    }
  ];
}

let users = [];
let products = createSeedProducts();

app.use((req, res, next) => {
  res.on("finish", () => {
    console.log(`[${new Date().toISOString()}] [${req.method}] ${res.statusCode} ${req.path}`);

    if (req.method === "POST" || req.method === "PUT") {
      console.log("Body:", req.body);
    }
  });

  next();
});

function isValidEmail(email) {
  return typeof email === "string" && email.includes("@") && email.trim().length >= 5;
}

function validateTextField(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return `${label} обязательно`;
  }

  return null;
}

function validateProductPayload(payload) {
  const title = payload.title !== undefined ? String(payload.title).trim() : "";
  const category = payload.category !== undefined ? String(payload.category).trim() : "";
  const description = payload.description !== undefined ? String(payload.description).trim() : "";
  const price = payload.price !== undefined ? Number(payload.price) : Number.NaN;

  const textErrors = [
    validateTextField(title, "Название товара"),
    validateTextField(category, "Категория"),
    validateTextField(description, "Описание")
  ].filter(Boolean);

  if (textErrors.length > 0) {
    return { error: textErrors[0] };
  }

  if (!Number.isFinite(price) || price <= 0) {
    return { error: "Цена должна быть положительным числом" };
  }

  return {
    value: {
      title,
      category,
      description,
      price
    }
  };
}

function sanitizeUser(user) {
  return {
    id: user.id,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name
  };
}

function authMiddleware(req, res, next) {
  const authorization = req.headers.authorization || "";
  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Требуется Bearer token" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.auth = payload;
    return next();
  } catch (error) {
    return res.status(401).json({ error: "Токен недействителен или истек" });
  }
}

function findProductOr404(id, res) {
  const product = products.find((item) => item.id === id);

  if (!product) {
    res.status(404).json({ error: "Товар не найден" });
    return null;
  }

  return product;
}

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/auth/register", async (req, res) => {
  const { email, first_name, last_name, password } = req.body;

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "Некорректный email" });
  }

  const firstNameError = validateTextField(first_name, "Имя");
  const lastNameError = validateTextField(last_name, "Фамилия");

  if (firstNameError || lastNameError) {
    return res.status(400).json({ error: firstNameError || lastNameError });
  }

  if (typeof password !== "string" || password.length < 6) {
    return res.status(400).json({ error: "Пароль должен содержать минимум 6 символов" });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const duplicate = users.find((user) => user.email === normalizedEmail);

  if (duplicate) {
    return res.status(409).json({ error: "Пользователь с таким email уже существует" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = {
    id: nanoid(6),
    email: normalizedEmail,
    first_name: first_name.trim(),
    last_name: last_name.trim(),
    passwordHash
  };

  users.push(user);
  return res.status(201).json(sanitizeUser(user));
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  if (!isValidEmail(email) || typeof password !== "string") {
    return res.status(400).json({ error: "Требуются email и password" });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = users.find((item) => item.email === normalizedEmail);

  if (!user) {
    return res.status(401).json({ error: "Неверный email или пароль" });
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    return res.status(401).json({ error: "Неверный email или пароль" });
  }

  const accessToken = jwt.sign(
    {
      sub: user.id,
      email: user.email
    },
    JWT_SECRET,
    { expiresIn: ACCESS_EXPIRES_IN }
  );

  return res.json({ accessToken });
});

app.get("/api/auth/me", authMiddleware, (req, res) => {
  const user = users.find((item) => item.id === req.auth.sub);

  if (!user) {
    return res.status(404).json({ error: "Пользователь не найден" });
  }

  return res.json(sanitizeUser(user));
});

app.get("/api/products", (req, res) => {
  res.json(products);
});

app.post("/api/products", (req, res) => {
  const result = validateProductPayload(req.body);

  if (result.error) {
    return res.status(400).json({ error: result.error });
  }

  const product = {
    id: nanoid(6),
    ...result.value
  };

  products.push(product);
  return res.status(201).json(product);
});

app.get("/api/products/:id", authMiddleware, (req, res) => {
  const product = findProductOr404(req.params.id, res);

  if (!product) {
    return;
  }

  res.json(product);
});

app.put("/api/products/:id", authMiddleware, (req, res) => {
  const product = findProductOr404(req.params.id, res);

  if (!product) {
    return;
  }

  const result = validateProductPayload(req.body);

  if (result.error) {
    return res.status(400).json({ error: result.error });
  }

  Object.assign(product, result.value);
  return res.json(product);
});

app.delete("/api/products/:id", authMiddleware, (req, res) => {
  const exists = products.some((item) => item.id === req.params.id);

  if (!exists) {
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
  console.log(`Сервер запущен на http://localhost:${port}`);
});
