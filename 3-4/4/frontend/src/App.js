import { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";

const apiClient = axios.create({
  baseURL: "http://localhost:3000/api",
  headers: {
    "Content-Type": "application/json",
    accept: "application/json"
  }
});

const emptyForm = {
  name: "",
  category: "",
  description: "",
  price: "",
  stock: "1"
};

export default function App() {
  const [properties, setProperties] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProperties = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get("/properties");
      setProperties(response.data);
    } catch (error) {
      console.error(error);
      alert("Ошибка загрузки объектов недвижимости");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProperties();
  }, []);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const validateForm = () => {
    const payload = {
      name: form.name.trim(),
      category: form.category.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      stock: Number(form.stock)
    };

    if (!payload.name || !payload.category || !payload.description) {
      alert("Заполни название, категорию и описание");
      return null;
    }

    if (!Number.isFinite(payload.price) || payload.price <= 0) {
      alert("Цена должна быть положительным числом");
      return null;
    }

    if (!Number.isInteger(payload.stock) || payload.stock < 0) {
      alert("Количество на складе должно быть целым числом от 0");
      return null;
    }

    return payload;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const payload = validateForm();

    if (!payload) {
      return;
    }

    try {
      if (editingId) {
        await apiClient.patch(`/properties/${editingId}`, payload);
      } else {
        await apiClient.post("/properties", payload);
      }

      resetForm();
      await loadProperties();
    } catch (error) {
      console.error(error);
      alert("Ошибка сохранения объекта");
    }
  };

  const handleEdit = (property) => {
    setEditingId(property.id);
    setForm({
      name: property.name,
      category: property.category,
      description: property.description,
      price: String(property.price),
      stock: String(property.stock)
    });
  };

  const handleDelete = async (id) => {
    const ok = window.confirm("Удалить объект недвижимости?");

    if (!ok) {
      return;
    }

    try {
      await apiClient.delete(`/properties/${id}`);
      await loadProperties();
    } catch (error) {
      console.error(error);
      alert("Ошибка удаления объекта");
    }
  };

  const formatPrice = (value) => {
    return Number(value).toLocaleString("ru-RU");
  };

  return (
    <main className="page">
      <header className="hero">
        <p className="hero__label">Практическая работа 4</p>
        <h1 className="hero__title">Каталог недвижимости</h1>
        <p className="hero__subtitle">React + Express: CRUD для объектов недвижимости</p>
      </header>

      <section className="panel">
        <h2>{editingId ? "Редактировать объект" : "Добавить объект"}</h2>

        <form className="form" onSubmit={handleSubmit}>
          <input
            name="name"
            placeholder="Название"
            value={form.name}
            onChange={handleInputChange}
          />
          <input
            name="category"
            placeholder="Категория"
            value={form.category}
            onChange={handleInputChange}
          />
          <textarea
            name="description"
            placeholder="Описание"
            value={form.description}
            onChange={handleInputChange}
          />
          <input
            name="price"
            placeholder="Цена"
            value={form.price}
            onChange={handleInputChange}
            inputMode="numeric"
          />
          <input
            name="stock"
            placeholder="Количество на складе"
            value={form.stock}
            onChange={handleInputChange}
            inputMode="numeric"
          />

          <div className="form__actions">
            <button type="submit">{editingId ? "Сохранить" : "Создать"}</button>
            {editingId && (
              <button type="button" onClick={resetForm} className="button-secondary">
                Отмена
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="panel__top">
          <h2>Объекты ({properties.length})</h2>
        </div>

        {loading ? (
          <p>Загрузка...</p>
        ) : (
          <div className="cards">
            {properties.map((property) => (
              <article key={property.id} className="card">
                <p className="card__category">{property.category}</p>
                <h3 className="card__name">{property.name}</h3>
                <p className="card__description">{property.description}</p>
                <p className="card__line">Цена: {formatPrice(property.price)} ₽</p>
                <p className="card__line">На складе: {property.stock}</p>
                <div className="card__actions">
                  <button onClick={() => handleEdit(property)}>Редактировать</button>
                  <button className="button-danger" onClick={() => handleDelete(property.id)}>
                    Удалить
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
