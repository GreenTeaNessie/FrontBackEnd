import { useEffect, useState } from "react";
import "./App.css";
import { api, clearTokens, getAccessToken } from "./api/client";

const emptyAuthForm = {
  username: "",
  password: "",
  role: "user"
};

const emptyProductForm = {
  title: "",
  category: "",
  description: "",
  price: ""
};

const emptyUserForm = {
  username: "",
  role: "user",
  isBlocked: false
};

const roleLabels = {
  user: "Пользователь",
  seller: "Продавец",
  admin: "Администратор"
};

const demoAccounts = [
  { username: "admin", password: "admin123", role: "admin" },
  { username: "seller", password: "seller123", role: "seller" },
  { username: "user", password: "user123", role: "user" }
];

function formatPrice(value) {
  return new Intl.NumberFormat("ru-RU").format(value);
}

function mapError(error, fallbackMessage) {
  return error.response?.data?.error || fallbackMessage;
}

export default function App() {
  const [mode, setMode] = useState("login");
  const [authForm, setAuthForm] = useState(emptyAuthForm);
  const [productForm, setProductForm] = useState(emptyProductForm);
  const [managedUserForm, setManagedUserForm] = useState(emptyUserForm);
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedManagedUser, setSelectedManagedUser] = useState(null);
  const [productFormMode, setProductFormMode] = useState("create");
  const [currentUser, setCurrentUser] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const [infoMessage, setInfoMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const canViewProducts = Boolean(currentUser);
  const canEditProducts = currentUser && ["seller", "admin"].includes(currentUser.role);
  const canManageUsers = currentUser?.role === "admin";
  const canDeleteProducts = currentUser?.role === "admin";

  useEffect(() => {
    const handleSessionExpired = () => {
      setCurrentUser(null);
      setProducts([]);
      setUsers([]);
      setSelectedProduct(null);
      setSelectedManagedUser(null);
      setProductForm(emptyProductForm);
      setManagedUserForm(emptyUserForm);
      setErrorMessage("Сессия истекла. Войдите заново.");
    };

    window.addEventListener("auth:expired", handleSessionExpired);

    return () => {
      window.removeEventListener("auth:expired", handleSessionExpired);
    };
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
      await loadProtectedData(me);
    } catch (error) {
      clearTokens();
      setCurrentUser(null);
      setErrorMessage(mapError(error, "Не удалось восстановить сессию."));
    } finally {
      setIsBusy(false);
    }
  }

  async function loadProtectedData(user) {
    const loadedProducts = await api.getProducts();
    setProducts(loadedProducts);

    if (selectedProduct) {
      const freshSelectedProduct = loadedProducts.find(
        (product) => product.id === selectedProduct.id
      );
      setSelectedProduct(freshSelectedProduct || null);

      if (freshSelectedProduct) {
        setProductForm((current) =>
          productFormMode === "edit"
            ? {
                ...current,
                title: freshSelectedProduct.title,
                category: freshSelectedProduct.category,
                description: freshSelectedProduct.description,
                price: String(freshSelectedProduct.price)
              }
            : current
        );
      }
    }

    if (user.role === "admin") {
      const loadedUsers = await api.getUsers();
      setUsers(loadedUsers);

      if (selectedManagedUser) {
        const freshSelectedUser = loadedUsers.find((item) => item.id === selectedManagedUser.id);
        setSelectedManagedUser(freshSelectedUser || null);

        if (freshSelectedUser) {
          setManagedUserForm({
            username: freshSelectedUser.username,
            role: freshSelectedUser.role,
            isBlocked: freshSelectedUser.isBlocked
          });
        }
      }
    } else {
      setUsers([]);
      setSelectedManagedUser(null);
      setManagedUserForm(emptyUserForm);
    }
  }

  async function handleReloadProtectedData() {
    if (!currentUser) {
      return;
    }

    setIsBusy(true);
    setErrorMessage("");

    try {
      await loadProtectedData(currentUser);
    } catch (error) {
      setErrorMessage(mapError(error, "Не удалось обновить данные."));
    } finally {
      setIsBusy(false);
    }
  }

  function resetProductForm() {
    setProductFormMode("create");
    setProductForm(emptyProductForm);
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    setIsBusy(true);
    setErrorMessage("");
    setInfoMessage("");

    try {
      if (mode === "register") {
        await api.register(authForm);
        setInfoMessage("Регистрация успешна. Выполняю вход автоматически.");
      }

      const response = await api.login(authForm);
      setCurrentUser(response.user);
      setAuthForm(emptyAuthForm);
      await loadProtectedData(response.user);
      setInfoMessage(
        `Добро пожаловать, ${response.user.username}. Роль: ${roleLabels[response.user.role]}.`
      );
    } catch (error) {
      setErrorMessage(mapError(error, "Не удалось выполнить авторизацию."));
    } finally {
      setIsBusy(false);
    }
  }

  function fillDemoCredentials(account) {
    setMode("login");
    setAuthForm({
      username: account.username,
      password: account.password,
      role: account.role
    });
  }

  function handleLogout() {
    clearTokens();
    setCurrentUser(null);
    setProducts([]);
    setUsers([]);
    setSelectedProduct(null);
    setSelectedManagedUser(null);
    resetProductForm();
    setManagedUserForm(emptyUserForm);
    setInfoMessage("Вы вышли из системы.");
    setErrorMessage("");
  }

  async function handleSelectProduct(productId) {
    if (!canViewProducts) {
      return;
    }

    setIsBusy(true);
    setErrorMessage("");

    try {
      const product = await api.getProductById(productId);
      setSelectedProduct(product);
    } catch (error) {
      setErrorMessage(mapError(error, "Не удалось получить товар."));
    } finally {
      setIsBusy(false);
    }
  }

  function handleEditSelectedProduct() {
    if (!selectedProduct || !canEditProducts) {
      return;
    }

    setProductFormMode("edit");
    setProductForm({
      title: selectedProduct.title,
      category: selectedProduct.category,
      description: selectedProduct.description,
      price: String(selectedProduct.price)
    });
    setInfoMessage("Форма заполнена данными товара.");
    setErrorMessage("");
  }

  async function handleProductSubmit(event) {
    event.preventDefault();

    if (!canEditProducts) {
      setErrorMessage("Эта операция доступна только продавцу или администратору.");
      return;
    }

    setIsBusy(true);
    setErrorMessage("");
    setInfoMessage("");

    try {
      if (productFormMode === "edit" && selectedProduct) {
        const updatedProduct = await api.updateProduct(selectedProduct.id, productForm);
        setSelectedProduct(updatedProduct);
        setInfoMessage("Товар обновлен.");
      } else {
        const createdProduct = await api.createProduct(productForm);
        setSelectedProduct(createdProduct);
        setInfoMessage("Товар создан.");
      }

      resetProductForm();
      await loadProtectedData(currentUser);
    } catch (error) {
      setErrorMessage(mapError(error, "Не удалось сохранить товар."));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDeleteSelectedProduct() {
    if (!selectedProduct || !canDeleteProducts) {
      setErrorMessage("Удаление товаров доступно только администратору.");
      return;
    }

    setIsBusy(true);
    setErrorMessage("");
    setInfoMessage("");

    try {
      await api.deleteProduct(selectedProduct.id);
      setSelectedProduct(null);
      resetProductForm();
      await loadProtectedData(currentUser);
      setInfoMessage("Товар удален.");
    } catch (error) {
      setErrorMessage(mapError(error, "Не удалось удалить товар."));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleSelectManagedUser(userId) {
    if (!canManageUsers) {
      return;
    }

    setIsBusy(true);
    setErrorMessage("");

    try {
      const user = await api.getUserById(userId);
      setSelectedManagedUser(user);
      setManagedUserForm({
        username: user.username,
        role: user.role,
        isBlocked: user.isBlocked
      });
    } catch (error) {
      setErrorMessage(mapError(error, "Не удалось получить пользователя."));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleUserUpdate(event) {
    event.preventDefault();

    if (!canManageUsers || !selectedManagedUser) {
      return;
    }

    setIsBusy(true);
    setErrorMessage("");
    setInfoMessage("");

    try {
      const updatedUser = await api.updateUser(selectedManagedUser.id, managedUserForm);
      const me = selectedManagedUser.id === currentUser.id ? await api.getMe() : currentUser;

      setSelectedManagedUser(updatedUser);
      setCurrentUser(me);
      setInfoMessage("Пользователь обновлен.");
      await loadProtectedData(me);
    } catch (error) {
      setErrorMessage(mapError(error, "Не удалось обновить пользователя."));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleBlockUser() {
    if (!canManageUsers || !selectedManagedUser) {
      return;
    }

    setIsBusy(true);
    setErrorMessage("");
    setInfoMessage("");

    try {
      const response = await api.blockUser(selectedManagedUser.id);
      setSelectedManagedUser(response.user);
      setManagedUserForm({
        username: response.user.username,
        role: response.user.role,
        isBlocked: response.user.isBlocked
      });
      await loadProtectedData(currentUser);
      setInfoMessage("Пользователь заблокирован.");
    } catch (error) {
      setErrorMessage(mapError(error, "Не удалось заблокировать пользователя."));
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Практики 11-12</p>
          <h1>RBAC-панель для товаров и пользователей</h1>
          <p className="hero-text">
            Один интерфейс для трех ролей: пользователь просматривает товары,
            продавец управляет каталогом, администратор дополнительно управляет
            пользователями и блокировками.
          </p>
          <div className="capsules">
            <span>user: просмотр товаров</span>
            <span>seller: создание и редактирование</span>
            <span>admin: товары + пользователи</span>
          </div>
        </div>

        <div className="hero-card">
          <span className="badge">
            {currentUser
              ? `${currentUser.username} · ${roleLabels[currentUser.role]}`
              : "Гость"}
          </span>
          <p className="hint">
            Бэкенд: <code>http://localhost:3002</code>
          </p>
          <p className="hint">
            Фронтенд: <code>http://localhost:3003</code>
          </p>
          {currentUser ? (
            <button className="secondary-button" onClick={handleLogout}>
              Выйти
            </button>
          ) : null}
        </div>
      </header>

      {errorMessage ? <div className="alert error">{errorMessage}</div> : null}
      {infoMessage ? <div className="alert info">{infoMessage}</div> : null}

      <main className="dashboard-grid">
        <section className="panel">
          <div className="panel-header">
            <h2>{mode === "login" ? "Вход" : "Регистрация"}</h2>
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
          </div>

          <form className="stack" onSubmit={handleAuthSubmit}>
            <label>
              Логин
              <input
                value={authForm.username}
                onChange={(event) =>
                  setAuthForm((current) => ({
                    ...current,
                    username: event.target.value
                  }))
                }
                placeholder="seller"
                required
              />
            </label>
            <label>
              Пароль
              <input
                type="password"
                value={authForm.password}
                onChange={(event) =>
                  setAuthForm((current) => ({
                    ...current,
                    password: event.target.value
                  }))
                }
                placeholder="seller123"
                required
              />
            </label>

            {mode === "register" ? (
              <label>
                Роль
                <select
                  value={authForm.role}
                  onChange={(event) =>
                    setAuthForm((current) => ({
                      ...current,
                      role: event.target.value
                    }))
                  }
                >
                  <option value="user">Пользователь</option>
                  <option value="seller">Продавец</option>
                  <option value="admin">Администратор</option>
                </select>
              </label>
            ) : null}

            <button className="primary-button" type="submit" disabled={isBusy}>
              {mode === "login" ? "Войти" : "Создать аккаунт"}
            </button>
          </form>

          <div className="demo-list">
            <h3>Готовые аккаунты</h3>
            {demoAccounts.map((account) => (
              <button
                key={account.username}
                className="demo-card"
                type="button"
                onClick={() => fillDemoCredentials(account)}
              >
                <strong>{account.username}</strong>
                <span>{account.password}</span>
                <small>{roleLabels[account.role]}</small>
              </button>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Каталог товаров</h2>
            {canViewProducts ? (
              <button
                className="ghost-button"
                type="button"
                onClick={handleReloadProtectedData}
              >
                Обновить
              </button>
            ) : null}
          </div>

          {canViewProducts ? (
            <div className="products-list">
              {products.map((product) => (
                <button
                  key={product.id}
                  className={`product-card ${
                    selectedProduct?.id === product.id ? "selected" : ""
                  }`}
                  onClick={() => handleSelectProduct(product.id)}
                  type="button"
                >
                  <span className="product-category">{product.category}</span>
                  <strong>{product.title}</strong>
                  <span>{formatPrice(product.price)} руб.</span>
                  <small>Автор: {product.ownerUsername}</small>
                </button>
              ))}
            </div>
          ) : (
            <p className="empty">Для просмотра каталога нужно войти в систему.</p>
          )}
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>{productFormMode === "edit" ? "Редактирование товара" : "Новый товар"}</h2>
            {canEditProducts ? (
              <button className="ghost-button" type="button" onClick={resetProductForm}>
                Очистить форму
              </button>
            ) : null}
          </div>

          {canEditProducts ? (
            <form className="stack" onSubmit={handleProductSubmit}>
              <label>
                Название
                <input
                  value={productForm.title}
                  onChange={(event) =>
                    setProductForm((current) => ({
                      ...current,
                      title: event.target.value
                    }))
                  }
                  required
                />
              </label>
              <label>
                Категория
                <input
                  value={productForm.category}
                  onChange={(event) =>
                    setProductForm((current) => ({
                      ...current,
                      category: event.target.value
                    }))
                  }
                  required
                />
              </label>
              <label>
                Описание
                <textarea
                  rows="4"
                  value={productForm.description}
                  onChange={(event) =>
                    setProductForm((current) => ({
                      ...current,
                      description: event.target.value
                    }))
                  }
                  required
                />
              </label>
              <label>
                Цена
                <input
                  type="number"
                  min="1"
                  value={productForm.price}
                  onChange={(event) =>
                    setProductForm((current) => ({
                      ...current,
                      price: event.target.value
                    }))
                  }
                  required
                />
              </label>
              <button className="primary-button" type="submit" disabled={isBusy}>
                {productFormMode === "edit" ? "Сохранить изменения" : "Создать товар"}
              </button>
            </form>
          ) : (
            <p className="empty">
              Создание и редактирование товаров доступно продавцу и администратору.
            </p>
          )}
        </section>
      </main>

      <section className="panel details-panel">
        <div className="panel-header">
          <h2>Карточка товара</h2>
          {selectedProduct ? (
            <div className="inline-actions">
              {canEditProducts ? (
                <button className="ghost-button" type="button" onClick={handleEditSelectedProduct}>
                  Редактировать
                </button>
              ) : null}
              {canDeleteProducts ? (
                <button className="danger-button" type="button" onClick={handleDeleteSelectedProduct}>
                  Удалить
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        {selectedProduct ? (
          <div className="details-card">
            <div className="details-meta">
              <span>{selectedProduct.category}</span>
              <span>{formatPrice(selectedProduct.price)} руб.</span>
            </div>
            <h3>{selectedProduct.title}</h3>
            <p>{selectedProduct.description}</p>
            <dl>
              <div>
                <dt>ID</dt>
                <dd>{selectedProduct.id}</dd>
              </div>
              <div>
                <dt>Автор</dt>
                <dd>{selectedProduct.ownerUsername}</dd>
              </div>
              <div>
                <dt>Изменен</dt>
                <dd>{new Date(selectedProduct.updatedAt).toLocaleString("ru-RU")}</dd>
              </div>
            </dl>
          </div>
        ) : (
          <p className="empty">Выберите товар, чтобы посмотреть подробную информацию.</p>
        )}
      </section>

      {canManageUsers ? (
        <section className="admin-grid">
          <div className="panel">
            <div className="panel-header">
              <h2>Пользователи</h2>
              <button
                className="ghost-button"
                type="button"
                onClick={handleReloadProtectedData}
              >
                Обновить список
              </button>
            </div>

            <div className="users-list">
              {users.map((user) => (
                <button
                  key={user.id}
                  className={`user-card ${
                    selectedManagedUser?.id === user.id ? "selected" : ""
                  }`}
                  type="button"
                  onClick={() => handleSelectManagedUser(user.id)}
                >
                  <strong>{user.username}</strong>
                  <span>{roleLabels[user.role]}</span>
                  <small>{user.isBlocked ? "Заблокирован" : "Активен"}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <h2>Управление пользователем</h2>
              <span className="subtle-text">
                {selectedManagedUser ? selectedManagedUser.id : "Выберите пользователя"}
              </span>
            </div>

            {selectedManagedUser ? (
              <form className="stack" onSubmit={handleUserUpdate}>
                <label>
                  Логин
                  <input
                    value={managedUserForm.username}
                    onChange={(event) =>
                      setManagedUserForm((current) => ({
                        ...current,
                        username: event.target.value
                      }))
                    }
                    required
                  />
                </label>
                <label>
                  Роль
                  <select
                    value={managedUserForm.role}
                    onChange={(event) =>
                      setManagedUserForm((current) => ({
                        ...current,
                        role: event.target.value
                      }))
                    }
                  >
                    <option value="user">Пользователь</option>
                    <option value="seller">Продавец</option>
                    <option value="admin">Администратор</option>
                  </select>
                </label>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={managedUserForm.isBlocked}
                    onChange={(event) =>
                      setManagedUserForm((current) => ({
                        ...current,
                        isBlocked: event.target.checked
                      }))
                    }
                  />
                  <span>Пользователь заблокирован</span>
                </label>
                <button className="primary-button" type="submit" disabled={isBusy}>
                  Сохранить пользователя
                </button>
                <button
                  className="danger-button"
                  type="button"
                  disabled={isBusy || selectedManagedUser.id === currentUser.id}
                  onClick={handleBlockUser}
                >
                  Заблокировать через DELETE
                </button>
              </form>
            ) : (
              <p className="empty">
                Администратор может выбирать пользователей, менять им роль и блокировать их.
              </p>
            )}
          </div>
        </section>
      ) : null}

      <footer className="footer-note">
        {isBusy
          ? "Выполняется запрос..."
          : "Проект готов для практик 11 и 12, включая README и сценарии RBAC."}
      </footer>
    </div>
  );
}
