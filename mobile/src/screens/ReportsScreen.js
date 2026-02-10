import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
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
      const chartColors = ['#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d', '#f87171', '#fca5a5'];
      return {
        name: cat?.name || 'Outros',
        value: total,
        color: chartColors[index % chartColors.length],
        legendFontColor: colors.text,
        legendFontSize: 12,
      };
    });
  };

  const totalIncomes = incomes.reduce((sum, i) => sum + i.value, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.value, 0);
  const balance = totalIncomes - totalExpenses;

  const incomeData = getIncomesByCategory();
  const expenseData = getExpensesByCategory();

  const chartConfig = {
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  };

  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Relatórios</Text>
        <Text style={styles.headerSubtitle}>{formatMonth(month, year)}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <View style={[styles.summaryIcon, { backgroundColor: `${colors.income}20` }]}>
                <Ionicons name="trending-up" size={20} color={colors.income} />
              </View>
              <Text style={styles.summaryLabel}>Receitas</Text>
              <Text style={[styles.summaryValue, { color: colors.income }]}>{formatCurrency(totalIncomes)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <View style={[styles.summaryIcon, { backgroundColor: `${colors.expense}20` }]}>
                <Ionicons name="trending-down" size={20} color={colors.expense} />
              </View>
              <Text style={styles.summaryLabel}>Despesas</Text>
              <Text style={[styles.summaryValue, { color: colors.expense }]}>{formatCurrency(totalExpenses)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <View style={[styles.summaryIcon, { backgroundColor: balance >= 0 ? `${colors.income}20` : `${colors.expense}20` }]}>
                <Ionicons name="wallet" size={20} color={balance >= 0 ? colors.income : colors.expense} />
              </View>
              <Text style={styles.summaryLabel}>Saldo</Text>
              <Text style={[styles.summaryValue, { color: balance >= 0 ? colors.income : colors.expense }]}>{formatCurrency(balance)}</Text>
            </View>
          </View>
        </View>

        {/* Income Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Receitas por Categoria</Text>
          {incomeData.length > 0 ? (
            <>
              <PieChart
                data={incomeData}
                width={screenWidth - 40}
                height={180}
                chartConfig={chartConfig}
                accessor="value"
                backgroundColor="transparent"
                paddingLeft="0"
                absolute
              />
              <View style={styles.legendContainer}>
                {incomeData.map((item, index) => (
                  <View key={index} style={styles.legendItem}>
                    <View style={[styles.legendColor, { backgroundColor: item.color }]} />
                    <Text style={styles.legendText}>{item.name}</Text>
                    <Text style={styles.legendValue}>{formatCurrency(item.value)}</Text>
                    <Text style={styles.legendPercent}>({((item.value / totalIncomes) * 100).toFixed(1)}%)</Text>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <View style={styles.emptyChart}>
              <Ionicons name="pie-chart-outline" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyChartText}>Sem dados de receitas</Text>
            </View>
          )}
        </View>

        {/* Expense Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Despesas por Categoria</Text>
          {expenseData.length > 0 ? (
            <>
              <PieChart
                data={expenseData}
                width={screenWidth - 40}
                height={180}
                chartConfig={chartConfig}
                accessor="value"
                backgroundColor="transparent"
                paddingLeft="0"
                absolute
              />
              <View style={styles.legendContainer}>
                {expenseData.map((item, index) => (
                  <View key={index} style={styles.legendItem}>
                    <View style={[styles.legendColor, { backgroundColor: item.color }]} />
                    <Text style={styles.legendText}>{item.name}</Text>
                    <Text style={styles.legendValue}>{formatCurrency(item.value)}</Text>
                    <Text style={styles.legendPercent}>({((item.value / totalExpenses) * 100).toFixed(1)}%)</Text>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <View style={styles.emptyChart}>
              <Ionicons name="pie-chart-outline" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyChartText}>Sem dados de despesas</Text>
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16, backgroundColor: colors.surface },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: colors.text },
  headerSubtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  summaryCard: { backgroundColor: colors.surface, marginHorizontal: 20, marginTop: 20, borderRadius: 16, padding: 20 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryItem: { alignItems: 'center', flex: 1 },
  summaryIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  summaryLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 4 },
  summaryValue: { fontSize: 14, fontWeight: '700' },
  chartCard: { backgroundColor: colors.surface, marginHorizontal: 20, marginTop: 20, borderRadius: 16, padding: 20 },
  chartTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 16 },
  legendContainer: { marginTop: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  legendColor: { width: 12, height: 12, borderRadius: 3, marginRight: 8 },
  legendText: { flex: 1, fontSize: 13, color: colors.text },
  legendValue: { fontSize: 13, fontWeight: '600', color: colors.text, marginRight: 8 },
  legendPercent: { fontSize: 12, color: colors.textSecondary, width: 50 },
  emptyChart: { alignItems: 'center', paddingVertical: 40 },
  emptyChartText: { fontSize: 14, color: colors.textSecondary, marginTop: 12 },
});
