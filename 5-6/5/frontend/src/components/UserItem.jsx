export default function UserItem({ user, onEdit, onDelete }) {
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
      <span>
        {user.name} ({user.age})
      </span>
      <span style={{ display: "flex", gap: 8 }}>
        <button type="button" onClick={() => onEdit(user)}>
          Edit
        </button>
        <button type="button" onClick={() => onDelete(user.id)}>
          Delete
        </button>
      </span>
    </li>
  );
}
