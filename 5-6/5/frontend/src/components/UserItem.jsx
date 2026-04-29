export default function ProductItem({ product, onEdit, onDelete }) {
  const formattedPrice = Number(product.price).toLocaleString("ru-RU");

  return (
    <li
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 14px",
        border: "1px solid #d0d7de",
        borderRadius: 8,
        marginBottom: 8,
        backgroundColor: "#ffffff"
      }}
    >
      <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <strong>{product.title}</strong>
        <span style={{ fontSize: 13, color: "#555" }}>
          {product.category} • {formattedPrice} ₽ • Остаток: {product.stock}
        </span>
        <span style={{ fontSize: 12, color: "#777" }}>{product.description}</span>
      </span>
      <span style={{ display: "flex", gap: 8 }}>
        <button type="button" onClick={() => onEdit(product)}>
          Редактировать
        </button>
        <button type="button" onClick={() => onDelete(product.id)}>
          Удалить
        </button>
      </span>
    </li>
  );
}
