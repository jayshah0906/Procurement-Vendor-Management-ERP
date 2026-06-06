import axios from 'axios';
import { env } from '../config/env';

/**
 * Pre-configured Axios instance for all API calls.
 */
const client = axios.create({
  baseURL: env.API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Simulate timeout for realistic mock delay during dev if no backend is present
  timeout: 10000, 
});

// Request Interceptor: Automatically inject JWT from local storage
client.interceptors.request.use(
  (config) => {
    // In a real app, you might use Zustand to get this, but localStorage is safe here
    // as we avoid cyclical dependencies between axios and zustand.
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401s (e.g., attempt refresh token or logout)
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      // Handle refresh token logic here in the future
      console.warn('Unauthorized: Logging out or refreshing token...');
      
      // Example clear action
      // localStorage.removeItem('accessToken');
      // window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default client;
