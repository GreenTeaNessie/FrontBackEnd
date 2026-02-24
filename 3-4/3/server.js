const express = require("express");

const app = express();
const port = 3000;


app.use(express.json());

let users = [
  { id: 1, name: "User 1", age: 16 },
  { id: 2, name: "User 2", age: 18 },
  { id: 3, name: "User 3", age: 20 }
];

app.get("/", (req, res) => {
  res.send("Main page");
});

app.get("/exchange-rate/:base", async (req, res) => {
  const base = String(req.params.base).toUpperCase();
  const target = req.query.target ? String(req.query.target).toUpperCase() : null;

  try {
    const response = await fetch(
      `https://v6.exchangerate-api.com/v6/fc1c85cc10f8981b47399204/latest/${base}`
    );

    if (!response.ok) {
      return res.status(502).json({ error: "Ошибка при обращении к ExchangeRate API" });
    }

    const data = await response.json();

    if (data.result !== "success") {
      return res.status(502).json({ error: "Некорректный ответ от ExchangeRate API" });
    }

    if (target) {
      const rate = data.conversion_rates?.[target];

      if (rate === undefined) {
        return res.status(400).json({ error: "Валюта не найдена" });
      }

      return res.json({
        base: data.base_code,
        target,
        rate,
        updatedAt: data.time_last_update_utc
      });
    }

    res.json(data);
  } catch (error) {
    console.error("Ошибка получения курсов:", error);
    res.status(500).json({ error: "Не удалось получить курсы валют" });
  }
});

app.get("/users", (req, res) => {
  res.json(users);
});

app.get("/users/:id", (req, res) => {
  const user = users.find((u) => u.id == req.params.id);

  if (!user) {
    return res.status(404).json({ error: "Пользователь не найден" });
  }

  res.json(user);
});

app.post("/users", (req, res) => {
  const { name, age } = req.body;

  if (!name || age === undefined) {
    return res.status(400).json({ error: "Имя и возраст обязательны" });
  }

  const newUser = {
    id: Date.now(),
    name,
    age: Number(age)
  };

  users.push(newUser);
  res.status(201).json(newUser);
});

app.put("/users/:id", (req, res) => {
  const user = users.find((u) => u.id == req.params.id);

  if (!user) {
    return res.status(404).json({ error: "Пользователь не найден" });
  }

  const { name, age } = req.body;

  if (!name || age === undefined) {
    return res.status(400).json({ error: "Имя и возраст обязательны" });
  }

  user.name = name;
  user.age = Number(age);

  res.json(user);
});

app.patch("/users/:id", (req, res) => {
  const user = users.find((u) => u.id == req.params.id);

  if (!user) {
    return res.status(404).json({ error: "Пользователь не найден" });
  }

  const { name, age } = req.body;

  if (name !== undefined) {
    user.name = name;
  }

  if (age !== undefined) {
    user.age = Number(age);
  }

  res.json(user);
});

app.delete("/users/:id", (req, res) => {
  users = users.filter((u) => u.id != req.params.id);
  res.send("Ok");
});

app.listen(port, () => {
  console.log(`Server started at http://localhost:${port}`);
});

