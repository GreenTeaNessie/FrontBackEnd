import { useEffect, useState } from "react";
import { api } from "../api";
import ProductItem from "../components/UserItem";
import ProductModal from "../components/UserModal";

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("1");
  const [editingId, setEditingId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await api.getProducts();
      setProducts(response);
    } catch (requestError) {
      console.error(requestError);
      setError("Не удалось загрузить товары");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const openCreateModal = () => {
    setTitle("");
    setCategory("");
    setDescription("");
    setPrice("");
    setStock("1");
    setEditingId(null);
    setError("");
    setIsModalOpen(true);
  };

  const openEditModal = (product) => {
    setTitle(product.title);
    setCategory(product.category);
    setDescription(product.description);
    setPrice(String(product.price));
    setStock(String(product.stock));
    setEditingId(product.id);
    setError("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setTitle("");
    setCategory("");
    setDescription("");
    setPrice("");
    setStock("1");
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedTitle = title.trim();
    const trimmedCategory = category.trim();
    const trimmedDescription = description.trim();
    const parsedPrice = Number(price);
    const parsedStock = Number(stock);

    if (!trimmedTitle || !trimmedCategory || !trimmedDescription) {
      setError("Заполните название товара, категорию и описание");
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
        await api.updateProduct(editingId, {
          title: trimmedTitle,
          category: trimmedCategory,
          description: trimmedDescription,
          price: parsedPrice,
          stock: parsedStock
        });
      } else {
        await api.createProduct({
          title: trimmedTitle,
          category: trimmedCategory,
          description: trimmedDescription,
          price: parsedPrice,
          stock: parsedStock
        });
      }

      closeModal();
      await loadProducts();
    } catch (requestError) {
      console.error(requestError);
      setError("Ошибка сохранения товара");
    }
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm("Удалить товар?");

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      await api.deleteProduct(id);
      await loadProducts();
    } catch (requestError) {
      console.error(requestError);
      setError("Ошибка удаления товара");
    }
  };

  return (
    <main
      style={{
        maxWidth: 840,
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
        <div>
          <h1 style={{ margin: 0 }}>Electro Store</h1>
          <div style={{ color: "#57606a", marginTop: 4 }}>
            Практики 5-6: CRUD товаров и Swagger документация
          </div>
        </div>
        <button type="button" onClick={openCreateModal}>
          + Добавить товар
        </button>
      </header>

      {loading ? <div>Загрузка...</div> : null}

      {!loading && products.length === 0 ? <div>Товаров пока нет</div> : null}

      {!loading && products.length > 0 ? (
        <ul style={{ padding: 0, listStyle: "none", margin: 0 }}>
          {products.map((product) => (
            <ProductItem key={product.id} product={product} onEdit={openEditModal} onDelete={handleDelete} />
          ))}
        </ul>
      ) : null}

      <ProductModal
        isOpen={isModalOpen}
        title={editingId ? "Редактирование товара" : "Создание товара"}
        titleValue={title}
        category={category}
        description={description}
        price={price}
        stock={stock}
        onTitleChange={setTitle}
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
