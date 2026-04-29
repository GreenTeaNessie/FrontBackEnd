import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:3000/api";
const ACCESS_TOKEN_KEY = "practice_9_10_access_token";
const REFRESH_TOKEN_KEY = "practice_9_10_refresh_token";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    accept: "application/json"
  }
});

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    accept: "application/json"
  }
});

export function getAccessToken() {
  return window.localStorage.getItem(ACCESS_TOKEN_KEY) || "";
}

export function getRefreshToken() {
  return window.localStorage.getItem(REFRESH_TOKEN_KEY) || "";
}

export function setTokens({ accessToken, refreshToken }) {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens() {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}

function notifySessionExpired() {
  window.dispatchEvent(new Event("auth:expired"));
}

apiClient.interceptors.request.use((config) => {
  const accessToken = getAccessToken();

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const refreshToken = getRefreshToken();
    const status = error.response?.status;
    const isRefreshRequest = originalRequest?.url?.includes("/auth/refresh");

    if (status !== 401 || originalRequest?._retry || isRefreshRequest) {
      return Promise.reject(error);
    }

    if (!refreshToken) {
      clearTokens();
      notifySessionExpired();
      return Promise.reject(error);
    }

    try {
      originalRequest._retry = true;

      const response = await refreshClient.post(
        "/auth/refresh",
        { refreshToken },
        {
          headers: {
            "x-refresh-token": refreshToken
          }
        }
      );

      setTokens(response.data);
      originalRequest.headers.Authorization = `Bearer ${response.data.accessToken}`;

      return apiClient(originalRequest);
    } catch (refreshError) {
      clearTokens();
      notifySessionExpired();
      return Promise.reject(refreshError);
    }
  }
);

export const api = {
  async register(payload) {
    const response = await apiClient.post("/auth/register", payload);
    return response.data;
  },

  async login(payload) {
    const response = await apiClient.post("/auth/login", payload);
    setTokens(response.data);
    return response.data;
  },

  async getMe() {
    const response = await apiClient.get("/auth/me");
    return response.data;
  },

  async getProducts() {
    const response = await apiClient.get("/products");
    return response.data;
  },

  async getProductById(id) {
    const response = await apiClient.get(`/products/${id}`);
    return response.data;
  },

  async createProduct(payload) {
    const response = await apiClient.post("/products", payload);
    return response.data;
  },

  async updateProduct(id, payload) {
    const response = await apiClient.put(`/products/${id}`, payload);
    return response.data;
  },

  async deleteProduct(id) {
    await apiClient.delete(`/products/${id}`);
  }
};
