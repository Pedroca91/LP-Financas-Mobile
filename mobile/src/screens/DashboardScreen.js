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
import { dashboardService, analyticsService, alertService } from '../services/api';

const screenWidth = Dimensions.get('window').width;

export default function DashboardScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { month, year, changeMonth, refreshAll } = useFinance();
  
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState(null);
  const [yearlyData, setYearlyData] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [highlights, setHighlights] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [showAlerts, setShowAlerts] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [summaryRes, yearlyRes] = await Promise.all([
        dashboardService.getSummary(month, year),
        dashboardService.getYearly(year),
      ]);
      setSummary(summaryRes.data);
      setYearlyData(yearlyRes.data);

      // Fetch alerts
      try {
        const alertsRes = await alertService.getDueDateAlerts();
        setAlerts(alertsRes.data || []);
      } catch (e) {
        console.log('Alerts not available');
      }

      // Fetch analytics
      try {
        const [highlightsRes, forecastRes, comparisonRes] = await Promise.all([
          analyticsService.getHighlights(month, year),
          analyticsService.getForecast(month, year),
          analyticsService.getComparison(month, year),
        ]);
        setHighlights(highlightsRes.data);
        setForecast(forecastRes.data);
        setComparison(comparisonRes.data);
      } catch (e) {
        console.log('Analytics not available');
      }
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

  const dismissAlert = (index) => {
    setAlerts(prev => prev.filter((_, i) => i !== index));
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

  const formatPercentage = (value) => {
    if (!value && value !== 0) return '0%';
    const prefix = value > 0 ? '+' : '';
    return `${prefix}${value.toFixed(1)}%`;
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

        {/* Alerts Section */}
        {alerts.length > 0 && showAlerts && (
          <View style={styles.alertsContainer}>
            <TouchableOpacity style={styles.alertsHeader} onPress={() => setShowAlerts(!showAlerts)}>
              <View style={styles.alertsHeaderLeft}>
                <Ionicons name="warning" size={20} color={colors.warning} />
                <Text style={styles.alertsTitle}>Alertas ({alerts.length})</Text>
              </View>
              <Ionicons name={showAlerts ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            
            {alerts.slice(0, 5).map((alert, index) => (
              <View 
                key={index} 
                style={[
                  styles.alertItem, 
                  { borderLeftColor: alert.days_until <= 1 ? colors.expense : colors.warning }
                ]}
              >
                <View style={styles.alertContent}>
                  <View style={styles.alertIconContainer}>
                    <Ionicons 
                      name={alert.days_until <= 1 ? 'alert-circle' : 'time'} 
                      size={18} 
                      color={alert.days_until <= 1 ? colors.expense : colors.warning} 
                    />
                  </View>
                  <View style={styles.alertInfo}>
                    <Text style={[styles.alertText, { color: alert.days_until <= 1 ? colors.expense : colors.warning }]}>
                      {alert.description || alert.category} vence em {alert.days_until} dia(s)
                    </Text>
                    <Text style={styles.alertValue}>Valor: {formatCurrency(alert.value)}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => dismissAlert(index)} style={styles.alertDismiss}>
                  <Ionicons name="close" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

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

        {/* Análise Avançada */}
        <View style={styles.sectionHeader}>
          <Ionicons name="analytics" size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>Análise Avançada</Text>
        </View>

        {/* Highlights - Maior Receita e Despesa */}
        {highlights && (
          <View style={styles.cardsRow}>
            <View style={[styles.highlightCard, { borderLeftColor: colors.income }]}>
              <View style={styles.highlightHeader}>
                <Ionicons name="arrow-down" size={14} color={colors.income} />
                <Text style={styles.highlightLabel}>Maior Receita do Mês</Text>
              </View>
              <Text style={[styles.highlightValue, { color: colors.income }]}>
                {formatCurrency(highlights.highest_income?.value || 0)}
              </Text>
              <Text style={styles.highlightDesc}>{highlights.highest_income?.category || 'N/A'}</Text>
              <Text style={styles.highlightSubDesc}>{highlights.highest_income?.description || 'Sem descrição'}</Text>
            </View>

            <View style={[styles.highlightCard, { borderLeftColor: colors.expense }]}>
              <View style={styles.highlightHeader}>
                <Ionicons name="arrow-up" size={14} color={colors.expense} />
                <Text style={styles.highlightLabel}>Maior Despesa do Mês</Text>
              </View>
              <Text style={[styles.highlightValue, { color: colors.expense }]}>
                {formatCurrency(highlights.highest_expense?.value || 0)}
              </Text>
              <Text style={styles.highlightDesc}>{highlights.highest_expense?.category || 'N/A'}</Text>
              <Text style={styles.highlightSubDesc}>{highlights.highest_expense?.description || 'Sem descrição'}</Text>
            </View>
          </View>
        )}

        {/* Previsão de Saldo */}
        {forecast && (
          <View style={styles.forecastCard}>
            <View style={styles.forecastHeader}>
              <Ionicons name="eye" size={18} color={colors.primary} />
              <Text style={styles.forecastTitle}>Previsão de Saldo</Text>
            </View>
            
            <Text style={styles.forecastSubtitle}>Saldo previsto fim do mês</Text>
            <Text style={[styles.forecastValue, { color: (forecast.predicted_balance || 0) >= 0 ? colors.income : colors.expense }]}>
              {formatCurrency(forecast.predicted_balance || 0)}
            </Text>

            <View style={styles.forecastDetails}>
              <View style={styles.forecastRow}>
                <Text style={styles.forecastLabel}>Saldo atual:</Text>
                <Text style={styles.forecastAmount}>{formatCurrency(forecast.current_balance || 0)}</Text>
              </View>
              <View style={styles.forecastRow}>
                <Text style={styles.forecastLabel}>Receitas pendentes:</Text>
                <Text style={[styles.forecastAmount, { color: colors.income }]}>+{formatCurrency(forecast.pending_income || 0)}</Text>
              </View>
              <View style={styles.forecastRow}>
                <Text style={styles.forecastLabel}>Despesas pendentes:</Text>
                <Text style={[styles.forecastAmount, { color: colors.expense }]}>-{formatCurrency(forecast.pending_expenses || 0)}</Text>
              </View>
            </View>

            {forecast.next_months && forecast.next_months.length > 0 && (
              <>
                <View style={styles.forecastDivider} />
                <Text style={styles.forecastSubtitle}>Próximos 3 meses (baseado em média)</Text>
                {forecast.next_months.map((m, i) => (
                  <View key={i} style={styles.forecastRow}>
                    <Text style={styles.forecastLabel}>{m.month}/{m.year}:</Text>
                    <Text style={[styles.forecastAmount, { color: colors.primary }]}>{formatCurrency(m.predicted || 0)}</Text>
                  </View>
                ))}
              </>
            )}
          </View>
        )}

        {/* Comparativo */}
        {comparison && (
          <View style={styles.comparisonCard}>
            <View style={styles.comparisonHeader}>
              <Ionicons name="swap-horizontal" size={18} color={colors.secondary} />
              <Text style={styles.comparisonTitle}>Comparativo</Text>
            </View>

            {/* vs Mês Anterior */}
            <Text style={styles.comparisonSubtitle}>vs Mês Anterior</Text>
            <View style={styles.comparisonRow}>
              <Text style={styles.comparisonLabel}>Receitas</Text>
              <Text style={[styles.comparisonPercent, { color: (comparison.vs_last_month?.income_change || 0) >= 0 ? colors.income : colors.expense }]}>
                {(comparison.vs_last_month?.income_change || 0) >= 0 ? '↗' : '↘'} {formatPercentage(comparison.vs_last_month?.income_change)}
              </Text>
            </View>
            <View style={styles.comparisonRow}>
              <Text style={styles.comparisonLabel}>Despesas</Text>
              <Text style={[styles.comparisonPercent, { color: (comparison.vs_last_month?.expense_change || 0) <= 0 ? colors.income : colors.expense }]}>
                {(comparison.vs_last_month?.expense_change || 0) >= 0 ? '↗' : '↘'} {formatPercentage(comparison.vs_last_month?.expense_change)}
              </Text>
            </View>
            <View style={styles.comparisonRow}>
              <Text style={styles.comparisonLabel}>Saldo</Text>
              <Text style={[styles.comparisonPercent, { color: (comparison.vs_last_month?.balance_change || 0) >= 0 ? colors.income : colors.expense }]}>
                {(comparison.vs_last_month?.balance_change || 0) >= 0 ? '↗' : '↘'} {formatPercentage(comparison.vs_last_month?.balance_change)}
              </Text>
            </View>

            {/* vs Mesmo Mês Ano Anterior */}
            <Text style={[styles.comparisonSubtitle, { marginTop: 16 }]}>vs Mesmo Mês Ano Anterior</Text>
            <View style={styles.comparisonRow}>
              <Text style={styles.comparisonLabel}>Receitas</Text>
              <Text style={[styles.comparisonPercent, { color: (comparison.vs_last_year?.income_change || 0) >= 0 ? colors.income : colors.expense }]}>
                {(comparison.vs_last_year?.income_change || 0) >= 0 ? '↗' : '↘'} {formatPercentage(comparison.vs_last_year?.income_change)}
              </Text>
            </View>
            <View style={styles.comparisonRow}>
              <Text style={styles.comparisonLabel}>Despesas</Text>
              <Text style={[styles.comparisonPercent, { color: (comparison.vs_last_year?.expense_change || 0) <= 0 ? colors.income : colors.expense }]}>
                {(comparison.vs_last_year?.expense_change || 0) >= 0 ? '↗' : '↘'} {formatPercentage(comparison.vs_last_year?.expense_change)}
              </Text>
            </View>

            {/* Valores comparativos */}
            <View style={styles.comparisonValues}>
              <View style={styles.comparisonValueItem}>
                <Text style={styles.comparisonValueLabel}>Atual</Text>
                <Text style={styles.comparisonValueAmount}>{formatCurrency(comparison.current?.balance || 0)}</Text>
              </View>
              <View style={styles.comparisonValueItem}>
                <Text style={styles.comparisonValueLabel}>Mês Ant.</Text>
                <Text style={styles.comparisonValueAmount}>{formatCurrency(comparison.vs_last_month?.previous_balance || 0)}</Text>
              </View>
              <View style={styles.comparisonValueItem}>
                <Text style={styles.comparisonValueLabel}>Ano Ant.</Text>
                <Text style={styles.comparisonValueAmount}>{formatCurrency(comparison.vs_last_year?.previous_balance || 0)}</Text>
              </View>
            </View>
          </View>
        )}

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
          <Text style={styles.statsTitle}>Resumo Rápido</Text>
          
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
  // Alerts
  alertsContainer: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  alertsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  alertsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  alertsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.warning,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderLeftWidth: 4,
    padding: 12,
    marginBottom: 8,
  },
  alertContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  alertIconContainer: {
    marginRight: 12,
  },
  alertInfo: {
    flex: 1,
  },
  alertText: {
    fontSize: 14,
    fontWeight: '500',
  },
  alertValue: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  alertDismiss: {
    padding: 4,
  },
  // Balance Card
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
  // Cards Row
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
  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  // Highlight Cards
  highlightCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderLeftWidth: 4,
    padding: 14,
  },
  highlightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  highlightLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  highlightValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  highlightDesc: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  highlightSubDesc: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  // Forecast Card
  forecastCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
  },
  forecastHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  forecastTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  forecastSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  forecastValue: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  forecastDetails: {},
  forecastRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  forecastLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  forecastAmount: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  forecastDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  // Comparison Card
  comparisonCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
  },
  comparisonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  comparisonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  comparisonSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  comparisonLabel: {
    fontSize: 13,
    color: colors.text,
  },
  comparisonPercent: {
    fontSize: 13,
    fontWeight: '600',
  },
  comparisonValues: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  comparisonValueItem: {
    alignItems: 'center',
  },
  comparisonValueLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  comparisonValueAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  // Chart
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
  // Stats
  statsContainer: {
    marginTop: 24,
    marginHorizontal: 20,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
  },
  statsTitle: {
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
