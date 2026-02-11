import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// URL do backend - ajuste conforme necessário
const API_URL = 'https://finance-offline-4.preview.emergentagent.com/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para tratar erros
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('token');
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth
export const authService = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (name, email, password) => api.post('/auth/register', { name, email, password }),
  getMe: () => api.get('/auth/me'),
};

// Dashboard
export const dashboardService = {
  getSummary: (month, year) => api.get(`/dashboard/summary?month=${month}&year=${year}`),
  getYearly: (year) => api.get(`/dashboard/yearly?year=${year}`),
};

// Analytics
export const analyticsService = {
  getHighlights: (month, year) => api.get(`/analytics/highlights?month=${month}&year=${year}`),
  getForecast: (month, year) => api.get(`/analytics/forecast?month=${month}&year=${year}`),
  getComparison: (month, year) => api.get(`/analytics/comparison?month=${month}&year=${year}`),
};

// Incomes
export const incomeService = {
  getAll: (month, year) => api.get(`/incomes?month=${month}&year=${year}`),
  create: (data) => api.post('/incomes', data),
  update: (id, data) => api.put(`/incomes/${id}`, data),
  delete: (id) => api.delete(`/incomes/${id}`),
};

// Expenses
export const expenseService = {
  getAll: (month, year) => api.get(`/expenses?month=${month}&year=${year}`),
  create: (data) => api.post('/expenses', data),
  update: (id, data) => api.put(`/expenses/${id}`, data),
  delete: (id) => api.delete(`/expenses/${id}`),
};

// Categories
export const categoryService = {
  getAll: () => api.get('/categories'),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
};

// Credit Cards
export const creditCardService = {
  getAll: () => api.get('/credit-cards'),
  create: (data) => api.post('/credit-cards', data),
  update: (id, data) => api.put(`/credit-cards/${id}`, data),
  delete: (id) => api.delete(`/credit-cards/${id}`),
  getSummary: () => api.get('/credit-cards/summary'),
};

// Investments
export const investmentService = {
  getAll: (month, year) => api.get(`/investments?month=${month}&year=${year}`),
  create: (data) => api.post('/investments', data),
  update: (id, data) => api.put(`/investments/${id}`, data),
  delete: (id) => api.delete(`/investments/${id}`),
};

// Alerts
export const alertService = {
  getBudgetAlerts: (month, year) => api.get(`/alerts/budget?month=${month}&year=${year}`),
  getDueDateAlerts: () => api.get('/alerts/due-dates'),
};
