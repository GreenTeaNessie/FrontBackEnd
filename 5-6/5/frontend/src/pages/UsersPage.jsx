import { useEffect, useState } from "react";
import { api } from "../api";
import UserItem from "../components/UserItem";
import UserModal from "../components/UserModal";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await api.getUsers();
      setUsers(response);
    } catch (requestError) {
      console.error(requestError);
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const openCreateModal = () => {
    setName("");
    setAge("");
    setEditingId(null);
    setError("");
    setIsModalOpen(true);
  };

  const openEditModal = (user) => {
    setName(user.name);
    setAge(String(user.age));
    setEditingId(user.id);
    setError("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setName("");
    setAge("");
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedName = name.trim();
    const parsedAge = Number(age);

    if (!trimmedName || !Number.isInteger(parsedAge) || parsedAge <= 0) {
      setError("Name and positive integer age are required");
      return;
    }

    try {
      setError("");
      if (editingId) {
        await api.updateUser(editingId, { name: trimmedName, age: parsedAge });
      } else {
        await api.createUser({ name: trimmedName, age: parsedAge });
      }

      closeModal();
      await loadUsers();
    } catch (requestError) {
      console.error(requestError);
      setError("Failed to save user");
    }
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm("Delete this user?");
    if (!confirmed) {
      return;
    }

    try {
      setError("");
      await api.deleteUser(id);
      await loadUsers();
    } catch (requestError) {
      console.error(requestError);
      setError("Failed to delete user");
    }
  };

  return (
    <main
      style={{
        maxWidth: 720,
        margin: "24px auto",
        padding: "0 12px",
        fontFamily: "Segoe UI, sans-serif"
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16
        }}
      >
        <h1 style={{ margin: 0 }}>Users</h1>
        <button type="button" onClick={openCreateModal}>
          Add user
        </button>
      </header>

      {loading ? <div>Loading...</div> : null}

      {!loading && users.length === 0 ? <div>No users yet</div> : null}

      {!loading && users.length > 0 ? (
        <ul style={{ padding: 0, listStyle: "none", margin: 0 }}>
          {users.map((user) => (
            <UserItem key={user.id} user={user} onEdit={openEditModal} onDelete={handleDelete} />
          ))}
        </ul>
      ) : null}

      <UserModal
        isOpen={isModalOpen}
        title={editingId ? "Edit user" : "Create user"}
        name={name}
        age={age}
        onNameChange={setName}
        onAgeChange={setAge}
        onSubmit={handleSubmit}
        onClose={closeModal}
        error={error}
      />

      {!isModalOpen && error ? <div style={{ marginTop: 12, color: "#cf222e" }}>{error}</div> : null}
    </main>
  );
}
