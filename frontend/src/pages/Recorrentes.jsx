import { useState, useEffect } from 'react';
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
import { Switch } from '../components/ui/switch';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  RefreshCw,
  Play,
  Pause,
  Calendar,
  DollarSign
} from 'lucide-react';
import { useToast } from '../components/ui/toast-provider';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const FREQUENCIES = [
  { value: 'monthly', label: 'Mensal' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'yearly', label: 'Anual' },
];

export function Recorrentes() {
  const { categories, creditCards, selectedMonth, selectedYear, refreshData } = useFinance();
  const toast = useToast();
  
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [generating, setGenerating] = useState(false);
  
  const [form, setForm] = useState({
    type: 'expense',
    category_id: '',
    description: '',
    value: '',
    frequency: 'monthly',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    day_of_month: '1',
    is_active: true,
    payment_method: 'cash',
    credit_card_id: '',
  });

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/recurring`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setTransactions(await response.json());
      }
    } catch (error) {
      toast.error('Erro ao carregar lançamentos recorrentes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token');
      const method = editing ? 'PUT' : 'POST';
      const url = editing 
        ? `${API_URL}/api/recurring/${editing.id}`
        : `${API_URL}/api/recurring`;
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          value: parseFloat(form.value),
          day_of_month: parseInt(form.day_of_month) || 1,
          end_date: form.end_date || null,
          credit_card_id: form.credit_card_id || null,
        }),
      });
      
      if (response.ok) {
        toast.success(editing ? 'Lançamento atualizado!' : 'Lançamento criado!');
        setDialogOpen(false);
        setEditing(null);
        resetForm();
        fetchTransactions();
      } else {
        throw new Error('Erro ao salvar');
      }
    } catch (error) {
      toast.error('Erro ao salvar lançamento');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/recurring/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        toast.success('Lançamento excluído!');
        fetchTransactions();
      }
    } catch (error) {
      toast.error('Erro ao excluir');
    }
  };

  const handleToggleActive = async (transaction) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/recurring/${transaction.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...transaction,
          is_active: !transaction.is_active,
        }),
      });
      
      if (response.ok) {
        toast.success(transaction.is_active ? 'Lançamento pausado' : 'Lançamento ativado');
        fetchTransactions();
      }
    } catch (error) {
      toast.error('Erro ao atualizar');
    }
  };

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_URL}/api/recurring/generate?month=${selectedMonth}&year=${selectedYear}`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.count > 0) {
          toast.success(`${data.count} lançamento(s) gerado(s)!`);
          refreshData();
        } else {
          toast.info('Nenhum lançamento novo para gerar');
        }
      }
    } catch (error) {
      toast.error('Erro ao gerar lançamentos');
    } finally {
      setGenerating(false);
    }
  };

  const resetForm = () => {
    setForm({
      type: 'expense',
      category_id: '',
      description: '',
      value: '',
      frequency: 'monthly',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      day_of_month: '1',
      is_active: true,
      payment_method: 'cash',
      credit_card_id: '',
    });
  };

  const openEdit = (transaction) => {
    setEditing(transaction);
    setForm({
      type: transaction.type,
      category_id: transaction.category_id,
      description: transaction.description,
      value: transaction.value.toString(),
      frequency: transaction.frequency,
      start_date: transaction.start_date,
      end_date: transaction.end_date || '',
      day_of_month: (transaction.day_of_month || 1).toString(),
      is_active: transaction.is_active,
      payment_method: transaction.payment_method || 'cash',
      credit_card_id: transaction.credit_card_id || '',
    });
    setDialogOpen(true);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0);
  };

  const getCategoryName = (categoryId) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat?.name || 'N/A';
  };

  const getCardName = (cardId) => {
    const card = creditCards.find(c => c.id === cardId);
    return card?.name || 'N/A';
  };

  const filteredCategories = categories.filter(c => c.type === form.type);

  const activeTransactions = transactions.filter(t => t.is_active);
  const inactiveTransactions = transactions.filter(t => !t.is_active);

  const totalMonthlyExpenses = transactions
    .filter(t => t.is_active && t.type === 'expense' && t.frequency === 'monthly')
    .reduce((sum, t) => sum + t.value, 0);

  const totalMonthlyIncome = transactions
    .filter(t => t.is_active && t.type === 'income' && t.frequency === 'monthly')
    .reduce((sum, t) => sum + t.value, 0);

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold">Lançamentos Recorrentes</h1>
          <p className="text-muted-foreground">Gerencie suas despesas e receitas fixas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleGenerate} disabled={generating}>
            <RefreshCw className={`h-4 w-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
            Gerar Lançamentos do Mês
          </Button>
          <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Recorrente
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Despesas Fixas Mensais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {formatCurrency(totalMonthlyExpenses)}
            </div>
            <p className="text-xs text-muted-foreground">
              {activeTransactions.filter(t => t.type === 'expense').length} lançamento(s) ativo(s)
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Receitas Fixas Mensais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {formatCurrency(totalMonthlyIncome)}
            </div>
            <p className="text-xs text-muted-foreground">
              {activeTransactions.filter(t => t.type === 'income').length} lançamento(s) ativo(s)
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Saldo Fixo Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalMonthlyIncome - totalMonthlyExpenses >= 0 ? 'text-blue-500' : 'text-red-500'}`}>
              {formatCurrency(totalMonthlyIncome - totalMonthlyExpenses)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5 text-green-500" />
            Lançamentos Ativos ({activeTransactions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Frequência</TableHead>
                <TableHead>Dia</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeTransactions.map((trans) => (
                <TableRow key={trans.id}>
                  <TableCell className="font-medium">{trans.description}</TableCell>
                  <TableCell>
                    <span className={trans.type === 'expense' ? 'text-red-500' : 'text-green-500'}>
                      {trans.type === 'expense' ? 'Despesa' : 'Receita'}
                    </span>
                  </TableCell>
                  <TableCell>{getCategoryName(trans.category_id)}</TableCell>
                  <TableCell>
                    {FREQUENCIES.find(f => f.value === trans.frequency)?.label}
                  </TableCell>
                  <TableCell>Dia {trans.day_of_month || 1}</TableCell>
                  <TableCell className={`text-right font-medium ${trans.type === 'expense' ? 'text-red-500' : 'text-green-500'}`}>
                    {formatCurrency(trans.value)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleToggleActive(trans)} title="Pausar">
                        <Pause className="h-4 w-4 text-yellow-500" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(trans)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(trans.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {activeTransactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Nenhum lançamento recorrente ativo
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Inactive Transactions */}
      {inactiveTransactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Pause className="h-5 w-5 text-yellow-500" />
              Lançamentos Pausados ({inactiveTransactions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inactiveTransactions.map((trans) => (
                  <TableRow key={trans.id} className="opacity-60">
                    <TableCell>{trans.description}</TableCell>
                    <TableCell>{trans.type === 'expense' ? 'Despesa' : 'Receita'}</TableCell>
                    <TableCell>{getCategoryName(trans.category_id)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(trans.value)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleToggleActive(trans)} title="Ativar">
                          <Play className="h-4 w-4 text-green-500" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(trans.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Editar Lançamento Recorrente' : 'Novo Lançamento Recorrente'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div>
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v, category_id: '' })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Despesa</SelectItem>
                  <SelectItem value="income">Receita</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Categoria</Label>
              <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Descrição</Label>
              <Input
                placeholder="Ex: Aluguel, Netflix, Salário..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div>
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
              />
            </div>

            <div>
              <Label>Frequência</Label>
              <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map((freq) => (
                    <SelectItem key={freq.value} value={freq.value}>{freq.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Dia do mês para lançamento</Label>
              <Input
                type="number"
                min="1"
                max="31"
                value={form.day_of_month}
                onChange={(e) => setForm({ ...form, day_of_month: e.target.value })}
              />
            </div>

            <div>
              <Label>Data de início</Label>
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              />
            </div>

            <div>
              <Label>Data de término (opcional)</Label>
              <Input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              />
            </div>

            {form.type === 'expense' && (
              <>
                <div>
                  <Label>Forma de pagamento</Label>
                  <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Dinheiro</SelectItem>
                      <SelectItem value="debit">Débito</SelectItem>
                      <SelectItem value="credit">Crédito</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {form.payment_method === 'credit' && creditCards.length > 0 && (
                  <div>
                    <Label>Cartão de Crédito</Label>
                    <Select value={form.credit_card_id} onValueChange={(v) => setForm({ ...form, credit_card_id: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {creditCards.map((card) => (
                          <SelectItem key={card.id} value={card.id}>{card.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!form.category_id || !form.description || !form.value}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
