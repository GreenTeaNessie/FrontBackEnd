const express = require("express");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

let properties = [
  { id: 1, name: "Студия 27 м², Мурино", price: 5100000 },
  { id: 2, name: "2-комнатная 58 м², Кудрово", price: 8900000 },
  { id: 3, name: "Дом 165 м², Всеволожский район", price: 23500000 }
];

app.get("/", (req, res) => {
  res.send("Главная страница — Продажа недвижимости");
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

app.get("/properties", (req, res) => {
  res.json(properties);
});

app.get("/properties/:id", (req, res) => {
  const property = properties.find((p) => p.id == req.params.id);

  if (!property) {
    return res.status(404).json({ error: "Объект недвижимости не найден" });
  }

  res.json(property);
});

app.post("/properties", (req, res) => {
  const { name, price } = req.body;

  if (!name || price === undefined) {
    return res.status(400).json({ error: "Название и цена обязательны" });
  }

  const newProperty = {
    id: Date.now(),
    name,
    price: Number(price)
  };

  properties.push(newProperty);
  res.status(201).json(newProperty);
});

app.put("/properties/:id", (req, res) => {
  const property = properties.find((p) => p.id == req.params.id);

  if (!property) {
    return res.status(404).json({ error: "Объект недвижимости не найден" });
  }

  const { name, price } = req.body;

  if (!name || price === undefined) {
    return res.status(400).json({ error: "Название и цена обязательны" });
  }

  property.name = name;
  property.price = Number(price);

  res.json(property);
});

app.patch("/properties/:id", (req, res) => {
  const property = properties.find((p) => p.id == req.params.id);

  if (!property) {
    return res.status(404).json({ error: "Объект недвижимости не найден" });
  }

  const { name, price } = req.body;

  if (name !== undefined) {
    property.name = name;
  }

  if (price !== undefined) {
    property.price = Number(price);
  }

  res.json(property);
});

app.delete("/properties/:id", (req, res) => {
  properties = properties.filter((p) => p.id != req.params.id);
  res.send("Ok");
});

app.listen(port, () => {
  console.log(`Сервер запущен на http://localhost:${port}`);
});

