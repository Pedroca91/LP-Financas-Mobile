import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { useNavigation } from '@react-navigation/native';
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
  const navigation = useNavigation();
  
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState(null);
  const [yearlyData, setYearlyData] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [highlights, setHighlights] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [tips, setTips] = useState([]);
  const [showAlerts, setShowAlerts] = useState(true);

  // Animation for the floating button
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse animation
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    // Glow animation
    const glowAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    pulseAnimation.start();
    glowAnimation.start();

    return () => {
      pulseAnimation.stop();
      glowAnimation.stop();
    };
  }, []);

  const navigateToChat = () => {
    navigation.navigate('Mais', { screen: 'Assistente' });
  };

  const fetchData = useCallback(async () => {
    try {
      const [summaryRes, yearlyRes] = await Promise.all([
        dashboardService.getSummary(month, year),
        dashboardService.getYearly(year),
      ]);
      setSummary(summaryRes.data);
      setYearlyData(yearlyRes.data);

      try {
        const alertsRes = await alertService.getDueDateAlerts();
        setAlerts(alertsRes.data || []);
      } catch (e) {
        console.log('Alerts not available');
      }

      try {
        const [highlightsRes, forecastRes, comparisonRes, tipsRes] = await Promise.all([
          analyticsService.getHighlights(month, year),
          analyticsService.getForecast(month, year),
          analyticsService.getComparison(month, year),
          analyticsService.getTips(month, year),
        ]);
        setHighlights(highlightsRes.data);
        setForecast(forecastRes.data);
        setComparison(comparisonRes.data);
        setTips(tipsRes.data || []);
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

  const balance = (summary?.total_income || 0) - ((summary?.total_expense || 0) + (summary?.total_expense_pending || 0));

  const styles = createStyles(colors, isDark);

  const chartConfig = {
    backgroundColor: 'transparent',
    backgroundGradientFrom: colors.cardDark,
    backgroundGradientTo: colors.primary,
    decimalPlaces: 0,
    color: (opacity = 1) => colors.gold,
    labelColor: (opacity = 1) => '#94a3b8',
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: colors.gold,
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
          color: (opacity = 1) => '#3b82f6',
          strokeWidth: 3,
        },
        {
          data: expenseData.slice(-6).map(v => v || 0),
          color: (opacity = 1) => colors.gold,
          strokeWidth: 3,
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
      <StatusBar style="light" />
      
      {/* Header */}
      <LinearGradient
        colors={[colors.primary, colors.primaryLight]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Olá, {user?.name?.split(' ')[0]}!</Text>
            <Text style={styles.headerSubtitle}>Bem-vindo ao LP Finanças</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={toggleTheme} style={styles.iconButton}>
              <Ionicons name={isDark ? 'sunny' : 'moon'} size={22} color={colors.gold} />
            </TouchableOpacity>
            <TouchableOpacity onPress={logout} style={styles.iconButton}>
              <Ionicons name="log-out-outline" size={22} color={colors.gold} />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />
        }
      >
        {/* Month Selector */}
        <View style={styles.monthSelector}>
          <TouchableOpacity onPress={() => navigateMonth(-1)} style={styles.monthButton}>
            <Ionicons name="chevron-back" size={24} color={colors.gold} />
          </TouchableOpacity>
          <Text style={styles.monthText}>{formatMonth(month, year)}</Text>
          <TouchableOpacity onPress={() => navigateMonth(1)} style={styles.monthButton}>
            <Ionicons name="chevron-forward" size={24} color={colors.gold} />
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
            
            {alerts.slice(0, 5).map((alert, index) => {
              const daysUntil = alert.days !== undefined ? alert.days : alert.days_until;
              const isUrgent = daysUntil <= 1;
              
              return (
                <View 
                  key={index} 
                  style={[
                    styles.alertItem, 
                    { borderLeftColor: isUrgent ? colors.expense : colors.warning }
                  ]}
                >
                  <View style={styles.alertContent}>
                    <View style={styles.alertIconContainer}>
                      <Ionicons 
                        name={isUrgent ? 'alert-circle' : 'time'} 
                        size={18} 
                        color={isUrgent ? colors.expense : colors.warning} 
                      />
                    </View>
                    <View style={styles.alertInfo}>
                      <Text style={[styles.alertText, { color: isUrgent ? colors.expense : colors.warning }]}>
                        {alert.message || `${alert.description || alert.category} vence em ${daysUntil} dia(s)`}
                      </Text>
                      <Text style={styles.alertValue}>Valor: {formatCurrency(alert.value)}</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => dismissAlert(index)} style={styles.alertDismiss}>
                    <Ionicons name="close" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {/* Balance Card */}
        <View style={styles.balanceCardContainer}>
          <LinearGradient
            colors={[colors.cardDark, colors.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.balanceCard}
          >
            <Text style={styles.balanceLabel}>Saldo do Mês</Text>
            <Text style={styles.balanceValue}>{formatCurrency(balance)}</Text>
          </LinearGradient>
        </View>

        {/* Summary Cards */}
        <View style={styles.cardsRow}>
          <View style={styles.summaryCard}>
            <LinearGradient
              colors={['rgba(201,166,107,0.15)', 'rgba(201,166,107,0.05)']}
              style={styles.summaryCardGradient}
            >
              <Text style={styles.cardLabel}>Receitas</Text>
              <Text style={[styles.cardValue, { color: colors.income }]}>
                {formatCurrency(summary?.total_income || 0)}
              </Text>
            </LinearGradient>
          </View>

          <View style={styles.summaryCard}>
            <LinearGradient
              colors={['rgba(201,166,107,0.15)', 'rgba(201,166,107,0.05)']}
              style={styles.summaryCardGradient}
            >
              <Text style={styles.cardLabel}>Despesas</Text>
              <Text style={[styles.cardValue, { color: colors.expense }]}>
                {formatCurrency((summary?.total_expense || 0) + (summary?.total_expense_pending || 0))}
              </Text>
            </LinearGradient>
          </View>
        </View>

        <View style={styles.cardsRow}>
          <View style={styles.summaryCard}>
            <LinearGradient
              colors={['rgba(201,166,107,0.15)', 'rgba(201,166,107,0.05)']}
              style={styles.summaryCardGradient}
            >
              <Text style={styles.cardLabel}>Investimentos</Text>
              <Text style={[styles.cardValue, { color: colors.investment }]}>
                {formatCurrency(summary?.total_investments || 0)}
              </Text>
            </LinearGradient>
          </View>

          <View style={styles.summaryCard}>
            <LinearGradient
              colors={['rgba(201,166,107,0.15)', 'rgba(201,166,107,0.05)']}
              style={styles.summaryCardGradient}
            >
              <Text style={styles.cardLabel}>Cartões</Text>
              <Text style={[styles.cardValue, { color: colors.gold }]}>
                {formatCurrency(summary?.credit_card_total || 0)}
              </Text>
            </LinearGradient>
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

        {/* Análise Avançada */}
        <View style={styles.sectionHeader}>
          <Ionicons name="analytics" size={20} color={colors.gold} />
          <Text style={styles.sectionTitle}>Análise Avançada</Text>
        </View>

        {/* Highlights - Maior Receita e Despesa */}
        <View style={styles.cardsRow}>
          <View style={[styles.highlightCard, { borderLeftColor: colors.income }]}>
            <View style={styles.highlightHeader}>
              <Ionicons name="arrow-down" size={14} color={colors.income} />
              <Text style={styles.highlightLabel}>Maior Receita do Mês</Text>
            </View>
            <Text style={[styles.highlightValue, { color: colors.income }]}>
              {formatCurrency(highlights?.largest_income?.value || 0)}
            </Text>
            <Text style={styles.highlightDesc}>
              {highlights?.largest_income?.description || 'Nenhuma receita'}
            </Text>
            <Text style={[styles.highlightDesc, { fontSize: 11, opacity: 0.7 }]}>
              {highlights?.largest_income?.category || ''}
            </Text>
          </View>

          <View style={[styles.highlightCard, { borderLeftColor: colors.expense }]}>
            <View style={styles.highlightHeader}>
              <Ionicons name="arrow-up" size={14} color={colors.expense} />
              <Text style={styles.highlightLabel}>Maior Despesa do Mês</Text>
            </View>
            <Text style={[styles.highlightValue, { color: colors.expense }]}>
              {formatCurrency(highlights?.largest_expense?.value || 0)}
            </Text>
            <Text style={styles.highlightDesc}>
              {highlights?.largest_expense?.description || 'Nenhuma despesa'}
            </Text>
            <Text style={[styles.highlightDesc, { fontSize: 11, opacity: 0.7 }]}>
              {highlights?.largest_expense?.category || ''}
            </Text>
          </View>
        </View>

        {/* Previsão de Saldo */}
        <View style={styles.forecastCard}>
          <LinearGradient
            colors={[colors.cardDark, colors.primaryLight]}
            style={styles.forecastGradient}
          >
            <View style={styles.forecastHeader}>
              <Ionicons name="eye" size={18} color={colors.gold} />
              <Text style={styles.forecastTitle}>Previsão de Saldo</Text>
            </View>
            
            <Text style={styles.forecastSubtitle}>Saldo previsto fim do mês</Text>
            <Text style={[styles.forecastValue, { color: (forecast?.predicted_balance || forecast?.forecast_current_month || 0) >= 0 ? colors.income : colors.expense }]}>
              {formatCurrency(forecast?.predicted_balance || forecast?.forecast_current_month || 0)}
            </Text>

            <View style={styles.forecastDetails}>
              <View style={styles.forecastRow}>
                <Text style={styles.forecastLabel}>Saldo atual:</Text>
                <Text style={styles.forecastAmount}>{formatCurrency(forecast?.current_balance || 0)}</Text>
              </View>
              <View style={styles.forecastRow}>
                <Text style={styles.forecastLabel}>Receitas pendentes:</Text>
                <Text style={[styles.forecastAmount, { color: colors.income }]}>+{formatCurrency(forecast?.pending_income || 0)}</Text>
              </View>
              <View style={styles.forecastRow}>
                <Text style={styles.forecastLabel}>Despesas pendentes:</Text>
                <Text style={[styles.forecastAmount, { color: colors.expense }]}>-{formatCurrency(forecast?.pending_expenses || forecast?.pending_expense || 0)}</Text>
              </View>
            </View>

            {/* Previsão próximos meses */}
            {forecast?.forecast_next_months && forecast.forecast_next_months.length > 0 && (
              <View style={styles.forecastNextMonths}>
                <Text style={styles.forecastNextTitle}>Próximos 3 meses (baseado em média)</Text>
                {forecast.forecast_next_months.map((item, index) => (
                  <View key={index} style={styles.forecastRow}>
                    <Text style={styles.forecastLabel}>{String(item.month).padStart(2, '0')}/{item.year}:</Text>
                    <Text style={[styles.forecastAmount, { color: colors.gold }]}>{formatCurrency(item.forecasted_balance)}</Text>
                  </View>
                ))}
              </View>
            )}
          </LinearGradient>
        </View>

        {/* Comparativo */}
        <View style={styles.comparisonCard}>
          <View style={styles.comparisonHeader}>
            <Ionicons name="cash" size={18} color={colors.gold} />
            <Text style={styles.comparisonTitle}>Comparativo</Text>
          </View>

          <Text style={styles.comparisonSubtitle}>vs Mês Anterior</Text>
          <View style={styles.comparisonRow}>
            <Text style={styles.comparisonLabel}>Receitas</Text>
            <Text style={[styles.comparisonPercent, { color: (comparison?.vs_last_month?.income_change || comparison?.variations?.income_vs_previous || 0) >= 0 ? colors.income : colors.expense }]}>
              {(comparison?.vs_last_month?.income_change || comparison?.variations?.income_vs_previous || 0) >= 0 ? '↗' : '↘'} {formatPercentage(comparison?.vs_last_month?.income_change || comparison?.variations?.income_vs_previous)}
            </Text>
          </View>
          <View style={styles.comparisonRow}>
            <Text style={styles.comparisonLabel}>Despesas</Text>
            <Text style={[styles.comparisonPercent, { color: (comparison?.vs_last_month?.expense_change || comparison?.variations?.expense_vs_previous || 0) <= 0 ? colors.income : colors.expense }]}>
              {(comparison?.vs_last_month?.expense_change || comparison?.variations?.expense_vs_previous || 0) >= 0 ? '↗' : '↘'} {formatPercentage(comparison?.vs_last_month?.expense_change || comparison?.variations?.expense_vs_previous)}
            </Text>
          </View>
          <View style={styles.comparisonRow}>
            <Text style={styles.comparisonLabel}>Saldo</Text>
            <Text style={[styles.comparisonPercent, { color: (comparison?.vs_last_month?.balance_change || comparison?.variations?.balance_vs_previous || 0) >= 0 ? colors.income : colors.expense }]}>
              {(comparison?.vs_last_month?.balance_change || comparison?.variations?.balance_vs_previous || 0) >= 0 ? '↗' : '↘'} {formatPercentage(comparison?.vs_last_month?.balance_change || comparison?.variations?.balance_vs_previous)}
            </Text>
          </View>

          <Text style={[styles.comparisonSubtitle, { marginTop: 16 }]}>vs Mesmo Mês Ano Anterior</Text>
          <View style={styles.comparisonRow}>
            <Text style={styles.comparisonLabel}>Receitas</Text>
            <Text style={[styles.comparisonPercent, { color: (comparison?.variations?.income_vs_last_year || 0) >= 0 ? colors.income : colors.expense }]}>
              {(comparison?.variations?.income_vs_last_year || 0) >= 0 ? '↗' : '↘'} {formatPercentage(comparison?.variations?.income_vs_last_year)}
            </Text>
          </View>
          <View style={styles.comparisonRow}>
            <Text style={styles.comparisonLabel}>Despesas</Text>
            <Text style={[styles.comparisonPercent, { color: (comparison?.variations?.expense_vs_last_year || 0) <= 0 ? colors.income : colors.expense }]}>
              {(comparison?.variations?.expense_vs_last_year || 0) >= 0 ? '↗' : '↘'} {formatPercentage(comparison?.variations?.expense_vs_last_year)}
            </Text>
          </View>

          {/* Valores absolutos */}
          <View style={styles.comparisonAbsolute}>
            <View style={styles.comparisonAbsoluteItem}>
              <Text style={styles.comparisonAbsoluteLabel}>Atual</Text>
              <Text style={[styles.comparisonAbsoluteValue, { color: colors.gold }]}>{formatCurrency(comparison?.current?.balance || balance)}</Text>
            </View>
            <View style={styles.comparisonAbsoluteItem}>
              <Text style={styles.comparisonAbsoluteLabel}>Mês Ant.</Text>
              <Text style={styles.comparisonAbsoluteValue}>{formatCurrency(comparison?.previous_month?.balance || 0)}</Text>
            </View>
            <View style={styles.comparisonAbsoluteItem}>
              <Text style={styles.comparisonAbsoluteLabel}>Ano Ant.</Text>
              <Text style={styles.comparisonAbsoluteValue}>{formatCurrency(comparison?.last_year?.balance || 0)}</Text>
            </View>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <Text style={styles.statsTitle}>Resumo Rápido</Text>
          
          <View style={styles.statItem}>
            <View style={styles.statLeft}>
              <Ionicons name="checkmark-circle" size={20} color={colors.income} />
              <Text style={styles.statLabel}>Receitas Recebidas</Text>
            </View>
            <Text style={[styles.statValue, { color: colors.income }]}>
              {formatCurrency((summary?.total_income || 0) - (summary?.total_income_pending || 0))}
            </Text>
          </View>

          <View style={styles.statItem}>
            <View style={styles.statLeft}>
              <Ionicons name="time" size={20} color={colors.warning} />
              <Text style={styles.statLabel}>Receitas Pendentes</Text>
            </View>
            <Text style={[styles.statValue, { color: colors.warning }]}>
              {formatCurrency(summary?.total_income_pending || 0)}
            </Text>
          </View>

          <View style={styles.statItem}>
            <View style={styles.statLeft}>
              <Ionicons name="checkmark-circle" size={20} color={colors.expense} />
              <Text style={styles.statLabel}>Despesas Pagas</Text>
            </View>
            <Text style={[styles.statValue, { color: colors.expense }]}>
              {formatCurrency(summary?.total_expense || 0)}
            </Text>
          </View>

          <View style={styles.statItem}>
            <View style={styles.statLeft}>
              <Ionicons name="time" size={20} color={colors.warning} />
              <Text style={styles.statLabel}>Despesas Pendentes</Text>
            </View>
            <Text style={[styles.statValue, { color: colors.warning }]}>
              {formatCurrency(summary?.total_expense_pending || 0)}
            </Text>
          </View>
        </View>

        {/* Dicas Personalizadas */}
        <View style={styles.tipsContainer}>
          <View style={styles.tipsHeader}>
            <Ionicons name="bulb" size={20} color={colors.gold} />
            <Text style={styles.tipsTitle}>Dicas Personalizadas</Text>
          </View>
          
          {tips && tips.length > 0 ? (
            tips.map((tip, index) => {
              const getTipStyle = (type) => {
                switch(type) {
                  case 'warning': return { bg: colors.expense + '20', border: colors.expense, icon: 'alert-circle' };
                  case 'success': return { bg: colors.income + '20', border: colors.income, icon: 'checkmark-circle' };
                  case 'info': return { bg: colors.primary + '30', border: colors.primary, icon: 'information-circle' };
                  default: return { bg: colors.primary + '30', border: colors.primary, icon: 'information-circle' };
                }
              };
              const tipStyle = getTipStyle(tip.type);
              
              return (
                <View 
                  key={index} 
                  style={[
                    styles.tipItem, 
                    { backgroundColor: tipStyle.bg, borderLeftColor: tipStyle.border }
                  ]}
                >
                  <View style={styles.tipIconContainer}>
                    <Ionicons name={tipStyle.icon} size={24} color={tipStyle.border} />
                  </View>
                  <View style={styles.tipContent}>
                    <Text style={styles.tipItemTitle}>{tip.title}</Text>
                    <Text style={styles.tipItemMessage}>{tip.message}</Text>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={[styles.tipItem, { backgroundColor: colors.primary + '20', borderLeftColor: colors.primary }]}>
              <View style={styles.tipIconContainer}>
                <Ionicons name="information-circle" size={24} color={colors.primary} />
              </View>
              <View style={styles.tipContent}>
                <Text style={styles.tipItemTitle}>Sem dicas no momento</Text>
                <Text style={styles.tipItemMessage}>Adicione receitas e despesas para receber dicas personalizadas!</Text>
              </View>
            </View>
          )}
        </View>

        {/* Análise de Tendências */}
        <View style={styles.trendsContainer}>
          <View style={styles.trendsHeader}>
            <Ionicons name="trending-up" size={20} color={colors.gold} />
            <Text style={styles.trendsTitle}>Análise de Tendências</Text>
          </View>
          
          <View style={styles.trendsCards}>
            <View style={styles.trendCard}>
              <Text style={styles.trendLabel}>Receitas vs Média</Text>
              <View style={styles.trendValueRow}>
                <Ionicons 
                  name={(summary?.total_income || 0) >= (yearlyData?.avg_income || 0) ? 'checkmark-circle' : 'alert-circle'} 
                  size={18} 
                  color={(summary?.total_income || 0) >= (yearlyData?.avg_income || 0) ? colors.income : colors.warning} 
                />
                <Text style={[styles.trendValue, { color: (summary?.total_income || 0) >= (yearlyData?.avg_income || 0) ? colors.income : colors.warning }]}>
                  {yearlyData?.avg_income > 0 ? (((summary?.total_income || 0) / yearlyData.avg_income - 1) * 100).toFixed(1) : '0.0'}%
                </Text>
              </View>
            </View>
            
            <View style={styles.trendCard}>
              <Text style={styles.trendLabel}>Despesas vs Média</Text>
              <View style={styles.trendValueRow}>
                <Ionicons 
                  name={(summary?.total_expense || 0) <= (yearlyData?.avg_expense || 0) ? 'checkmark-circle' : 'alert-circle'} 
                  size={18} 
                  color={(summary?.total_expense || 0) <= (yearlyData?.avg_expense || 0) ? colors.income : colors.expense} 
                />
                <Text style={[styles.trendValue, { color: (summary?.total_expense || 0) <= (yearlyData?.avg_expense || 0) ? colors.income : colors.expense }]}>
                  {yearlyData?.avg_expense > 0 ? (((summary?.total_expense || 0) / yearlyData.avg_expense - 1) * 100).toFixed(1) : '0.0'}%
                </Text>
              </View>
            </View>
          </View>
          
          <Text style={styles.trendsMessage}>
            {(summary?.total_income || 0) >= (summary?.total_expense || 0) 
              ? 'Seus gastos estão estáveis comparado aos meses anteriores' 
              : 'Atenção: suas despesas estão acima das receitas este mês'}
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating AI Assistant Button */}
      <TouchableOpacity
        style={styles.floatingButtonContainer}
        onPress={navigateToChat}
        activeOpacity={0.8}
      >
        <Animated.View
          style={[
            styles.floatingButtonGlow,
            {
              opacity: glowAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.3, 0.8],
              }),
              transform: [
                {
                  scale: glowAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.3],
                  }),
                },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.floatingButton,
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <LinearGradient
            colors={['#8b5cf6', '#6366f1']}
            style={styles.floatingButtonGradient}
          >
            <Ionicons name="chatbubbles" size={28} color="#fff" />
          </LinearGradient>
        </Animated.View>
        <View style={styles.floatingButtonBadge}>
          <Text style={styles.floatingButtonBadgeText}>IA</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (colors, isDark) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.gold,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  monthButton: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderGold,
  },
  monthText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
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
  balanceCardContainer: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  balanceCard: {
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(201,166,107,0.3)',
  },
  balanceLabel: {
    fontSize: 16,
    color: colors.gold,
    marginBottom: 8,
  },
  balanceValue: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  cardsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 12,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderGold,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryCardGradient: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  cardLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  highlightCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderLeftWidth: 4,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
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
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  highlightDesc: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  forecastCard: {
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  forecastGradient: {
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
    color: '#ffffff',
  },
  forecastSubtitle: {
    fontSize: 12,
    color: colors.gold,
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
    color: '#94a3b8',
  },
  forecastAmount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  comparisonCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
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
    color: colors.gold,
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
  chartContainer: {
    marginTop: 20,
    marginHorizontal: 20,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
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
    marginTop: 20,
    marginHorizontal: 20,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
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
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingButtonGlow: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#8b5cf6',
  },
  floatingButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 10,
  },
  floatingButtonGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingButtonBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#22c55e',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 2,
    borderColor: '#fff',
  },
  floatingButtonBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  tipsContainer: {
    marginTop: 20,
    marginHorizontal: 20,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.primary + '20',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  tipIconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  tipContent: {
    flex: 1,
  },
  tipItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  tipItemMessage: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
