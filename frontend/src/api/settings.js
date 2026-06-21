import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '';
const axiosInstance = axios.create({ baseURL: API_BASE, timeout: 30000 });
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const fetchSettings = () => axiosInstance.get('/api/settings').then((r) => r.data);
export const updateSetting = (key, value) =>
  axiosInstance.patch(`/api/settings/${key}`, { value }).then((r) => r.data);
