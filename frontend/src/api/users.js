import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '';
const axiosInstance = axios.create({ baseURL: API_BASE, timeout: 30000 });
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const fetchUsers = () => axiosInstance.get('/api/users').then((r) => r.data);
export const createUser = (username, password, role = 'user') =>
  axiosInstance.post('/api/users', { username, password, role }).then((r) => r.data);
export const deleteUser = (id) => axiosInstance.delete(`/api/users/${id}`).then((r) => r.data);
export const assignGroupToUser = (userId, groupId) =>
  axiosInstance.post(`/api/users/${userId}/groups`, { groupId }).then((r) => r.data);
export const unassignGroupFromUser = (userId, groupId) =>
  axiosInstance.delete(`/api/users/${userId}/groups/${groupId}`).then((r) => r.data);
