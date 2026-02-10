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
import { Plus, Pencil, Trash2, ArrowUpCircle, CreditCard } from 'lucide-react';

export function Saidas() {
  const {
    expenses,
    expenseCategories,
    creditCards,
    selectedMonth,
    selectedYear,
    createExpense,
    updateExpense,
    deleteExpense,
  } = useFinance();

  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    category_id: '',
    description: '',
    value: '',
    date: new Date().toISOString().split('T')[0],
    payment_method: 'cash',
    credit_card_id: '',
    installments: '1',
    current_installment: '1',
    due_date: '',
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

  const filteredExpenses = filterTransactions(expenses, filters);

  const resetForm = () => {
    setFormData({
      category_id: '',
      description: '',
      value: '',
      date: new Date().toISOString().split('T')[0],
      payment_method: 'cash',
      credit_card_id: '',
      installments: '1',
      current_installment: '1',
      due_date: '',
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
      payment_method: item.payment_method,
      credit_card_id: item.credit_card_id || '',
      installments: String(item.installments),
      current_installment: String(item.current_installment),
      due_date: item.due_date || '',
      payment_date: item.payment_date || '',
      status: item.status
    });
    setIsOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Determinar o mês/ano baseado na data de vencimento (due_date)
      // Se não tiver due_date, usa o mês/ano selecionado
      let targetMonth = selectedMonth;
      let targetYear = selectedYear;
      
      if (formData.due_date) {
        const dueDate = new Date(formData.due_date + 'T00:00:00');
        targetMonth = dueDate.getMonth() + 1; // getMonth() retorna 0-11
        targetYear = dueDate.getFullYear();
      }
      
      const data = {
        ...formData,
        value: parseFloat(formData.value),
        installments: parseInt(formData.installments),
        current_installment: parseInt(formData.current_installment),
        month: targetMonth,
        year: targetYear
      };

      if (editingItem) {
        await updateExpense(editingItem.id, data);
        toast.success('Saída atualizada com sucesso!');
      } else {
        await createExpense(data);
        toast.success(`Saída criada para ${targetMonth.toString().padStart(2, '0')}/${targetYear}!`);
      }
      setIsOpen(false);
      resetForm();
    } catch (error) {
      toast.error('Erro ao salvar saída');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta saída?')) {
      try {
        await deleteExpense(id);
        toast.success('Saída excluída com sucesso!');
      } catch (error) {
        toast.error('Erro ao excluir saída');
      }
    }
  };

  const getCategoryName = (categoryId) => {
    const category = expenseCategories.find(c => c.id === categoryId);
    return category?.name || 'Sem categoria';
  };

  const getCreditCardName = (cardId) => {
    const card = creditCards.find(c => c.id === cardId);
    return card?.name || '-';
  };

  const getPaymentMethodLabel = (method) => {
    const labels = { cash: 'Dinheiro', debit: 'Débito', credit: 'Crédito' };
    return labels[method] || method;
  };

  const totalPaid = filteredExpenses.filter(e => e.status === 'paid').reduce((sum, e) => sum + e.value, 0);
  const totalPending = filteredExpenses.filter(e => e.status === 'pending').reduce((sum, e) => sum + e.value, 0);

  return (
    <div className="space-y-6 animate-fade-in" data-testid="saidas-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-semibold text-foreground flex items-center gap-3">
            <ArrowUpCircle className="h-8 w-8 text-red-500" />
            Saídas
          </h1>
          <p className="text-muted-foreground mt-1">
            Registro de despesas de {getMonthName(selectedMonth)} de {selectedYear}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <MonthSelector />
          <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="rounded-sm" data-testid="add-expense-btn">
                <Plus className="h-4 w-4 mr-2" />
                Nova Saída
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingItem ? 'Editar Saída' : 'Nova Saída'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Select
                      value={formData.category_id}
                      onValueChange={(v) => setFormData({ ...formData, category_id: v })}
                    >
                      <SelectTrigger data-testid="expense-category-select">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {expenseCategories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Valor</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                      placeholder="0,00"
                      required
                      data-testid="expense-value"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descrição opcional"
                    data-testid="expense-description"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Forma de Pagamento</Label>
                    <Select
                      value={formData.payment_method}
                      onValueChange={(v) => setFormData({ ...formData, payment_method: v })}
                    >
                      <SelectTrigger data-testid="expense-payment-method">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Dinheiro</SelectItem>
                        <SelectItem value="debit">Débito</SelectItem>
                        <SelectItem value="credit">Crédito</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(v) => setFormData({ ...formData, status: v })}
                    >
                      <SelectTrigger data-testid="expense-status-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pendente</SelectItem>
                        <SelectItem value="paid">Pago</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {formData.payment_method === 'credit' && (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Cartão</Label>
                      <Select
                        value={formData.credit_card_id}
                        onValueChange={(v) => {
                          // Auto-preencher data de vencimento baseado no cartão
                          const selectedCard = creditCards.find(c => c.id === v);
                          let newDueDate = formData.due_date;
                          
                          if (selectedCard && selectedCard.due_day) {
                            // Calcular próximo vencimento baseado na data da compra
                            const purchaseDate = formData.date ? new Date(formData.date + 'T00:00:00') : new Date();
                            const closingDay = selectedCard.closing_day || 25;
                            const dueDay = selectedCard.due_day;
                            
                            let dueMonth = purchaseDate.getMonth();
                            let dueYear = purchaseDate.getFullYear();
                            
                            // Se a compra foi depois do fechamento, vai para o próximo mês
                            if (purchaseDate.getDate() > closingDay) {
                              dueMonth += 1;
                            }
                            // O vencimento é sempre no mês seguinte ao fechamento
                            dueMonth += 1;
                            
                            if (dueMonth > 11) {
                              dueMonth -= 12;
                              dueYear += 1;
                            }
                            
                            newDueDate = `${dueYear}-${String(dueMonth + 1).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`;
                          }
                          
                          setFormData({ ...formData, credit_card_id: v, due_date: newDueDate });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {creditCards.map((card) => (
                            <SelectItem key={card.id} value={card.id}>{card.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Parcelas</Label>
                      <Input
                        type="number"
                        min="1"
                        value={formData.installments}
                        onChange={(e) => setFormData({ ...formData, installments: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Parcela Atual</Label>
                      <Input
                        type="number"
                        min="1"
                        value={formData.current_installment}
                        onChange={(e) => setFormData({ ...formData, current_installment: e.target.value })}
                      />
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Data da Compra</Label>
                    <Input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                      data-testid="expense-date"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Vencimento (define o mês)</Label>
                    <Input
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    />
                    {formData.due_date && (
                      <p className="text-xs text-primary">
                        → Irá para: {new Date(formData.due_date + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Data Pagamento</Label>
                    <Input
                      type="date"
                      value={formData.payment_date}
                      onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" data-testid="expense-submit-btn">
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
              {formatCurrency(totalPaid + totalPending)}
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pago</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold text-red-500">
              {formatCurrency(totalPaid)}
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
        categories={expenseCategories}
        onFilterChange={setFilters}
        type="expense"
      />

      {/* Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoria</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Forma</TableHead>
                <TableHead>Cartão</TableHead>
                <TableHead>Parcela</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    Nenhuma saída registrada para este período
                  </TableCell>
                </TableRow>
              ) : (
                expenses.map((expense) => (
                  <TableRow key={expense.id} data-testid={`expense-row-${expense.id}`}>
                    <TableCell className="font-medium">{getCategoryName(expense.category_id)}</TableCell>
                    <TableCell className="text-muted-foreground">{expense.description || '-'}</TableCell>
                    <TableCell className="font-mono font-medium text-red-500">
                      {formatCurrency(expense.value)}
                    </TableCell>
                    <TableCell>{getPaymentMethodLabel(expense.payment_method)}</TableCell>
                    <TableCell>
                      {expense.payment_method === 'credit' ? (
                        <div className="flex items-center gap-1">
                          <CreditCard className="h-3 w-3" />
                          {getCreditCardName(expense.credit_card_id)}
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {expense.installments > 1 ? `${expense.current_installment}/${expense.installments}` : '-'}
                    </TableCell>
                    <TableCell>{formatDate(expense.due_date)}</TableCell>
                    <TableCell>
                      <Badge className={expense.status === 'paid' ? 'status-paid' : 'status-pending'}>
                        {expense.status === 'paid' ? 'Pago' : 'Pendente'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(expense)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(expense.id)}
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
