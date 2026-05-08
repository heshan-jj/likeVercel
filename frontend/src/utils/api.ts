/// <reference types="vite/client" />
import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL,
  withCredentials: true,
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
    
    // If error is 401 and it's not a retry request and NOT an unlock request
    const isUnlockRequest = originalRequest.url?.includes('/auth/unlock');
    if (error.response?.status === 401 && !isUnlockRequest && !originalRequest._retry) {
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
        } catch {
          // Refresh failed, user needs to login again
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          if (window.location.pathname !== '/unlock' && window.location.pathname !== '/onboarding') {
            window.location.href = '/unlock';
          }
        }
      } else {
        if (window.location.pathname !== '/unlock' && window.location.pathname !== '/onboarding') {
          window.location.href = '/unlock';
        }
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
