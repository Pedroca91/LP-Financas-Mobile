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

  const renderUser = ({ item }) => (
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
              <View style={[styles.badge, { backgroundColor: item.is_active ? `${colors.income}20` : `${colors.expense}20` }]}>
                <Text style={[styles.badgeText, { color: item.is_active ? colors.income : colors.expense }]}>
                  {item.is_active ? 'Ativo' : 'Inativo'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.userActions}>
          <View style={styles.actionRow}>
            <Text style={styles.actionLabel}>Ativo</Text>
            <Switch
              value={item.is_active}
              onValueChange={() => toggleActive(item)}
              trackColor={{ false: colors.border, true: colors.income }}
              thumbColor="#fff"
            />
          </View>
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

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <LinearGradient
        colors={[colors.primary, colors.primaryLight]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Administração</Text>
        </View>
        <Text style={styles.headerSubtitle}>{users.length} usuários cadastrados</Text>
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
});
