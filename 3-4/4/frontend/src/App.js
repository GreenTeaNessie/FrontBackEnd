import { useEffect, useState } from "react";
import axios from "axios";

const apiClient = axios.create({
  baseURL: "http://localhost:3000/api",
  headers: {
    "Content-Type": "application/json",
    accept: "application/json"
  }
});

export default function App() {
  const [users, setUsers] = useState([]);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get("/users");
      setUsers(response.data);
    } catch (error) {
      console.error(error);
      alert("Ошибка запроса");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedName = name.trim();
    const parsedAge = Number(age);

    if (!trimmedName || !Number.isFinite(parsedAge)) {
      alert("Имя и возраст обязательны");
      return;
    }

    try {
      if (editingId) {
        await apiClient.patch(`/users/${editingId}`, { name: trimmedName, age: parsedAge });
      } else {
        await apiClient.post("/users", { name: trimmedName, age: parsedAge });
      }

      setName("");
      setAge("");
      setEditingId(null);
      await loadUsers();
    } catch (error) {
      console.error(error);
      alert("Ошибка запроса");
    }
  };

  const handleEdit = (user) => {
    setEditingId(user.id);
    setName(user.name);
    setAge(String(user.age));
  };

  const handleDelete = async (id) => {
    try {
      await apiClient.delete(`/users/${id}`);
      await loadUsers();
    } catch (error) {
      console.error(error);
      alert("Ошибка запроса");
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setName("");
    setAge("");
  };

  return (
    <main style={{ maxWidth: 640, margin: "20px auto", fontFamily: "Arial, sans-serif" }}>
      <h1>Users App</h1>

      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          placeholder="Name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <input
          placeholder="Age"
          value={age}
          onChange={(event) => setAge(event.target.value)}
        />
        <button type="submit">{editingId ? "Update" : "Create"}</button>
        {editingId && (
          <button type="button" onClick={handleCancel}>
            Cancel
          </button>
        )}
      </form>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <ul>
          {users.map((user) => (
            <li key={user.id} style={{ marginBottom: 8 }}>
              {user.name} ({user.age})
              <button style={{ marginLeft: 8 }} onClick={() => handleEdit(user)}>
                Edit
              </button>
              <button style={{ marginLeft: 8 }} onClick={() => handleDelete(user.id)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
