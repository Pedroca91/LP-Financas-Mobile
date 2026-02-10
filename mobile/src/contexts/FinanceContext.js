import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  dashboardService,
  incomeService,
  expenseService,
  categoryService,
  creditCardService,
  investmentService,
  analyticsService,
} from '../services/api';

const FinanceContext = createContext();

export const FinanceProvider = ({ children }) => {
  const currentDate = new Date();
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [year, setYear] = useState(currentDate.getFullYear());
  
  const [summary, setSummary] = useState(null);
  const [incomes, setIncomes] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [creditCards, setCreditCards] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchSummary = useCallback(async () => {
    try {
      const response = await dashboardService.getSummary(month, year);
      setSummary(response.data);
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  }, [month, year]);

  const fetchIncomes = useCallback(async () => {
    try {
      const response = await incomeService.getAll(month, year);
      setIncomes(response.data);
    } catch (error) {
      console.error('Error fetching incomes:', error);
    }
  }, [month, year]);

  const fetchExpenses = useCallback(async () => {
    try {
      const response = await expenseService.getAll(month, year);
      setExpenses(response.data);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    }
  }, [month, year]);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await categoryService.getAll();
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }, []);

  const fetchCreditCards = useCallback(async () => {
    try {
      const response = await creditCardService.getAll();
      setCreditCards(response.data);
    } catch (error) {
      console.error('Error fetching credit cards:', error);
    }
  }, []);

  const fetchInvestments = useCallback(async () => {
    try {
      const response = await investmentService.getAll(month, year);
      setInvestments(response.data);
    } catch (error) {
      console.error('Error fetching investments:', error);
    }
  }, [month, year]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchSummary(),
        fetchIncomes(),
        fetchExpenses(),
        fetchCategories(),
        fetchCreditCards(),
        fetchInvestments(),
      ]);
    } finally {
      setLoading(false);
    }
  }, [fetchSummary, fetchIncomes, fetchExpenses, fetchCategories, fetchCreditCards, fetchInvestments]);

  const changeMonth = (newMonth, newYear) => {
    setMonth(newMonth);
    setYear(newYear);
  };

  const incomeCategories = categories.filter(c => c.type === 'income');
  const expenseCategories = categories.filter(c => c.type === 'expense');
  const investmentCategories = categories.filter(c => c.type === 'investment');

  return (
    <FinanceContext.Provider
      value={{
        month,
        year,
        changeMonth,
        summary,
        incomes,
        expenses,
        categories,
        incomeCategories,
        expenseCategories,
        investmentCategories,
        creditCards,
        investments,
        loading,
        fetchSummary,
        fetchIncomes,
        fetchExpenses,
        fetchCategories,
        fetchCreditCards,
        fetchInvestments,
        refreshAll,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within FinanceProvider');
  }
  return context;
};
