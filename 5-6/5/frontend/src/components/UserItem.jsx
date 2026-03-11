export default function PropertyItem({ property, onEdit, onDelete }) {
  const formattedPrice = Number(property.price).toLocaleString("ru-RU");

  return (
    <li
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 12px",
        border: "1px solid #d0d7de",
        borderRadius: 8,
        marginBottom: 8,
        backgroundColor: "#ffffff"
      }}
    >
      <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <strong>{property.name}</strong>
        <span style={{ fontSize: 13, color: "#555" }}>
          {property.category} &mdash; {formattedPrice} ₽
        </span>
        <span style={{ fontSize: 12, color: "#777" }}>{property.description}</span>
      </span>
      <span style={{ display: "flex", gap: 8 }}>
        <button type="button" onClick={() => onEdit(property)}>
          Редактировать
        </button>
        <button type="button" onClick={() => onDelete(property.id)}>
          Удалить
        </button>
      </span>
    </li>
  );
}
