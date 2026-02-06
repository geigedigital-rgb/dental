import axios from 'axios';

// Локально: прокси Vite на localhost:3001, baseURL /api. На деплое: VITE_API_URL (полный URL бэкенда).
const baseURL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api`
  : '/api';

const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

export default api;

export const materialTypesApi = {
  list: (params?: { parentId?: string; archived?: string }) =>
    api.get('/material-types', { params }).then((r) => r.data),
  get: (id: string) => api.get(`/material-types/${id}`).then((r) => r.data),
  create: (data: any) => api.post('/material-types', data).then((r) => r.data),
  update: (id: string, data: any) => api.patch(`/material-types/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/material-types/${id}`).then((r) => r.data),
};

export const materialsApi = {
  list: (params?: { archived?: string; materialTypeId?: string; search?: string }) =>
    api.get('/materials', { params }).then((r) => r.data),
  get: (id: string) => api.get(`/materials/${id}`).then((r) => r.data),
  create: (data: any) => api.post('/materials', data).then((r) => r.data),
  update: (id: string, data: any) => api.patch(`/materials/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/materials/${id}`).then((r) => r.data),
};

export const suppliersApi = {
  list: () => api.get('/suppliers').then((r) => r.data),
  get: (id: string) => api.get(`/suppliers/${id}`).then((r) => r.data),
  create: (data: any) => api.post('/suppliers', data).then((r) => r.data),
  update: (id: string, data: any) => api.patch(`/suppliers/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/suppliers/${id}`).then((r) => r.data),
};

export const stockApi = {
  createEntry: (data: any) => api.post('/stock/entries', data).then((r) => r.data),
  getEntries: (params?: { from?: string; to?: string; supplierId?: string }) =>
    api.get('/stock/entries', { params }).then((r) => r.data),
  getEntry: (id: string) => api.get(`/stock/entries/${id}`).then((r) => r.data),
  updateEntry: (id: string, data: any) => api.patch(`/stock/entries/${id}`, data).then((r) => r.data),
  deleteEntry: (id: string) => api.delete(`/stock/entries/${id}`).then((r) => r.data),
  createWriteOff: (data: any) => api.post('/stock/write-offs', data).then((r) => r.data),
  getWriteOffs: (params?: { from?: string; to?: string; materialId?: string }) =>
    api.get('/stock/write-offs', { params }).then((r) => r.data),
  getWriteOff: (id: string) => api.get(`/stock/write-offs/${id}`).then((r) => r.data),
  updateWriteOff: (id: string, data: any) => api.patch(`/stock/write-offs/${id}`, data).then((r) => r.data),
  deleteWriteOff: (id: string) => api.delete(`/stock/write-offs/${id}`).then((r) => r.data),
  getMovements: (params?: { materialId?: string; from?: string; to?: string; limit?: number }) =>
    api.get('/stock/movements', { params }).then((r) => r.data),
  getInventoryWithLots: () => api.get('/stock/inventory-with-lots').then((r) => r.data),
  getLotsByMaterial: (materialId: string) =>
    api.get(`/stock/materials/${materialId}/lots`).then((r) => r.data),
};

export const servicesApi = {
  list: () => api.get('/services').then((r) => r.data),
  get: (id: string) => api.get(`/services/${id}`).then((r) => r.data),
  getCost: (id: string) => api.get(`/services/${id}/cost`).then((r) => r.data),
  create: (data: any) => api.post('/services', data).then((r) => r.data),
  update: (id: string, data: any) => api.patch(`/services/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/services/${id}`).then((r) => r.data),
};

export const salesApi = {
  createServiceSale: (data: any) => api.post('/sales/service', data).then((r) => r.data),
  getServiceSales: (params?: { from?: string; to?: string; serviceId?: string }) =>
    api.get('/sales/service', { params }).then((r) => r.data),
  getServiceSale: (id: string) => api.get(`/sales/service/${id}`).then((r) => r.data),
  updateServiceSale: (id: string, data: { note?: string; saleDate?: string; totalPrice?: number; laborAmount?: number }) =>
    api.patch(`/sales/service/${id}`, data).then((r) => r.data),
  deleteServiceSale: (id: string) => api.delete(`/sales/service/${id}`).then((r) => r.data),
};

export const reportsApi = {
  profitByPeriod: (from: string, to: string) =>
    api.get('/reports/profit-by-period', { params: { from, to } }).then((r) => r.data),
  materialConsumption: (from: string, to: string) =>
    api.get('/reports/material-consumption', { params: { from, to } }).then((r) => r.data),
  serviceProfitability: (from: string, to: string) =>
    api.get('/reports/service-profitability', { params: { from, to } }).then((r) => r.data),
  inventoryBalance: () => api.get('/reports/inventory-balance').then((r) => r.data),
  lowStockAlerts: () => api.get('/reports/low-stock-alerts').then((r) => r.data),
  warehouseDashboard: () => api.get('/reports/warehouse-dashboard').then((r) => r.data),
  marginAnalysis: (from: string, to: string) =>
    api.get('/reports/margin-analysis', { params: { from, to } }).then((r) => r.data),
  cashflow: (from: string, to: string, groupBy?: 'day' | 'week' | 'month') =>
    api.get('/reports/cashflow', { params: { from, to, groupBy } }).then((r) => r.data),
  pl: (from: string, to: string) =>
    api.get('/reports/pl', { params: { from, to } }).then((r) => r.data),
  revenueMarginDaily: (from: string, to: string) =>
    api.get('/reports/revenue-margin-daily', { params: { from, to } }).then((r) => r.data),
  operationLog: (params?: { from?: string; to?: string; limit?: number; entityType?: string; entityId?: string }) =>
    api.get('/reports/operation-log', { params }).then((r) => r.data),
};

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then((r) => r.data),
};

export type InventorySettings = {
  writeOffMethod: 'FIFO' | 'AVERAGE';
  lotTracking: boolean;
  expiryRule: 'FEFO' | 'NONE';
};

export const settingsApi = {
  getInventory: () => api.get<InventorySettings>('/settings/inventory').then((r) => r.data),
  patchInventory: (data: Partial<InventorySettings>) =>
    api.patch<InventorySettings>('/settings/inventory', data).then((r) => r.data),
};
