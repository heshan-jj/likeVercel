/// <reference types="vite/client" />
import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL,
  withCredentials: true,
});

// Response interceptor to handle 401 & token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const isUnlockRequest = originalRequest.url?.includes('/auth/unlock');
      const isRefreshRequest = originalRequest.url?.includes('/auth/refresh');

      if (!isUnlockRequest && !isRefreshRequest) {
        try {
          await api.post('/auth/refresh');
          return api(originalRequest);
        } catch {
          if (window.location.pathname !== '/unlock' && window.location.pathname !== '/onboarding') {
            window.location.href = '/unlock';
          }
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;
