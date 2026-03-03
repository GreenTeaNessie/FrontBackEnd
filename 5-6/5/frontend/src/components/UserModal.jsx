export default function UserModal({
  isOpen,
  title,
  name,
  age,
  onNameChange,
  onAgeChange,
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
          maxWidth: 420,
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
          <span>Name</span>
          <input value={name} onChange={(event) => onNameChange(event.target.value)} required autoFocus />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span>Age</span>
          <input type="number" min="1" step="1" value={age} onChange={(event) => onAgeChange(event.target.value)} required />
        </label>

        {error ? <div style={{ color: "#cf222e" }}>{error}</div> : null}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit">Save</button>
        </div>
      </form>
    </div>
  );
}
