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

function formatPrice(value) {
  return `${new Intl.NumberFormat("ru-RU").format(value)} ₽`;
}

function mapError(error, fallbackMessage) {
  return error.response?.data?.error || fallbackMessage;
}

export default function App() {
  const [mode, setMode] = useState("login");
  const [authForm, setAuthForm] = useState(emptyAuthForm);
  const [productForm, setProductForm] = useState(emptyProductForm);
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [formMode, setFormMode] = useState("create");
  const [currentUser, setCurrentUser] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const [infoMessage, setInfoMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const handleSessionExpired = () => {
      setCurrentUser(null);
      setProducts([]);
      setSelectedProduct(null);
      setFormMode("create");
      setProductForm(emptyProductForm);
      setErrorMessage("Сессия истекла. Выполните вход снова.");
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
      await loadProducts();
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
      const freshSelected = await api.getProductById(targetId);
      setSelectedProduct(freshSelected);
    } catch (error) {
      const fallbackProduct = response.find((item) => item.id === targetId) || response[0];
      setSelectedProduct(fallbackProduct);
    }

    return response;
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

  function resetProductForm() {
    setFormMode("create");
    setProductForm(emptyProductForm);
  }

  function startEditingProduct() {
    if (!selectedProduct) {
      return;
    }

    setFormMode("edit");
    setProductForm({
      title: selectedProduct.title,
      category: selectedProduct.category,
      description: selectedProduct.description,
      price: String(selectedProduct.price)
    });
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    setIsBusy(true);
    setErrorMessage("");
    setInfoMessage("");

    try {
      if (mode === "register") {
        await api.register({
          email: authForm.email,
          first_name: authForm.first_name,
          last_name: authForm.last_name,
          password: authForm.password
        });
        setInfoMessage("Регистрация выполнена. Вход выполнен автоматически.");
      }

      await api.login({
        email: authForm.email,
        password: authForm.password
      });

      const me = await api.getMe();
      setCurrentUser(me);
      setAuthForm(emptyAuthForm);
      await loadProducts();
    } catch (error) {
      setErrorMessage(mapError(error, "Не удалось выполнить вход."));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleReloadProducts() {
    setIsBusy(true);
    setErrorMessage("");

    try {
      await loadProducts();
    } catch (error) {
      setErrorMessage(mapError(error, "Не удалось обновить каталог."));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleProductSubmit(event) {
    event.preventDefault();
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

      if (formMode === "edit" && selectedProduct) {
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

  async function handleDeleteSelected() {
    if (!selectedProduct) {
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

  function handleLogout() {
    clearTokens();
    setCurrentUser(null);
    setProducts([]);
    setSelectedProduct(null);
    setAuthForm(emptyAuthForm);
    resetProductForm();
    setInfoMessage("Вы вышли из системы.");
    setErrorMessage("");
  }

  if (!currentUser) {
    return (
      <div className="app-shell">
        {errorMessage ? <div className="alert error">{errorMessage}</div> : null}
        {infoMessage ? <div className="alert info">{infoMessage}</div> : null}

        <section className="hero">
          <div className="panel" style={{ padding: 28 }}>
            <p className="eyebrow">Практики 9-10</p>
            <h1>Electro Store с JWT и refresh token</h1>
            <p className="hero-text">
              Войдите или зарегистрируйтесь, чтобы открыть каталог, посмотреть карточку товара
              по ID и управлять товарами через единый API `/api/products`.
            </p>
          </div>

          <div className="hero-card">
            <div className="badge">{mode === "login" ? "Вход" : "Регистрация"}</div>

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

            <form className="stack" onSubmit={handleAuthSubmit}>
              <label>
                Email
                <input
                  value={authForm.email}
                  onChange={(event) =>
                    setAuthForm((prev) => ({ ...prev, email: event.target.value }))
                  }
                  type="email"
                  required
                />
              </label>

              {mode === "register" ? (
                <>
                  <label>
                    Имя
                    <input
                      value={authForm.first_name}
                      onChange={(event) =>
                        setAuthForm((prev) => ({ ...prev, first_name: event.target.value }))
                      }
                      required
                    />
                  </label>

                  <label>
                    Фамилия
                    <input
                      value={authForm.last_name}
                      onChange={(event) =>
                        setAuthForm((prev) => ({ ...prev, last_name: event.target.value }))
                      }
                      required
                    />
                  </label>
                </>
              ) : null}

              <label>
                Пароль
                <input
                  value={authForm.password}
                  onChange={(event) =>
                    setAuthForm((prev) => ({ ...prev, password: event.target.value }))
                  }
                  type="password"
                  required
                />
              </label>

              <button className="primary-button" disabled={isBusy} type="submit">
                {isBusy ? "Подождите..." : mode === "login" ? "Войти" : "Создать аккаунт"}
              </button>
            </form>

            <p className="hint">
              `POST /api/auth/login` возвращает пару токенов, а клиент автоматически обновляет
              access token через `x-refresh-token`.
            </p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="app-shell">
      {errorMessage ? <div className="alert error">{errorMessage}</div> : null}
      {infoMessage ? <div className="alert info">{infoMessage}</div> : null}

      <section className="hero">
        <div className="panel" style={{ padding: 28 }}>
          <p className="eyebrow">Авторизованный режим</p>
          <h1>Каталог электроники</h1>
          <p className="hero-text">
            Пользователь: {currentUser.first_name} {currentUser.last_name} ({currentUser.email}).
            Каталог, карточка товара и форма редактирования работают поверх одного JWT API.
          </p>
        </div>

        <div className="hero-card">
          <div className="badge">Session Active</div>
          <p className="hint">Access token обновляется автоматически через refresh token.</p>
          <button className="secondary-button" onClick={handleReloadProducts} type="button">
            Обновить каталог
          </button>
          <button className="ghost-button" onClick={handleLogout} type="button">
            Выйти
          </button>
        </div>
      </section>

      <section className="grid-layout">
        <article className="panel">
          <div className="panel-header">
            <h2>Список товаров</h2>
            <button className="ghost-button" onClick={resetProductForm} type="button">
              Новый товар
            </button>
          </div>

          {products.length === 0 ? (
            <p className="empty">Каталог пока пуст.</p>
          ) : (
            <div className="products-list">
              {products.map((product) => (
                <button
                  key={product.id}
                  className={`product-card ${selectedProduct?.id === product.id ? "selected" : ""}`}
                  onClick={() => handleSelectProduct(product.id)}
                  type="button"
                >
                  <span className="product-category">{product.category}</span>
                  <strong>{product.title}</strong>
                  <span>{formatPrice(product.price)}</span>
                </button>
              ))}
            </div>
          )}
        </article>

        <article className="panel">
          <div className="panel-header">
            <h2>Карточка товара</h2>
            <span className="note">{selectedProduct ? `ID: ${selectedProduct.id}` : "Выберите товар"}</span>
          </div>

          {selectedProduct ? (
            <div className="details-card">
              <span className="product-category">{selectedProduct.category}</span>
              <h3>{selectedProduct.title}</h3>
              <div className="details-meta">
                <span>{formatPrice(selectedProduct.price)}</span>
                <span>JWT detail route</span>
              </div>
              <p className="note">{selectedProduct.description}</p>
              <dl>
                <div>
                  <dt>Категория</dt>
                  <dd>{selectedProduct.category}</dd>
                </div>
                <div>
                  <dt>Цена</dt>
                  <dd>{formatPrice(selectedProduct.price)}</dd>
                </div>
                <div>
                  <dt>Идентификатор</dt>
                  <dd>{selectedProduct.id}</dd>
                </div>
              </dl>

              <div className="inline-actions">
                <button className="ghost-button" onClick={startEditingProduct} type="button">
                  Редактировать
                </button>
                <button className="danger-button" onClick={handleDeleteSelected} type="button">
                  Удалить
                </button>
              </div>
            </div>
          ) : (
            <p className="empty">После загрузки каталога выберите товар слева.</p>
          )}
        </article>

        <article className="panel">
          <div className="panel-header">
            <h2>{formMode === "edit" ? "Редактирование товара" : "Создание товара"}</h2>
            {formMode === "edit" ? (
              <button className="ghost-button" onClick={resetProductForm} type="button">
                Отмена
              </button>
            ) : null}
          </div>

          <form className="stack" onSubmit={handleProductSubmit}>
            <label>
              Название товара
              <input
                value={productForm.title}
                onChange={(event) =>
                  setProductForm((prev) => ({ ...prev, title: event.target.value }))
                }
                required
              />
            </label>

            <label>
              Категория
              <input
                value={productForm.category}
                onChange={(event) =>
                  setProductForm((prev) => ({ ...prev, category: event.target.value }))
                }
                required
              />
            </label>

            <label>
              Описание
              <textarea
                value={productForm.description}
                onChange={(event) =>
                  setProductForm((prev) => ({ ...prev, description: event.target.value }))
                }
                rows={5}
                required
              />
            </label>

            <label>
              Цена
              <input
                value={productForm.price}
                onChange={(event) =>
                  setProductForm((prev) => ({ ...prev, price: event.target.value }))
                }
                inputMode="numeric"
                required
              />
            </label>

            <button className="primary-button" disabled={isBusy} type="submit">
              {formMode === "edit" ? "Сохранить товар" : "Создать товар"}
            </button>
          </form>
        </article>
      </section>

      <p className="footer-note">
        Практика 10 использует frontend-flow `register/login -> list -> detail -> create -> edit -> delete`.
      </p>
    </div>
  );
}
