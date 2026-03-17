import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || '';

let _getToken = null;

export function setTokenGetter(fn) {
  _getToken = fn;
}

const api = axios.create({ baseURL: BASE });

api.interceptors.request.use(async (config) => {
  if (_getToken) {
    const token = await _getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Users
export const getMe       = () => api.get('/api/users/me').then(r => r.data);
export const postHousehold = (body) => api.post('/api/users/household', body).then(r => r.data);

// Dashboard
export const getDashboard = (params) => api.get('/api/dashboard/summary', { params }).then(r => r.data);
export const getCompare   = (params) => api.get('/api/dashboard/compare', { params }).then(r => r.data);

// Expenses
export const getExpenses    = (params) => api.get('/api/expenses', { params }).then(r => r.data);
export const createExpense  = (body)   => api.post('/api/expenses', body).then(r => r.data);
export const updateExpense  = (id, body) => api.put(`/api/expenses/${id}`, body).then(r => r.data);
export const deleteExpense  = (id)     => api.delete(`/api/expenses/${id}`);

// Income
export const getIncome      = (params) => api.get('/api/income', { params }).then(r => r.data);
export const createIncome   = (body)   => api.post('/api/income', body).then(r => r.data);
export const updateIncome   = (id, body) => api.put(`/api/income/${id}`, body).then(r => r.data);
export const deleteIncome   = (id)     => api.delete(`/api/income/${id}`);

// Budget
export const getBudget      = () => api.get('/api/budget').then(r => r.data);
export const getBudgetActuals = (params) => api.get('/api/budget/actuals', { params }).then(r => r.data);
export const upsertBudget   = (category, body) => api.put(`/api/budget/${encodeURIComponent(category)}`, body).then(r => r.data);

// Import
export const previewImport  = (formData) => api.post('/api/import/preview', formData).then(r => r.data);
export const confirmImport  = (formData) => api.post('/api/import/confirm', formData).then(r => r.data);

export default api;
