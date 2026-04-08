import { useEffect, useState } from "react";
import "./App.css";
import { api, clearTokens, getAccessToken } from "./api/client";

const emptyAuthForm = {
  username: "",
  password: "",
  role: "user"
};

const emptyPropertyForm = {
  title: "",
  propertyType: "",
  address: "",
  description: "",
  price: "",
  area: ""
};

const emptyUserForm = {
  username: "",
  role: "user",
  isBlocked: false
};

const roleLabels = {
  user: "Покупатель",
  seller: "Риелтор",
  admin: "Администратор"
};

const demoAccounts = [
  { username: "admin", password: "admin123", role: "admin" },
  { username: "realtor", password: "realtor123", role: "seller" },
  { username: "buyer", password: "buyer123", role: "user" }
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
  const [propertyForm, setPropertyForm] = useState(emptyPropertyForm);
  const [managedUserForm, setManagedUserForm] = useState(emptyUserForm);
  const [properties, setProperties] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [selectedManagedUser, setSelectedManagedUser] = useState(null);
  const [propertyFormMode, setPropertyFormMode] = useState("create");
  const [currentUser, setCurrentUser] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const [infoMessage, setInfoMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const canViewProperties = Boolean(currentUser);
  const canEditProperties = currentUser && ["seller", "admin"].includes(currentUser.role);
  const canManageUsers = currentUser?.role === "admin";
  const canDeleteProperties = currentUser?.role === "admin";

  useEffect(() => {
    const handleSessionExpired = () => {
      setCurrentUser(null);
      setProperties([]);
      setUsers([]);
      setSelectedProperty(null);
      setSelectedManagedUser(null);
      setPropertyForm(emptyPropertyForm);
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
    const loadedProperties = await api.getProperties();
    setProperties(loadedProperties);

    if (selectedProperty) {
      const freshSelectedProperty = loadedProperties.find(
        (property) => property.id === selectedProperty.id
      );
      setSelectedProperty(freshSelectedProperty || null);

      if (freshSelectedProperty) {
        setPropertyForm((current) =>
          propertyFormMode === "edit"
            ? {
                ...current,
                title: freshSelectedProperty.title,
                propertyType: freshSelectedProperty.propertyType,
                address: freshSelectedProperty.address,
                description: freshSelectedProperty.description,
                price: String(freshSelectedProperty.price),
                area: String(freshSelectedProperty.area)
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

  function resetPropertyForm() {
    setPropertyFormMode("create");
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
    setProperties([]);
    setUsers([]);
    setSelectedProperty(null);
    setSelectedManagedUser(null);
    resetPropertyForm();
    setManagedUserForm(emptyUserForm);
    setInfoMessage("Вы вышли из системы.");
    setErrorMessage("");
  }

  async function handleSelectProperty(propertyId) {
    if (!canViewProperties) {
      return;
    }

    setIsBusy(true);
    setErrorMessage("");

    try {
      const property = await api.getPropertyById(propertyId);
      setSelectedProperty(property);
    } catch (error) {
      setErrorMessage(mapError(error, "Не удалось получить объект недвижимости."));
    } finally {
      setIsBusy(false);
    }
  }

  function handleEditSelectedProperty() {
    if (!selectedProperty || !canEditProperties) {
      return;
    }

    setPropertyFormMode("edit");
    setPropertyForm({
      title: selectedProperty.title,
      propertyType: selectedProperty.propertyType,
      address: selectedProperty.address,
      description: selectedProperty.description,
      price: String(selectedProperty.price),
      area: String(selectedProperty.area)
    });
    setInfoMessage("Форма заполнена данными объекта недвижимости.");
    setErrorMessage("");
  }

  async function handlePropertySubmit(event) {
    event.preventDefault();

    if (!canEditProperties) {
      setErrorMessage("Эта операция доступна только риелтору или администратору.");
      return;
    }

    setIsBusy(true);
    setErrorMessage("");
    setInfoMessage("");

    try {
      if (propertyFormMode === "edit" && selectedProperty) {
        const updatedProperty = await api.updateProperty(selectedProperty.id, propertyForm);
        setSelectedProperty(updatedProperty);
        setInfoMessage("Объявление обновлено.");
      } else {
        const createdProperty = await api.createProperty(propertyForm);
        setSelectedProperty(createdProperty);
        setInfoMessage("Объявление создано.");
      }

      resetPropertyForm();
      await loadProtectedData(currentUser);
    } catch (error) {
      setErrorMessage(mapError(error, "Не удалось сохранить объявление."));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDeleteSelectedProperty() {
    if (!selectedProperty || !canDeleteProperties) {
      setErrorMessage("Удаление объявлений доступно только администратору.");
      return;
    }

    setIsBusy(true);
    setErrorMessage("");
    setInfoMessage("");

    try {
      await api.deleteProperty(selectedProperty.id);
      setSelectedProperty(null);
      resetPropertyForm();
      await loadProtectedData(currentUser);
      setInfoMessage("Объявление удалено.");
    } catch (error) {
      setErrorMessage(mapError(error, "Не удалось удалить объявление."));
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
          <h1>RBAC-панель для недвижимости и пользователей</h1>
          <p className="hero-text">
            Один интерфейс для трех ролей: покупатель просматривает объекты,
            риелтор публикует и редактирует объявления, администратор дополнительно
            управляет пользователями и модерирует каталог.
          </p>
          <div className="capsules">
            <span>buyer: просмотр объектов</span>
            <span>realtor: создание и редактирование</span>
            <span>admin: объявления + пользователи</span>
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
                placeholder="realtor"
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
                placeholder="realtor123"
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
                  <option value="user">Покупатель</option>
                  <option value="seller">Риелтор</option>
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
            <h2>Каталог недвижимости</h2>
            {canViewProperties ? (
              <button
                className="ghost-button"
                type="button"
                onClick={handleReloadProtectedData}
              >
                Обновить
              </button>
            ) : null}
          </div>

          {canViewProperties ? (
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
            </div>
          ) : (
            <p className="empty">Для просмотра каталога нужно войти в систему.</p>
          )}
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>
              {propertyFormMode === "edit" ? "Редактирование объявления" : "Новое объявление"}
            </h2>
            {canEditProperties ? (
              <button className="ghost-button" type="button" onClick={resetPropertyForm}>
                Очистить форму
              </button>
            ) : null}
          </div>

          {canEditProperties ? (
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
                  required
                />
              </label>
              <button className="primary-button" type="submit" disabled={isBusy}>
                {propertyFormMode === "edit" ? "Сохранить изменения" : "Создать объявление"}
              </button>
            </form>
          ) : (
            <p className="empty">
              Создание и редактирование объявлений доступно риелтору и администратору.
            </p>
          )}
        </section>
      </main>

      <section className="panel details-panel">
        <div className="panel-header">
          <h2>Карточка объекта</h2>
          {selectedProperty ? (
            <div className="inline-actions">
              {canEditProperties ? (
                <button className="ghost-button" type="button" onClick={handleEditSelectedProperty}>
                  Редактировать
                </button>
              ) : null}
              {canDeleteProperties ? (
                <button
                  className="danger-button"
                  type="button"
                  onClick={handleDeleteSelectedProperty}
                >
                  Удалить
                </button>
              ) : null}
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
          <p className="empty">Выберите объект, чтобы посмотреть подробную информацию.</p>
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
                    <option value="user">Покупатель</option>
                    <option value="seller">Риелтор</option>
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
