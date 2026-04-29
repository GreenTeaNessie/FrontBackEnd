import React from "react";

export default function PropertyItem({ product, onEdit, onDelete }) {
  const formattedPrice = Number(product.price).toLocaleString("ru-RU");

  return (
    <div className="propertyRow">
      <div className="propertyMain">
        <div className="propertyId">#{product.id}</div>
        <div className="propertyName">{product.title}</div>
        <div className="propertyCategory">{product.category}</div>
        <div className="propertyPrice">{formattedPrice} ₽</div>
        <div className="propertyStock">На складе: {product.stock}</div>
      </div>

      <p className="propertyDescription">{product.description}</p>

      <div className="propertyActions">
        <button className="btn" onClick={() => onEdit(product)}>
          Редактировать
        </button>
        <button className="btn btn--danger" onClick={() => onDelete(product.id)}>
          Удалить
        </button>
      </div>
    </div>
  );
}
