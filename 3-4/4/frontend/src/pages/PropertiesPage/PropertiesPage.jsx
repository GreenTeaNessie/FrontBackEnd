import React, { useEffect, useState } from "react";
import "./PropertiesPage.css";
import PropertiesList from "../../components/PropertiesList";
import PropertyModal from "../../components/PropertyModal";
import { api } from "../../api";

export default function PropertiesPage() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [editingProperty, setEditingProperty] = useState(null);

  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    try {
      setLoading(true);
      const data = await api.getProperties();
      setProperties(data);
    } catch (error) {
      console.error(error);
      alert("Ошибка загрузки объектов");
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setModalMode("create");
    setEditingProperty(null);
    setModalOpen(true);
  };

  const openEdit = (property) => {
    setModalMode("edit");
    setEditingProperty(property);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingProperty(null);
  };

  const handleDelete = async (id) => {
    const ok = window.confirm("Удалить объект недвижимости?");
    if (!ok) return;

    try {
      await api.deleteProperty(id);
      setProperties((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      console.error(error);
      alert("Ошибка удаления объекта");
    }
  };

  const handleSubmitModal = async (payload) => {
    try {
      if (modalMode === "create") {
        const newProperty = await api.createProperty(payload);
        setProperties((prev) => [...prev, newProperty]);
      } else {
        const updatedProperty = await api.updateProperty(payload.id, payload);
        setProperties((prev) =>
          prev.map((item) => (item.id === payload.id ? updatedProperty : item))
        );
      }

      closeModal();
    } catch (error) {
      console.error(error);
      alert("Ошибка сохранения объекта");
    }
  };

  return (
    <div className="page">
      <header className="header">
        <div className="header__inner">
          <div className="brand">Real Estate App</div>
          <div className="header__right">React + Express</div>
        </div>
      </header>

      <main className="main">
        <div className="container">
          <div className="toolbar">
            <h1 className="title">Объекты недвижимости</h1>
            <button className="btn btn--primary" onClick={openCreate}>
              + Создать
            </button>
          </div>

          {loading ? (
            <div className="empty">Загрузка...</div>
          ) : (
            <PropertiesList properties={properties} onEdit={openEdit} onDelete={handleDelete} />
          )}
        </div>
      </main>

      <footer className="footer">
        <div className="footer__inner">© {new Date().getFullYear()} Real Estate App</div>
      </footer>

      <PropertyModal
        open={modalOpen}
        mode={modalMode}
        initialProperty={editingProperty}
        onClose={closeModal}
        onSubmit={handleSubmitModal}
      />
    </div>
  );
}
