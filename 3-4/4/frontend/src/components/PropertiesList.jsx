import React from "react";
import PropertyItem from "./PropertyItem";

export default function PropertiesList({ products, onEdit, onDelete }) {
  if (!products.length) {
    return <div className="empty">Товаров пока нет</div>;
  }

  return (
    <div className="list">
      {products.map((item) => (
        <PropertyItem key={item.id} product={item} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}
