export default function ProductModal({
  isOpen,
  title,
  titleValue,
  category,
  description,
  price,
  stock,
  onTitleChange,
  onCategoryChange,
  onDescriptionChange,
  onPriceChange,
  onStockChange,
  onSubmit,
  onClose,
  error
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16
      }}
    >
      <form
        onSubmit={onSubmit}
        style={{
          width: "100%",
          maxWidth: 480,
          borderRadius: 12,
          backgroundColor: "#ffffff",
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 10
        }}
      >
        <h2 style={{ margin: 0 }}>{title}</h2>

        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span>Название товара</span>
          <input value={titleValue} onChange={(event) => onTitleChange(event.target.value)} required autoFocus />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span>Категория</span>
          <input value={category} onChange={(event) => onCategoryChange(event.target.value)} required />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span>Описание</span>
          <textarea
            value={description}
            onChange={(event) => onDescriptionChange(event.target.value)}
            required
            style={{ minHeight: 60, resize: "vertical" }}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span>Цена (₽)</span>
          <input
            type="number"
            min="1"
            step="1"
            value={price}
            onChange={(event) => onPriceChange(event.target.value)}
            required
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span>Количество</span>
          <input
            type="number"
            min="0"
            step="1"
            value={stock}
            onChange={(event) => onStockChange(event.target.value)}
            required
          />
        </label>

        {error ? <div style={{ color: "#cf222e" }}>{error}</div> : null}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose}>
            Отмена
          </button>
          <button type="submit">Сохранить</button>
        </div>
      </form>
    </div>
  );
}
