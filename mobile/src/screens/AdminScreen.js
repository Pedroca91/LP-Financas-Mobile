import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Alert,
  FlatList,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

export default function AdminScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const { isAdmin } = useAuth();
  
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user',
    status: 'approved',
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
    if (isAdmin) fetchUsers();
  }, [isAdmin]);

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
      status: 'approved',
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

  const handleApprove = (user) => {
    Alert.alert('Aprovar', `Deseja aprovar ${user.name}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Aprovar',
        onPress: async () => {
          try {
            await api.patch(`/admin/users/${user.id}/approve`);
            fetchUsers();
          } catch (error) {
            Alert.alert('Erro', 'Não foi possível aprovar');
          }
        },
      },
    ]);
  };

  const handleBlock = (user) => {
    Alert.alert('Bloquear', `Deseja bloquear ${user.name}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Bloquear',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.patch(`/admin/users/${user.id}/block`);
            fetchUsers();
          } catch (error) {
            Alert.alert('Erro', 'Não foi possível bloquear');
          }
        },
      },
    ]);
  };

  const handleDelete = (user) => {
    Alert.alert('Excluir', `Deseja excluir ${user.name} e todos os dados?`, [
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return colors.income;
      case 'pending': return colors.warning;
      case 'blocked': return colors.expense;
      default: return colors.textSecondary;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'approved': return 'Aprovado';
      case 'pending': return 'Pendente';
      case 'blocked': return 'Bloqueado';
      default: return status;
    }
  };

  const pendingCount = users.filter(u => u.status === 'pending').length;
  const approvedCount = users.filter(u => u.status === 'approved').length;
  const blockedCount = users.filter(u => u.status === 'blocked').length;

  const styles = createStyles(colors);

  if (!isAdmin) {
    return (
      <View style={styles.container}>
        <View style={styles.accessDenied}>
          <Ionicons name="lock-closed" size={64} color={colors.textSecondary} />
          <Text style={styles.accessDeniedText}>Acesso restrito a administradores</Text>
        </View>
      </View>
    );
  }

  const renderUser = ({ item }) => (
    <View style={styles.userItem}>
      <View style={styles.userHeader}>
        <View style={styles.userAvatar}>
          <Text style={styles.userAvatarText}>{item.name?.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
          <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{getStatusLabel(item.status)}</Text>
          </View>
        </View>
        {item.role === 'admin' && (
          <View style={styles.adminBadge}>
            <Ionicons name="shield-checkmark" size={16} color={colors.primary} />
          </View>
        )}
      </View>
      {item.role !== 'admin' && (
        <View style={styles.userActions}>
          {item.status !== 'approved' && (
            <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.income }]} onPress={() => handleApprove(item)}>
              <Ionicons name="checkmark" size={18} color="#fff" />
              <Text style={styles.actionButtonText}>Aprovar</Text>
            </TouchableOpacity>
          )}
          {item.status !== 'blocked' && (
            <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.warning }]} onPress={() => handleBlock(item)}>
              <Ionicons name="ban" size={18} color="#fff" />
              <Text style={styles.actionButtonText}>Bloquear</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.expense }]} onPress={() => handleDelete(item)}>
            <Ionicons name="trash" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>Excluir</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Administração</Text>
        <TouchableOpacity onPress={openAddModal} style={styles.addButton}>
          <Ionicons name="person-add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { borderLeftColor: colors.warning }]}>
          <Text style={styles.statValue}>{pendingCount}</Text>
          <Text style={styles.statLabel}>Pendentes</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: colors.income }]}>
          <Text style={styles.statValue}>{approvedCount}</Text>
          <Text style={styles.statLabel}>Aprovados</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: colors.expense }]}>
          <Text style={styles.statValue}>{blockedCount}</Text>
          <Text style={styles.statLabel}>Bloqueados</Text>
        </View>
      </View>

      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={renderUser}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyText}>Nenhum usuário</Text>
          </View>
        }
      />

      {/* Modal para adicionar usuário */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Novo Usuário</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
              <Text style={styles.inputLabel}>Nome *</Text>
              <TextInput
                style={styles.input}
                placeholder="Nome completo"
                placeholderTextColor={colors.textSecondary}
                value={formData.name}
                onChangeText={(t) => setFormData({ ...formData, name: t })}
              />

              <Text style={styles.inputLabel}>Email *</Text>
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
                placeholder="Senha (mínimo 6 caracteres)"
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
                  <Text style={[styles.roleOptionText, formData.role === 'user' && styles.roleOptionTextSelected]}>Usuário</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.roleOption, formData.role === 'admin' && styles.roleOptionSelectedAdmin]}
                  onPress={() => setFormData({ ...formData, role: 'admin' })}
                >
                  <Text style={[styles.roleOptionText, formData.role === 'admin' && styles.roleOptionTextSelected]}>Admin</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Status</Text>
              <View style={styles.roleSelector}>
                <TouchableOpacity
                  style={[styles.roleOption, formData.status === 'approved' && { backgroundColor: colors.income, borderColor: colors.income }]}
                  onPress={() => setFormData({ ...formData, status: 'approved' })}
                >
                  <Text style={[styles.roleOptionText, formData.status === 'approved' && styles.roleOptionTextSelected]}>Aprovado</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.roleOption, formData.status === 'pending' && { backgroundColor: colors.warning, borderColor: colors.warning }]}
                  onPress={() => setFormData({ ...formData, status: 'pending' })}
                >
                  <Text style={[styles.roleOptionText, formData.status === 'pending' && styles.roleOptionTextSelected]}>Pendente</Text>
                </TouchableOpacity>
              </View>
              <View style={{ height: 20 }} />
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleCreateUser}>
                <Text style={styles.saveButtonText}>Criar Usuário</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16, backgroundColor: colors.surface },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text },
  addButton: { backgroundColor: colors.primary, width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  statsContainer: { flexDirection: 'row', marginHorizontal: 20, marginTop: 16, gap: 12 },
  statCard: { flex: 1, backgroundColor: colors.surface, borderRadius: 12, padding: 16, borderLeftWidth: 4 },
  statValue: { fontSize: 24, fontWeight: 'bold', color: colors.text },
  statLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  listContainer: { padding: 20, paddingBottom: 100 },
  userItem: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 12 },
  userHeader: { flexDirection: 'row', alignItems: 'center' },
  userAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  userAvatarText: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: '600', color: colors.text },
  userEmail: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginTop: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusText: { fontSize: 11, fontWeight: '600' },
  adminBadge: { padding: 8 },
  userActions: { flexDirection: 'row', marginTop: 12, gap: 8 },
  actionButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, gap: 4 },
  actionButtonText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, color: colors.textSecondary, marginTop: 16 },
  accessDenied: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  accessDeniedText: { fontSize: 16, color: colors.textSecondary, marginTop: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontSize: 20, fontWeight: '600', color: colors.text },
  modalBody: { padding: 20 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: colors.background, borderRadius: 12, padding: 16, fontSize: 16, color: colors.text, borderWidth: 1, borderColor: colors.border },
  roleSelector: { flexDirection: 'row', gap: 12 },
  roleOption: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.background, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  roleOptionSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  roleOptionSelectedAdmin: { backgroundColor: colors.warning, borderColor: colors.warning },
  roleOptionText: { fontSize: 14, fontWeight: '600', color: colors.text },
  roleOptionTextSelected: { color: '#fff' },
  modalFooter: { flexDirection: 'row', padding: 20, gap: 12, borderTopWidth: 1, borderTopColor: colors.border },
  cancelButton: { flex: 1, paddingVertical: 16, borderRadius: 12, backgroundColor: colors.background, alignItems: 'center' },
  cancelButtonText: { fontSize: 16, fontWeight: '600', color: colors.text },
  saveButton: { flex: 1, paddingVertical: 16, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center' },
  saveButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
