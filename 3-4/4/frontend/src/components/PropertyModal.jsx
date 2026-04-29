import React, { useEffect, useState } from "react";

export default function PropertyModal({ open, mode, initialProduct, onClose, onSubmit }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("1");

  useEffect(() => {
    if (!open) return;

    setTitle(initialProduct?.title ?? "");
    setCategory(initialProduct?.category ?? "");
    setDescription(initialProduct?.description ?? "");
    setPrice(initialProduct?.price != null ? String(initialProduct.price) : "");
    setStock(initialProduct?.stock != null ? String(initialProduct.stock) : "1");
  }, [open, initialProduct]);

  if (!open) return null;

  const modalTitle = mode === "edit" ? "Редактирование товара" : "Создание товара";

  const handleSubmit = (event) => {
    event.preventDefault();

    const trimmedTitle = title.trim();
    const trimmedCategory = category.trim();
    const trimmedDescription = description.trim();
    const parsedPrice = Number(price);
    const parsedStock = Number(stock);

    if (!trimmedTitle || !trimmedCategory || !trimmedDescription) {
      alert("Заполните название товара, категорию и описание");
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
      id: initialProduct?.id,
      title: trimmedTitle,
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
          <div className="modal__title">{modalTitle}</div>
          <button className="iconBtn" onClick={onClose} aria-label="Закрыть">
            x
          </button>
        </div>

        <form className="form" onSubmit={handleSubmit}>
          <label className="label">
            Название товара
            <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} autoFocus />
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
