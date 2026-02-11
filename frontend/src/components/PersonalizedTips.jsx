import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { 
  TrendingUp, TrendingDown, PiggyBank, PieChart, Clock, Target, 
  CreditCard, AlertTriangle, CheckCircle, Info, Lightbulb
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ICONS = {
  'trending-up': TrendingUp,
  'trending-down': TrendingDown,
  'piggy-bank': PiggyBank,
  'pie-chart': PieChart,
  'clock': Clock,
  'target': Target,
  'credit-card': CreditCard,
};

const TYPE_STYLES = {
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-800',
    icon: 'text-amber-500',
    iconBg: 'bg-amber-100 dark:bg-amber-900/40'
  },
  success: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    border: 'border-emerald-200 dark:border-emerald-800',
    icon: 'text-emerald-500',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/40'
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    icon: 'text-blue-500',
    iconBg: 'bg-blue-100 dark:bg-blue-900/40'
  }
};

export function PersonalizedTips() {
  const [tips, setTips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTips();
  }, []);

  const fetchTips = async () => {
    try {
      const response = await axios.get(`${API}/tips/personalized`);
      setTips(response.data);
    } catch (error) {
      console.error('Error fetching tips:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="card-hover">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            Dicas Personalizadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-6">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (tips.length === 0) {
    return (
      <Card className="card-hover">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            Dicas Personalizadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
            <p>Suas finanças estão em ordem! 🎉</p>
            <p className="text-sm mt-1">Continue assim!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-hover">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-amber-500" />
          Dicas Personalizadas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {tips.map((tip, index) => {
          const Icon = ICONS[tip.icon] || Info;
          const styles = TYPE_STYLES[tip.type] || TYPE_STYLES.info;
          
          return (
            <div
              key={index}
              className={`p-3 rounded-lg border ${styles.bg} ${styles.border}`}
            >
              <div className="flex gap-3">
                <div className={`w-8 h-8 rounded-lg ${styles.iconBg} flex items-center justify-center shrink-0`}>
                  <Icon className={`h-4 w-4 ${styles.icon}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm">{tip.title}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{tip.message}</p>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
