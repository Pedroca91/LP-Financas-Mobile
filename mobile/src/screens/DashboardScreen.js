import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useFinance } from '../contexts/FinanceContext';
import { formatCurrency, formatMonth, getMonthName } from '../utils/formatters';
import { dashboardService } from '../services/api';

const screenWidth = Dimensions.get('window').width;

export default function DashboardScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { month, year, changeMonth, refreshAll } = useFinance();
  
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState(null);
  const [yearlyData, setYearlyData] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [summaryRes, yearlyRes] = await Promise.all([
        dashboardService.getSummary(month, year),
        dashboardService.getYearly(year),
      ]);
      setSummary(summaryRes.data);
      setYearlyData(yearlyRes.data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    }
  }, [month, year]);

  useEffect(() => {
    fetchData();
  }, [month, year, fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    await refreshAll();
    setRefreshing(false);
  }, [fetchData, refreshAll]);

  const navigateMonth = (direction) => {
    let newMonth = month + direction;
    let newYear = year;
    
    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }
    
    changeMonth(newMonth, newYear);
  };

  const balance = (summary?.total_income || 0) - (summary?.total_expenses || 0);

  const styles = createStyles(colors);

  const chartConfig = {
    backgroundColor: colors.surface,
    backgroundGradientFrom: colors.surface,
    backgroundGradientTo: colors.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => colors.primary,
    labelColor: (opacity = 1) => colors.textSecondary,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: colors.primary,
    },
  };

  const getChartData = () => {
    if (!yearlyData?.months || yearlyData.months.length === 0) {
      return {
        labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
        datasets: [{ data: [0, 0, 0, 0, 0, 0] }],
      };
    }

    const labels = yearlyData.months.map(m => getMonthName(m.month));
    const incomeData = yearlyData.months.map(m => m.income || 0);
    const expenseData = yearlyData.months.map(m => m.expenses || 0);

    return {
      labels: labels.slice(-6),
      datasets: [
        {
          data: incomeData.slice(-6).map(v => v || 0),
          color: (opacity = 1) => colors.income,
          strokeWidth: 2,
        },
        {
          data: expenseData.slice(-6).map(v => v || 0),
          color: (opacity = 1) => colors.expense,
          strokeWidth: 2,
        },
      ],
      legend: ['Receitas', 'Despesas'],
    };
  };

  return (
    <View style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Olá, {user?.name?.split(' ')[0]}!</Text>
          <Text style={styles.headerSubtitle}>Bem-vindo ao LP Finanças</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={toggleTheme} style={styles.iconButton}>
            <Ionicons name={isDark ? 'sunny' : 'moon'} size={22} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={logout} style={styles.iconButton}>
            <Ionicons name="log-out-outline" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Month Selector */}
        <View style={styles.monthSelector}>
          <TouchableOpacity onPress={() => navigateMonth(-1)} style={styles.monthButton}>
            <Ionicons name="chevron-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.monthText}>{formatMonth(month, year)}</Text>
          <TouchableOpacity onPress={() => navigateMonth(1)} style={styles.monthButton}>
            <Ionicons name="chevron-forward" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Balance Card */}
        <View style={[styles.balanceCard, { backgroundColor: colors.primary }]}>
          <Text style={styles.balanceLabel}>Saldo do Mês</Text>
          <Text style={styles.balanceValue}>{formatCurrency(balance)}</Text>
        </View>

        {/* Summary Cards */}
        <View style={styles.cardsRow}>
          <View style={[styles.summaryCard, styles.cardHalf]}>
            <View style={[styles.cardIcon, { backgroundColor: `${colors.income}20` }]}>
              <Ionicons name="trending-up" size={24} color={colors.income} />
            </View>
            <Text style={styles.cardLabel}>Receitas</Text>
            <Text style={[styles.cardValue, { color: colors.income }]}>
              {formatCurrency(summary?.total_income || 0)}
            </Text>
          </View>

          <View style={[styles.summaryCard, styles.cardHalf]}>
            <View style={[styles.cardIcon, { backgroundColor: `${colors.expense}20` }]}>
              <Ionicons name="trending-down" size={24} color={colors.expense} />
            </View>
            <Text style={styles.cardLabel}>Despesas</Text>
            <Text style={[styles.cardValue, { color: colors.expense }]}>
              {formatCurrency(summary?.total_expenses || 0)}
            </Text>
          </View>
        </View>

        <View style={styles.cardsRow}>
          <View style={[styles.summaryCard, styles.cardHalf]}>
            <View style={[styles.cardIcon, { backgroundColor: `${colors.investment}20` }]}>
              <Ionicons name="bar-chart" size={24} color={colors.investment} />
            </View>
            <Text style={styles.cardLabel}>Investimentos</Text>
            <Text style={[styles.cardValue, { color: colors.investment }]}>
              {formatCurrency(summary?.total_investments || 0)}
            </Text>
          </View>

          <View style={[styles.summaryCard, styles.cardHalf]}>
            <View style={[styles.cardIcon, { backgroundColor: `${colors.warning}20` }]}>
              <Ionicons name="card" size={24} color={colors.warning} />
            </View>
            <Text style={styles.cardLabel}>Cartões</Text>
            <Text style={[styles.cardValue, { color: colors.warning }]}>
              {formatCurrency(summary?.credit_card_total || 0)}
            </Text>
          </View>
        </View>

        {/* Chart */}
        {yearlyData && yearlyData.months && yearlyData.months.length > 0 && (
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Evolução Anual</Text>
            <LineChart
              data={getChartData()}
              width={screenWidth - 48}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
              withInnerLines={false}
              withOuterLines={false}
            />
          </View>
        )}

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Resumo Rápido</Text>
          
          <View style={styles.statItem}>
            <View style={styles.statLeft}>
              <Ionicons name="checkmark-circle" size={20} color={colors.income} />
              <Text style={styles.statLabel}>Receitas Recebidas</Text>
            </View>
            <Text style={[styles.statValue, { color: colors.income }]}>
              {formatCurrency(summary?.received_income || 0)}
            </Text>
          </View>

          <View style={styles.statItem}>
            <View style={styles.statLeft}>
              <Ionicons name="time" size={20} color={colors.warning} />
              <Text style={styles.statLabel}>Receitas Pendentes</Text>
            </View>
            <Text style={[styles.statValue, { color: colors.warning }]}>
              {formatCurrency(summary?.pending_income || 0)}
            </Text>
          </View>

          <View style={styles.statItem}>
            <View style={styles.statLeft}>
              <Ionicons name="checkmark-circle" size={20} color={colors.expense} />
              <Text style={styles.statLabel}>Despesas Pagas</Text>
            </View>
            <Text style={[styles.statValue, { color: colors.expense }]}>
              {formatCurrency(summary?.paid_expenses || 0)}
            </Text>
          </View>

          <View style={styles.statItem}>
            <View style={styles.statLeft}>
              <Ionicons name="time" size={20} color={colors.warning} />
              <Text style={styles.statLabel}>Despesas Pendentes</Text>
            </View>
            <Text style={[styles.statValue, { color: colors.warning }]}>
              {formatCurrency(summary?.pending_expenses || 0)}
            </Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: colors.surface,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  monthButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  monthText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  balanceCard: {
    marginHorizontal: 20,
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  balanceLabel: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
  },
  balanceValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  cardsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 16,
    gap: 12,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHalf: {
    flex: 1,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  chartContainer: {
    marginTop: 24,
    marginHorizontal: 20,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  chart: {
    borderRadius: 16,
  },
  statsContainer: {
    marginTop: 24,
    marginHorizontal: 20,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  statItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statLabel: {
    fontSize: 14,
    color: colors.text,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
  },
});
