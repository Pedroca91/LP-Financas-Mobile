import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { PieChart } from 'react-native-chart-kit';
import { useTheme } from '../contexts/ThemeContext';
import { useFinance } from '../contexts/FinanceContext';
import { formatCurrency, formatMonth } from '../utils/formatters';

const screenWidth = Dimensions.get('window').width;

export default function ReportsScreen() {
  const { colors, isDark } = useTheme();
  const { month, year, incomes, expenses, incomeCategories, expenseCategories, fetchIncomes, fetchExpenses, fetchCategories } = useFinance();

  useEffect(() => {
    fetchIncomes();
    fetchExpenses();
    fetchCategories();
  }, [month, year]);

  const getIncomesByCategory = () => {
    const grouped = {};
    incomes.forEach(income => {
      if (!grouped[income.category_id]) grouped[income.category_id] = 0;
      grouped[income.category_id] += income.value;
    });
    return Object.entries(grouped).map(([catId, total], index) => {
      const cat = incomeCategories.find(c => c.id === catId);
      const chartColors = ['#22c55e', '#16a34a', '#15803d', '#166534', '#14532d', '#4ade80', '#86efac'];
      return {
        name: cat?.name || 'Outros',
        value: total,
        color: chartColors[index % chartColors.length],
        legendFontColor: colors.text,
        legendFontSize: 12,
      };
    });
  };

  const getExpensesByCategory = () => {
    const grouped = {};
    expenses.forEach(expense => {
      if (!grouped[expense.category_id]) grouped[expense.category_id] = 0;
      grouped[expense.category_id] += expense.value;
    });
    return Object.entries(grouped).map(([catId, total], index) => {
      const cat = expenseCategories.find(c => c.id === catId);
      const chartColors = ['#c9a66b', '#d4a574', '#b8956b', '#a68a5b', '#947e4b', '#e8c48f', '#f0d4a0'];
      return {
        name: cat?.name || 'Outros',
        value: total,
        color: chartColors[index % chartColors.length],
        legendFontColor: colors.text,
        legendFontSize: 12,
      };
    });
  };

  const totalIncome = incomes.reduce((sum, i) => sum + i.value, 0);
  const totalExpense = expenses.reduce((sum, e) => sum + e.value, 0);
  const balance = totalIncome - totalExpense;

  const incomeData = getIncomesByCategory();
  const expenseData = getExpensesByCategory();

  const styles = createStyles(colors, isDark);

  const chartConfig = {
    color: (opacity = 1) => colors.text,
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <LinearGradient
        colors={[colors.primary, colors.primaryLight]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Relatórios</Text>
        </View>
        <Text style={styles.headerSubtitle}>{formatMonth(month, year)}</Text>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <LinearGradient
              colors={[colors.income, '#16a34a']}
              style={styles.summaryGradient}
            >
              <Ionicons name="trending-up" size={24} color="#fff" />
              <Text style={styles.summaryLabel}>Receitas</Text>
              <Text style={styles.summaryValue}>{formatCurrency(totalIncome)}</Text>
            </LinearGradient>
          </View>

          <View style={styles.summaryCard}>
            <LinearGradient
              colors={[colors.gold, colors.copper]}
              style={styles.summaryGradient}
            >
              <Ionicons name="trending-down" size={24} color="#fff" />
              <Text style={styles.summaryLabel}>Despesas</Text>
              <Text style={styles.summaryValue}>{formatCurrency(totalExpense)}</Text>
            </LinearGradient>
          </View>
        </View>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <LinearGradient
            colors={balance >= 0 ? [colors.income, '#16a34a'] : [colors.expense, '#dc2626']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.balanceGradient}
          >
            <Text style={styles.balanceLabel}>Saldo do Mês</Text>
            <Text style={styles.balanceValue}>{formatCurrency(balance)}</Text>
          </LinearGradient>
        </View>

        {/* Income Chart */}
        {incomeData.length > 0 && (
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Receitas por Categoria</Text>
            <PieChart
              data={incomeData}
              width={screenWidth - 48}
              height={200}
              chartConfig={chartConfig}
              accessor="value"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          </View>
        )}

        {/* Expense Chart */}
        {expenseData.length > 0 && (
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Despesas por Categoria</Text>
            <PieChart
              data={expenseData}
              width={screenWidth - 48}
              height={200}
              chartConfig={chartConfig}
              accessor="value"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          </View>
        )}

        {/* Category Details */}
        <View style={styles.detailsContainer}>
          <Text style={styles.detailsTitle}>Detalhes por Categoria</Text>
          
          {expenseData.map((item, index) => (
            <View key={index} style={styles.detailRow}>
              <View style={styles.detailLeft}>
                <View style={[styles.detailDot, { backgroundColor: item.color }]} />
                <Text style={styles.detailName}>{item.name}</Text>
              </View>
              <Text style={styles.detailValue}>{formatCurrency(item.value)}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const createStyles = (colors, isDark) => StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.background 
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#ffffff' 
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.gold,
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  summaryContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  summaryGradient: {
    padding: 16,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 8,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 4,
  },
  balanceCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  balanceGradient: {
    padding: 20,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  balanceValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 4,
  },
  chartContainer: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  detailsContainer: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  detailName: {
    fontSize: 14,
    color: colors.text,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
});
