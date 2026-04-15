const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const { nanoid } = require("nanoid");

const app = express();
const PORT = process.env.PORT || 3002;

const PASSWORDS_FILE = path.join(__dirname, "passwords.json");

function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function loadPasswords() {
  try {
    return JSON.parse(fs.readFileSync(PASSWORDS_FILE, "utf8"));
  } catch {
    return {};
  }
}

function savePasswords(store) {
  fs.writeFileSync(PASSWORDS_FILE, JSON.stringify(store, null, 2), "utf8");
}

const passwords = loadPasswords();

const ACCESS_SECRET = process.env.ACCESS_SECRET || "practice_11_12_access_secret";
const REFRESH_SECRET = process.env.REFRESH_SECRET || "practice_11_12_refresh_secret";
const ACCESS_EXPIRES_IN = "15m";
const REFRESH_EXPIRES_IN = "7d";
const ALLOWED_ROLES = ["user", "seller", "admin"];

app.use(
  cors({
    origin: ["http://localhost:3003"],
    credentials: true
  })
);
app.use(express.json());

function createUser(username, password, role) {
  const id = nanoid(8);
  passwords[username] = hashPassword(password);
  return {
    id,
    username,
    role,
    isBlocked: false,
    createdAt: new Date().toISOString()
  };
}

const users = [
  createUser("admin", "admin123", "admin"),
  createUser("realtor", "realtor123", "seller"),
  createUser("buyer", "buyer123", "user")
];

savePasswords(passwords);

const refreshTokens = new Map();
const properties = [
  {
    id: nanoid(8),
    title: "Семейная трехкомнатная квартира",
    propertyType: "Квартира",
    address: "Москва, ул. Архитектора Щусева, 5к2",
    description: "Просторная квартира в современном ЖК, рядом школа, парк и метро.",
    price: 24300000,
    area: 86,
    agentId: users[1].id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: nanoid(8),
    title: "Дом у леса с террасой",
    propertyType: "Дом",
    address: "Московская область, Истра, Сосновая, 11",
    description: "Дом для круглогодичного проживания с участком, террасой и баней.",
    price: 31900000,
    area: 164,
    agentId: users[0].id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

function sanitizeUser(user) {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    isBlocked: user.isBlocked,
    createdAt: user.createdAt
  };
}

function enrichProperty(property) {
  const agent = users.find((user) => user.id === property.agentId);

  return {
    ...property,
    agentUsername: agent ? agent.username : "agency-admin"
  };
}

function normalizeRole(value) {
  const role = String(value || "user").trim().toLowerCase();
  return ALLOWED_ROLES.includes(role) ? role : "";
}

function normalizePropertyPayload(payload) {
  const title = String(payload.title || "").trim();
  const propertyType = String(payload.propertyType || "").trim();
  const address = String(payload.address || "").trim();
  const description = String(payload.description || "").trim();
  const imageUrl = String(payload.imageUrl || "").trim();
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
      imageUrl,
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
      username: user.username,
      role: user.role
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
      username: user.username,
      role: user.role
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

function revokeUserRefreshTokens(userId) {
  for (const [token, currentUserId] of refreshTokens.entries()) {
    if (currentUserId === userId) {
      refreshTokens.delete(token);
    }
  }
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

    if (user.isBlocked) {
      revokeUserRefreshTokens(user.id);
      return res.status(403).json({
        error: "User is blocked"
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

function roleMiddleware(allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: "Forbidden"
      });
    }

    next();
  };
}

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/auth/register", async (req, res) => {
  const username = String(req.body.username || "").trim();
  const password = String(req.body.password || "").trim();
  const role = normalizeRole(req.body.role || "user");

  if (!username || !password) {
    return res.status(400).json({
      error: "username and password are required"
    });
  }

  if (!role) {
    return res.status(400).json({
      error: "role must be user, seller or admin"
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

  passwords[username] = hashPassword(password);
  savePasswords(passwords);

  const user = {
    id: nanoid(8),
    username,
    role,
    isBlocked: false,
    createdAt: new Date().toISOString()
  };

  users.push(user);

  return res.status(201).json(sanitizeUser(user));
});

app.post("/api/auth/login", (req, res) => {
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

  if (user.isBlocked) {
    return res.status(403).json({
      error: "User is blocked"
    });
  }

  const isValidPassword = hashPassword(password) === passwords[user.username];
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

    if (user.isBlocked) {
      refreshTokens.delete(refreshToken);
      revokeUserRefreshTokens(user.id);
      return res.status(403).json({
        error: "User is blocked"
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

app.get("/api/users", authMiddleware, roleMiddleware(["admin"]), (req, res) => {
  return res.json(users.map(sanitizeUser));
});

app.get("/api/users/:id", authMiddleware, roleMiddleware(["admin"]), (req, res) => {
  const user = users.find((item) => item.id === req.params.id);

  if (!user) {
    return res.status(404).json({
      error: "User not found"
    });
  }

  return res.json(sanitizeUser(user));
});

app.put("/api/users/:id", authMiddleware, roleMiddleware(["admin"]), (req, res) => {
  const user = users.find((item) => item.id === req.params.id);

  if (!user) {
    return res.status(404).json({
      error: "User not found"
    });
  }

  const nextUsername = req.body.username ? String(req.body.username).trim() : user.username;
  const nextRole = req.body.role ? normalizeRole(req.body.role) : user.role;
  const nextBlocked =
    typeof req.body.isBlocked === "boolean" ? req.body.isBlocked : user.isBlocked;

  if (!nextUsername) {
    return res.status(400).json({
      error: "username is required"
    });
  }

  if (!nextRole) {
    return res.status(400).json({
      error: "role must be user, seller or admin"
    });
  }

  const usernameTaken = users.some(
    (item) => item.id !== user.id && item.username === nextUsername
  );

  if (usernameTaken) {
    return res.status(409).json({
      error: "username already exists"
    });
  }

  if (user.id === req.user.id && nextBlocked) {
    return res.status(400).json({
      error: "You cannot block yourself"
    });
  }

  user.username = nextUsername;
  user.role = nextRole;
  user.isBlocked = nextBlocked;

  if (user.isBlocked) {
    revokeUserRefreshTokens(user.id);
  }

  return res.json(sanitizeUser(user));
});

app.delete("/api/users/:id", authMiddleware, roleMiddleware(["admin"]), (req, res) => {
  const user = users.find((item) => item.id === req.params.id);

  if (!user) {
    return res.status(404).json({
      error: "User not found"
    });
  }

  if (user.id === req.user.id) {
    return res.status(400).json({
      error: "You cannot block yourself"
    });
  }

  user.isBlocked = true;
  revokeUserRefreshTokens(user.id);

  return res.json({
    message: "User blocked",
    user: sanitizeUser(user)
  });
});

app.get(
  "/api/properties",
  authMiddleware,
  roleMiddleware(["user", "seller", "admin"]),
  (req, res) => {
    return res.json(properties.map(enrichProperty));
  }
);

app.post(
  "/api/properties",
  authMiddleware,
  roleMiddleware(["seller", "admin"]),
  (req, res) => {
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
  }
);

app.get(
  "/api/properties/:id",
  authMiddleware,
  roleMiddleware(["user", "seller", "admin"]),
  (req, res) => {
    const property = properties.find((item) => item.id === req.params.id);

    if (!property) {
      return res.status(404).json({
        error: "Property not found"
      });
    }

    return res.json(enrichProperty(property));
  }
);

app.put(
  "/api/properties/:id",
  authMiddleware,
  roleMiddleware(["seller", "admin"]),
  (req, res) => {
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
    property.imageUrl = normalized.value.imageUrl;
    property.price = normalized.value.price;
    property.area = normalized.value.area;
    property.updatedAt = new Date().toISOString();

    return res.json(enrichProperty(property));
  }
);

app.delete(
  "/api/properties/:id",
  authMiddleware,
  roleMiddleware(["admin"]),
  (req, res) => {
    const index = properties.findIndex((item) => item.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({
        error: "Property not found"
      });
    }

    properties.splice(index, 1);

    return res.status(204).send();
  }
);

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
  console.log(`Practice 11-12 backend started on http://localhost:${PORT}`);
  console.log("Demo users: admin/admin123, realtor/realtor123, buyer/buyer123");
});
