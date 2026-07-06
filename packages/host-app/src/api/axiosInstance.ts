import axios from 'axios';

const baseURL = import.meta.env.VITE_AUTH_API_BASE;

const axiosInstance = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginEndpoint = error.config?.url?.includes('/api/v1/login');

    if (error.response?.status === 401 && !isLoginEndpoint) {
      window.dispatchEvent(new CustomEvent('session:expired'));
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
