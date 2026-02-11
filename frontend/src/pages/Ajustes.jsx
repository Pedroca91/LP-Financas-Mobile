import { useState } from 'react';
import { useFinance } from '../contexts/FinanceContext';
import { formatCurrency } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import { toast } from '../components/ui/toast-provider';
import { Settings, Plus, Pencil, Trash2, CreditCard, Tags, Bell, Smartphone, Download, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { usePWA } from '../hooks/usePWA';

export function Ajustes() {
  const {
    categories,
    creditCards,
    createCategory,
    updateCategory,
    deleteCategory,
    createCreditCard,
    updateCreditCard,
    deleteCreditCard
  } = useFinance();

  const { 
    permission, 
    loading: notifLoading, 
    supported: notifSupported, 
    enableNotifications,
    isEnabled: notificationsEnabled
  } = useNotifications();

  const {
    isInstallable,
    isInstalled,
    isOnline,
    updateAvailable,
    installApp,
    updateApp,
    clearCache
  } = usePWA();

  const [activeTab, setActiveTab] = useState('categories');
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isCardOpen, setIsCardOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingCard, setEditingCard] = useState(null);

  const [categoryForm, setCategoryForm] = useState({ name: '', type: 'expense' });
  const [cardForm, setCardForm] = useState({ name: '', limit: '', closing_day: '', due_day: '' });

  const resetCategoryForm = () => {
    setCategoryForm({ name: '', type: 'expense' });
    setEditingCategory(null);
  };

  const resetCardForm = () => {
    setCardForm({ name: '', limit: '', closing_day: '', due_day: '' });
    setEditingCard(null);
  };

  const handleEditCategory = (cat) => {
    setEditingCategory(cat);
    setCategoryForm({ name: cat.name, type: cat.type });
    setIsCategoryOpen(true);
  };

  const handleEditCard = (card) => {
    setEditingCard(card);
    setCardForm({
      name: card.name,
      limit: String(card.limit),
      closing_day: String(card.closing_day),
      due_day: String(card.due_day)
    });
    setIsCardOpen(true);
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, categoryForm);
        toast.success('Categoria atualizada!');
      } else {
        await createCategory(categoryForm);
        toast.success('Categoria criada!');
      }
      setIsCategoryOpen(false);
      resetCategoryForm();
    } catch (error) {
      toast.error('Erro ao salvar categoria');
    }
  };

  const handleDeleteCategory = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta categoria?')) {
      try {
        await deleteCategory(id);
        toast.success('Categoria excluída!');
      } catch (error) {
        toast.error('Erro ao excluir categoria');
      }
    }
  };

  const handleCardSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...cardForm,
        limit: parseFloat(cardForm.limit),
        closing_day: parseInt(cardForm.closing_day),
        due_day: parseInt(cardForm.due_day)
      };
      if (editingCard) {
        await updateCreditCard(editingCard.id, data);
        toast.success('Cartão atualizado!');
      } else {
        await createCreditCard(data);
        toast.success('Cartão criado!');
      }
      setIsCardOpen(false);
      resetCardForm();
    } catch (error) {
      toast.error('Erro ao salvar cartão');
    }
  };

  const handleDeleteCard = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este cartão?')) {
      try {
        await deleteCreditCard(id);
        toast.success('Cartão excluído!');
      } catch (error) {
        toast.error('Erro ao excluir cartão');
      }
    }
  };

  const handleEnableNotifications = async () => {
    const result = await enableNotifications();
    if (result.success) {
      toast.success('Notificações ativadas com sucesso!');
    } else {
      toast.error(result.error || 'Erro ao ativar notificações');
    }
  };

  const handleInstallApp = async () => {
    const result = await installApp();
    if (result.success) {
      toast.success('App instalado com sucesso!');
    } else {
      toast.error(result.error || 'Erro ao instalar app');
    }
  };

  const handleClearCache = async () => {
    try {
      await clearCache();
      toast.success('Cache limpo com sucesso!');
    } catch (error) {
      toast.error('Erro ao limpar cache');
    }
  };

  const getTypeLabel = (type) => {
    const labels = { income: 'Receita', expense: 'Despesa', investment: 'Investimento' };
    return labels[type] || type;
  };

  const getTypeBadgeClass = (type) => {
    const classes = {
      income: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
      expense: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      investment: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
    };
    return classes[type] || '';
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="ajustes-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-heading font-semibold text-foreground flex items-center gap-3">
          <Settings className="h-8 w-8 text-primary" />
          Ajustes
        </h1>
        <p className="text-muted-foreground mt-1">
          Configure categorias, cartões de crédito e preferências do app
        </p>
      </div>

      {/* Online/Offline Status */}
      <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${isOnline ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
        {isOnline ? (
          <>
            <Wifi className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-sm text-emerald-700 dark:text-emerald-300">Você está online</span>
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span className="text-sm text-amber-700 dark:text-amber-300">Você está offline - Alguns recursos podem não funcionar</span>
          </>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="categories" data-testid="tab-categories">
            <Tags className="h-4 w-4 mr-2" />
            Categorias
          </TabsTrigger>
          <TabsTrigger value="cards" data-testid="tab-cards">
            <CreditCard className="h-4 w-4 mr-2" />
            Cartões
          </TabsTrigger>
          <TabsTrigger value="notifications" data-testid="tab-notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notificações
          </TabsTrigger>
          <TabsTrigger value="app" data-testid="tab-app">
            <Smartphone className="h-4 w-4 mr-2" />
            App
          </TabsTrigger>
        </TabsList>

        {/* Categories Tab */}
        <TabsContent value="categories" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Categorias</CardTitle>
                <CardDescription>Gerencie suas categorias de receitas, despesas e investimentos</CardDescription>
              </div>
              <Dialog open={isCategoryOpen} onOpenChange={(open) => { setIsCategoryOpen(open); if (!open) resetCategoryForm(); }}>
                <DialogTrigger asChild>
                  <Button className="rounded-sm" data-testid="add-category-btn">
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Categoria
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingCategory ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCategorySubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Nome</Label>
                      <Input
                        value={categoryForm.name}
                        onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                        placeholder="Nome da categoria"
                        required
                        data-testid="category-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <Select
                        value={categoryForm.type}
                        onValueChange={(v) => setCategoryForm({ ...categoryForm, type: v })}
                      >
                        <SelectTrigger data-testid="category-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="income">Receita</SelectItem>
                          <SelectItem value="expense">Despesa</SelectItem>
                          <SelectItem value="investment">Investimento</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setIsCategoryOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit" data-testid="category-submit-btn">
                        {editingCategory ? 'Salvar' : 'Criar'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Padrão</TableHead>
                    <TableHead className="w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((cat) => (
                    <TableRow key={cat.id}>
                      <TableCell className="font-medium">{cat.name}</TableCell>
                      <TableCell>
                        <Badge className={getTypeBadgeClass(cat.type)}>
                          {getTypeLabel(cat.type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {cat.is_default ? <Badge variant="secondary">Sim</Badge> : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditCategory(cat)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteCategory(cat.id)}
                          >
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
        </TabsContent>

        {/* Cards Tab */}
        <TabsContent value="cards" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Cartões de Crédito</CardTitle>
                <CardDescription>Gerencie seus cartões de crédito</CardDescription>
              </div>
              <Dialog open={isCardOpen} onOpenChange={(open) => { setIsCardOpen(open); if (!open) resetCardForm(); }}>
                <DialogTrigger asChild>
                  <Button className="rounded-sm" data-testid="add-card-btn">
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Cartão
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingCard ? 'Editar Cartão' : 'Novo Cartão'}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCardSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Nome do Cartão</Label>
                      <Input
                        value={cardForm.name}
                        onChange={(e) => setCardForm({ ...cardForm, name: e.target.value })}
                        placeholder="Ex: Nubank, Itaú..."
                        required
                        data-testid="card-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Limite</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={cardForm.limit}
                        onChange={(e) => setCardForm({ ...cardForm, limit: e.target.value })}
                        placeholder="0,00"
                        required
                        data-testid="card-limit"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Dia Fechamento</Label>
                        <Input
                          type="number"
                          min="1"
                          max="31"
                          value={cardForm.closing_day}
                          onChange={(e) => setCardForm({ ...cardForm, closing_day: e.target.value })}
                          placeholder="1-31"
                          required
                          data-testid="card-closing-day"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Dia Vencimento</Label>
                        <Input
                          type="number"
                          min="1"
                          max="31"
                          value={cardForm.due_day}
                          onChange={(e) => setCardForm({ ...cardForm, due_day: e.target.value })}
                          placeholder="1-31"
                          required
                          data-testid="card-due-day"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setIsCardOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit" data-testid="card-submit-btn">
                        {editingCard ? 'Salvar' : 'Criar'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Limite</TableHead>
                    <TableHead>Fechamento</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead className="w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {creditCards.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Nenhum cartão cadastrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    creditCards.map((card) => (
                      <TableRow key={card.id}>
                        <TableCell className="font-medium">{card.name}</TableCell>
                        <TableCell className="font-mono">{formatCurrency(card.limit)}</TableCell>
                        <TableCell>Dia {card.closing_day}</TableCell>
                        <TableCell>Dia {card.due_day}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditCard(card)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteCard(card.id)}
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
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notificações Push
              </CardTitle>
              <CardDescription>
                Receba alertas sobre vencimentos, metas e dicas financeiras
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!notifSupported ? (
                <div className="bg-amber-100 dark:bg-amber-900/30 p-4 rounded-lg">
                  <p className="text-amber-700 dark:text-amber-300 text-sm">
                    Seu navegador não suporta notificações push. Tente usar Chrome, Firefox ou Edge.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">Ativar Notificações</p>
                      <p className="text-sm text-muted-foreground">
                        Receba alertas mesmo quando o app estiver fechado
                      </p>
                    </div>
                    {notificationsEnabled ? (
                      <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                        Ativado
                      </Badge>
                    ) : (
                      <Button 
                        onClick={handleEnableNotifications} 
                        disabled={notifLoading}
                        size="sm"
                      >
                        {notifLoading ? 'Ativando...' : 'Ativar'}
                      </Button>
                    )}
                  </div>

                  {notificationsEnabled && (
                    <div className="space-y-4 pt-4 border-t">
                      <p className="text-sm font-medium text-muted-foreground">Você receberá notificações sobre:</p>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                          <span className="text-sm">Contas próximas do vencimento</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                          <span className="text-sm">Alertas de orçamento (80% e 100%)</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                          <span className="text-sm">Dicas personalizadas</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                          <span className="text-sm">Resumo semanal</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {permission === 'denied' && (
                    <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-lg">
                      <p className="text-red-700 dark:text-red-300 text-sm">
                        As notificações foram bloqueadas. Para ativá-las, vá nas configurações do seu navegador e permita notificações para este site.
                      </p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* App Tab */}
        <TabsContent value="app" className="mt-6">
          <div className="space-y-6">
            {/* Install Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Instalar App
                </CardTitle>
                <CardDescription>
                  Instale o LP Finanças na tela inicial do seu dispositivo
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isInstalled ? (
                  <div className="flex items-center gap-3 bg-emerald-100 dark:bg-emerald-900/30 p-4 rounded-lg">
                    <Smartphone className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <p className="font-medium text-emerald-700 dark:text-emerald-300">App instalado!</p>
                      <p className="text-sm text-emerald-600 dark:text-emerald-400">
                        Você está usando a versão instalada do app
                      </p>
                    </div>
                  </div>
                ) : isInstallable ? (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Instale o app para acesso rápido e uso offline. O app funciona como um aplicativo nativo sem ocupar muito espaço.
                    </p>
                    <Button onClick={handleInstallApp} className="w-full sm:w-auto">
                      <Download className="h-4 w-4 mr-2" />
                      Instalar App
                    </Button>
                  </div>
                ) : (
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      A instalação não está disponível no momento. No celular, use o menu do navegador e selecione "Adicionar à tela inicial".
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Update Card */}
            {updateAvailable && (
              <Card className="border-amber-200 dark:border-amber-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                    <RefreshCw className="h-5 w-5" />
                    Atualização Disponível
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Uma nova versão do app está disponível com melhorias e correções.
                    </p>
                    <Button onClick={updateApp} variant="outline">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Atualizar Agora
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Offline Mode Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {isOnline ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
                  Modo Offline
                </CardTitle>
                <CardDescription>
                  Acesse seus dados mesmo sem internet
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-medium">Status da Conexão</p>
                    <p className="text-sm text-muted-foreground">
                      {isOnline ? 'Conectado à internet' : 'Sem conexão'}
                    </p>
                  </div>
                  <Badge className={isOnline ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'}>
                    {isOnline ? 'Online' : 'Offline'}
                  </Badge>
                </div>

                <div className="pt-4 border-t space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">Recursos offline:</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                      <span>Visualizar dashboard e transações</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                      <span>Acessar categorias e configurações</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                      <span>Criar/editar transações (sincroniza ao voltar online)</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button variant="outline" onClick={handleClearCache} size="sm">
                    Limpar Cache
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Limpe o cache se estiver com problemas de carregamento
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
