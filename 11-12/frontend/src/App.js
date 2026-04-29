import { useEffect, useState } from "react";
import "./App.css";
import { api, clearTokens, getAccessToken } from "./api/client";

const emptyAuthForm = {
  email: "",
  first_name: "",
  last_name: "",
  password: ""
};

const emptyProductForm = {
  title: "",
  category: "",
  description: "",
  price: ""
};

const emptyUserForm = {
  email: "",
  first_name: "",
  last_name: "",
  role: "user",
  isBlocked: false
};

const roleLabels = {
  user: "Покупатель",
  seller: "Продавец",
  admin: "Администратор"
};

const demoAccounts = [
  { email: "admin@electro.local", password: "Admin1234", role: "admin" },
  { email: "seller@electro.local", password: "Seller1234", role: "seller" },
  { email: "user@electro.local", password: "User1234", role: "user" }
];

const categoryImages = {
  Ноутбуки: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=1200&h=720&fit=crop&auto=format",
  Смартфоны: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1200&h=720&fit=crop&auto=format",
  Планшеты: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=1200&h=720&fit=crop&auto=format",
  Мониторы: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=1200&h=720&fit=crop&auto=format",
  Аудио: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1200&h=720&fit=crop&auto=format",
  default: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&h=720&fit=crop&auto=format"
};

function mapError(error, fallbackMessage) {
  return error.response?.data?.error || fallbackMessage;
}

function formatPrice(value) {
  return `${new Intl.NumberFormat("ru-RU").format(value)} ₽`;
}

function getProductImage(product) {
  return categoryImages[product.category] || categoryImages.default;
}

export default function App() {
  const [mode, setMode] = useState("login");
  const [authForm, setAuthForm] = useState(emptyAuthForm);
  const [productForm, setProductForm] = useState(emptyProductForm);
  const [userForm, setUserForm] = useState(emptyUserForm);
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [productFormMode, setProductFormMode] = useState("create");
  const [currentUser, setCurrentUser] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const [infoMessage, setInfoMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const canManageProducts = currentUser && ["seller", "admin"].includes(currentUser.role);
  const canDeleteProducts = currentUser?.role === "admin";
  const isAdmin = currentUser?.role === "admin";
  const isEditingSelf = selectedUser?.id === currentUser?.id;

  useEffect(() => {
    const handleSessionExpired = () => {
      setCurrentUser(null);
      setProducts([]);
      setUsers([]);
      setSelectedProduct(null);
      setSelectedUser(null);
      setProductFormMode("create");
      setProductForm(emptyProductForm);
      setUserForm(emptyUserForm);
      setErrorMessage("Сессия истекла. Выполните вход снова.");
      setInfoMessage("");
    };

    window.addEventListener("auth:expired", handleSessionExpired);
    return () => window.removeEventListener("auth:expired", handleSessionExpired);
  }, []);

  useEffect(() => {
    bootstrap();
  }, []);

  async function bootstrap() {
    if (!getAccessToken()) {
      return;
    }

    setIsBusy(true);
    setErrorMessage("");

    try {
      const me = await api.getMe();
      setCurrentUser(me);
      await loadDashboard(me);
    } catch (error) {
      clearTokens();
      setCurrentUser(null);
      setErrorMessage(mapError(error, "Не удалось восстановить сессию."));
    } finally {
      setIsBusy(false);
    }
  }

  async function loadProducts(preferredId) {
    const response = await api.getProducts();
    setProducts(response);

    if (response.length === 0) {
      setSelectedProduct(null);
      return response;
    }

    const targetId = preferredId || selectedProduct?.id || response[0].id;

    try {
      const freshProduct = await api.getProductById(targetId);
      setSelectedProduct(freshProduct);
    } catch (error) {
      const fallbackProduct = response.find((item) => item.id === targetId) || response[0];
      setSelectedProduct(fallbackProduct);
    }

    return response;
  }

  async function loadUsers(preferredId) {
    const response = await api.getUsers();
    setUsers(response);

    if (response.length === 0) {
      setSelectedUser(null);
      setUserForm(emptyUserForm);
      return response;
    }

    const targetId = preferredId || selectedUser?.id || response[0].id;
    const freshUser = await api.getUserById(targetId);

    setSelectedUser(freshUser);
    setUserForm({
      email: freshUser.email,
      first_name: freshUser.first_name,
      last_name: freshUser.last_name,
      role: freshUser.role,
      isBlocked: freshUser.isBlocked
    });

    return response;
  }

  async function loadDashboard(user) {
    await loadProducts();

    if (user.role === "admin") {
      await loadUsers();
    } else {
      setUsers([]);
      setSelectedUser(null);
      setUserForm(emptyUserForm);
    }
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    setIsBusy(true);
    setErrorMessage("");
    setInfoMessage("");

    try {
      if (mode === "register") {
        await api.register(authForm);
        setInfoMessage("Регистрация выполнена. Вход выполнен автоматически.");
      }

      await api.login({
        email: authForm.email,
        password: authForm.password
      });

      const me = await api.getMe();
      setCurrentUser(me);
      setAuthForm(emptyAuthForm);
      await loadDashboard(me);
    } catch (error) {
      setErrorMessage(mapError(error, "Не удалось выполнить вход."));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleQuickLogin(account) {
    setIsBusy(true);
    setErrorMessage("");
    setInfoMessage("");

    try {
      await api.login({
        email: account.email,
        password: account.password
      });

      const me = await api.getMe();
      setCurrentUser(me);
      setAuthForm({
        email: account.email,
        first_name: "",
        last_name: "",
        password: account.password
      });
      await loadDashboard(me);
    } catch (error) {
      setErrorMessage(mapError(error, "Не удалось выполнить демо-вход."));
    } finally {
      setIsBusy(false);
    }
  }

  function resetProductForm() {
    setProductFormMode("create");
    setProductForm(emptyProductForm);
  }

  function startEditingProduct() {
    if (!selectedProduct) {
      return;
    }

    setProductFormMode("edit");
    setProductForm({
      title: selectedProduct.title,
      category: selectedProduct.category,
      description: selectedProduct.description,
      price: String(selectedProduct.price)
    });
  }

  async function handleReloadDashboard() {
    if (!currentUser) {
      return;
    }

    setIsBusy(true);
    setErrorMessage("");

    try {
      await loadDashboard(currentUser);
    } catch (error) {
      setErrorMessage(mapError(error, "Не удалось обновить данные панели."));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleSelectProduct(id) {
    setIsBusy(true);
    setErrorMessage("");

    try {
      const product = await api.getProductById(id);
      setSelectedProduct(product);
    } catch (error) {
      setErrorMessage(mapError(error, "Не удалось загрузить карточку товара."));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleProductSubmit(event) {
    event.preventDefault();

    if (!canManageProducts) {
      return;
    }

    setIsBusy(true);
    setErrorMessage("");
    setInfoMessage("");

    const payload = {
      title: productForm.title.trim(),
      category: productForm.category.trim(),
      description: productForm.description.trim(),
      price: Number(productForm.price)
    };

    if (!payload.title || !payload.category || !payload.description) {
      setErrorMessage("Заполните название товара, категорию и описание.");
      setIsBusy(false);
      return;
    }

    if (!Number.isFinite(payload.price) || payload.price <= 0) {
      setErrorMessage("Введите корректную цену.");
      setIsBusy(false);
      return;
    }

    try {
      let savedProduct;

      if (productFormMode === "edit" && selectedProduct) {
        savedProduct = await api.updateProduct(selectedProduct.id, payload);
        setInfoMessage("Товар обновлен.");
      } else {
        savedProduct = await api.createProduct(payload);
        setInfoMessage("Товар создан.");
      }

      resetProductForm();
      await loadProducts(savedProduct.id);
    } catch (error) {
      setErrorMessage(mapError(error, "Не удалось сохранить товар."));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDeleteProduct() {
    if (!selectedProduct || !canDeleteProducts) {
      return;
    }

    const confirmed = window.confirm(`Удалить товар "${selectedProduct.title}"?`);

    if (!confirmed) {
      return;
    }

    setIsBusy(true);
    setErrorMessage("");
    setInfoMessage("");

    try {
      await api.deleteProduct(selectedProduct.id);
      setInfoMessage("Товар удален.");
      resetProductForm();
      await loadProducts();
    } catch (error) {
      setErrorMessage(mapError(error, "Не удалось удалить товар."));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleSelectUser(id) {
    setIsBusy(true);
    setErrorMessage("");

    try {
      const user = await api.getUserById(id);
      setSelectedUser(user);
      setUserForm({
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        isBlocked: user.isBlocked
      });
    } catch (error) {
      setErrorMessage(mapError(error, "Не удалось загрузить пользователя."));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleUserSubmit(event) {
    event.preventDefault();

    if (!selectedUser || !isAdmin) {
      return;
    }

    setIsBusy(true);
    setErrorMessage("");
    setInfoMessage("");

    try {
      const updatedUser = await api.updateUser(selectedUser.id, userForm);
      setInfoMessage("Пользователь обновлен.");
      await loadUsers(updatedUser.id);

      if (updatedUser.id === currentUser.id) {
        const me = await api.getMe();
        setCurrentUser(me);
      }
    } catch (error) {
      setErrorMessage(mapError(error, "Не удалось обновить пользователя."));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleBlockUser() {
    if (!selectedUser || !isAdmin) {
      return;
    }

    const confirmed = window.confirm(
      `Заблокировать пользователя ${selectedUser.email}? Повторный вход будет запрещен.`
    );

    if (!confirmed) {
      return;
    }

    setIsBusy(true);
    setErrorMessage("");
    setInfoMessage("");

    try {
      await api.blockUser(selectedUser.id);
      setInfoMessage("Пользователь заблокирован.");
      await loadUsers(selectedUser.id);
    } catch (error) {
      setErrorMessage(mapError(error, "Не удалось заблокировать пользователя."));
    } finally {
      setIsBusy(false);
    }
  }

  function handleLogout() {
    clearTokens();
    setCurrentUser(null);
    setProducts([]);
    setUsers([]);
    setSelectedProduct(null);
    setSelectedUser(null);
    setProductFormMode("create");
    setProductForm(emptyProductForm);
    setUserForm(emptyUserForm);
    setInfoMessage("Вы вышли из системы.");
    setErrorMessage("");
  }

  if (!currentUser) {
    return (
      <>
        <nav className="navbar">
          <div className="navbar-brand">
            Electro Store
            <span className="brand-dot" />
          </div>
          <span className="navbar-status">RBAC mode</span>
        </nav>

        <div className="alerts">
          {errorMessage ? <div className="alert error">{errorMessage}</div> : null}
          {infoMessage ? <div className="alert info">{infoMessage}</div> : null}
        </div>

        <section className="auth-page">
          <div className="auth-card">
            <div className="segmented">
              <button
                className={mode === "login" ? "active" : ""}
                onClick={() => setMode("login")}
                type="button"
              >
                Вход
              </button>
              <button
                className={mode === "register" ? "active" : ""}
                onClick={() => setMode("register")}
                type="button"
              >
                Регистрация
              </button>
            </div>

            <h2>Практики 11-12</h2>
            <p className="auth-subtitle">
              Ролевая панель управления товарами. Публичная регистрация создает только роль `user`.
            </p>

            <form className="form-grid" onSubmit={handleAuthSubmit}>
              <div className="field full-width">
                <label>Email</label>
                <input
                  type="email"
                  value={authForm.email}
                  onChange={(event) =>
                    setAuthForm((prev) => ({ ...prev, email: event.target.value }))
                  }
                  required
                />
              </div>

              {mode === "register" ? (
                <>
                  <div className="field">
                    <label>Имя</label>
                    <input
                      value={authForm.first_name}
                      onChange={(event) =>
                        setAuthForm((prev) => ({ ...prev, first_name: event.target.value }))
                      }
                      required
                    />
                  </div>

                  <div className="field">
                    <label>Фамилия</label>
                    <input
                      value={authForm.last_name}
                      onChange={(event) =>
                        setAuthForm((prev) => ({ ...prev, last_name: event.target.value }))
                      }
                      required
                    />
                  </div>
                </>
              ) : null}

              <div className="field full-width">
                <label>Пароль</label>
                <input
                  type="password"
                  value={authForm.password}
                  onChange={(event) =>
                    setAuthForm((prev) => ({ ...prev, password: event.target.value }))
                  }
                  required
                />
              </div>

              <div className="form-actions full-width">
                <button className="btn btn-primary" disabled={isBusy} type="submit">
                  {isBusy ? "Подождите..." : mode === "login" ? "Войти" : "Создать аккаунт"}
                </button>
              </div>
            </form>

            <div className="demo-divider">Демо-аккаунты</div>

            <div className="demo-accounts">
              {demoAccounts.map((account) => (
                <button
                  key={account.email}
                  className="demo-card"
                  onClick={() => handleQuickLogin(account)}
                  type="button"
                >
                  <span>
                    <strong>{account.email}</strong>
                    <span className="demo-role">{roleLabels[account.role]}</span>
                  </span>
                  <span>Войти</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <nav className="navbar">
        <div className="navbar-brand">
          Electro Store
          <span className="brand-dot" />
        </div>
        <span className="navbar-status">RBAC panel</span>
        <div className="user-pill">
          {currentUser.email}
          <span className="role-tag">{roleLabels[currentUser.role]}</span>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={handleReloadDashboard} type="button">
          Обновить
        </button>
        <button className="btn btn-ghost btn-sm" onClick={handleLogout} type="button">
          Выйти
        </button>
      </nav>

      <div className="alerts">
        {errorMessage ? <div className="alert error">{errorMessage}</div> : null}
        {infoMessage ? <div className="alert info">{infoMessage}</div> : null}
      </div>

      <div className="app-layout">
        <aside className="sidebar">
          <div className="sidebar-header">
            <h3>Товары</h3>
            <span className="sidebar-count">{products.length}</span>
          </div>

          <div className="sidebar-body">
            {products.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">□</div>
                <p>Каталог пуст. {canManageProducts ? "Создайте первый товар." : "Ожидайте пополнение каталога."}</p>
              </div>
            ) : (
              products.map((product) => (
                <button
                  key={product.id}
                  className={`prop-card ${selectedProduct?.id === product.id ? "selected" : ""}`}
                  onClick={() => handleSelectProduct(product.id)}
                  type="button"
                >
                  <img className="prop-thumb" src={getProductImage(product)} alt={product.title} />
                  <div className="prop-info">
                    <span className="prop-type">{product.category}</span>
                    <strong>{product.title}</strong>
                    <span className="prop-addr">{product.description}</span>
                    <span className="prop-price">{formatPrice(product.price)}</span>
                    <span className="prop-area">ID: {product.id}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        <main className="main-content">
          <section className="panel">
            <div className="panel-header">
              <h2>Карточка товара</h2>
              <span className="section-label">{roleLabels[currentUser.role]}</span>
            </div>

            {selectedProduct ? (
              <>
                <img
                  className="details-hero"
                  src={getProductImage(selectedProduct)}
                  alt={selectedProduct.title}
                />

                <div className="details-header">
                  <div>
                    <h3 className="details-title">{selectedProduct.title}</h3>
                    <span className="details-type">{selectedProduct.category}</span>
                  </div>
                  <div className="details-price">{formatPrice(selectedProduct.price)}</div>
                </div>

                <div className="details-addr">Каталог доступен ролям user, seller и admin.</div>
                <p className="details-desc">{selectedProduct.description}</p>

                <dl className="details-meta-grid">
                  <div className="meta-item">
                    <dt>ID</dt>
                    <dd>{selectedProduct.id}</dd>
                  </div>
                  <div className="meta-item">
                    <dt>Категория</dt>
                    <dd>{selectedProduct.category}</dd>
                  </div>
                  <div className="meta-item">
                    <dt>Доступ</dt>
                    <dd>{canManageProducts ? "Редактирование доступно" : "Только просмотр"}</dd>
                  </div>
                </dl>

                <div className="details-actions" style={{ marginTop: 16 }}>
                  {canManageProducts ? (
                    <button className="btn btn-primary" onClick={startEditingProduct} type="button">
                      Редактировать
                    </button>
                  ) : null}
                  {canDeleteProducts ? (
                    <button className="btn btn-danger" onClick={handleDeleteProduct} type="button">
                      Удалить
                    </button>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">□</div>
                <p>Выберите товар слева, чтобы открыть подробную карточку.</p>
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-header">
              <h2>{productFormMode === "edit" ? "Редактирование товара" : "Создание товара"}</h2>
              <span className="section-label">
                {canManageProducts ? "seller/admin" : "read-only"}
              </span>
            </div>

            {canManageProducts ? (
              <form className="form-grid" onSubmit={handleProductSubmit}>
                <div className="field">
                  <label>Название товара</label>
                  <input
                    value={productForm.title}
                    onChange={(event) =>
                      setProductForm((prev) => ({ ...prev, title: event.target.value }))
                    }
                    required
                  />
                </div>

                <div className="field">
                  <label>Категория</label>
                  <input
                    value={productForm.category}
                    onChange={(event) =>
                      setProductForm((prev) => ({ ...prev, category: event.target.value }))
                    }
                    required
                  />
                </div>

                <div className="field full-width">
                  <label>Описание</label>
                  <textarea
                    rows={4}
                    value={productForm.description}
                    onChange={(event) =>
                      setProductForm((prev) => ({ ...prev, description: event.target.value }))
                    }
                    required
                  />
                </div>

                <div className="field">
                  <label>Цена</label>
                  <input
                    inputMode="numeric"
                    value={productForm.price}
                    onChange={(event) =>
                      setProductForm((prev) => ({ ...prev, price: event.target.value }))
                    }
                    required
                  />
                </div>

                <div className="form-actions full-width">
                  <button className="btn btn-primary" disabled={isBusy} type="submit">
                    {productFormMode === "edit" ? "Сохранить товар" : "Создать товар"}
                  </button>
                  {productFormMode === "edit" ? (
                    <button className="btn btn-ghost" onClick={resetProductForm} type="button">
                      Отмена
                    </button>
                  ) : null}
                </div>
              </form>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">i</div>
                <p>Роль `user` может только просматривать товары. Для редактирования нужна роль `seller` или `admin`.</p>
              </div>
            )}
          </section>

          {isAdmin ? (
            <section className="panel">
              <div className="panel-header">
                <h2>Управление пользователями</h2>
                <span className="section-label">admin only</span>
              </div>

              <div className="admin-row">
                <div>
                  <p className="section-label">Список пользователей</p>
                  {users.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-icon">□</div>
                      <p>Пользователи не найдены.</p>
                    </div>
                  ) : (
                    <div className="users-list">
                      {users.map((user) => (
                        <button
                          key={user.id}
                          className={`user-card ${selectedUser?.id === user.id ? "selected" : ""}`}
                          onClick={() => handleSelectUser(user.id)}
                          type="button"
                        >
                          <span>
                            <span className="user-name">
                              {user.first_name} {user.last_name}
                            </span>
                            <span className="user-role">
                              {user.email} • {roleLabels[user.role]}
                            </span>
                          </span>
                          <span className={`status-badge ${user.isBlocked ? "blocked" : "active"}`}>
                            {user.isBlocked ? "blocked" : "active"}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <p className="section-label">Редактирование пользователя</p>

                  {selectedUser ? (
                    <form className="form-grid" onSubmit={handleUserSubmit}>
                      <div className="field">
                        <label>Email</label>
                        <input
                          type="email"
                          value={userForm.email}
                          onChange={(event) =>
                            setUserForm((prev) => ({ ...prev, email: event.target.value }))
                          }
                          required
                        />
                      </div>

                      <div className="field">
                        <label>Роль</label>
                        <select
                          value={userForm.role}
                          onChange={(event) =>
                            setUserForm((prev) => ({ ...prev, role: event.target.value }))
                          }
                          disabled={isEditingSelf}
                        >
                          <option value="user">user</option>
                          <option value="seller">seller</option>
                          <option value="admin">admin</option>
                        </select>
                      </div>

                      <div className="field">
                        <label>Имя</label>
                        <input
                          value={userForm.first_name}
                          onChange={(event) =>
                            setUserForm((prev) => ({ ...prev, first_name: event.target.value }))
                          }
                          required
                        />
                      </div>

                      <div className="field">
                        <label>Фамилия</label>
                        <input
                          value={userForm.last_name}
                          onChange={(event) =>
                            setUserForm((prev) => ({ ...prev, last_name: event.target.value }))
                          }
                          required
                        />
                      </div>

                      <div className="full-width">
                        <label className="checkbox-field">
                          <input
                            checked={userForm.isBlocked}
                            disabled={isEditingSelf}
                            onChange={(event) =>
                              setUserForm((prev) => ({ ...prev, isBlocked: event.target.checked }))
                            }
                            type="checkbox"
                          />
                          Заблокирован
                        </label>
                      </div>

                      <div className="form-actions full-width">
                        <button className="btn btn-primary" disabled={isBusy} type="submit">
                          Сохранить пользователя
                        </button>
                        <button
                          className="btn btn-danger"
                          disabled={isBusy || isEditingSelf}
                          onClick={handleBlockUser}
                          type="button"
                        >
                          Заблокировать
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="empty-state">
                      <div className="empty-icon">□</div>
                      <p>Выберите пользователя слева, чтобы открыть форму редактирования.</p>
                    </div>
                  )}
                </div>
              </div>
            </section>
          ) : null}
        </main>
      </div>

      <footer className="footer">
        Практики 11-12: `user` читает, `seller` редактирует, `admin` управляет товарами и пользователями.
      </footer>
    </>
  );
}
