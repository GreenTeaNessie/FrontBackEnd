import axios from "axios";

const apiClient = axios.create({
  baseURL: "http://localhost:3000/api",
  headers: {
    "Content-Type": "application/json",
    accept: "application/json"
  }
});

export const api = {
  createProperty: async (property) => {
    const response = await apiClient.post("/properties", property);
    return response.data;
  },

  getProperties: async () => {
    const response = await apiClient.get("/properties");
    return response.data;
  },

  getPropertyById: async (id) => {
    const response = await apiClient.get(`/properties/${id}`);
    return response.data;
  },

  updateProperty: async (id, property) => {
    const response = await apiClient.patch(`/properties/${id}`, property);
    return response.data;
  },

  deleteProperty: async (id) => {
    await apiClient.delete(`/properties/${id}`);
  }
};
