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
    // Ensure url doesn't start with a slash so it properly appends to baseURL
    if (config.url && config.url.startsWith('/')) {
      config.url = config.url.substring(1);
    }
    
    // Ensure baseURL ends with a slash
    if (config.baseURL && !config.baseURL.endsWith('/')) {
      config.baseURL += '/';
    }

    const token = localStorage.getItem('vidhik_auth_token');
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
      localStorage.removeItem('vidhik_auth_token');
      localStorage.removeItem('vidhik_user_data');
      window.location.href = '/lawyer/login';
    }
    return Promise.reject(error);
  }
);

export default api;
