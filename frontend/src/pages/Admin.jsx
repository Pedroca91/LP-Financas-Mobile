import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
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
} from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { toast } from '../components/ui/toast-provider';
import { Users, UserCheck, UserX, Trash2, Shield, Pencil, UserPlus } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export function Admin() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user',
    status: 'approved'
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/admin/users`);
      setUsers(response.data);
    } catch (error) {
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'user',
      status: 'approved'
    });
    setEditingUser(null);
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      status: user.status
    });
    setIsEditOpen(true);
  };

  const handleCreate = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    try {
      const updateData = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        status: formData.status
      };
      
      // Só envia senha se foi preenchida
      if (formData.password) {
        updateData.password = formData.password;
      }

      await axios.put(`${API}/admin/users/${editingUser.id}`, updateData);
      toast.success('Usuário atualizado com sucesso!');
      setIsEditOpen(false);
      resetForm();
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao atualizar usuário');
    }
  };

  const handleSubmitCreate = async (e) => {
    e.preventDefault();
    try {
      if (!formData.password) {
        toast.error('Senha é obrigatória para novos usuários');
        return;
      }

      await axios.post(`${API}/admin/users`, {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role
      });
      toast.success('Usuário criado com sucesso!');
      setIsCreateOpen(false);
      resetForm();
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao criar usuário');
    }
  };

  const handleApprove = async (userId) => {
    try {
      await axios.patch(`${API}/admin/users/${userId}/approve`);
      toast.success('Usuário aprovado!');
      fetchUsers();
    } catch (error) {
      toast.error('Erro ao aprovar usuário');
    }
  };

  const handleBlock = async (userId) => {
    try {
      await axios.patch(`${API}/admin/users/${userId}/block`);
      toast.success('Usuário bloqueado!');
      fetchUsers();
    } catch (error) {
      toast.error('Erro ao bloquear usuário');
    }
  };

  const handleDelete = async (userId) => {
    if (window.confirm('Tem certeza? Isso excluirá o usuário e todos os seus dados.')) {
      try {
        await axios.delete(`${API}/admin/users/${userId}`);
        toast.success('Usuário excluído!');
        fetchUsers();
      } catch (error) {
        toast.error('Erro ao excluir usuário');
      }
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: <Badge className="status-pending">Pendente</Badge>,
      approved: <Badge className="status-approved">Aprovado</Badge>,
      blocked: <Badge className="status-blocked">Bloqueado</Badge>
    };
    return badges[status] || status;
  };

  const getRoleBadge = (role) => {
    if (role === 'admin') {
      return <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">Admin</Badge>;
    }
    return <Badge variant="secondary">Usuário</Badge>;
  };

  const pendingCount = users.filter(u => u.status === 'pending').length;

  return (
    <div className="space-y-6 animate-fade-in" data-testid="admin-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-heading font-semibold text-foreground flex items-center gap-3">
          <Shield className="h-8 w-8 text-accent" />
          Painel Administrativo
        </h1>
        <p className="text-muted-foreground mt-1">
          Gerencie usuários e aprovações do sistema
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="card-hover">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{users.length}</div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pendentes</CardTitle>
            <UserCheck className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Aprovados</CardTitle>
            <UserCheck className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">
              {users.filter(u => u.status === 'approved').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Usuários</CardTitle>
          <CardDescription>Lista de todos os usuários cadastrados no sistema</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Cadastro</TableHead>
                <TableHead className="w-32">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} data-testid={`user-row-${user.id}`}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{getRoleBadge(user.role)}</TableCell>
                  <TableCell>{getStatusBadge(user.status)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    {user.id !== currentUser?.id && (
                      <div className="flex items-center gap-1">
                        {user.status === 'pending' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleApprove(user.id)}
                            title="Aprovar"
                            data-testid={`approve-user-${user.id}`}
                          >
                            <UserCheck className="h-4 w-4 text-emerald-500" />
                          </Button>
                        )}
                        {user.status === 'approved' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleBlock(user.id)}
                            title="Bloquear"
                            data-testid={`block-user-${user.id}`}
                          >
                            <UserX className="h-4 w-4 text-yellow-500" />
                          </Button>
                        )}
                        {user.status === 'blocked' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleApprove(user.id)}
                            title="Desbloquear"
                          >
                            <UserCheck className="h-4 w-4 text-emerald-500" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(user.id)}
                          title="Excluir"
                          data-testid={`delete-user-${user.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
