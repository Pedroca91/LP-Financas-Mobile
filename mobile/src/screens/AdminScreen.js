import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Alert,
  FlatList,
  Switch,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import api from '../services/api';

export default function AdminScreen() {
  const { colors, isDark } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user',
  });

  const fetchUsers = async () => {
    try {
      const response = await api.get('/admin/users');
      setUsers(response.data);
    } catch (error) {
      console.log('Error fetching users:', error);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
  }, []);

  const openAddModal = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'user',
    });
    setModalVisible(true);
  };

  const handleCreateUser = async () => {
    if (!formData.name || !formData.email || !formData.password) {
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }
    try {
      await api.post('/admin/users', formData);
      setModalVisible(false);
      fetchUsers();
      Alert.alert('Sucesso', 'Usuário criado com sucesso!');
    } catch (error) {
      const message = error.response?.data?.detail || 'Erro ao criar usuário';
      Alert.alert('Erro', message);
    }
  };

  const approveUser = async (user) => {
    Alert.alert('Aprovar', `Deseja aprovar o usuário ${user.name}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Aprovar',
        onPress: async () => {
          try {
            await api.put(`/admin/users/${user.id}`, { status: 'approved' });
            fetchUsers();
            Alert.alert('Sucesso', 'Usuário aprovado!');
          } catch (error) {
            Alert.alert('Erro', 'Não foi possível aprovar');
          }
        },
      },
    ]);
  };

  const toggleBlock = async (user) => {
    try {
      const newStatus = user.status === 'blocked' ? 'approved' : 'blocked';
      await api.put(`/admin/users/${user.id}`, { status: newStatus });
      fetchUsers();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível atualizar');
    }
  };

  const toggleActive = async (user) => {
    try {
      await api.put(`/admin/users/${user.id}`, { is_active: !user.is_active });
      fetchUsers();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível atualizar');
    }
  };

  const toggleAdmin = async (user) => {
    try {
      const newRole = user.role === 'admin' ? 'user' : 'admin';
      await api.put(`/admin/users/${user.id}`, { role: newRole });
      fetchUsers();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível atualizar');
    }
  };

  const deleteUser = (user) => {
    Alert.alert('Excluir', `Deseja excluir o usuário ${user.name}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/admin/users/${user.id}`);
            fetchUsers();
          } catch (error) {
            Alert.alert('Erro', 'Não foi possível excluir');
          }
        },
      },
    ]);
  };

  const styles = createStyles(colors, isDark);

  const renderUser = ({ item }) => {
    // Determinar o status de aprovação
    const isApproved = item.status === 'approved';
    const isPending = item.status === 'pending';
    const isBlocked = item.status === 'blocked';
    
    const getStatusLabel = () => {
      if (isPending) return 'Pendente';
      if (isBlocked) return 'Bloqueado';
      return 'Aprovado';
    };
    
    const getStatusColor = () => {
      if (isPending) return colors.warning;
      if (isBlocked) return colors.expense;
      return colors.income;
    };
    
    return (
      <View style={styles.userCard}>
        <LinearGradient
          colors={[colors.surface, colors.surface]}
          style={styles.userCardGradient}
        >
          <View style={styles.userHeader}>
            <View style={styles.avatarContainer}>
              <LinearGradient
                colors={item.role === 'admin' ? [colors.gold, colors.copper] : [colors.primary, colors.primaryLight]}
                style={styles.avatar}
              >
                <Text style={styles.avatarText}>{item.name?.charAt(0).toUpperCase()}</Text>
              </LinearGradient>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{item.name}</Text>
              <Text style={styles.userEmail}>{item.email}</Text>
              <View style={styles.userBadges}>
                <View style={[styles.badge, { backgroundColor: item.role === 'admin' ? `${colors.gold}20` : `${colors.primary}20` }]}>
                  <Text style={[styles.badgeText, { color: item.role === 'admin' ? colors.gold : colors.primary }]}>
                    {item.role === 'admin' ? 'Admin' : 'Usuário'}
                  </Text>
                </View>
                <View style={[styles.badge, { backgroundColor: `${getStatusColor()}20` }]}>
                  <Text style={[styles.badgeText, { color: getStatusColor() }]}>
                    {getStatusLabel()}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.userActions}>
            {isPending && (
              <TouchableOpacity 
                style={[styles.approveButton, { backgroundColor: colors.income }]} 
                onPress={() => approveUser(item)}
              >
                <Ionicons name="checkmark-circle" size={16} color="#fff" />
                <Text style={styles.approveButtonText}>Aprovar</Text>
              </TouchableOpacity>
            )}
            {!isPending && (
              <View style={styles.actionRow}>
                <Text style={styles.actionLabel}>Bloquear</Text>
                <Switch
                  value={isBlocked}
                  onValueChange={() => toggleBlock(item)}
                  trackColor={{ false: colors.border, true: colors.expense }}
                  thumbColor="#fff"
                />
              </View>
            )}
            <View style={styles.actionRow}>
              <Text style={styles.actionLabel}>Admin</Text>
              <Switch
                value={item.role === 'admin'}
                onValueChange={() => toggleAdmin(item)}
                trackColor={{ false: colors.border, true: colors.gold }}
                thumbColor="#fff"
              />
            </View>
            <TouchableOpacity style={styles.deleteButton} onPress={() => deleteUser(item)}>
              <Ionicons name="trash-outline" size={20} color={colors.expense} />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <LinearGradient
        colors={[colors.primary, colors.primaryLight]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Administração</Text>
            <Text style={styles.headerSubtitle}>{users.length} usuários cadastrados</Text>
          </View>
          <TouchableOpacity onPress={openAddModal} style={styles.addButton}>
            <Ionicons name="person-add" size={24} color="#1a2d47" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={renderUser}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color={colors.gold} />
            <Text style={styles.emptyText}>Nenhum usuário cadastrado</Text>
          </View>
        }
      />

      {/* Modal Criar Usuário */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={[colors.primary, colors.primaryLight]}
              style={styles.modalHeader}
            >
              <Text style={styles.modalTitle}>Novo Usuário</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </LinearGradient>
            
            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Nome *</Text>
              <TextInput
                style={styles.input}
                placeholder="Nome completo"
                placeholderTextColor={colors.textSecondary}
                value={formData.name}
                onChangeText={(t) => setFormData({ ...formData, name: t })}
              />

              <Text style={styles.inputLabel}>E-mail *</Text>
              <TextInput
                style={styles.input}
                placeholder="email@exemplo.com"
                placeholderTextColor={colors.textSecondary}
                value={formData.email}
                onChangeText={(t) => setFormData({ ...formData, email: t })}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>Senha *</Text>
              <TextInput
                style={styles.input}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor={colors.textSecondary}
                value={formData.password}
                onChangeText={(t) => setFormData({ ...formData, password: t })}
                secureTextEntry
              />

              <Text style={styles.inputLabel}>Tipo de Usuário</Text>
              <View style={styles.roleSelector}>
                <TouchableOpacity
                  style={[styles.roleOption, formData.role === 'user' && styles.roleOptionSelected]}
                  onPress={() => setFormData({ ...formData, role: 'user' })}
                >
                  <Ionicons name="person" size={18} color={formData.role === 'user' ? '#fff' : colors.text} />
                  <Text style={[styles.roleOptionText, formData.role === 'user' && styles.roleOptionTextSelected]}>
                    Usuário
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.roleOption, formData.role === 'admin' && styles.roleOptionAdminSelected]}
                  onPress={() => setFormData({ ...formData, role: 'admin' })}
                >
                  <Ionicons name="shield-checkmark" size={18} color={formData.role === 'admin' ? '#fff' : colors.text} />
                  <Text style={[styles.roleOptionText, formData.role === 'admin' && styles.roleOptionTextSelected]}>
                    Admin
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleCreateUser}>
                <LinearGradient
                  colors={[colors.gold, colors.copper]}
                  style={styles.saveButtonGradient}
                >
                  <Text style={styles.saveButtonText}>Criar Usuário</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors, isDark) => StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.background 
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#ffffff' 
  },
  addButton: {
    backgroundColor: '#c9a66b',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#c9a66b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.gold,
    marginTop: 4,
  },
  listContainer: { 
    padding: 20, 
    paddingBottom: 100 
  },
  userCard: {
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  userCardGradient: {
    padding: 16,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  userEmail: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  userBadges: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  userActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: `${colors.expense}15`,
  },
  emptyContainer: { 
    alignItems: 'center', 
    paddingTop: 60 
  },
  emptyText: { 
    fontSize: 16, 
    color: colors.textSecondary, 
    marginTop: 16 
  },
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'flex-end' 
  },
  modalContent: { 
    backgroundColor: colors.surface, 
    borderTopLeftRadius: 24, 
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 20, 
    borderTopLeftRadius: 24, 
    borderTopRightRadius: 24 
  },
  modalTitle: { 
    fontSize: 20, 
    fontWeight: '600', 
    color: '#ffffff' 
  },
  modalBody: { 
    padding: 20 
  },
  inputLabel: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: colors.text, 
    marginBottom: 8, 
    marginTop: 12 
  },
  input: { 
    backgroundColor: colors.background, 
    borderRadius: 12, 
    padding: 16, 
    fontSize: 16, 
    color: colors.text, 
    borderWidth: 1, 
    borderColor: colors.border 
  },
  roleSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  roleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roleOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  roleOptionAdminSelected: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  roleOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  roleOptionTextSelected: {
    color: '#ffffff',
  },
  modalFooter: { 
    flexDirection: 'row', 
    padding: 20, 
    gap: 12, 
    borderTopWidth: 1, 
    borderTopColor: colors.border 
  },
  cancelButton: { 
    flex: 1, 
    paddingVertical: 16, 
    borderRadius: 12, 
    backgroundColor: colors.background, 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: colors.text 
  },
  saveButton: { 
    flex: 1, 
    borderRadius: 12, 
    overflow: 'hidden' 
  },
  saveButtonGradient: { 
    paddingVertical: 16, 
    alignItems: 'center' 
  },
  saveButtonText: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#ffffff' 
  },
});
