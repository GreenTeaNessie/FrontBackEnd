import axios from "axios";

const apiClient = axios.create({
  baseURL: "http://localhost:3000/api"
});

export const api = {
  createUser: async (user) => {
    const response = await apiClient.post("/users", user);
    return response.data;
  },
  getUsers: async () => {
    const response = await apiClient.get("/users");
    return response.data;
  },
  getUserById: async (id) => {
    const response = await apiClient.get(`/users/${id}`);
    return response.data;
  },
  updateUser: async (id, user) => {
    const response = await apiClient.patch(`/users/${id}`, user);
    return response.data;
  },
  deleteUser: async (id) => {
    await apiClient.delete(`/users/${id}`);
  }
};
