import { useEffect, useState } from "react";
import "./App.css";
import { api, clearTokens, getAccessToken } from "./api/client";

const emptyAuthForm = {
  username: "",
  password: ""
};

const emptyProductForm = {
  title: "",
  category: "",
  description: "",
  price: ""
};

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
      setSelectedProduct(null);
      setFormMode("create");
      setProductForm(emptyProductForm);
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
    setIsBusy(true);
    setErrorMessage("");

    try {
      await loadProducts();

      if (getAccessToken()) {
        const me = await api.getMe();
        setCurrentUser(me);
      }
    } catch (error) {
      clearTokens();
      setCurrentUser(null);
      setErrorMessage(mapError(error, "Не удалось восстановить сессию."));
    } finally {
      setIsBusy(false);
    }
  }

  async function loadProducts() {
    const response = await api.getProducts();
    setProducts(response);

    if (selectedProduct) {
      const freshSelected = response.find((product) => product.id === selectedProduct.id);
      setSelectedProduct(freshSelected || null);
    }

    return response;
  }

  async function handleReloadProducts() {
    setIsBusy(true);
    setErrorMessage("");

    try {
      await loadProducts();
    } catch (error) {
      setErrorMessage(mapError(error, "Не удалось обновить список товаров."));
    } finally {
      setIsBusy(false);
    }
  }

  function resetProductForm() {
    setFormMode("create");
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
      await loadProducts();
      setInfoMessage(`Добро пожаловать, ${response.user.username}.`);
    } catch (error) {
      setErrorMessage(mapError(error, "Не удалось выполнить авторизацию."));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleLogout() {
    clearTokens();
    setCurrentUser(null);
    setSelectedProduct(null);
    resetProductForm();
    setInfoMessage("Вы вышли из системы.");
    setErrorMessage("");
    await loadProducts();
  }

  async function handleSelectProduct(productId) {
    if (!currentUser) {
      setErrorMessage("Для просмотра детальной карточки нужно авторизоваться.");
      return;
    }

    setIsBusy(true);
    setErrorMessage("");
    setInfoMessage("");

    try {
      const product = await api.getProductById(productId);
      setSelectedProduct(product);
      setFormMode("create");
    } catch (error) {
      setErrorMessage(mapError(error, "Не удалось получить товар."));
    } finally {
      setIsBusy(false);
    }
  }

  function handleEditSelectedProduct() {
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
    setInfoMessage("Форма заполнена данными выбранного товара.");
    setErrorMessage("");
  }

  async function handleProductSubmit(event) {
    event.preventDefault();

    if (!currentUser) {
      setErrorMessage("Сначала войдите в систему.");
      return;
    }

    setIsBusy(true);
    setErrorMessage("");
    setInfoMessage("");

    try {
      if (formMode === "edit" && selectedProduct) {
        const updatedProduct = await api.updateProduct(selectedProduct.id, productForm);
        setSelectedProduct(updatedProduct);
        setInfoMessage("Товар успешно обновлен.");
      } else {
        const createdProduct = await api.createProduct(productForm);
        setSelectedProduct(createdProduct);
        setInfoMessage("Товар успешно создан.");
      }

      resetProductForm();
      await loadProducts();
    } catch (error) {
      setErrorMessage(mapError(error, "Не удалось сохранить товар."));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDeleteSelectedProduct() {
    if (!currentUser || !selectedProduct) {
      return;
    }

    setIsBusy(true);
    setErrorMessage("");
    setInfoMessage("");

    try {
      await api.deleteProduct(selectedProduct.id);
      setSelectedProduct(null);
      resetProductForm();
      await loadProducts();
      setInfoMessage("Товар удален.");
    } catch (error) {
      setErrorMessage(mapError(error, "Не удалось удалить товар."));
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Практика 9-10</p>
          <h1>React-клиент для JWT-авторизации и CRUD товаров</h1>
          <p className="hero-text">
            Интерфейс работает с access token и refresh token, умеет
            автоматически обновлять сессию и управлять товарами после входа.
          </p>
        </div>

        <div className="hero-card">
          <span className="badge">
            {currentUser ? `Пользователь: ${currentUser.username}` : "Гость"}
          </span>
          <p className="hint">
            Бэкенд: <code>http://localhost:3000</code>
          </p>
          <p className="hint">
            Фронтенд: <code>http://localhost:3001</code>
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

      <main className="grid-layout">
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
                placeholder="student"
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
                placeholder="1234"
                required
              />
            </label>
            <button className="primary-button" type="submit" disabled={isBusy}>
              {mode === "login" ? "Войти" : "Создать аккаунт"}
            </button>
          </form>

          <div className="note">
            После входа форма товаров станет доступной, а детальная карточка
            будет загружаться через защищенный маршрут.
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Товары</h2>
            <button className="ghost-button" type="button" onClick={handleReloadProducts}>
              Обновить список
            </button>
          </div>

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

            {!products.length ? <p className="empty">Список товаров пуст.</p> : null}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>{formMode === "edit" ? "Редактирование" : "Новый товар"}</h2>
            <button className="ghost-button" type="button" onClick={resetProductForm}>
              Очистить форму
            </button>
          </div>

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
                placeholder="Например, клавиатура"
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
                placeholder="Периферия"
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
                placeholder="Кратко опишите товар"
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
                placeholder="9990"
                required
              />
            </label>

            <button className="primary-button" type="submit" disabled={isBusy || !currentUser}>
              {formMode === "edit" ? "Сохранить изменения" : "Создать товар"}
            </button>
          </form>

          {!currentUser ? (
            <p className="empty">Авторизуйтесь, чтобы создавать и редактировать товары.</p>
          ) : null}
        </section>
      </main>

      <section className="panel details-panel">
        <div className="panel-header">
          <h2>Детальная карточка</h2>
          {selectedProduct ? (
            <div className="inline-actions">
              <button className="ghost-button" type="button" onClick={handleEditSelectedProduct}>
                Заполнить форму для редактирования
              </button>
              <button
                className="danger-button"
                type="button"
                onClick={handleDeleteSelectedProduct}
                disabled={!currentUser || isBusy}
              >
                Удалить
              </button>
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
                <dt>Обновлен</dt>
                <dd>{new Date(selectedProduct.updatedAt).toLocaleString("ru-RU")}</dd>
              </div>
            </dl>
          </div>
        ) : (
          <p className="empty">
            Выберите товар из списка. Детальный просмотр доступен через
            защищенный маршрут и требует авторизации.
          </p>
        )}
      </section>

      <footer className="footer-note">
        {isBusy ? "Выполняется запрос..." : "Проект готов для практик 9 и 10."}
      </footer>
    </div>
  );
}
