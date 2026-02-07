import { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { formatCurrency } from '../lib/utils';
import { TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight, Target } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export function HighlightsCards({ month, year }) {
  const [highlights, setHighlights] = useState(null);

  useEffect(() => {
    const fetchHighlights = async () => {
      try {
        const response = await axios.get(`${API}/analytics/highlights`, {
          params: { month, year }
        });
        setHighlights(response.data);
      } catch (error) {
        console.error('Error fetching highlights:', error);
      }
    };
    fetchHighlights();
  }, [month, year]);

  if (!highlights) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Maior Receita */}
      {highlights.largest_income && (
        <Card className="card-hover border-l-4 border-l-emerald-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ArrowDownRight className="w-4 h-4 text-emerald-500" />
              Maior Receita do Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-emerald-600">
                {formatCurrency(highlights.largest_income.value)}
              </div>
              <div className="text-sm text-muted-foreground">
                <div className="font-medium text-foreground">{highlights.largest_income.category}</div>
                <div>{highlights.largest_income.description || 'Sem descrição'}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Maior Despesa */}
      {highlights.largest_expense && (
        <Card className="card-hover border-l-4 border-l-red-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4 text-red-500" />
              Maior Despesa do Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(highlights.largest_expense.value)}
              </div>
              <div className="text-sm text-muted-foreground">
                <div className="font-medium text-foreground">{highlights.largest_expense.category}</div>
                <div>{highlights.largest_expense.description || 'Sem descrição'}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function ForecastCard({ month, year }) {
  const [forecast, setForecast] = useState(null);

  useEffect(() => {
    const fetchForecast = async () => {
      try {
        const response = await axios.get(`${API}/analytics/forecast`, {
          params: { month, year }
        });
        setForecast(response.data);
      } catch (error) {
        console.error('Error fetching forecast:', error);
      }
    };
    fetchForecast();
  }, [month, year]);

  if (!forecast) return null;

  const isPositive = forecast.forecast_current_month >= 0;

  return (
    <Card className="card-hover">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          Previsão de Saldo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">Saldo previsto fim do mês</p>
          <p className={`text-3xl font-bold ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
            {formatCurrency(forecast.forecast_current_month)}
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Saldo atual:</span>
            <span className="font-medium">{formatCurrency(forecast.current_balance)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Receitas pendentes:</span>
            <span className="font-medium text-emerald-600">+{formatCurrency(forecast.pending_income)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Despesas pendentes:</span>
            <span className="font-medium text-red-600">-{formatCurrency(forecast.pending_expense)}</span>
          </div>
        </div>

        <div className="pt-3 border-t">
          <p className="text-xs text-muted-foreground mb-2">Próximos 3 meses (baseado em média)</p>
          <div className="space-y-1">
            {forecast.forecast_next_months.slice(0, 3).map((item, index) => (
              <div key={index} className="flex justify-between text-xs">
                <span className="text-muted-foreground">
                  {String(item.month).padStart(2, '0')}/{item.year}:
                </span>
                <span className={`font-medium ${item.forecasted_balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(item.forecasted_balance)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ComparisonCard({ month, year }) {
  const [comparison, setComparison] = useState(null);

  useEffect(() => {
    const fetchComparison = async () => {
      try {
        const response = await axios.get(`${API}/analytics/comparison`, {
          params: { month, year }
        });
        setComparison(response.data);
      } catch (error) {
        console.error('Error fetching comparison:', error);
      }
    };
    fetchComparison();
  }, [month, year]);

  if (!comparison) return null;

  const renderVariation = (value) => {
    const isPositive = value >= 0;
    return (
      <span className={`flex items-center gap-1 text-sm font-medium ${
        isPositive ? 'text-emerald-600' : 'text-red-600'
      }`}>
        {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
        {Math.abs(value).toFixed(1)}%
      </span>
    );
  };

  return (
    <Card className="card-hover">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-primary" />
          Comparativo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Vs Mês Anterior */}
        <div>
          <h4 className="text-sm font-medium mb-3">vs Mês Anterior</h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Receitas</span>
              {renderVariation(comparison.variations.income_vs_previous)}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Despesas</span>
              {renderVariation(comparison.variations.expense_vs_previous)}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Saldo</span>
              {renderVariation(comparison.variations.balance_vs_previous)}
            </div>
          </div>
        </div>

        {/* Vs Ano Anterior */}
        <div className="pt-3 border-t">
          <h4 className="text-sm font-medium mb-3">vs Mesmo Mês Ano Anterior</h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Receitas</span>
              {renderVariation(comparison.variations.income_vs_last_year)}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Despesas</span>
              {renderVariation(comparison.variations.expense_vs_last_year)}
            </div>
          </div>
        </div>

        {/* Valores Absolutos */}
        <div className="pt-3 border-t">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Atual</p>
              <p className="text-sm font-bold">{formatCurrency(comparison.current.balance)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Mês Ant.</p>
              <p className="text-sm font-medium">{formatCurrency(comparison.previous_month.balance)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Ano Ant.</p>
              <p className="text-sm font-medium">{formatCurrency(comparison.last_year.balance)}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}