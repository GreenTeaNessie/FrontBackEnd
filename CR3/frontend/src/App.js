import { useEffect, useState } from "react";
import "./App.css";
import { api, clearTokens, getAccessToken } from "./api/client";

const emptyAuthForm = { username: "", password: "", role: "user" };
const emptyPropertyForm = { title: "", propertyType: "", address: "", description: "", imageUrl: "", price: "", area: "" };
const emptyUserForm = { username: "", role: "user", isBlocked: false };
const emptyReminderForm = { text: "", reminderTime: "" };

const roleLabels = { user: "Покупатель", seller: "Риелтор", admin: "Администратор" };
const demoAccounts = [
  { username: "admin",   password: "admin123",   role: "admin"  },
  { username: "realtor", password: "realtor123", role: "seller" },
  { username: "buyer",   password: "buyer123",   role: "user"   },
];

function formatPrice(v) { return new Intl.NumberFormat("ru-RU").format(v) + " ₽"; }
function mapError(e, fb) { return e.response?.data?.error || fb; }
function formatDateTime(v) { return new Date(v).toLocaleString("ru-RU"); }

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

function loadSocketClient(socketUrl) {
  if (window.io) return Promise.resolve(window.io);

  return new Promise((resolve, reject) => {
    const existing = document.getElementById("socket-io-client");
    if (existing) {
      existing.addEventListener("load", () => resolve(window.io));
      existing.addEventListener("error", reject);
      return;
    }

    const script = document.createElement("script");
    script.id = "socket-io-client";
    script.src = `${socketUrl}/socket.io/socket.io.js`;
    script.async = true;
    script.onload = () => resolve(window.io);
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

const IMAGES_BY_TYPE = {
  // Квартиры — интерьеры, виды из окон, жилые комплексы
  квартира: [
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=500&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&h=500&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=500&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&h=500&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&h=500&fit=crop&auto=format",
  ],
  // Дома — фасады, коттеджи, загородные дома
  дом: [
    "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&h=500&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=500&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&h=500&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&h=500&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&h=500&fit=crop&auto=format",
  ],
  // Кухни / студии
  студия: [
    "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&h=500&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=500&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=500&fit=crop&auto=format",
  ],
  // Коммерческая / офис
  офис: [
    "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=500&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800&h=500&fit=crop&auto=format",
  ],
  // Запасной пул — если тип не совпал
  default: [
    "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&h=500&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&h=500&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=500&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=500&fit=crop&auto=format",
  ],
};

function getPropertyImage(p) {
  if (p.imageUrl) return p.imageUrl;
  const key = (p.propertyType || "").toLowerCase().trim();
  const pool = IMAGES_BY_TYPE[key] || IMAGES_BY_TYPE.default;
  const hash = p.id.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return pool[hash % pool.length];
}

export default function App() {
  const [mode, setMode] = useState("login");
  const [authForm, setAuthForm] = useState(emptyAuthForm);
  const [propertyForm, setPropertyForm] = useState(emptyPropertyForm);
  const [managedUserForm, setManagedUserForm] = useState(emptyUserForm);
  const [properties, setProperties] = useState([]);
  const [users, setUsers] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [selectedManagedUser, setSelectedManagedUser] = useState(null);
  const [propertyFormMode, setPropertyFormMode] = useState("create");
  const [reminderForm, setReminderForm] = useState(emptyReminderForm);
  const [appConfig, setAppConfig] = useState(null);
  const [socketStatus, setSocketStatus] = useState("Socket.IO не подключён");
  const [pushStatus, setPushStatus] = useState("Push не настроен");
  const [currentUser, setCurrentUser] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const [infoMessage, setInfoMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const canEdit = currentUser && ["seller", "admin"].includes(currentUser.role);
  const isAdmin = currentUser?.role === "admin";

  useEffect(() => {
    api.getConfig()
      .then(setAppConfig)
      .catch(() => setPushStatus("Конфигурация PWA недоступна"));
  }, []);

  useEffect(() => {
    const onExpired = () => {
      setCurrentUser(null); setProperties([]); setUsers([]); setReminders([]);
      setSelectedProperty(null); setSelectedManagedUser(null);
      setPropertyForm(emptyPropertyForm); setManagedUserForm(emptyUserForm); setReminderForm(emptyReminderForm);
      setErrorMessage("Сессия истекла. Войдите заново.");
    };
    window.addEventListener("auth:expired", onExpired);
    return () => window.removeEventListener("auth:expired", onExpired);
  }, []);

  useEffect(() => { bootstrap(); }, []);

  useEffect(() => {
    if (!currentUser) {
      setPushStatus("Push не настроен");
      return;
    }
    refreshPushStatus().catch(() => setPushStatus("Push статус недоступен"));
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser || !appConfig?.socketUrl) return undefined;

    let socket;
    let isMounted = true;

    loadSocketClient(appConfig.socketUrl)
      .then((io) => {
        if (!isMounted) return;
        socket = io(appConfig.socketUrl);
        socket.on("connect", () => setSocketStatus(`Socket.IO подключён: ${socket.id}`));
        socket.on("disconnect", () => setSocketStatus("Socket.IO отключён"));
        socket.on("propertyCreated", (property) => {
          setInfoMessage(`Новое объявление: ${property.title}`);
          loadData(currentUser);
        });
        socket.on("propertyUpdated", (property) => {
          setInfoMessage(`Объявление обновлено: ${property.title}`);
          loadData(currentUser);
        });
        socket.on("propertyDeleted", (property) => {
          setInfoMessage(`Объявление удалено: ${property.title}`);
          loadData(currentUser);
        });
        socket.on("reminderScheduled", (reminder) => {
          if (reminder.userId === currentUser.id || currentUser.role === "admin") {
            setInfoMessage(`Напоминание запланировано: ${reminder.propertyTitle}`);
            api.getReminders().then(setReminders).catch(() => {});
          }
        });
        socket.on("reminderSnoozed", (reminder) => {
          if (reminder.userId === currentUser.id || currentUser.role === "admin") {
            setInfoMessage(`Напоминание отложено: ${reminder.propertyTitle}`);
            api.getReminders().then(setReminders).catch(() => {});
          }
        });
        socket.on("reminderDue", (reminder) => {
          if (reminder.userId === currentUser.id || currentUser.role === "admin") {
            setInfoMessage(`Время напоминания: ${reminder.propertyTitle}`);
            api.getReminders().then(setReminders).catch(() => {});
          }
        });
      })
      .catch(() => setSocketStatus("Socket.IO клиент не загрузился"));

    return () => {
      isMounted = false;
      if (socket) socket.disconnect();
    };
  }, [currentUser, appConfig]);

  async function bootstrap() {
    if (!getAccessToken()) return;
    setIsBusy(true);
    try {
      const me = await api.getMe();
      setCurrentUser(me);
      await loadData(me);
    } catch (e) {
      clearTokens();
      setErrorMessage(mapError(e, "Не удалось восстановить сессию."));
    } finally { setIsBusy(false); }
  }

  async function loadData(user) {
    const props = await api.getProperties();
    setProperties(props);
    const rems = await api.getReminders();
    setReminders(rems);
    if (selectedProperty) {
      const fresh = props.find(p => p.id === selectedProperty.id);
      setSelectedProperty(fresh || null);
      if (fresh && propertyFormMode === "edit") {
        setPropertyForm({ title: fresh.title, propertyType: fresh.propertyType,
          address: fresh.address, description: fresh.description,
          imageUrl: fresh.imageUrl || "",
          price: String(fresh.price), area: String(fresh.area) });
      }
    }
    if (user.role === "admin") {
      const us = await api.getUsers();
      setUsers(us);
      if (selectedManagedUser) {
        const freshU = us.find(u => u.id === selectedManagedUser.id);
        setSelectedManagedUser(freshU || null);
        if (freshU) setManagedUserForm({ username: freshU.username, role: freshU.role, isBlocked: freshU.isBlocked });
      }
    } else { setUsers([]); setSelectedManagedUser(null); setManagedUserForm(emptyUserForm); }
  }

  async function reload() {
    if (!currentUser) return;
    setIsBusy(true); setErrorMessage("");
    try { await loadData(currentUser); } catch (e) { setErrorMessage(mapError(e, "Не удалось обновить данные.")); }
    finally { setIsBusy(false); }
  }

  function resetPropertyForm() { setPropertyFormMode("create"); setPropertyForm(emptyPropertyForm); }

  async function handleAuthSubmit(e) {
    e.preventDefault(); setIsBusy(true); setErrorMessage(""); setInfoMessage("");
    try {
      if (mode === "register") { await api.register(authForm); setInfoMessage("Регистрация успешна."); }
      const res = await api.login(authForm);
      setCurrentUser(res.user); setAuthForm(emptyAuthForm);
      await loadData(res.user);
      setInfoMessage(`Добро пожаловать, ${res.user.username}.`);
    } catch (e) { setErrorMessage(mapError(e, "Не удалось авторизоваться.")); }
    finally { setIsBusy(false); }
  }

  function fillDemo(acc) { setMode("login"); setAuthForm({ username: acc.username, password: acc.password, role: acc.role }); }

  function handleLogout() {
    clearTokens(); setCurrentUser(null); setProperties([]); setUsers([]); setReminders([]);
    setSelectedProperty(null); setSelectedManagedUser(null);
    resetPropertyForm(); setManagedUserForm(emptyUserForm); setReminderForm(emptyReminderForm);
    setInfoMessage("Вы вышли из системы."); setErrorMessage("");
  }

  async function handleSelectProperty(id) {
    setIsBusy(true); setErrorMessage("");
    try { setSelectedProperty(await api.getPropertyById(id)); }
    catch (e) { setErrorMessage(mapError(e, "Не удалось загрузить объект.")); }
    finally { setIsBusy(false); }
  }

  function handleEditProperty() {
    if (!selectedProperty || !canEdit) return;
    setPropertyFormMode("edit");
    setPropertyForm({ title: selectedProperty.title, propertyType: selectedProperty.propertyType,
      address: selectedProperty.address, description: selectedProperty.description,
      imageUrl: selectedProperty.imageUrl || "",
      price: String(selectedProperty.price), area: String(selectedProperty.area) });
    setErrorMessage("");
  }

  async function handlePropertySubmit(e) {
    e.preventDefault();
    if (!canEdit) { setErrorMessage("Доступно только риелтору или администратору."); return; }
    setIsBusy(true); setErrorMessage(""); setInfoMessage("");
    try {
      if (propertyFormMode === "edit" && selectedProperty) {
        setSelectedProperty(await api.updateProperty(selectedProperty.id, propertyForm));
        setInfoMessage("Объявление обновлено.");
      } else {
        setSelectedProperty(await api.createProperty(propertyForm));
        setInfoMessage("Объявление создано.");
      }
      resetPropertyForm(); await loadData(currentUser);
    } catch (e) { setErrorMessage(mapError(e, "Не удалось сохранить.")); }
    finally { setIsBusy(false); }
  }

  async function handleDeleteProperty() {
    if (!selectedProperty || !isAdmin) { setErrorMessage("Удаление доступно только администратору."); return; }
    if (!window.confirm(`Удалить «${selectedProperty.title}»?`)) return;
    setIsBusy(true); setErrorMessage(""); setInfoMessage("");
    try {
      await api.deleteProperty(selectedProperty.id);
      setSelectedProperty(null); resetPropertyForm();
      await loadData(currentUser); setInfoMessage("Объявление удалено.");
    } catch (e) { setErrorMessage(mapError(e, "Не удалось удалить.")); }
    finally { setIsBusy(false); }
  }

  async function handleSelectUser(id) {
    if (!isAdmin) return;
    setIsBusy(true); setErrorMessage("");
    try {
      const u = await api.getUserById(id);
      setSelectedManagedUser(u);
      setManagedUserForm({ username: u.username, role: u.role, isBlocked: u.isBlocked });
    } catch (e) { setErrorMessage(mapError(e, "Не удалось загрузить пользователя.")); }
    finally { setIsBusy(false); }
  }

  async function handleUserUpdate(e) {
    e.preventDefault();
    if (!isAdmin || !selectedManagedUser) return;
    setIsBusy(true); setErrorMessage(""); setInfoMessage("");
    try {
      const updated = await api.updateUser(selectedManagedUser.id, managedUserForm);
      const me = selectedManagedUser.id === currentUser.id ? await api.getMe() : currentUser;
      setSelectedManagedUser(updated); setCurrentUser(me);
      setInfoMessage("Пользователь обновлён."); await loadData(me);
    } catch (e) { setErrorMessage(mapError(e, "Не удалось обновить.")); }
    finally { setIsBusy(false); }
  }

  async function handleBlockUser() {
    if (!isAdmin || !selectedManagedUser) return;
    setIsBusy(true); setErrorMessage(""); setInfoMessage("");
    try {
      const res = await api.blockUser(selectedManagedUser.id);
      setSelectedManagedUser(res.user);
      setManagedUserForm({ username: res.user.username, role: res.user.role, isBlocked: res.user.isBlocked });
      await loadData(currentUser); setInfoMessage("Пользователь заблокирован.");
    } catch (e) { setErrorMessage(mapError(e, "Не удалось заблокировать.")); }
    finally { setIsBusy(false); }
  }

  async function refreshPushStatus() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPushStatus("Push API не поддерживается браузером");
      return;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    setPushStatus(subscription ? "Push включён" : "Push выключен");
  }

  async function handleEnablePush() {
    if (!appConfig?.vapidPublicKey) {
      setErrorMessage("VAPID public key не загружен.");
      return;
    }

    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setErrorMessage("Браузер не поддерживает Push API.");
      return;
    }

    setIsBusy(true); setErrorMessage(""); setInfoMessage("");
    try {
      const permission = Notification.permission === "default"
        ? await Notification.requestPermission()
        : Notification.permission;

      if (permission !== "granted") {
        setErrorMessage("Разрешите уведомления в настройках браузера.");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(appConfig.vapidPublicKey)
        });
      }

      await api.subscribePush(subscription);
      await refreshPushStatus();
      setInfoMessage("Push-уведомления включены.");
    } catch (e) {
      setErrorMessage(mapError(e, "Не удалось включить Push."));
    } finally { setIsBusy(false); }
  }

  async function handleDisablePush() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    setIsBusy(true); setErrorMessage(""); setInfoMessage("");
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await api.unsubscribePush(subscription.endpoint);
        await subscription.unsubscribe();
      }
      await refreshPushStatus();
      setInfoMessage("Push-уведомления отключены.");
    } catch (e) {
      setErrorMessage(mapError(e, "Не удалось отключить Push."));
    } finally { setIsBusy(false); }
  }

  async function handleReminderSubmit(e) {
    e.preventDefault();
    if (!selectedProperty) {
      setErrorMessage("Выберите объект для напоминания.");
      return;
    }

    const reminderTime = new Date(reminderForm.reminderTime).getTime();
    if (!reminderForm.text.trim() || Number.isNaN(reminderTime) || reminderTime <= Date.now()) {
      setErrorMessage("Укажите текст и будущее время напоминания.");
      return;
    }

    setIsBusy(true); setErrorMessage(""); setInfoMessage("");
    try {
      const reminder = await api.createReminder({
        propertyId: selectedProperty.id,
        text: reminderForm.text,
        reminderTime
      });
      setReminders((current) => [...current, reminder].sort((a, b) => a.reminderTime - b.reminderTime));
      setReminderForm(emptyReminderForm);
      setInfoMessage("Напоминание создано.");
    } catch (e) {
      setErrorMessage(mapError(e, "Не удалось создать напоминание."));
    } finally { setIsBusy(false); }
  }

  async function handleDeleteReminder(id) {
    setIsBusy(true); setErrorMessage(""); setInfoMessage("");
    try {
      await api.deleteReminder(id);
      setReminders((current) => current.filter((reminder) => reminder.id !== id));
      setInfoMessage("Напоминание удалено.");
    } catch (e) {
      setErrorMessage(mapError(e, "Не удалось удалить напоминание."));
    } finally { setIsBusy(false); }
  }

  function pf(key) {
    return (e) => setPropertyForm(c => ({ ...c, [key]: e.target.value }));
  }
  function af(key) {
    return (e) => setAuthForm(c => ({ ...c, [key]: e.target.value }));
  }
  function uf(key, isCheck) {
    return (e) => setManagedUserForm(c => ({ ...c, [key]: isCheck ? e.target.checked : e.target.value }));
  }
  function rf(key) {
    return (e) => setReminderForm(c => ({ ...c, [key]: e.target.value }));
  }

  /* ── RENDER ──────────────────────────────────────────────── */

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-brand">
          <div className="brand-dot" />
          EstateHub
        </div>
        {isBusy && <span className="navbar-status">Загрузка…</span>}
        {currentUser && (
          <>
            <div className="pwa-status">
              <span>{socketStatus}</span>
              <span>{pushStatus}</span>
            </div>
            <button className="btn btn-ghost btn-sm" type="button" onClick={handleEnablePush}>Push on</button>
            <button className="btn btn-ghost btn-sm" type="button" onClick={handleDisablePush}>Push off</button>
            <div className="user-pill">
              {currentUser.username}
              <span className="role-tag">{roleLabels[currentUser.role]}</span>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Выйти</button>
          </>
        )}
      </nav>

      {/* Alerts */}
      {(errorMessage || infoMessage) && (
        <div className="alerts">
          {errorMessage && <div className="alert error">{errorMessage}</div>}
          {infoMessage  && <div className="alert info">{infoMessage}</div>}
        </div>
      )}

      {/* Auth page */}
      {!currentUser ? (
        <div className="auth-page">
          <div className="auth-card">
            <h2>Вход в систему</h2>
            <p className="auth-subtitle">Платформа управления недвижимостью</p>

            <div className="segmented">
              <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")} type="button">Вход</button>
              <button className={mode === "register" ? "active" : ""} onClick={() => setMode("register")} type="button">Регистрация</button>
            </div>

            <form onSubmit={handleAuthSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="field">
                <label>Логин</label>
                <input value={authForm.username} onChange={af("username")} placeholder="username" required />
              </div>
              <div className="field">
                <label>Пароль</label>
                <input type="password" value={authForm.password} onChange={af("password")} placeholder="••••••••" required />
              </div>
              {mode === "register" && (
                <div className="field">
                  <label>Роль</label>
                  <select value={authForm.role} onChange={af("role")}>
                    <option value="user">Покупатель</option>
                    <option value="seller">Риелтор</option>
                    <option value="admin">Администратор</option>
                  </select>
                </div>
              )}
              <button className="btn btn-primary" type="submit" disabled={isBusy} style={{ marginTop: 4 }}>
                {mode === "login" ? "Войти" : "Создать аккаунт"}
              </button>
            </form>

            <div className="demo-divider">Быстрый вход</div>
            <div className="demo-accounts">
              {demoAccounts.map(acc => (
                <button key={acc.username} className="demo-card" type="button" onClick={() => fillDemo(acc)}>
                  <strong>{acc.username}</strong>
                  <span className="demo-role">{roleLabels[acc.role]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Main app */
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div className="app-layout">
            {/* Sidebar — catalog */}
            <aside className="sidebar">
              <div className="sidebar-header">
                <h3>Каталог</h3>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span className="sidebar-count">{properties.length}</span>
                  <button className="btn btn-ghost btn-sm btn-icon-only" title="Обновить" onClick={reload}>↻</button>
                </div>
              </div>
              <div className="sidebar-body">
                {properties.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">🏠</div>
                    <p>Объявлений пока нет</p>
                  </div>
                ) : (
                  properties.map(p => (
                    <button
                      key={p.id}
                      className={`prop-card ${selectedProperty?.id === p.id ? "selected" : ""}`}
                      onClick={() => handleSelectProperty(p.id)}
                      type="button"
                    >
                      <img className="prop-thumb" src={getPropertyImage(p)} alt={p.title} />
                      <div className="prop-info">
                        <span className="prop-type">{p.propertyType}</span>
                        <strong>{p.title}</strong>
                        <span className="prop-addr">{p.address}</span>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span className="prop-price">{formatPrice(p.price)}</span>
                          <span className="prop-area">{p.area} м²</span>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </aside>

            {/* Main content */}
            <main className="main-content">
              {/* Property details */}
              {selectedProperty ? (
                <div className="panel">
                  <img
                    className="details-hero"
                    src={getPropertyImage(selectedProperty)}
                    alt={selectedProperty.title}
                  />
                  <div className="details-header">
                    <div style={{ flex: 1 }}>
                      <span className="details-type">{selectedProperty.propertyType}</span>
                      <h2 className="details-title" style={{ marginTop: 8 }}>{selectedProperty.title}</h2>
                      <p className="details-addr">📍 {selectedProperty.address}</p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div className="details-price">{formatPrice(selectedProperty.price)}</div>
                      <div style={{ fontSize: "0.875rem", color: "var(--muted)", marginTop: 4 }}>{selectedProperty.area} м²</div>
                    </div>
                  </div>

                  {selectedProperty.description && (
                    <p className="details-desc">{selectedProperty.description}</p>
                  )}

                  <div className="details-meta-grid" style={{ marginBottom: 16 }}>
                    <dl className="meta-item"><dt>ID</dt><dd>{selectedProperty.id}</dd></dl>
                    <dl className="meta-item"><dt>Риелтор</dt><dd>{selectedProperty.agentUsername}</dd></dl>
                    <dl className="meta-item"><dt>Площадь</dt><dd>{selectedProperty.area} м²</dd></dl>
                  </div>

                  <div className="details-actions">
                    {canEdit && (
                      <button className="btn btn-ghost btn-sm" onClick={handleEditProperty}>Редактировать</button>
                    )}
                    {isAdmin && (
                      <button className="btn btn-danger btn-sm" onClick={handleDeleteProperty}>Удалить</button>
                    )}
                  </div>

                  <form className="reminder-form" onSubmit={handleReminderSubmit}>
                    <div className="field full-width">
                      <label>Push-напоминание по объекту</label>
                      <input
                        value={reminderForm.text}
                        onChange={rf("text")}
                        placeholder={`Напомнить про: ${selectedProperty.title}`}
                        required
                      />
                    </div>
                    <div className="field">
                      <label>Дата и время</label>
                      <input
                        type="datetime-local"
                        value={reminderForm.reminderTime}
                        onChange={rf("reminderTime")}
                        required
                      />
                    </div>
                    <div className="form-actions reminder-actions">
                      <button className="btn btn-primary" type="submit" disabled={isBusy}>Создать напоминание</button>
                    </div>
                  </form>
                </div>
              ) : (
                !canEdit && (
                  <div className="panel">
                    <div className="empty-state">
                      <div className="empty-icon">🏘️</div>
                      <p>Выберите объект из каталога слева, чтобы посмотреть подробную информацию</p>
                    </div>
                  </div>
                )
              )}

              {/* Property form (seller / admin) */}
              {canEdit && (
                <div className="panel">
                  <div className="panel-header">
                    <h2>{propertyFormMode === "edit" ? "Редактирование объявления" : "Новое объявление"}</h2>
                    {propertyFormMode === "edit" && (
                      <button className="btn btn-ghost btn-sm" onClick={resetPropertyForm}>Отменить</button>
                    )}
                  </div>

                  <form onSubmit={handlePropertySubmit}>
                    <div className="form-grid">
                      <div className="field full-width">
                        <label>Заголовок объявления</label>
                        <input value={propertyForm.title} onChange={pf("title")} placeholder="2-к квартира у метро" required />
                      </div>
                      <div className="field full-width">
                        <label>Фото объекта (URL, необязательно)</label>
                        <input value={propertyForm.imageUrl} onChange={pf("imageUrl")} placeholder="https://..." />
                      </div>
                      <div className="field">
                        <label>Тип объекта</label>
                        <input value={propertyForm.propertyType} onChange={pf("propertyType")} placeholder="Квартира" required />
                      </div>
                      <div className="field">
                        <label>Адрес</label>
                        <input value={propertyForm.address} onChange={pf("address")} placeholder="ул. Ленина, 10" required />
                      </div>
                      <div className="field">
                        <label>Стоимость, ₽</label>
                        <input type="number" min="1" value={propertyForm.price} onChange={pf("price")} placeholder="5000000" required />
                      </div>
                      <div className="field">
                        <label>Площадь, м²</label>
                        <input type="number" min="1" value={propertyForm.area} onChange={pf("area")} placeholder="54" required />
                      </div>
                      <div className="field full-width">
                        <label>Описание</label>
                        <textarea rows={3} value={propertyForm.description} onChange={pf("description")} placeholder="Опишите объект…" required />
                      </div>
                    </div>
                    <div className="form-actions" style={{ marginTop: 14 }}>
                      <button className="btn btn-primary" type="submit" disabled={isBusy}>
                        {propertyFormMode === "edit" ? "Сохранить изменения" : "Создать объявление"}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="panel">
                <div className="panel-header">
                  <h2>Push-напоминания</h2>
                  <button className="btn btn-ghost btn-sm" onClick={reload}>Обновить</button>
                </div>
                {reminders.length === 0 ? (
                  <div className="empty-state compact">
                    <p>Напоминаний пока нет. Выберите объект и задайте время.</p>
                  </div>
                ) : (
                  <div className="reminders-list">
                    {reminders.map((reminder) => (
                      <div className="reminder-item" key={reminder.id}>
                        <div>
                          <strong>{reminder.propertyTitle}</strong>
                          <p>{reminder.text}</p>
                          <span>
                            {formatDateTime(reminder.reminderTime)} · {reminder.status === "due" ? "сработало" : "запланировано"}
                          </span>
                        </div>
                        <button className="btn btn-danger btn-sm" type="button" onClick={() => handleDeleteReminder(reminder.id)}>
                          Удалить
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Admin: users */}
              {isAdmin && (
                <div className="panel">
                  <div className="panel-header">
                    <h2>Управление пользователями</h2>
                    <button className="btn btn-ghost btn-sm" onClick={reload}>Обновить</button>
                  </div>

                  <div className="admin-row">
                    <div>
                      <p className="section-label">Список пользователей</p>
                      <div className="users-list">
                        {users.map(u => (
                          <button
                            key={u.id}
                            className={`user-card ${selectedManagedUser?.id === u.id ? "selected" : ""}`}
                            type="button"
                            onClick={() => handleSelectUser(u.id)}
                          >
                            <div>
                              <div className="user-name">{u.username}</div>
                              <div className="user-role">{roleLabels[u.role]}</div>
                            </div>
                            <span className={`status-badge ${u.isBlocked ? "blocked" : "active"}`}>
                              {u.isBlocked ? "Заблокирован" : "Активен"}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="section-label">
                        {selectedManagedUser ? `Редактировать: ${selectedManagedUser.username}` : "Выберите пользователя"}
                      </p>
                      {selectedManagedUser ? (
                        <form onSubmit={handleUserUpdate} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                          <div className="field">
                            <label>Логин</label>
                            <input value={managedUserForm.username} onChange={uf("username")} required />
                          </div>
                          <div className="field">
                            <label>Роль</label>
                            <select value={managedUserForm.role} onChange={uf("role")}>
                              <option value="user">Покупатель</option>
                              <option value="seller">Риелтор</option>
                              <option value="admin">Администратор</option>
                            </select>
                          </div>
                          <label className="checkbox-field">
                            <input type="checkbox" checked={managedUserForm.isBlocked} onChange={uf("isBlocked", true)} />
                            Пользователь заблокирован
                          </label>
                          <div className="form-actions">
                            <button className="btn btn-primary" type="submit" disabled={isBusy}>Сохранить</button>
                            <button
                              className="btn btn-danger"
                              type="button"
                              disabled={isBusy || selectedManagedUser.id === currentUser.id}
                              onClick={handleBlockUser}
                            >
                              Заблокировать
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="empty-state" style={{ padding: "20px 0" }}>
                          <p>Выберите пользователя из списка</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </main>
          </div>

          <footer className="footer">© 2025 EstateHub</footer>
        </div>
      )}
    </div>
  );
}
