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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Progress } from '../components/ui/progress';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  CreditCard,
  Calendar,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  Receipt
} from 'lucide-react';
import { useToast } from '../components/ui/toast-provider';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export function Cartoes() {
  const { creditCards, selectedMonth, selectedYear, refreshData } = useFinance();
  const toast = useToast();
  
  const [summary, setSummary] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const [statement, setStatement] = useState(null);
  const [installments, setInstallments] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  const [form, setForm] = useState({
    name: '',
    limit: '',
    closing_day: '1',
    due_day: '10',
  });

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_URL}/api/credit-cards/summary?month=${selectedMonth}&year=${selectedYear}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.ok) {
        setSummary(await response.json());
      }
    } catch (error) {
      console.error('Erro ao carregar resumo:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatement = async (cardId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_URL}/api/credit-cards/${cardId}/statement?month=${selectedMonth}&year=${selectedYear}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.ok) {
        setStatement(await response.json());
      }
    } catch (error) {
      console.error('Erro ao carregar fatura:', error);
    }
  };

  const fetchInstallments = async (cardId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_URL}/api/credit-cards/${cardId}/installments`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.ok) {
        setInstallments(await response.json());
      }
    } catch (error) {
      console.error('Erro ao carregar parcelas:', error);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [selectedMonth, selectedYear, creditCards]);

  useEffect(() => {
    if (selectedCard) {
      fetchStatement(selectedCard.id);
      fetchInstallments(selectedCard.id);
    }
  }, [selectedCard, selectedMonth, selectedYear]);

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token');
      const method = editing ? 'PUT' : 'POST';
      const url = editing 
        ? `${API_URL}/api/credit-cards/${editing.id}`
        : `${API_URL}/api/credit-cards`;
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: form.name,
          limit: parseFloat(form.limit),
          closing_day: parseInt(form.closing_day),
          due_day: parseInt(form.due_day),
        }),
      });
      
      if (response.ok) {
        toast.success(editing ? 'Cartão atualizado!' : 'Cartão criado!');
        setDialogOpen(false);
        setEditing(null);
        resetForm();
        await fetchSummary();
        if (refreshData) refreshData();
      } else {
        throw new Error('Erro ao salvar');
      }
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao salvar cartão');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este cartão?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/credit-cards/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        toast.success('Cartão excluído!');
        refreshData();
        fetchSummary();
        if (selectedCard?.id === id) {
          setSelectedCard(null);
        }
      }
    } catch (error) {
      toast.error('Erro ao excluir');
    }
  };

  const resetForm = () => {
    setForm({
      name: '',
      limit: '',
      closing_day: '1',
      due_day: '10',
    });
  };

  const openEdit = (card) => {
    setEditing(card);
    setForm({
      name: card.name,
      limit: card.limit.toString(),
      closing_day: card.closing_day.toString(),
      due_day: card.due_day.toString(),
    });
    setDialogOpen(true);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0);
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR');
  };

  const getMonthName = (month) => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return months[month - 1];
  };

  // Calcular totais
  const totalLimit = summary.reduce((sum, s) => sum + s.limit, 0);
  const totalSpent = summary.reduce((sum, s) => sum + s.spent, 0);
  const totalAvailable = summary.reduce((sum, s) => sum + s.available, 0);
  const totalFutureCommitted = summary.reduce((sum, s) => sum + s.future_committed, 0);

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
          <h1 className="text-3xl font-heading font-bold">Cartões de Crédito</h1>
          <p className="text-muted-foreground">Gerencie seus cartões, faturas e parcelas</p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Cartão
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Limite Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              {formatCurrency(totalLimit)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Gasto no Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {formatCurrency(totalSpent)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Disponível</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {formatCurrency(totalAvailable)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Parcelas Futuras</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">
              {formatCurrency(totalFutureCommitted)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {summary.map((item) => {
          const usageColor = item.usage_percentage >= 90 ? 'bg-red-500' : 
                            item.usage_percentage >= 70 ? 'bg-yellow-500' : 'bg-green-500';
          
          return (
            <Card 
              key={item.card.id} 
              className={`cursor-pointer transition-all hover:shadow-lg ${
                selectedCard?.id === item.card.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setSelectedCard(item.card)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    <span>{item.card.name}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={(e) => { e.stopPropagation(); openEdit(item.card); }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={(e) => { e.stopPropagation(); handleDelete(item.card.id); }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Utilização</span>
                    <span className="font-medium">{item.usage_percentage.toFixed(0)}%</span>
                  </div>
                  <Progress value={item.usage_percentage} className="h-2" />
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Limite</p>
                    <p className="font-medium">{formatCurrency(item.limit)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Disponível</p>
                    <p className="font-medium text-green-500">{formatCurrency(item.available)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Fatura Atual</p>
                    <p className="font-medium text-red-500">{formatCurrency(item.spent)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Parcelas Futuras</p>
                    <p className="font-medium text-yellow-500">{formatCurrency(item.future_committed)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                  <span>Fecha dia {item.card.closing_day}</span>
                  <span>Vence dia {item.card.due_day}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {summary.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum cartão cadastrado</p>
              <Button className="mt-4" onClick={() => { resetForm(); setDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Cartão
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Card Details */}
      {selectedCard && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              {selectedCard.name} - Detalhes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="statement">Fatura do Mês</TabsTrigger>
                <TabsTrigger value="installments">Parcelas Futuras</TabsTrigger>
              </TabsList>

              <TabsContent value="statement" className="mt-4">
                {statement ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                      <div>
                        <p className="text-sm text-muted-foreground">Total da Fatura</p>
                        <p className="text-2xl font-bold text-red-500">{formatCurrency(statement.total)}</p>
                      </div>
                      <Receipt className="h-8 w-8 text-muted-foreground" />
                    </div>

                    {Object.entries(statement.by_category).map(([category, data]) => (
                      <div key={category} className="border rounded-lg p-4">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-medium">{category}</h4>
                          <span className="text-sm font-medium">{formatCurrency(data.subtotal)}</span>
                        </div>
                        <div className="space-y-2">
                          {data.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center text-sm">
                              <div>
                                <span>{item.description}</span>
                                {item.installment && (
                                  <span className="ml-2 text-xs text-muted-foreground">
                                    ({item.installment})
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="text-muted-foreground">{formatDate(item.date)}</span>
                                <span className="font-medium">{formatCurrency(item.value)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    {Object.keys(statement.by_category).length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        Nenhuma despesa neste cartão no mês
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Carregando...</p>
                )}
              </TabsContent>

              <TabsContent value="installments" className="mt-4">
                {installments ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Comprometido</p>
                        <p className="text-2xl font-bold text-yellow-500">
                          {formatCurrency(installments.total_committed)}
                        </p>
                      </div>
                      <Calendar className="h-8 w-8 text-muted-foreground" />
                    </div>

                    {/* Monthly totals */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {Object.entries(installments.monthly_totals)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .slice(0, 6)
                        .map(([key, value]) => {
                          const [year, month] = key.split('-');
                          return (
                            <div key={key} className="p-3 bg-muted rounded-lg text-center">
                              <p className="text-xs text-muted-foreground">
                                {getMonthName(parseInt(month))}/{year}
                              </p>
                              <p className="font-medium">{formatCurrency(value)}</p>
                            </div>
                          );
                        })}
                    </div>

                    {/* Installments list */}
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Parcela</TableHead>
                          <TableHead>Mês</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {installments.installments.slice(0, 20).map((inst, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{inst.description}</TableCell>
                            <TableCell>{inst.installment}/{inst.total_installments}</TableCell>
                            <TableCell>{getMonthName(inst.month)}/{inst.year}</TableCell>
                            <TableCell className="text-right">{formatCurrency(inst.value)}</TableCell>
                          </TableRow>
                        ))}
                        {installments.installments.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground">
                              Nenhuma parcela futura
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Carregando...</p>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Editar Cartão' : 'Novo Cartão de Crédito'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome do Cartão</Label>
              <Input
                placeholder="Ex: Nubank, Itaú..."
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Limite (R$)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={form.limit}
                onChange={(e) => setForm({ ...form, limit: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Dia de Fechamento</Label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={form.closing_day}
                  onChange={(e) => setForm({ ...form, closing_day: e.target.value })}
                />
              </div>
              <div>
                <Label>Dia de Vencimento</Label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={form.due_day}
                  onChange={(e) => setForm({ ...form, due_day: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!form.name || !form.limit}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
