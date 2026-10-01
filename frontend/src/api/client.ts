import axios, { AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor to attach JWT Bearer token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('cms_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for unified error formatting
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ detail?: string }>) => {
    let message = 'An unexpected error occurred';
    if (!error.response) {
      message = 'Unable to connect to the server. Please start the backend.';
    } else if (error.response.status === 503) {
      message = error.response.data?.detail || 'Server/database is unavailable.';
    } else if (error.response.status === 401) {
      message = error.response.data?.detail || 'Invalid username or password.';
    } else if (error.response.status === 403) {
      message = error.response.data?.detail || 'Access forbidden. Required role not assigned.';
    } else if (error.response.data?.detail) {
      message = error.response.data.detail;
    }
    console.error(`[API Error] ${error.config?.method?.toUpperCase()} ${error.config?.url}:`, message);
    return Promise.reject(new Error(message));
  }
);

export default apiClient;
