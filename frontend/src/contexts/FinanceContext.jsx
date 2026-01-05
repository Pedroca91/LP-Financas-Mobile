import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { getCurrentMonth, getCurrentYear } from '../lib/utils';

const FinanceContext = createContext(null);

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export function FinanceProvider({ children }) {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [selectedYear, setSelectedYear] = useState(getCurrentYear());
  const [categories, setCategories] = useState([]);
  const [creditCards, setCreditCards] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }, []);

  const fetchCreditCards = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/credit-cards`);
      setCreditCards(response.data);
    } catch (error) {
      console.error('Error fetching credit cards:', error);
    }
  }, []);

  const fetchIncomes = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/incomes`, {
        params: { month: selectedMonth, year: selectedYear }
      });
      setIncomes(response.data);
    } catch (error) {
      console.error('Error fetching incomes:', error);
    }
  }, [selectedMonth, selectedYear]);

  const fetchExpenses = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/expenses`, {
        params: { month: selectedMonth, year: selectedYear }
      });
      setExpenses(response.data);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    }
  }, [selectedMonth, selectedYear]);

  const fetchInvestments = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/investments`, {
        params: { month: selectedMonth, year: selectedYear }
      });
      setInvestments(response.data);
    } catch (error) {
      console.error('Error fetching investments:', error);
    }
  }, [selectedMonth, selectedYear]);

  const fetchBudgets = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/budgets`, {
        params: { month: selectedMonth, year: selectedYear }
      });
      setBudgets(response.data);
    } catch (error) {
      console.error('Error fetching budgets:', error);
    }
  }, [selectedMonth, selectedYear]);

  const fetchSummary = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/dashboard/summary`, {
        params: { month: selectedMonth, year: selectedYear }
      });
      setSummary(response.data);
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  }, [selectedMonth, selectedYear]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchCategories(),
      fetchCreditCards(),
      fetchIncomes(),
      fetchExpenses(),
      fetchInvestments(),
      fetchBudgets(),
      fetchSummary()
    ]);
    setLoading(false);
  }, [fetchCategories, fetchCreditCards, fetchIncomes, fetchExpenses, fetchInvestments, fetchBudgets, fetchSummary]);

  useEffect(() => {
    refreshAll();
  }, [selectedMonth, selectedYear, refreshAll]);

  // CRUD Operations
  const createIncome = async (data) => {
    const response = await axios.post(`${API}/incomes`, data);
    await fetchIncomes();
    await fetchSummary();
    return response.data;
  };

  const updateIncome = async (id, data) => {
    const response = await axios.put(`${API}/incomes/${id}`, data);
    await fetchIncomes();
    await fetchSummary();
    return response.data;
  };

  const deleteIncome = async (id) => {
    await axios.delete(`${API}/incomes/${id}`);
    await fetchIncomes();
    await fetchSummary();
  };

  const createExpense = async (data) => {
    const response = await axios.post(`${API}/expenses`, data);
    await fetchExpenses();
    await fetchSummary();
    return response.data;
  };

  const updateExpense = async (id, data) => {
    const response = await axios.put(`${API}/expenses/${id}`, data);
    await fetchExpenses();
    await fetchSummary();
    return response.data;
  };

  const deleteExpense = async (id) => {
    await axios.delete(`${API}/expenses/${id}`);
    await fetchExpenses();
    await fetchSummary();
  };

  const createInvestment = async (data) => {
    const response = await axios.post(`${API}/investments`, data);
    await fetchInvestments();
    await fetchSummary();
    return response.data;
  };

  const updateInvestment = async (id, data) => {
    const response = await axios.put(`${API}/investments/${id}`, data);
    await fetchInvestments();
    await fetchSummary();
    return response.data;
  };

  const deleteInvestment = async (id) => {
    await axios.delete(`${API}/investments/${id}`);
    await fetchInvestments();
    await fetchSummary();
  };

  const createCategory = async (data) => {
    const response = await axios.post(`${API}/categories`, data);
    await fetchCategories();
    return response.data;
  };

  const updateCategory = async (id, data) => {
    const response = await axios.put(`${API}/categories/${id}`, data);
    await fetchCategories();
    return response.data;
  };

  const deleteCategory = async (id) => {
    await axios.delete(`${API}/categories/${id}`);
    await fetchCategories();
  };

  const createCreditCard = async (data) => {
    const response = await axios.post(`${API}/credit-cards`, data);
    await fetchCreditCards();
    return response.data;
  };

  const updateCreditCard = async (id, data) => {
    const response = await axios.put(`${API}/credit-cards/${id}`, data);
    await fetchCreditCards();
    return response.data;
  };

  const deleteCreditCard = async (id) => {
    await axios.delete(`${API}/credit-cards/${id}`);
    await fetchCreditCards();
  };

  const createBudget = async (data) => {
    const response = await axios.post(`${API}/budgets`, data);
    await fetchBudgets();
    return response.data;
  };

  const incomeCategories = categories.filter(c => c.type === 'income');
  const expenseCategories = categories.filter(c => c.type === 'expense');
  const investmentCategories = categories.filter(c => c.type === 'investment');

  return (
    <FinanceContext.Provider value={{
      selectedMonth,
      setSelectedMonth,
      selectedYear,
      setSelectedYear,
      categories,
      incomeCategories,
      expenseCategories,
      investmentCategories,
      creditCards,
      incomes,
      expenses,
      investments,
      budgets,
      summary,
      loading,
      refreshAll,
      createIncome,
      updateIncome,
      deleteIncome,
      createExpense,
      updateExpense,
      deleteExpense,
      createInvestment,
      updateInvestment,
      deleteInvestment,
      createCategory,
      updateCategory,
      deleteCategory,
      createCreditCard,
      updateCreditCard,
      deleteCreditCard,
      createBudget
    }}>
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
}
