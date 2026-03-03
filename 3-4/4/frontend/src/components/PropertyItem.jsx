import React from "react";

export default function PropertyItem({ property, onEdit, onDelete }) {
  const formattedPrice = Number(property.price).toLocaleString("ru-RU");

  return (
    <div className="propertyRow">
      <div className="propertyMain">
        <div className="propertyId">#{property.id}</div>
        <div className="propertyName">{property.name}</div>
        <div className="propertyCategory">{property.category}</div>
        <div className="propertyPrice">{formattedPrice} ₽</div>
        <div className="propertyStock">На складе: {property.stock}</div>
      </div>

      <p className="propertyDescription">{property.description}</p>

      <div className="propertyActions">
        <button className="btn" onClick={() => onEdit(property)}>
          Редактировать
        </button>
        <button className="btn btn--danger" onClick={() => onDelete(property.id)}>
          Удалить
        </button>
      </div>
    </div>
  );
}
