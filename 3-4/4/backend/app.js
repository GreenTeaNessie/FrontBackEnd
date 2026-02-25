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

let users = [
  { id: nanoid(6), name: "User 1", age: 16 },
  { id: nanoid(6), name: "User 2", age: 18 },
  { id: nanoid(6), name: "User 3", age: 20 }
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

function findUserOr404(id, res) {
  const user = users.find((u) => u.id == id);

  if (!user) {
    res.status(404).json({ error: "Пользователь не найден" });
    return null;
  }

  return user;
}

app.post("/api/users", (req, res) => {
  const { name, age } = req.body;

  if (!name || age === undefined) {
    return res.status(400).json({ error: "Имя и возраст обязательны" });
  }

  const newUser = {
    id: nanoid(6),
    name: String(name).trim(),
    age: Number(age)
  };

  users.push(newUser);
  res.status(201).json(newUser);
});

app.get("/api/users", (req, res) => {
  res.json(users);
});

app.get("/api/users/:id", (req, res) => {
  const user = findUserOr404(req.params.id, res);

  if (!user) {
    return;
  }

  res.json(user);
});

app.patch("/api/users/:id", (req, res) => {
  const user = findUserOr404(req.params.id, res);

  if (!user) {
    return;
  }

  if (req.body?.name === undefined && req.body?.age === undefined) {
    return res.status(400).json({ error: "Нет данных для обновления" });
  }

  const { name, age } = req.body;

  if (name !== undefined) {
    user.name = String(name).trim();
  }

  if (age !== undefined) {
    user.age = Number(age);
  }

  res.json(user);
});

app.delete("/api/users/:id", (req, res) => {
  const exists = users.some((u) => u.id === req.params.id);

  if (!exists) {
    return res.status(404).json({ error: "Пользователь не найден" });
  }

  users = users.filter((u) => u.id !== req.params.id);
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
