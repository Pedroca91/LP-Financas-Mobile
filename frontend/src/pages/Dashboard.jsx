import { useFinance } from '../contexts/FinanceContext';
import { MonthSelector } from '../components/layout/MonthSelector';
import { formatCurrency, getMonthName } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { AlertsPanel, TrendsPanel } from '../components/AlertsPanel';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Wallet,
  TrendingUp,
  PiggyBank,
  Target
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { useEffect, useState } from 'react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export function Dashboard() {
  const { summary, selectedMonth, selectedYear, loading } = useFinance();
  const [yearlyData, setYearlyData] = useState([]);

  useEffect(() => {
    const fetchYearlyData = async () => {
      try {
        const response = await axios.get(`${API}/dashboard/yearly`, {
          params: { year: selectedYear }
        });
        setYearlyData(response.data.map(d => ({
          ...d,
          name: getMonthName(d.month).substring(0, 3)
        })));
      } catch (error) {
        console.error('Error fetching yearly data:', error);
      }
    };
    fetchYearlyData();
  }, [selectedYear]);

  const stats = [
    {
      title: 'Saldo do Mês',
      value: summary?.balance || 0,
      icon: Wallet,
      color: (summary?.balance || 0) >= 0 ? 'text-emerald-500' : 'text-red-500',
      bgColor: (summary?.balance || 0) >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'
    },
    {
      title: 'Receitas Recebidas',
      value: summary?.total_income || 0,
      subtitle: `Pendente: ${formatCurrency(summary?.total_income_pending || 0)}`,
      icon: ArrowDownCircle,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10'
    },
    {
      title: 'Despesas Pagas',
      value: summary?.total_expense || 0,
      subtitle: `Pendente: ${formatCurrency(summary?.total_expense_pending || 0)}`,
      icon: ArrowUpCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10'
    },
    {
      title: 'Investimentos',
      value: summary?.total_contributions || 0,
      subtitle: `Dividendos: ${formatCurrency(summary?.total_dividends || 0)}`,
      icon: TrendingUp,
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
  ];

  const budgetComparison = [
    {
      name: 'Receitas',
      Planejado: summary?.planned_income || 0,
      Realizado: summary?.total_income || 0,
    },
    {
      name: 'Despesas',
      Planejado: summary?.planned_expense || 0,
      Realizado: summary?.total_expense || 0,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in" data-testid="dashboard-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-semibold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Visão geral das suas finanças em {getMonthName(selectedMonth)} de {selectedYear}
          </p>
        </div>
        <MonthSelector />
      </div>

      {/* Alerts */}
      <AlertsPanel month={selectedMonth} year={selectedYear} />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index} className="card-hover" data-testid={`stat-card-${index}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-sm ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-mono font-bold ${stat.color}`}>
                {formatCurrency(stat.value)}
              </div>
              {stat.subtitle && (
                <p className="text-xs text-muted-foreground mt-1">{stat.subtitle}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trends Panel */}
        <TrendsPanel month={selectedMonth} year={selectedYear} />
        
        {/* Yearly Evolution */}
        <Card className="card-hover lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-heading flex items-center gap-2">
              <PiggyBank className="h-5 w-5 text-primary" />
              Evolução Anual - {selectedYear}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={yearlyData}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '0.25rem'
                    }}
                    formatter={(value) => formatCurrency(value)}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="income"
                    name="Receitas"
                    stroke="hsl(var(--chart-1))"
                    fillOpacity={1}
                    fill="url(#colorIncome)"
                  />
                  <Area
                    type="monotone"
                    dataKey="expense"
                    name="Despesas"
                    stroke="hsl(var(--chart-2))"
                    fillOpacity={1}
                    fill="url(#colorExpense)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Budget vs Actual */}
        <Card className="card-hover">
          <CardHeader>
            <CardTitle className="text-lg font-heading flex items-center gap-2">
              <Target className="h-5 w-5 text-accent" />
              Meta vs Realizado - {getMonthName(selectedMonth)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={budgetComparison} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))' }} width={80} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '0.25rem'
                    }}
                    formatter={(value) => formatCurrency(value)}
                  />
                  <Legend />
                  <Bar dataKey="Planejado" fill="hsl(var(--chart-3))" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="Realizado" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
