import { useEffect, useState } from "react";
import "./App.css";
import { api, clearTokens, getAccessToken } from "./api/client";

const emptyAuthForm = {
  username: "",
  password: ""
};

const emptyPropertyForm = {
  title: "",
  propertyType: "",
  address: "",
  description: "",
  price: "",
  area: ""
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
  const [propertyForm, setPropertyForm] = useState(emptyPropertyForm);
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [formMode, setFormMode] = useState("create");
  const [currentUser, setCurrentUser] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const [infoMessage, setInfoMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const handleSessionExpired = () => {
      setCurrentUser(null);
      setSelectedProperty(null);
      setFormMode("create");
      setPropertyForm(emptyPropertyForm);
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
      await loadProperties();

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

  async function loadProperties() {
    const response = await api.getProperties();
    setProperties(response);

    if (selectedProperty) {
      const freshSelected = response.find((property) => property.id === selectedProperty.id);
      setSelectedProperty(freshSelected || null);
    }

    return response;
  }

  async function handleReloadProperties() {
    setIsBusy(true);
    setErrorMessage("");

    try {
      await loadProperties();
    } catch (error) {
      setErrorMessage(mapError(error, "Не удалось обновить список объектов."));
    } finally {
      setIsBusy(false);
    }
  }

  function resetPropertyForm() {
    setFormMode("create");
    setPropertyForm(emptyPropertyForm);
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
      await loadProperties();
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
    setSelectedProperty(null);
    resetPropertyForm();
    setInfoMessage("Вы вышли из системы.");
    setErrorMessage("");
    await loadProperties();
  }

  async function handleSelectProperty(propertyId) {
    if (!currentUser) {
      setErrorMessage("Для просмотра детальной карточки нужно авторизоваться.");
      return;
    }

    setIsBusy(true);
    setErrorMessage("");
    setInfoMessage("");

    try {
      const property = await api.getPropertyById(propertyId);
      setSelectedProperty(property);
      setFormMode("create");
    } catch (error) {
      setErrorMessage(mapError(error, "Не удалось получить объект недвижимости."));
    } finally {
      setIsBusy(false);
    }
  }

  function handleEditSelectedProperty() {
    if (!selectedProperty) {
      return;
    }

    setFormMode("edit");
    setPropertyForm({
      title: selectedProperty.title,
      propertyType: selectedProperty.propertyType,
      address: selectedProperty.address,
      description: selectedProperty.description,
      price: String(selectedProperty.price),
      area: String(selectedProperty.area)
    });
    setInfoMessage("Форма заполнена данными выбранного объявления.");
    setErrorMessage("");
  }

  async function handlePropertySubmit(event) {
    event.preventDefault();

    if (!currentUser) {
      setErrorMessage("Сначала войдите в систему.");
      return;
    }

    setIsBusy(true);
    setErrorMessage("");
    setInfoMessage("");

    try {
      if (formMode === "edit" && selectedProperty) {
        const updatedProperty = await api.updateProperty(selectedProperty.id, propertyForm);
        setSelectedProperty(updatedProperty);
        setInfoMessage("Объявление успешно обновлено.");
      } else {
        const createdProperty = await api.createProperty(propertyForm);
        setSelectedProperty(createdProperty);
        setInfoMessage("Объявление успешно создано.");
      }

      resetPropertyForm();
      await loadProperties();
    } catch (error) {
      setErrorMessage(mapError(error, "Не удалось сохранить объявление."));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDeleteSelectedProperty() {
    if (!currentUser || !selectedProperty) {
      return;
    }

    setIsBusy(true);
    setErrorMessage("");
    setInfoMessage("");

    try {
      await api.deleteProperty(selectedProperty.id);
      setSelectedProperty(null);
      resetPropertyForm();
      await loadProperties();
      setInfoMessage("Объявление удалено.");
    } catch (error) {
      setErrorMessage(mapError(error, "Не удалось удалить объявление."));
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Практика 9-10</p>
          <h1>React-клиент для JWT-авторизации и каталога недвижимости</h1>
          <p className="hero-text">
            Интерфейс работает с access token и refresh token, автоматически
            обновляет сессию и позволяет управлять объявлениями о недвижимости после входа.
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
            После входа форма объявлений станет доступной, а детальная карточка объекта
            будет загружаться через защищенный маршрут.
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Объекты недвижимости</h2>
            <button className="ghost-button" type="button" onClick={handleReloadProperties}>
              Обновить список
            </button>
          </div>

          <div className="products-list">
            {properties.map((property) => (
              <button
                key={property.id}
                className={`product-card ${
                  selectedProperty?.id === property.id ? "selected" : ""
                }`}
                onClick={() => handleSelectProperty(property.id)}
                type="button"
              >
                <span className="product-category">{property.propertyType}</span>
                <strong>{property.title}</strong>
                <span>{property.address}</span>
                <span>{formatPrice(property.price)} руб.</span>
                <small>Площадь: {property.area} м²</small>
              </button>
            ))}

            {!properties.length ? <p className="empty">Список объявлений пуст.</p> : null}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>{formMode === "edit" ? "Редактирование объявления" : "Новое объявление"}</h2>
            <button className="ghost-button" type="button" onClick={resetPropertyForm}>
              Очистить форму
            </button>
          </div>

          <form className="stack" onSubmit={handlePropertySubmit}>
            <label>
              Заголовок объявления
              <input
                value={propertyForm.title}
                onChange={(event) =>
                  setPropertyForm((current) => ({
                    ...current,
                    title: event.target.value
                  }))
                }
                placeholder="Студия рядом с метро"
                required
              />
            </label>
            <label>
              Тип объекта
              <input
                value={propertyForm.propertyType}
                onChange={(event) =>
                  setPropertyForm((current) => ({
                    ...current,
                    propertyType: event.target.value
                  }))
                }
                placeholder="Квартира"
                required
              />
            </label>
            <label>
              Адрес
              <input
                value={propertyForm.address}
                onChange={(event) =>
                  setPropertyForm((current) => ({
                    ...current,
                    address: event.target.value
                  }))
                }
                placeholder="Санкт-Петербург, ул. Примерная, 15"
                required
              />
            </label>
            <label>
              Описание
              <textarea
                rows="4"
                value={propertyForm.description}
                onChange={(event) =>
                  setPropertyForm((current) => ({
                    ...current,
                    description: event.target.value
                  }))
                }
                placeholder="Опишите состояние, район и преимущества объекта"
                required
              />
            </label>
            <label>
              Стоимость
              <input
                type="number"
                min="1"
                value={propertyForm.price}
                onChange={(event) =>
                  setPropertyForm((current) => ({
                    ...current,
                    price: event.target.value
                  }))
                }
                placeholder="6500000"
                required
              />
            </label>
            <label>
              Площадь, м²
              <input
                type="number"
                min="1"
                value={propertyForm.area}
                onChange={(event) =>
                  setPropertyForm((current) => ({
                    ...current,
                    area: event.target.value
                  }))
                }
                placeholder="42"
                required
              />
            </label>

            <button className="primary-button" type="submit" disabled={isBusy || !currentUser}>
              {formMode === "edit" ? "Сохранить изменения" : "Создать объявление"}
            </button>
          </form>

          {!currentUser ? (
            <p className="empty">Авторизуйтесь, чтобы создавать и редактировать объявления.</p>
          ) : null}
        </section>
      </main>

      <section className="panel details-panel">
        <div className="panel-header">
          <h2>Карточка объекта</h2>
          {selectedProperty ? (
            <div className="inline-actions">
              <button className="ghost-button" type="button" onClick={handleEditSelectedProperty}>
                Заполнить форму для редактирования
              </button>
              <button
                className="danger-button"
                type="button"
                onClick={handleDeleteSelectedProperty}
                disabled={!currentUser || isBusy}
              >
                Удалить
              </button>
            </div>
          ) : null}
        </div>

        {selectedProperty ? (
          <div className="details-card">
            <div className="details-meta">
              <span>{selectedProperty.propertyType}</span>
              <span>{formatPrice(selectedProperty.price)} руб.</span>
            </div>
            <h3>{selectedProperty.title}</h3>
            <p>{selectedProperty.address}</p>
            <p>{selectedProperty.description}</p>
            <dl>
              <div>
                <dt>ID</dt>
                <dd>{selectedProperty.id}</dd>
              </div>
              <div>
                <dt>Риелтор</dt>
                <dd>{selectedProperty.agentUsername}</dd>
              </div>
              <div>
                <dt>Площадь</dt>
                <dd>{selectedProperty.area} м²</dd>
              </div>
            </dl>
          </div>
        ) : (
          <p className="empty">
            Выберите объект из списка. Детальный просмотр доступен через защищенный маршрут
            и требует авторизации.
          </p>
        )}
      </section>

      <footer className="footer-note">
        {isBusy ? "Выполняется запрос..." : "Проект готов для практик 9 и 10."}
      </footer>
    </div>
  );
}
