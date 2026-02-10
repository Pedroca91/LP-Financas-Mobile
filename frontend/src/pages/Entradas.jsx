import { useState } from 'react';
import { useFinance } from '../contexts/FinanceContext';
import { MonthSelector } from '../components/layout/MonthSelector';
import { AdvancedFilters, filterTransactions } from '../components/AdvancedFilters';
import { formatCurrency, formatDate, getMonthName } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { toast } from '../components/ui/toast-provider';
import { Plus, Pencil, Trash2, ArrowDownCircle } from 'lucide-react';

export function Entradas() {
  const {
    incomes,
    incomeCategories,
    selectedMonth,
    selectedYear,
    createIncome,
    updateIncome,
    deleteIncome,
    loading
  } = useFinance();

  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    category_id: '',
    description: '',
    value: '',
    date: new Date().toISOString().split('T')[0],
    payment_date: '',
    status: 'pending'
  });
  const [filters, setFilters] = useState({
    search: '',
    category: 'all',
    status: 'all',
    minValue: '',
    maxValue: ''
  });

  const filteredIncomes = filterTransactions(incomes, filters);

  const resetForm = () => {
    setFormData({
      category_id: '',
      description: '',
      value: '',
      date: new Date().toISOString().split('T')[0],
      payment_date: '',
      status: 'pending'
    });
    setEditingItem(null);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      category_id: item.category_id,
      description: item.description || '',
      value: String(item.value),
      date: item.date,
      payment_date: item.payment_date || '',
      status: item.status
    });
    setIsOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        value: parseFloat(formData.value),
        month: selectedMonth,
        year: selectedYear
      };

      if (editingItem) {
        await updateIncome(editingItem.id, data);
        toast.success('Entrada atualizada com sucesso!');
      } else {
        await createIncome(data);
        toast.success('Entrada criada com sucesso!');
      }
      setIsOpen(false);
      resetForm();
    } catch (error) {
      toast.error('Erro ao salvar entrada');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta entrada?')) {
      try {
        await deleteIncome(id);
        toast.success('Entrada excluída com sucesso!');
      } catch (error) {
        toast.error('Erro ao excluir entrada');
      }
    }
  };

  const getCategoryName = (categoryId) => {
    const category = incomeCategories.find(c => c.id === categoryId);
    return category?.name || 'Sem categoria';
  };

  const totalReceived = filteredIncomes.filter(i => i.status === 'received').reduce((sum, i) => sum + i.value, 0);
  const totalPending = filteredIncomes.filter(i => i.status === 'pending').reduce((sum, i) => sum + i.value, 0);

  return (
    <div className="space-y-6 animate-fade-in" data-testid="entradas-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-semibold text-foreground flex items-center gap-3">
            <ArrowDownCircle className="h-8 w-8 text-emerald-500" />
            Entradas
          </h1>
          <p className="text-muted-foreground mt-1">
            Registro de receitas de {getMonthName(selectedMonth)} de {selectedYear}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <MonthSelector />
          <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="rounded-sm" data-testid="add-income-btn">
                <Plus className="h-4 w-4 mr-2" />
                Nova Entrada
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editingItem ? 'Editar Entrada' : 'Nova Entrada'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select
                    value={formData.category_id}
                    onValueChange={(v) => setFormData({ ...formData, category_id: v })}
                  >
                    <SelectTrigger data-testid="income-category-select">
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {incomeCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descrição opcional"
                    data-testid="income-description"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Valor</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                      placeholder="0,00"
                      required
                      data-testid="income-value"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(v) => setFormData({ ...formData, status: v })}
                    >
                      <SelectTrigger data-testid="income-status-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pendente</SelectItem>
                        <SelectItem value="received">Recebido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data Prevista</Label>
                    <Input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                      data-testid="income-date"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Data Recebimento</Label>
                    <Input
                      type="date"
                      value={formData.payment_date}
                      onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                      data-testid="income-payment-date"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" data-testid="income-submit-btn">
                    {editingItem ? 'Salvar' : 'Criar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Previsto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold text-foreground">
              {formatCurrency(totalReceived + totalPending)}
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Recebido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold text-emerald-500">
              {formatCurrency(totalReceived)}
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pendente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold text-yellow-500">
              {formatCurrency(totalPending)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Filters */}
      <AdvancedFilters 
        categories={incomeCategories}
        onFilterChange={setFilters}
        type="income"
      />

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoria</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Data Prevista</TableHead>
                <TableHead>Data Recebimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredIncomes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Nenhuma entrada registrada para este período
                  </TableCell>
                </TableRow>
              ) : (
                incomes.map((income) => (
                  <TableRow key={income.id} data-testid={`income-row-${income.id}`}>
                    <TableCell className="font-medium">{getCategoryName(income.category_id)}</TableCell>
                    <TableCell className="text-muted-foreground">{income.description || '-'}</TableCell>
                    <TableCell className="font-mono font-medium text-emerald-500">
                      {formatCurrency(income.value)}
                    </TableCell>
                    <TableCell>{formatDate(income.date)}</TableCell>
                    <TableCell>{formatDate(income.payment_date)}</TableCell>
                    <TableCell>
                      <Badge className={income.status === 'received' ? 'status-received' : 'status-pending'}>
                        {income.status === 'received' ? 'Recebido' : 'Pendente'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(income)}
                          data-testid={`edit-income-${income.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(income.id)}
                          data-testid={`delete-income-${income.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
