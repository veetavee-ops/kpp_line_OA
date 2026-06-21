import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '';
const axiosInstance = axios.create({ baseURL: API_BASE, timeout: 30000 });
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const fetchLineUsers = () => axiosInstance.get('/api/line-users').then((r) => r.data);
export const toggleLineUserSearch = (userId, canSearch) =>
  axiosInstance.patch(`/api/line-users/${userId}/search-permission`, { canSearch }).then((r) => r.data);
