const fs = require("fs");
const path = require("path");
const express = require("express");

const app = express();
const port = process.env.PORT || 3001;
const envPath = path.join(__dirname, ".env");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  return fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .reduce((accumulator, line) => {
      const trimmedLine = line.trim();

      if (!trimmedLine || trimmedLine.startsWith("#")) {
        return accumulator;
      }

      const separatorIndex = trimmedLine.indexOf("=");
      if (separatorIndex === -1) {
        return accumulator;
      }

      const key = trimmedLine.slice(0, separatorIndex).trim();
      const value = trimmedLine.slice(separatorIndex + 1).trim();

      accumulator[key] = value;
      return accumulator;
    }, {});
}

const envConfig = loadEnvFile(envPath);
const exchangeRateApiKey = process.env.EXCHANGE_RATE_API_KEY || envConfig.EXCHANGE_RATE_API_KEY || "";

app.get("/", (req, res) => {
  res.json({
    message: "Вспомогательный прокси для практического занятия №3",
    routes: ["GET /health", "GET /api/exchange-rate/:base", "GET /api/exchange-rate/:base?target=RUB"]
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    exchangeRateApiKeyConfigured: Boolean(exchangeRateApiKey)
  });
});

app.get("/api/exchange-rate/:base", async (req, res) => {
  const base = String(req.params.base).toUpperCase();
  const target = req.query.target ? String(req.query.target).toUpperCase() : null;

  if (!exchangeRateApiKey) {
    return res.status(500).json({
      error: "Переменная EXCHANGE_RATE_API_KEY не задана"
    });
  }

  try {
    const response = await fetch(
      `https://v6.exchangerate-api.com/v6/${exchangeRateApiKey}/latest/${base}`
    );

    if (!response.ok) {
      return res.status(502).json({
        error: "Ошибка при обращении к ExchangeRate API"
      });
    }

    const data = await response.json();

    if (data.result !== "success") {
      return res.status(502).json({
        error: "Некорректный ответ от ExchangeRate API",
        details: data
      });
    }

    if (!target) {
      return res.json({
        result: data.result,
        base: data.base_code,
        updatedAt: data.time_last_update_utc,
        conversionRates: data.conversion_rates
      });
    }

    const rate = data.conversion_rates?.[target];

    if (rate === undefined) {
      return res.status(400).json({
        error: `Валюта ${target} не найдена`
      });
    }

    return res.json({
      base: data.base_code,
      target,
      rate,
      updatedAt: data.time_last_update_utc
    });
  } catch (error) {
    console.error("Ошибка получения курсов:", error);
    return res.status(500).json({
      error: "Не удалось получить курсы валют"
    });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: "Маршрут не найден" });
});

app.listen(port, () => {
  console.log(`Сервер запущен на http://localhost:${port}`);
});
