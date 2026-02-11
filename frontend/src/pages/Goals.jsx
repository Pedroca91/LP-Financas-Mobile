import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Progress } from '../components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import { toast } from '../components/ui/toast-provider';
import { 
  Target, Plus, Pencil, Trash2, PiggyBank, Plane, Car, Home, 
  GraduationCap, Wallet, TrendingUp, CheckCircle2, Clock
} from 'lucide-react';
import { formatCurrency } from '../lib/utils';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const GOAL_CATEGORIES = [
  { value: 'general', label: 'Geral', icon: Target },
  { value: 'emergency', label: 'Reserva de Emergência', icon: PiggyBank },
  { value: 'travel', label: 'Viagem', icon: Plane },
  { value: 'car', label: 'Carro', icon: Car },
  { value: 'house', label: 'Casa/Imóvel', icon: Home },
  { value: 'education', label: 'Educação', icon: GraduationCap },
  { value: 'investment', label: 'Investimento', icon: TrendingUp },
  { value: 'other', label: 'Outro', icon: Wallet },
];

const GOAL_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', 
  '#EC4899', '#06B6D4', '#84CC16'
];

export function Goals() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [isContributeOpen, setIsContributeOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [contributionValue, setContributionValue] = useState('');
  const [contributionNote, setContributionNote] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    target_value: '',
    current_value: '0',
    deadline: '',
    category: 'general',
    color: '#3B82F6',
    icon: 'target'
  });

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      const response = await axios.get(`${API}/goals`);
      setGoals(response.data);
    } catch (error) {
      toast.error('Erro ao carregar metas');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      target_value: '',
      current_value: '0',
      deadline: '',
      category: 'general',
      color: '#3B82F6',
      icon: 'target'
    });
    setEditingGoal(null);
  };

  const handleEdit = (goal) => {
    setEditingGoal(goal);
    setFormData({
      name: goal.name,
      description: goal.description || '',
      target_value: String(goal.target_value),
      current_value: String(goal.current_value),
      deadline: goal.deadline || '',
      category: goal.category,
      color: goal.color,
      icon: goal.icon
    });
    setIsOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        target_value: parseFloat(formData.target_value),
        current_value: parseFloat(formData.current_value || 0)
      };

      if (editingGoal) {
        await axios.put(`${API}/goals/${editingGoal.id}`, data);
        toast.success('Meta atualizada com sucesso!');
      } else {
        await axios.post(`${API}/goals`, data);
        toast.success('Meta criada com sucesso!');
      }
      setIsOpen(false);
      resetForm();
      fetchGoals();
    } catch (error) {
      toast.error('Erro ao salvar meta');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta meta?')) {
      try {
        await axios.delete(`${API}/goals/${id}`);
        toast.success('Meta excluída!');
        fetchGoals();
      } catch (error) {
        toast.error('Erro ao excluir meta');
      }
    }
  };

  const handleContribute = async (e) => {
    e.preventDefault();
    if (!selectedGoal) return;

    try {
      await axios.post(`${API}/goals/${selectedGoal.id}/contribute?value=${parseFloat(contributionValue)}&note=${encodeURIComponent(contributionNote)}`);
      toast.success('Contribuição adicionada!');
      setIsContributeOpen(false);
      setContributionValue('');
      setContributionNote('');
      setSelectedGoal(null);
      fetchGoals();
    } catch (error) {
      toast.error('Erro ao adicionar contribuição');
    }
  };

  const openContribute = (goal) => {
    setSelectedGoal(goal);
    setIsContributeOpen(true);
  };

  const getCategoryIcon = (category) => {
    const cat = GOAL_CATEGORIES.find(c => c.value === category);
    return cat ? cat.icon : Target;
  };

  const getProgress = (goal) => {
    return Math.min((goal.current_value / goal.target_value) * 100, 100);
  };

  const activeGoals = goals.filter(g => !g.is_completed);
  const completedGoals = goals.filter(g => g.is_completed);
  const totalTarget = activeGoals.reduce((sum, g) => sum + g.target_value, 0);
  const totalCurrent = activeGoals.reduce((sum, g) => sum + g.current_value, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-semibold text-foreground flex items-center gap-3">
            <Target className="h-8 w-8 text-primary" />
            Metas Financeiras
          </h1>
          <p className="text-muted-foreground mt-1">
            Planeje e acompanhe suas metas de economia
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="rounded-sm">
              <Plus className="h-4 w-4 mr-2" />
              Nova Meta
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingGoal ? 'Editar Meta' : 'Nova Meta'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome da Meta</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Viagem para Europa"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Descrição (opcional)</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detalhes da meta"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor Alvo</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.target_value}
                    onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                    placeholder="0,00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valor Atual</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.current_value}
                    onChange={(e) => setFormData({ ...formData, current_value: e.target.value })}
                    placeholder="0,00"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(v) => setFormData({ ...formData, category: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GOAL_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Prazo (opcional)</Label>
                  <Input
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Cor</Label>
                <div className="flex gap-2 flex-wrap">
                  {GOAL_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        formData.color === color ? 'border-foreground scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData({ ...formData, color })}
                    />
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingGoal ? 'Salvar' : 'Criar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total em Metas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold text-foreground">
              {formatCurrency(totalTarget)}
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Já Guardado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold text-primary">
              {formatCurrency(totalCurrent)}
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Falta Guardar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold text-amber-500">
              {formatCurrency(Math.max(totalTarget - totalCurrent, 0))}
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Metas Completas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono font-bold text-emerald-500">
              {completedGoals.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Goals */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Clock className="h-5 w-5 text-amber-500" />
          Metas em Andamento ({activeGoals.length})
        </h2>
        
        {activeGoals.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhuma meta cadastrada ainda.</p>
              <p className="text-sm text-muted-foreground mt-1">Crie sua primeira meta para começar!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeGoals.map((goal) => {
              const Icon = getCategoryIcon(goal.category);
              const progress = getProgress(goal);
              return (
                <Card key={goal.id} className="card-hover overflow-hidden">
                  <div className="h-2" style={{ backgroundColor: goal.color }}></div>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${goal.color}20` }}
                        >
                          <Icon className="h-5 w-5" style={{ color: goal.color }} />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{goal.name}</CardTitle>
                          {goal.description && (
                            <CardDescription className="text-xs mt-0.5">{goal.description}</CardDescription>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(goal)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(goal.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Progresso</span>
                        <span className="font-medium">{progress.toFixed(1)}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs text-muted-foreground">Atual</p>
                        <p className="font-mono font-semibold" style={{ color: goal.color }}>
                          {formatCurrency(goal.current_value)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Meta</p>
                        <p className="font-mono font-semibold">
                          {formatCurrency(goal.target_value)}
                        </p>
                      </div>
                    </div>
                    {goal.deadline && (
                      <p className="text-xs text-muted-foreground">
                        Prazo: {new Date(goal.deadline).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                    <Button 
                      className="w-full" 
                      size="sm"
                      onClick={() => openContribute(goal)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Valor
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            Metas Concluídas ({completedGoals.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {completedGoals.map((goal) => {
              const Icon = getCategoryIcon(goal.category);
              return (
                <Card key={goal.id} className="opacity-75">
                  <div className="h-2 bg-emerald-500"></div>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <Icon className="h-5 w-5 text-emerald-500" />
                      </div>
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {goal.name}
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        </CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="font-mono font-semibold text-emerald-500">
                      {formatCurrency(goal.target_value)}
                    </p>
                    {goal.completed_at && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Concluída em: {new Date(goal.completed_at).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Contribute Modal */}
      <Dialog open={isContributeOpen} onOpenChange={setIsContributeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar à Meta: {selectedGoal?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleContribute} className="space-y-4">
            <div className="space-y-2">
              <Label>Valor a Adicionar</Label>
              <Input
                type="number"
                step="0.01"
                value={contributionValue}
                onChange={(e) => setContributionValue(e.target.value)}
                placeholder="0,00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Observação (opcional)</Label>
              <Input
                value={contributionNote}
                onChange={(e) => setContributionNote(e.target.value)}
                placeholder="Ex: Bônus do trabalho"
              />
            </div>
            {selectedGoal && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Atual: {formatCurrency(selectedGoal.current_value)} / {formatCurrency(selectedGoal.target_value)}
                </p>
                {contributionValue && (
                  <p className="text-sm font-medium text-primary mt-1">
                    Novo total: {formatCurrency(selectedGoal.current_value + parseFloat(contributionValue || 0))}
                  </p>
                )}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsContributeOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                Adicionar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
