import axios from 'axios';

const TOKEN_KEY = 'recallit-token';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
});

let authToken = localStorage.getItem(TOKEN_KEY) || '';

api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

export const setAuthToken = (token) => {
  authToken = token || '';
  if (authToken) {
    localStorage.setItem(TOKEN_KEY, authToken);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
};

export const getStoredAuthToken = () => localStorage.getItem(TOKEN_KEY) || '';

export default api;
