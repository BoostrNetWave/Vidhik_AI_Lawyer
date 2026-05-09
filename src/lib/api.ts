import axios from 'axios';

// Create a central axios instance
const api = axios.create({
  baseURL: typeof window !== 'undefined' ? `${window.location.origin}/lawyer/api` : '/lawyer/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the JWT token in all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('lawyer_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle common errors (like 401 Unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear local storage and redirect to login if unauthorized
      localStorage.removeItem('lawyer_token');
      localStorage.removeItem('lawyer_user');
      window.location.href = '/lawyer/login';
    }
    return Promise.reject(error);
  }
);

export default api;
