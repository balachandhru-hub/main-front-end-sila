import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';
const baseURL = import.meta.env.VITE_AUTH_API_BASE;
const apiKey = 'N8qX2LmP7vRa5HdK9sWy4JcTf1AzNgEuXm6BpLr3YvCi0FoMsZaDhUk8QtGeXwPnV';

const axiosInstance = axios.create({
  baseURL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
    ...(apiKey ? { 'X-API-Key': apiKey } : {}),
  },
  withCredentials: true,
});

axiosInstance.interceptors.request.use(
  (config) => {
    const isLoginOrRefresh = config.url?.includes('/login') || config.url?.includes('/refresh-token');
    if (isLoginOrRefresh && config.headers) {
      delete config.headers['X-API-Key'];
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401) {
      const isRefreshTokenRequest = originalRequest?.url?.includes('/refresh-token');
      if (isRefreshTokenRequest) {
        useAuthStore.getState().logout();
        window.dispatchEvent(new CustomEvent('session:expired'));
        return Promise.reject(error);
      }
    }

    // Exclude all auth endpoints (login, send-otp, verify-otp, refresh-token, etc.) from refresh logic
    const isAuthEndpoint = originalRequest?.url?.includes('/api/v1/identity/auth/');
    if (error.response?.status === 401 && !isAuthEndpoint && !originalRequest._retry && !originalRequest?._skipRefresh) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return axiosInstance(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }
      originalRequest._retry = true;
      isRefreshing = true;
      try {
        await axiosInstance.post('/api/v1/identity/auth/refresh-token');
        isRefreshing = false;
        processQueue(null);
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        processQueue(refreshError);
        useAuthStore.getState().logout();
        window.dispatchEvent(new CustomEvent('session:expired'));
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);
export default axiosInstance;
