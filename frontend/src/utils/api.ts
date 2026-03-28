/// <reference types="vite/client" />
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  withCredentials: true
});

// Request interceptor automatically attaching token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle 401 & token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If error is 401 and it's not a retry request and NOT a login request
    const isLoginRequest = originalRequest.url?.includes('/auth/login');
    if (error.response?.status === 401 && !isLoginRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          // Attempt to refresh token using the configured api instance
          const { data } = await api.post('/auth/refresh', {
            refreshToken,
          });
          
          // Store new token and retry
          localStorage.setItem('accessToken', data.accessToken);
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh failed, user needs to login again
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
        }
      } else {
        window.location.href = '/login';
      }
    }
    // [DIAGNOSTIC] Log every error clearly for Logcat
    console.error(`[API ERROR] Status: ${error.response?.status} | URL: ${originalRequest.url} | Message: ${error.message}`);
    if (error.response?.data) {
      console.error(`[API ERROR DATA]`, error.response.data);
    }
    
    return Promise.reject(error);
  }
);

export default api;
