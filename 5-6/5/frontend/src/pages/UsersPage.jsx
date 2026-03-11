import { useEffect, useState } from "react";
import { api } from "../api";
import PropertyItem from "../components/UserItem";
import PropertyModal from "../components/UserModal";

export default function PropertiesPage() {
  const [properties, setProperties] = useState([]);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("1");
  const [editingId, setEditingId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadProperties = async () => {
    try {
      setLoading(true);
      const response = await api.getProperties();
      setProperties(response);
    } catch (requestError) {
      console.error(requestError);
      setError("Не удалось загрузить объекты");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProperties();
  }, []);

  const openCreateModal = () => {
    setName("");
    setCategory("");
    setDescription("");
    setPrice("");
    setStock("1");
    setEditingId(null);
    setError("");
    setIsModalOpen(true);
  };

  const openEditModal = (property) => {
    setName(property.name);
    setCategory(property.category);
    setDescription(property.description);
    setPrice(String(property.price));
    setStock(String(property.stock));
    setEditingId(property.id);
    setError("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setName("");
    setCategory("");
    setDescription("");
    setPrice("");
    setStock("1");
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedName = name.trim();
    const trimmedCategory = category.trim();
    const trimmedDescription = description.trim();
    const parsedPrice = Number(price);
    const parsedStock = Number(stock);

    if (!trimmedName || !trimmedCategory || !trimmedDescription) {
      setError("Заполните название, категорию и описание");
      return;
    }

    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setError("Введите корректную цену");
      return;
    }

    if (!Number.isInteger(parsedStock) || parsedStock < 0) {
      setError("Введите корректное количество");
      return;
    }

    try {
      setError("");
      if (editingId) {
        await api.updateProperty(editingId, {
          name: trimmedName,
          category: trimmedCategory,
          description: trimmedDescription,
          price: parsedPrice,
          stock: parsedStock
        });
      } else {
        await api.createProperty({
          name: trimmedName,
          category: trimmedCategory,
          description: trimmedDescription,
          price: parsedPrice,
          stock: parsedStock
        });
      }

      closeModal();
      await loadProperties();
    } catch (requestError) {
      console.error(requestError);
      setError("Ошибка сохранения объекта");
    }
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm("Удалить объект недвижимости?");
    if (!confirmed) {
      return;
    }

    try {
      setError("");
      await api.deleteProperty(id);
      await loadProperties();
    } catch (requestError) {
      console.error(requestError);
      setError("Ошибка удаления объекта");
    }
  };

  return (
    <main
      style={{
        maxWidth: 780,
        margin: "24px auto",
        padding: "0 12px",
        fontFamily: "Segoe UI, sans-serif"
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16
        }}
      >
        <h1 style={{ margin: 0 }}>Продажа недвижимости</h1>
        <button type="button" onClick={openCreateModal}>
          + Добавить объект
        </button>
      </header>

      {loading ? <div>Загрузка...</div> : null}

      {!loading && properties.length === 0 ? <div>Объектов пока нет</div> : null}

      {!loading && properties.length > 0 ? (
        <ul style={{ padding: 0, listStyle: "none", margin: 0 }}>
          {properties.map((property) => (
            <PropertyItem key={property.id} property={property} onEdit={openEditModal} onDelete={handleDelete} />
          ))}
        </ul>
      ) : null}

      <PropertyModal
        isOpen={isModalOpen}
        title={editingId ? "Редактирование объекта" : "Создание объекта"}
        name={name}
        category={category}
        description={description}
        price={price}
        stock={stock}
        onNameChange={setName}
        onCategoryChange={setCategory}
        onDescriptionChange={setDescription}
        onPriceChange={setPrice}
        onStockChange={setStock}
        onSubmit={handleSubmit}
        onClose={closeModal}
        error={error}
      />

      {!isModalOpen && error ? <div style={{ marginTop: 12, color: "#cf222e" }}>{error}</div> : null}
    </main>
  );
}
