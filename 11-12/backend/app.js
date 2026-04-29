const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { nanoid } = require("nanoid");

const app = express();
const port = process.env.PORT || 3002;

const ACCESS_SECRET = process.env.ACCESS_SECRET || "practice_11_12_access_secret";
const REFRESH_SECRET = process.env.REFRESH_SECRET || "practice_11_12_refresh_secret";
const ACCESS_EXPIRES_IN = "15m";
const REFRESH_EXPIRES_IN = "7d";
const AVAILABLE_ROLES = ["user", "seller", "admin"];

app.use(
  cors({
    origin: "http://localhost:3003",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "x-refresh-token"]
  })
);
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
    },
    {
      id: nanoid(6),
      title: "Монитор PixelView 27",
      category: "Мониторы",
      description: "27-дюймовый IPS-монитор с частотой обновления 144 Гц.",
      price: 28990
    },
    {
      id: nanoid(6),
      title: "Беспроводные наушники SoundBeat One",
      category: "Аудио",
      description: "Полноразмерные наушники с шумоподавлением и автономностью до 40 часов.",
      price: 15990
    }
  ];
}

let users = [];
let products = createSeedProducts();
const refreshTokens = new Map();

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
    last_name: user.last_name,
    role: user.role,
    isBlocked: user.isBlocked
  };
}

function issueTokens(user) {
  const accessToken = jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role
    },
    ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRES_IN }
  );

  const refreshToken = jwt.sign(
    {
      sub: user.id
    },
    REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRES_IN }
  );

  refreshTokens.set(refreshToken, user.id);

  return { accessToken, refreshToken };
}

function revokeUserSessions(userId) {
  for (const [token, sessionUserId] of refreshTokens.entries()) {
    if (sessionUserId === userId) {
      refreshTokens.delete(token);
    }
  }
}

function extractRefreshToken(req) {
  return req.headers["x-refresh-token"] || req.body?.refreshToken || "";
}

function authMiddleware(req, res, next) {
  const authorization = req.headers.authorization || "";
  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Требуется Bearer token" });
  }

  try {
    const payload = jwt.verify(token, ACCESS_SECRET);
    const user = users.find((item) => item.id === payload.sub);

    if (!user) {
      return res.status(401).json({ error: "Пользователь не найден" });
    }

    if (user.isBlocked) {
      return res.status(403).json({ error: "Пользователь заблокирован" });
    }

    req.auth = payload;
    req.currentUser = user;
    return next();
  } catch (error) {
    return res.status(401).json({ error: "Токен недействителен или истек" });
  }
}

function requireRoles(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.currentUser.role)) {
      return res.status(403).json({ error: "Недостаточно прав" });
    }

    return next();
  };
}

function findProductOr404(id, res) {
  const product = products.find((item) => item.id === id);

  if (!product) {
    res.status(404).json({ error: "Товар не найден" });
    return null;
  }

  return product;
}

function findUserOr404(id, res) {
  const user = users.find((item) => item.id === id);

  if (!user) {
    res.status(404).json({ error: "Пользователь не найден" });
    return null;
  }

  return user;
}

async function seedDemoUsers() {
  const demoUsers = [
    {
      email: "admin@electro.local",
      first_name: "Системный",
      last_name: "Администратор",
      password: "Admin1234",
      role: "admin"
    },
    {
      email: "seller@electro.local",
      first_name: "Мария",
      last_name: "Продавец",
      password: "Seller1234",
      role: "seller"
    },
    {
      email: "user@electro.local",
      first_name: "Илья",
      last_name: "Покупатель",
      password: "User1234",
      role: "user"
    }
  ];

  const seededUsers = [];

  for (const demoUser of demoUsers) {
    seededUsers.push({
      id: nanoid(6),
      email: demoUser.email,
      first_name: demoUser.first_name,
      last_name: demoUser.last_name,
      passwordHash: await bcrypt.hash(demoUser.password, 10),
      role: demoUser.role,
      isBlocked: false
    });
  }

  users = seededUsers;
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

  if (users.some((user) => user.email === normalizedEmail)) {
    return res.status(409).json({ error: "Пользователь с таким email уже существует" });
  }

  const user = {
    id: nanoid(6),
    email: normalizedEmail,
    first_name: first_name.trim(),
    last_name: last_name.trim(),
    passwordHash: await bcrypt.hash(password, 10),
    role: "user",
    isBlocked: false
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

  if (user.isBlocked) {
    return res.status(403).json({ error: "Пользователь заблокирован" });
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    return res.status(401).json({ error: "Неверный email или пароль" });
  }

  return res.json(issueTokens(user));
});

app.post("/api/auth/refresh", (req, res) => {
  const refreshToken = extractRefreshToken(req);

  if (!refreshToken) {
    return res.status(400).json({ error: "Refresh token не передан" });
  }

  if (!refreshTokens.has(refreshToken)) {
    return res.status(401).json({ error: "Refresh token не найден" });
  }

  try {
    const payload = jwt.verify(refreshToken, REFRESH_SECRET);
    const user = users.find((item) => item.id === payload.sub);

    if (!user) {
      refreshTokens.delete(refreshToken);
      return res.status(401).json({ error: "Пользователь не найден" });
    }

    if (user.isBlocked) {
      refreshTokens.delete(refreshToken);
      return res.status(403).json({ error: "Пользователь заблокирован" });
    }

    refreshTokens.delete(refreshToken);
    return res.json(issueTokens(user));
  } catch (error) {
    refreshTokens.delete(refreshToken);
    return res.status(401).json({ error: "Refresh token недействителен или истек" });
  }
});

app.get("/api/auth/me", authMiddleware, (req, res) => {
  return res.json(sanitizeUser(req.currentUser));
});

app.get("/api/products", authMiddleware, requireRoles("user", "seller", "admin"), (req, res) => {
  res.json(products);
});

app.get("/api/products/:id", authMiddleware, requireRoles("user", "seller", "admin"), (req, res) => {
  const product = findProductOr404(req.params.id, res);

  if (!product) {
    return;
  }

  return res.json(product);
});

app.post("/api/products", authMiddleware, requireRoles("seller", "admin"), (req, res) => {
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

app.put("/api/products/:id", authMiddleware, requireRoles("seller", "admin"), (req, res) => {
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

app.delete("/api/products/:id", authMiddleware, requireRoles("admin"), (req, res) => {
  const exists = products.some((item) => item.id === req.params.id);

  if (!exists) {
    return res.status(404).json({ error: "Товар не найден" });
  }

  products = products.filter((item) => item.id !== req.params.id);
  return res.status(204).send();
});

app.get("/api/users", authMiddleware, requireRoles("admin"), (req, res) => {
  res.json(users.map(sanitizeUser));
});

app.get("/api/users/:id", authMiddleware, requireRoles("admin"), (req, res) => {
  const user = findUserOr404(req.params.id, res);

  if (!user) {
    return;
  }

  return res.json(sanitizeUser(user));
});

app.put("/api/users/:id", authMiddleware, requireRoles("admin"), (req, res) => {
  const user = findUserOr404(req.params.id, res);

  if (!user) {
    return;
  }

  const updates = {};
  const { email, first_name, last_name, role, isBlocked } = req.body;

  if (
    email === undefined &&
    first_name === undefined &&
    last_name === undefined &&
    role === undefined &&
    isBlocked === undefined
  ) {
    return res.status(400).json({ error: "Нет данных для обновления" });
  }

  if (email !== undefined) {
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Некорректный email" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const duplicate = users.find((item) => item.email === normalizedEmail && item.id !== user.id);

    if (duplicate) {
      return res.status(409).json({ error: "Пользователь с таким email уже существует" });
    }

    updates.email = normalizedEmail;
  }

  if (first_name !== undefined) {
    const error = validateTextField(first_name, "Имя");
    if (error) {
      return res.status(400).json({ error });
    }
    updates.first_name = first_name.trim();
  }

  if (last_name !== undefined) {
    const error = validateTextField(last_name, "Фамилия");
    if (error) {
      return res.status(400).json({ error });
    }
    updates.last_name = last_name.trim();
  }

  if (role !== undefined) {
    if (!AVAILABLE_ROLES.includes(role)) {
      return res.status(400).json({ error: "Недопустимая роль" });
    }

    if (req.currentUser.id === user.id && role !== user.role) {
      return res.status(400).json({ error: "Администратор не может менять собственную роль" });
    }

    updates.role = role;
  }

  if (isBlocked !== undefined) {
    if (typeof isBlocked !== "boolean") {
      return res.status(400).json({ error: "isBlocked должен быть boolean" });
    }

    if (req.currentUser.id === user.id && isBlocked) {
      return res.status(400).json({ error: "Администратор не может заблокировать самого себя" });
    }

    updates.isBlocked = isBlocked;
  }

  Object.assign(user, updates);

  if (updates.isBlocked === true) {
    revokeUserSessions(user.id);
  }

  return res.json(sanitizeUser(user));
});

app.delete("/api/users/:id", authMiddleware, requireRoles("admin"), (req, res) => {
  const user = findUserOr404(req.params.id, res);

  if (!user) {
    return;
  }

  if (req.currentUser.id === user.id) {
    return res.status(400).json({ error: "Администратор не может заблокировать самого себя" });
  }

  user.isBlocked = true;
  revokeUserSessions(user.id);
  return res.json(sanitizeUser(user));
});

app.use((req, res) => {
  res.status(404).json({ error: "Маршрут не найден" });
});

app.use((err, req, res, next) => {
  console.error("Необработанная ошибка:", err);
  res.status(500).json({ error: "Внутренняя ошибка сервера" });
});

async function start() {
  await seedDemoUsers();

  app.listen(port, () => {
    console.log(`Сервер запущен на http://localhost:${port}`);
  });
}

start().catch((error) => {
  console.error("Не удалось инициализировать приложение:", error);
  process.exit(1);
});
