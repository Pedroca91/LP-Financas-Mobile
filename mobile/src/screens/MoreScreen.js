import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

export default function MoreScreen({ navigation }) {
  const { colors, isDark, toggleTheme } = useTheme();
  const { user, logout, isAdmin } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Sair',
      'Deseja realmente sair da sua conta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: logout },
      ]
    );
  };

  const styles = createStyles(colors);

  const MenuItem = ({ icon, title, subtitle, onPress, rightComponent }) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} disabled={!onPress}>
      <View style={[styles.menuIcon, { backgroundColor: `${colors.primary}15` }]}>
        <Ionicons name={icon} size={22} color={colors.primary} />
      </View>
      <View style={styles.menuContent}>
        <Text style={styles.menuTitle}>{title}</Text>
        {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
      </View>
      {rightComponent || (
        onPress && <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mais</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
            {isAdmin && (
              <View style={styles.adminBadge}>
                <Ionicons name="shield-checkmark" size={12} color="#fff" />
                <Text style={styles.adminBadgeText}>Administrador</Text>
              </View>
            )}
          </View>
        </View>

        {/* Menu Sections */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferências</Text>
          
          <MenuItem
            icon={isDark ? 'moon' : 'sunny'}
            title="Modo Escuro"
            subtitle={isDark ? 'Ativado' : 'Desativado'}
            rightComponent={
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            }
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gestão</Text>
          
          <MenuItem
            icon="folder-outline"
            title="Categorias"
            subtitle="Gerenciar categorias"
            onPress={() => Alert.alert('Em breve', 'Funcionalidade em desenvolvimento')}
          />
          
          <MenuItem
            icon="card-outline"
            title="Cartões de Crédito"
            subtitle="Gerenciar cartões"
            onPress={() => Alert.alert('Em breve', 'Funcionalidade em desenvolvimento')}
          />
          
          <MenuItem
            icon="repeat-outline"
            title="Lançamentos Recorrentes"
            subtitle="Gerenciar recorrências"
            onPress={() => Alert.alert('Em breve', 'Funcionalidade em desenvolvimento')}
          />
        </View>

        {isAdmin && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Administração</Text>
            
            <MenuItem
              icon="people-outline"
              title="Gerenciar Usuários"
              subtitle="Aprovar e bloquear usuários"
              onPress={() => Alert.alert('Em breve', 'Funcionalidade em desenvolvimento')}
            />
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sobre</Text>
          
          <MenuItem
            icon="information-circle-outline"
            title="Versão do App"
            subtitle="1.0.0"
          />
          
          <MenuItem
            icon="heart-outline"
            title="Desenvolvido por"
            subtitle="Pedro Carvalho"
          />
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color={colors.expense} />
          <Text style={[styles.logoutText, { color: colors.expense }]}>Sair da Conta</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: colors.surface,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    marginTop: 20,
    padding: 20,
    borderRadius: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  profileEmail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 8,
    gap: 4,
  },
  adminBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  section: {
    marginTop: 24,
    marginHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContent: {
    flex: 1,
    marginLeft: 12,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  menuSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    marginTop: 32,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
