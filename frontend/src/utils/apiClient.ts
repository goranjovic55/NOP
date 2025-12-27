import axios from 'axios';
import { setupAxiosRetry } from './axiosRetry';

// Create axios instance with default configuration
const apiClient = axios.create({
  baseURL: '/api/v1',
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Setup retry logic with custom configuration
setupAxiosRetry(apiClient, {
  retries: 3,
  retryDelay: 1000,
  maxRetryDelay: 10000,
  onRetry: (retryCount, error, requestConfig) => {
    // You can add custom logic here, e.g., show a toast notification
    console.warn(`Retrying request (${retryCount}/3):`, requestConfig.url);
  },
});

// Add request interceptor to attach auth token
apiClient.interceptors.request.use(
  (config) => {
    // Get token from localStorage (you can also use a store)
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for global error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle specific error cases
    if (error.response?.status === 401) {
      // Token expired or invalid - redirect to login
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
