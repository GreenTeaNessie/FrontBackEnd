import React, { useEffect, useState } from "react";

export default function PropertyModal({ open, mode, initialProperty, onClose, onSubmit }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("1");

  useEffect(() => {
    if (!open) return;

    setName(initialProperty?.name ?? "");
    setCategory(initialProperty?.category ?? "");
    setDescription(initialProperty?.description ?? "");
    setPrice(initialProperty?.price != null ? String(initialProperty.price) : "");
    setStock(initialProperty?.stock != null ? String(initialProperty.stock) : "1");
  }, [open, initialProperty]);

  if (!open) return null;

  const title = mode === "edit" ? "Редактирование объекта" : "Создание объекта";

  const handleSubmit = (event) => {
    event.preventDefault();

    const trimmedName = name.trim();
    const trimmedCategory = category.trim();
    const trimmedDescription = description.trim();
    const parsedPrice = Number(price);
    const parsedStock = Number(stock);

    if (!trimmedName || !trimmedCategory || !trimmedDescription) {
      alert("Заполните название, категорию и описание");
      return;
    }

    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      alert("Введите корректную цену");
      return;
    }

    if (!Number.isInteger(parsedStock) || parsedStock < 0) {
      alert("Введите корректное количество на складе");
      return;
    }

    onSubmit({
      id: initialProperty?.id,
      name: trimmedName,
      category: trimmedCategory,
      description: trimmedDescription,
      price: parsedPrice,
      stock: parsedStock
    });
  };

  return (
    <div className="backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal__header">
          <div className="modal__title">{title}</div>
          <button className="iconBtn" onClick={onClose} aria-label="Закрыть">
            x
          </button>
        </div>

        <form className="form" onSubmit={handleSubmit}>
          <label className="label">
            Название
            <input className="input" value={name} onChange={(event) => setName(event.target.value)} autoFocus />
          </label>

          <label className="label">
            Категория
            <input className="input" value={category} onChange={(event) => setCategory(event.target.value)} />
          </label>

          <label className="label">
            Описание
            <textarea className="input" value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>

          <label className="label">
            Цена
            <input className="input" value={price} onChange={(event) => setPrice(event.target.value)} inputMode="numeric" />
          </label>

          <label className="label">
            Количество на складе
            <input className="input" value={stock} onChange={(event) => setStock(event.target.value)} inputMode="numeric" />
          </label>

          <div className="modal__footer">
            <button type="button" className="btn" onClick={onClose}>
              Отмена
            </button>
            <button type="submit" className="btn btn--primary">
              {mode === "edit" ? "Сохранить" : "Создать"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
