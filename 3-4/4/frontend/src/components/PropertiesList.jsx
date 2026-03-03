import React from "react";
import PropertyItem from "./PropertyItem";

export default function PropertiesList({ properties, onEdit, onDelete }) {
  if (!properties.length) {
    return <div className="empty">Объектов недвижимости пока нет</div>;
  }

  return (
    <div className="list">
      {properties.map((item) => (
        <PropertyItem key={item.id} property={item} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}
