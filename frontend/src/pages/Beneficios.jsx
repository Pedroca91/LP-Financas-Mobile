import { useState, useEffect, useMemo } from 'react';
import { useFinance } from '../contexts/FinanceContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  CreditCard, 
  Utensils, 
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank
} from 'lucide-react';
import { useToast } from '../components/ui/toast-provider';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const BENEFIT_TYPES = [
  { value: 'vr', label: 'Vale Refeição (VR)', icon: Utensils, color: 'text-orange-500' },
  { value: 'va', label: 'Vale Alimentação (VA)', icon: ShoppingCart, color: 'text-green-500' },
];

const EXPENSE_CATEGORIES = {
  vr: [
    { value: 'restaurante', label: 'Restaurante' },
    { value: 'lanchonete', label: 'Lanchonete' },
    { value: 'padaria', label: 'Padaria' },
    { value: 'delivery', label: 'Delivery' },
    { value: 'outros_vr', label: 'Outros' },
  ],
  va: [
    { value: 'mercado', label: 'Mercado/Supermercado' },
    { value: 'acougue', label: 'Açougue' },
    { value: 'padaria_va', label: 'Padaria' },
    { value: 'hortifruti', label: 'Hortifruti' },
    { value: 'outros_va', label: 'Outros' },
  ],
};

const CHART_COLORS = ['#f97316', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#eab308', '#14b8a6'];

const CATEGORY_LABELS = {
  restaurante: 'Restaurante',
  lanchonete: 'Lanchonete',
  padaria: 'Padaria',
  delivery: 'Delivery',
  outros_vr: 'Outros',
  mercado: 'Mercado',
  acougue: 'Açougue',
  padaria_va: 'Padaria',
  hortifruti: 'Hortifruti',
  outros_va: 'Outros',
};

export function Beneficios() {
  const { selectedMonth, selectedYear } = useFinance();
  const { toast } = useToast();
  
  // State
  const [credits, setCredits] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Dialog state
  const [creditDialogOpen, setCreditDialogOpen] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [editingCredit, setEditingCredit] = useState(null);
  const [editingExpense, setEditingExpense] = useState(null);
  
  // Form state
  const [creditForm, setCreditForm] = useState({
    benefit_type: 'vr',
    value: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
  });
  
  const [expenseForm, setExpenseForm] = useState({
    benefit_type: 'vr',
    category: 'restaurante',
    description: '',
    value: '',
    date: new Date().toISOString().split('T')[0],
    establishment: '',
  });

  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [creditsRes, expensesRes, summaryRes] = await Promise.all([
        fetch(`${API_URL}/api/benefits/credits?month=${selectedMonth}&year=${selectedYear}`, { headers }),
        fetch(`${API_URL}/api/benefits/expenses?month=${selectedMonth}&year=${selectedYear}`, { headers }),
        fetch(`${API_URL}/api/benefits/summary?month=${selectedMonth}&year=${selectedYear}`, { headers }),
      ]);
      
      if (creditsRes.ok) setCredits(await creditsRes.json());
      if (expensesRes.ok) setExpenses(await expensesRes.json());
      if (summaryRes.ok) setSummary(await summaryRes.json());
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({ title: 'Erro ao carregar dados', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear]);

  // Credit handlers
  const handleSaveCredit = async () => {
    try {
      const token = localStorage.getItem('token');
      const method = editingCredit ? 'PUT' : 'POST';
      const url = editingCredit 
        ? `${API_URL}/api/benefits/credits/${editingCredit.id}`
        : `${API_URL}/api/benefits/credits`;
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...creditForm,
          value: parseFloat(creditForm.value),
          month: selectedMonth,
          year: selectedYear,
        }),
      });
      
      if (response.ok) {
        toast({ title: editingCredit ? 'Crédito atualizado!' : 'Crédito adicionado!' });
        setCreditDialogOpen(false);
        setEditingCredit(null);
        resetCreditForm();
        fetchData();
      } else {
        throw new Error('Erro ao salvar');
      }
    } catch (error) {
      toast({ title: 'Erro ao salvar crédito', variant: 'destructive' });
    }
  };

  const handleDeleteCredit = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este crédito?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/benefits/credits/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        toast({ title: 'Crédito excluído!' });
        fetchData();
      }
    } catch (error) {
      toast({ title: 'Erro ao excluir', variant: 'destructive' });
    }
  };

  // Expense handlers
  const handleSaveExpense = async () => {
    try {
      const token = localStorage.getItem('token');
      const method = editingExpense ? 'PUT' : 'POST';
      const url = editingExpense 
        ? `${API_URL}/api/benefits/expenses/${editingExpense.id}`
        : `${API_URL}/api/benefits/expenses`;
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...expenseForm,
          value: parseFloat(expenseForm.value),
          month: selectedMonth,
          year: selectedYear,
        }),
      });
      
      if (response.ok) {
        toast({ title: editingExpense ? 'Gasto atualizado!' : 'Gasto adicionado!' });
        setExpenseDialogOpen(false);
        setEditingExpense(null);
        resetExpenseForm();
        fetchData();
      } else {
        throw new Error('Erro ao salvar');
      }
    } catch (error) {
      toast({ title: 'Erro ao salvar gasto', variant: 'destructive' });
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este gasto?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/benefits/expenses/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        toast({ title: 'Gasto excluído!' });
        fetchData();
      }
    } catch (error) {
      toast({ title: 'Erro ao excluir', variant: 'destructive' });
    }
  };

  // Form helpers
  const resetCreditForm = () => {
    setCreditForm({
      benefit_type: 'vr',
      value: '',
      date: new Date().toISOString().split('T')[0],
      description: '',
    });
  };

  const resetExpenseForm = () => {
    setExpenseForm({
      benefit_type: 'vr',
      category: 'restaurante',
      description: '',
      value: '',
      date: new Date().toISOString().split('T')[0],
      establishment: '',
    });
  };

  const openEditCredit = (credit) => {
    setEditingCredit(credit);
    setCreditForm({
      benefit_type: credit.benefit_type,
      value: credit.value.toString(),
      date: credit.date,
      description: credit.description || '',
    });
    setCreditDialogOpen(true);
  };

  const openEditExpense = (expense) => {
    setEditingExpense(expense);
    setExpenseForm({
      benefit_type: expense.benefit_type,
      category: expense.category,
      description: expense.description,
      value: expense.value.toString(),
      date: expense.date,
      establishment: expense.establishment || '',
    });
    setExpenseDialogOpen(true);
  };

  // Chart data
  const vrChartData = useMemo(() => {
    if (!summary?.vr?.by_category) return [];
    return Object.entries(summary.vr.by_category).map(([key, value]) => ({
      name: CATEGORY_LABELS[key] || key,
      value: value,
    }));
  }, [summary]);

  const vaChartData = useMemo(() => {
    if (!summary?.va?.by_category) return [];
    return Object.entries(summary.va.by_category).map(([key, value]) => ({
      name: CATEGORY_LABELS[key] || key,
      value: value,
    }));
  }, [summary]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0);
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-heading font-bold">Benefícios</h1>
        <p className="text-muted-foreground">Gerencie seu Vale Refeição e Vale Alimentação</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* VR Card */}
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Utensils className="h-4 w-4 text-orange-500" />
              Vale Refeição (VR)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {formatCurrency(summary?.vr?.balance)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Recebido: {formatCurrency(summary?.vr?.credits)} | Gasto: {formatCurrency(summary?.vr?.expenses)}
            </div>
          </CardContent>
        </Card>

        {/* VA Card */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-green-500" />
              Vale Alimentação (VA)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {formatCurrency(summary?.va?.balance)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Recebido: {formatCurrency(summary?.va?.credits)} | Gasto: {formatCurrency(summary?.va?.expenses)}
            </div>
          </CardContent>
        </Card>

        {/* Total Recebido */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              Total Recebido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              {formatCurrency(summary?.total_credits)}
            </div>
          </CardContent>
        </Card>

        {/* Saldo Total */}
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Wallet className="h-4 w-4 text-purple-500" />
              Saldo Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary?.total_balance >= 0 ? 'text-purple-500' : 'text-red-500'}`}>
              {formatCurrency(summary?.total_balance)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="credits">Recebimentos</TabsTrigger>
          <TabsTrigger value="expenses">Gastos</TabsTrigger>
          <TabsTrigger value="charts">Gráficos</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* VR Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Utensils className="h-5 w-5 text-orange-500" />
                  Vale Refeição - Gastos por Categoria
                </CardTitle>
              </CardHeader>
              <CardContent>
                {vrChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={vrChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {vrChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                    Nenhum gasto registrado
                  </div>
                )}
              </CardContent>
            </Card>

            {/* VA Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-green-500" />
                  Vale Alimentação - Gastos por Categoria
                </CardTitle>
              </CardHeader>
              <CardContent>
                {vaChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={vaChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {vaChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                    Nenhum gasto registrado
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Expenses */}
          <Card>
            <CardHeader>
              <CardTitle>Últimos Gastos</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Estabelecimento</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.slice(0, 5).map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>{formatDate(expense.date)}</TableCell>
                      <TableCell>
                        <span className={expense.benefit_type === 'vr' ? 'text-orange-500' : 'text-green-500'}>
                          {expense.benefit_type.toUpperCase()}
                        </span>
                      </TableCell>
                      <TableCell>{CATEGORY_LABELS[expense.category] || expense.category}</TableCell>
                      <TableCell>{expense.description}</TableCell>
                      <TableCell>{expense.establishment || '-'}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(expense.value)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {expenses.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        Nenhum gasto registrado este mês
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Credits Tab */}
        <TabsContent value="credits" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { resetCreditForm(); setCreditDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Recebimento
            </Button>
          </div>

          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {credits.map((credit) => (
                    <TableRow key={credit.id}>
                      <TableCell>{formatDate(credit.date)}</TableCell>
                      <TableCell>
                        <span className={`flex items-center gap-2 ${credit.benefit_type === 'vr' ? 'text-orange-500' : 'text-green-500'}`}>
                          {credit.benefit_type === 'vr' ? <Utensils className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
                          {credit.benefit_type.toUpperCase()}
                        </span>
                      </TableCell>
                      <TableCell>{credit.description || 'Crédito mensal'}</TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        +{formatCurrency(credit.value)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openEditCredit(credit)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteCredit(credit.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {credits.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Nenhum recebimento registrado este mês
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { resetExpenseForm(); setExpenseDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Gasto
            </Button>
          </div>

          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Estabelecimento</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>{formatDate(expense.date)}</TableCell>
                      <TableCell>
                        <span className={`flex items-center gap-2 ${expense.benefit_type === 'vr' ? 'text-orange-500' : 'text-green-500'}`}>
                          {expense.benefit_type === 'vr' ? <Utensils className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
                          {expense.benefit_type.toUpperCase()}
                        </span>
                      </TableCell>
                      <TableCell>{CATEGORY_LABELS[expense.category] || expense.category}</TableCell>
                      <TableCell>{expense.description}</TableCell>
                      <TableCell>{expense.establishment || '-'}</TableCell>
                      <TableCell className="text-right font-medium text-red-600">
                        -{formatCurrency(expense.value)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openEditExpense(expense)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteExpense(expense.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {expenses.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        Nenhum gasto registrado este mês
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Charts Tab */}
        <TabsContent value="charts" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Comparison Bar Chart */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Comparativo VR vs VA</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={[
                      { name: 'VR', Recebido: summary?.vr?.credits || 0, Gasto: summary?.vr?.expenses || 0 },
                      { name: 'VA', Recebido: summary?.va?.credits || 0, Gasto: summary?.va?.expenses || 0 },
                    ]}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => `R$ ${value}`} />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="Recebido" fill="#22c55e" />
                    <Bar dataKey="Gasto" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* VR Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Utensils className="h-5 w-5 text-orange-500" />
                  Distribuição VR
                </CardTitle>
              </CardHeader>
              <CardContent>
                {vrChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={vrChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                      >
                        {vrChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    Nenhum gasto VR registrado
                  </div>
                )}
              </CardContent>
            </Card>

            {/* VA Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-green-500" />
                  Distribuição VA
                </CardTitle>
              </CardHeader>
              <CardContent>
                {vaChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={vaChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                      >
                        {vaChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    Nenhum gasto VA registrado
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Credit Dialog */}
      <Dialog open={creditDialogOpen} onOpenChange={setCreditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCredit ? 'Editar Recebimento' : 'Novo Recebimento'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tipo de Benefício</Label>
              <Select 
                value={creditForm.benefit_type} 
                onValueChange={(v) => setCreditForm({ ...creditForm, benefit_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BENEFIT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <span className="flex items-center gap-2">
                        <type.icon className={`h-4 w-4 ${type.color}`} />
                        {type.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={creditForm.value}
                onChange={(e) => setCreditForm({ ...creditForm, value: e.target.value })}
              />
            </div>
            <div>
              <Label>Data</Label>
              <Input
                type="date"
                value={creditForm.date}
                onChange={(e) => setCreditForm({ ...creditForm, date: e.target.value })}
              />
            </div>
            <div>
              <Label>Descrição (opcional)</Label>
              <Input
                placeholder="Ex: Crédito mensal"
                value={creditForm.description}
                onChange={(e) => setCreditForm({ ...creditForm, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveCredit} disabled={!creditForm.value}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Expense Dialog */}
      <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingExpense ? 'Editar Gasto' : 'Novo Gasto'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tipo de Benefício</Label>
              <Select 
                value={expenseForm.benefit_type} 
                onValueChange={(v) => setExpenseForm({ 
                  ...expenseForm, 
                  benefit_type: v,
                  category: EXPENSE_CATEGORIES[v][0].value
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BENEFIT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <span className="flex items-center gap-2">
                        <type.icon className={`h-4 w-4 ${type.color}`} />
                        {type.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Categoria</Label>
              <Select 
                value={expenseForm.category} 
                onValueChange={(v) => setExpenseForm({ ...expenseForm, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES[expenseForm.benefit_type].map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Descrição</Label>
              <Input
                placeholder="Ex: Almoço"
                value={expenseForm.description}
                onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
              />
            </div>
            <div>
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={expenseForm.value}
                onChange={(e) => setExpenseForm({ ...expenseForm, value: e.target.value })}
              />
            </div>
            <div>
              <Label>Data</Label>
              <Input
                type="date"
                value={expenseForm.date}
                onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
              />
            </div>
            <div>
              <Label>Estabelecimento (opcional)</Label>
              <Input
                placeholder="Ex: Restaurante X"
                value={expenseForm.establishment}
                onChange={(e) => setExpenseForm({ ...expenseForm, establishment: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExpenseDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveExpense} disabled={!expenseForm.value || !expenseForm.description}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
