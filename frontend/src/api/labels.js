// labels.js — ฟังก์ชันติดต่อ backend สำหรับ label feature
// ใช้ axiosInstance จาก messages.js เพื่อให้ baseURL และ auth token ถูกต้อง
import axios from 'axios';

// ใช้ baseURL เดียวกับ API อื่นๆ (VITE_API_URL จาก .env)
const API_BASE = import.meta.env.VITE_API_URL || '';

const axiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

// ดึง token จาก localStorage แนบไปกับทุก request
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ดึง label ทั้งหมดจาก backend
export const fetchLabels = () =>
  axiosInstance.get('/api/labels').then((r) => r.data);

// สร้าง label ใหม่
export const createLabel = (name, color) =>
  axiosInstance.post('/api/labels', { name, color }).then((r) => r.data);

// ลบ label ตาม id
export const deleteLabel = (id) =>
  axiosInstance.delete(`/api/labels/${id}`).then((r) => r.data);

// เพิ่มกลุ่มเข้า label
export const assignGroup = (labelId, groupId) =>
  axiosInstance.post(`/api/labels/${labelId}/assign`, { groupId }).then((r) => r.data);

// เอากลุ่มออกจาก label
export const unassignGroup = (labelId, groupId) =>
  axiosInstance.delete(`/api/labels/${labelId}/assign/${groupId}`).then((r) => r.data);
