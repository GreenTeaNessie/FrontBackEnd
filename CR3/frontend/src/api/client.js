import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:3018/api";
const ACCESS_TOKEN_KEY = "cr3_access_token";
const REFRESH_TOKEN_KEY = "cr3_refresh_token";

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
  async getConfig() {
    const response = await apiClient.get("/config");
    return response.data;
  },

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

  async getProperties() {
    const response = await apiClient.get("/properties");
    return response.data;
  },

  async getPropertyById(id) {
    const response = await apiClient.get(`/properties/${id}`);
    return response.data;
  },

  async createProperty(payload) {
    const response = await apiClient.post("/properties", payload);
    return response.data;
  },

  async updateProperty(id, payload) {
    const response = await apiClient.put(`/properties/${id}`, payload);
    return response.data;
  },

  async deleteProperty(id) {
    await apiClient.delete(`/properties/${id}`);
  },

  async getUsers() {
    const response = await apiClient.get("/users");
    return response.data;
  },

  async getUserById(id) {
    const response = await apiClient.get(`/users/${id}`);
    return response.data;
  },

  async updateUser(id, payload) {
    const response = await apiClient.put(`/users/${id}`, payload);
    return response.data;
  },

  async blockUser(id) {
    const response = await apiClient.delete(`/users/${id}`);
    return response.data;
  },

  async subscribePush(subscription) {
    const response = await apiClient.post("/push/subscribe", subscription);
    return response.data;
  },

  async unsubscribePush(endpoint) {
    const response = await apiClient.post("/push/unsubscribe", { endpoint });
    return response.data;
  },

  async getReminders() {
    const response = await apiClient.get("/reminders");
    return response.data;
  },

  async createReminder(payload) {
    const response = await apiClient.post("/reminders", payload);
    return response.data;
  },

  async deleteReminder(id) {
    await apiClient.delete(`/reminders/${id}`);
  }
};
