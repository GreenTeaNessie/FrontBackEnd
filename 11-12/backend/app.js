const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { nanoid } = require("nanoid");

const app = express();
const PORT = process.env.PORT || 3002;

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
  return {
    id: nanoid(8),
    username,
    passwordHash: bcrypt.hashSync(password, 10),
    role,
    isBlocked: false,
    createdAt: new Date().toISOString()
  };
}

const users = [
  createUser("admin", "admin123", "admin"),
  createUser("seller", "seller123", "seller"),
  createUser("user", "user123", "user")
];

const refreshTokens = new Map();
const products = [
  {
    id: nanoid(8),
    title: "Механическая клавиатура",
    category: "Периферия",
    description: "Полноразмерная клавиатура для работы и игр.",
    price: 7990,
    ownerId: users[1].id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: nanoid(8),
    title: "Планшет для заметок",
    category: "Электроника",
    description: "Компактный планшет для учебы, чтения и заметок.",
    price: 23990,
    ownerId: users[0].id,
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

function enrichProduct(product) {
  const owner = users.find((user) => user.id === product.ownerId);

  return {
    ...product,
    ownerUsername: owner ? owner.username : "unknown"
  };
}

function normalizeRole(value) {
  const role = String(value || "user").trim().toLowerCase();
  return ALLOWED_ROLES.includes(role) ? role : "";
}

function normalizeProductPayload(payload) {
  const title = String(payload.title || "").trim();
  const category = String(payload.category || "").trim();
  const description = String(payload.description || "").trim();
  const price = Number(payload.price);

  if (!title || !category || !description) {
    return { error: "title, category and description are required" };
  }

  if (!Number.isFinite(price) || price <= 0) {
    return { error: "price must be a positive number" };
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

  const passwordHash = await bcrypt.hash(password, 10);
  const user = {
    id: nanoid(8),
    username,
    passwordHash,
    role,
    isBlocked: false,
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

  if (user.isBlocked) {
    return res.status(403).json({
      error: "User is blocked"
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
  "/api/products",
  authMiddleware,
  roleMiddleware(["user", "seller", "admin"]),
  (req, res) => {
    return res.json(products.map(enrichProduct));
  }
);

app.post(
  "/api/products",
  authMiddleware,
  roleMiddleware(["seller", "admin"]),
  (req, res) => {
    const normalized = normalizeProductPayload(req.body || {});

    if (normalized.error) {
      return res.status(400).json({
        error: normalized.error
      });
    }

    const product = {
      id: nanoid(8),
      ...normalized.value,
      ownerId: req.user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    products.unshift(product);

    return res.status(201).json(enrichProduct(product));
  }
);

app.get(
  "/api/products/:id",
  authMiddleware,
  roleMiddleware(["user", "seller", "admin"]),
  (req, res) => {
    const product = products.find((item) => item.id === req.params.id);

    if (!product) {
      return res.status(404).json({
        error: "Product not found"
      });
    }

    return res.json(enrichProduct(product));
  }
);

app.put(
  "/api/products/:id",
  authMiddleware,
  roleMiddleware(["seller", "admin"]),
  (req, res) => {
    const product = products.find((item) => item.id === req.params.id);

    if (!product) {
      return res.status(404).json({
        error: "Product not found"
      });
    }

    const normalized = normalizeProductPayload(req.body || {});

    if (normalized.error) {
      return res.status(400).json({
        error: normalized.error
      });
    }

    product.title = normalized.value.title;
    product.category = normalized.value.category;
    product.description = normalized.value.description;
    product.price = normalized.value.price;
    product.updatedAt = new Date().toISOString();

    return res.json(enrichProduct(product));
  }
);

app.delete(
  "/api/products/:id",
  authMiddleware,
  roleMiddleware(["admin"]),
  (req, res) => {
    const index = products.findIndex((item) => item.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({
        error: "Product not found"
      });
    }

    products.splice(index, 1);

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
  console.log("Demo users: admin/admin123, seller/seller123, user/user123");
});
