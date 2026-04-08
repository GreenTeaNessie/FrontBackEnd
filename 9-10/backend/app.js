const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { nanoid } = require("nanoid");

const app = express();
const PORT = process.env.PORT || 3000;

const ACCESS_SECRET = process.env.ACCESS_SECRET || "practice_9_10_access_secret";
const REFRESH_SECRET = process.env.REFRESH_SECRET || "practice_9_10_refresh_secret";
const ACCESS_EXPIRES_IN = "15m";
const REFRESH_EXPIRES_IN = "7d";

app.use(
  cors({
    origin: ["http://localhost:3001"],
    credentials: true
  })
);
app.use(express.json());

const users = [];
const refreshTokens = new Map();
const properties = [
  {
    id: nanoid(8),
    title: "Студия с панорамными окнами",
    propertyType: "Квартира",
    address: "Санкт-Петербург, Мурино, ул. Шувалова, 14",
    description: "Новая студия рядом с метро, подходит для жизни или сдачи в аренду.",
    price: 5650000,
    area: 28,
    agentId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: nanoid(8),
    title: "Таунхаус с участком",
    propertyType: "Дом",
    address: "Ленинградская область, Всеволожск, Кленовая аллея, 7",
    description: "Двухэтажный таунхаус с парковкой, террасой и небольшим садом.",
    price: 16400000,
    area: 118,
    agentId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

function sanitizeUser(user) {
  return {
    id: user.id,
    username: user.username,
    createdAt: user.createdAt
  };
}

function enrichProperty(property) {
  const agent = users.find((user) => user.id === property.agentId);

  return {
    ...property,
    agentUsername: agent ? agent.username : "agency-demo"
  };
}

function normalizePropertyPayload(payload) {
  const title = String(payload.title || "").trim();
  const propertyType = String(payload.propertyType || "").trim();
  const address = String(payload.address || "").trim();
  const description = String(payload.description || "").trim();
  const price = Number(payload.price);
  const area = Number(payload.area);

  if (!title || !propertyType || !address || !description) {
    return { error: "title, propertyType, address and description are required" };
  }

  if (!Number.isFinite(price) || price <= 0) {
    return { error: "price must be a positive number" };
  }

  if (!Number.isFinite(area) || area <= 0) {
    return { error: "area must be a positive number" };
  }

  return {
    value: {
      title,
      propertyType,
      address,
      description,
      price,
      area
    }
  };
}

function extractRefreshToken(req) {
  const headerToken =
    req.headers["x-refresh-token"] ||
    req.headers["refresh-token"] ||
    req.headers["x-token-refresh"];

  if (headerToken) {
    return String(headerToken).trim();
  }

  const { refreshToken } = req.body || {};
  return refreshToken ? String(refreshToken).trim() : "";
}

function generateAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      username: user.username
    },
    ACCESS_SECRET,
    {
      expiresIn: ACCESS_EXPIRES_IN
    }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      username: user.username
    },
    REFRESH_SECRET,
    {
      expiresIn: REFRESH_EXPIRES_IN
    }
  );
}

function issueTokens(user) {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  refreshTokens.set(refreshToken, user.id);

  return {
    accessToken,
    refreshToken
  };
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({
      error: "Missing or invalid Authorization header"
    });
  }

  try {
    const payload = jwt.verify(token, ACCESS_SECRET);
    const user = users.find((item) => item.id === payload.sub);

    if (!user) {
      return res.status(401).json({
        error: "User not found"
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      error: "Invalid or expired token"
    });
  }
}

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/auth/register", async (req, res) => {
  const username = String(req.body.username || "").trim();
  const password = String(req.body.password || "").trim();

  if (!username || !password) {
    return res.status(400).json({
      error: "username and password are required"
    });
  }

  if (password.length < 4) {
    return res.status(400).json({
      error: "password must contain at least 4 characters"
    });
  }

  const exists = users.some((user) => user.username === username);
  if (exists) {
    return res.status(409).json({
      error: "username already exists"
    });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = {
    id: nanoid(8),
    username,
    passwordHash,
    createdAt: new Date().toISOString()
  };

  users.push(user);

  return res.status(201).json(sanitizeUser(user));
});

app.post("/api/auth/login", async (req, res) => {
  const username = String(req.body.username || "").trim();
  const password = String(req.body.password || "").trim();

  if (!username || !password) {
    return res.status(400).json({
      error: "username and password are required"
    });
  }

  const user = users.find((item) => item.username === username);
  if (!user) {
    return res.status(401).json({
      error: "Invalid credentials"
    });
  }

  const isValidPassword = await bcrypt.compare(password, user.passwordHash);
  if (!isValidPassword) {
    return res.status(401).json({
      error: "Invalid credentials"
    });
  }

  const tokens = issueTokens(user);

  return res.json({
    ...tokens,
    user: sanitizeUser(user)
  });
});

app.post("/api/auth/refresh", (req, res) => {
  const refreshToken = extractRefreshToken(req);

  if (!refreshToken) {
    return res.status(400).json({
      error: "refreshToken is required"
    });
  }

  if (!refreshTokens.has(refreshToken)) {
    return res.status(401).json({
      error: "Invalid refresh token"
    });
  }

  try {
    const payload = jwt.verify(refreshToken, REFRESH_SECRET);
    const user = users.find((item) => item.id === payload.sub);

    if (!user) {
      refreshTokens.delete(refreshToken);
      return res.status(401).json({
        error: "User not found"
      });
    }

    refreshTokens.delete(refreshToken);
    const tokens = issueTokens(user);

    return res.json(tokens);
  } catch (error) {
    refreshTokens.delete(refreshToken);
    return res.status(401).json({
      error: "Invalid or expired refresh token"
    });
  }
});

app.get("/api/auth/me", authMiddleware, (req, res) => {
  return res.json(sanitizeUser(req.user));
});

app.get("/api/properties", (req, res) => {
  return res.json(properties.map(enrichProperty));
});

app.post("/api/properties", authMiddleware, (req, res) => {
  const normalized = normalizePropertyPayload(req.body || {});

  if (normalized.error) {
    return res.status(400).json({
      error: normalized.error
    });
  }

  const property = {
    id: nanoid(8),
    ...normalized.value,
    agentId: req.user.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  properties.unshift(property);

  return res.status(201).json(enrichProperty(property));
});

app.get("/api/properties/:id", authMiddleware, (req, res) => {
  const property = properties.find((item) => item.id === req.params.id);

  if (!property) {
    return res.status(404).json({
      error: "Property not found"
    });
  }

  return res.json(enrichProperty(property));
});

app.put("/api/properties/:id", authMiddleware, (req, res) => {
  const property = properties.find((item) => item.id === req.params.id);

  if (!property) {
    return res.status(404).json({
      error: "Property not found"
    });
  }

  const normalized = normalizePropertyPayload(req.body || {});

  if (normalized.error) {
    return res.status(400).json({
      error: normalized.error
    });
  }

  property.title = normalized.value.title;
  property.propertyType = normalized.value.propertyType;
  property.address = normalized.value.address;
  property.description = normalized.value.description;
  property.price = normalized.value.price;
  property.area = normalized.value.area;
  property.updatedAt = new Date().toISOString();

  return res.json(enrichProperty(property));
});

app.delete("/api/properties/:id", authMiddleware, (req, res) => {
  const index = properties.findIndex((item) => item.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({
      error: "Property not found"
    });
  }

  properties.splice(index, 1);

  return res.status(204).send();
});

app.use((req, res) => {
  res.status(404).json({
    error: "Route not found"
  });
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({
    error: "Internal server error"
  });
});

app.listen(PORT, () => {
  console.log(`Practice 9-10 backend started on http://localhost:${PORT}`);
});
