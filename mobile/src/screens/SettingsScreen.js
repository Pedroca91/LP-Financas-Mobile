import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useFinance } from '../contexts/FinanceContext';
import { categoryService } from '../services/api';

export default function SettingsScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const { categories, fetchCategories } = useFinance();
  
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('expense');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({ name: '', type: 'expense' });

  useEffect(() => {
    fetchCategories();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchCategories();
    setRefreshing(false);
  }, []);

  const filteredCategories = categories.filter(c => c.type === activeTab);

  const openAddModal = () => {
    setEditingCategory(null);
    setFormData({ name: '', type: activeTab });
    setModalVisible(true);
  };

  const openEditModal = (category) => {
    setEditingCategory(category);
    setFormData({ name: category.name, type: category.type });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Erro', 'Digite o nome da categoria');
      return;
    }
    try {
      if (editingCategory) {
        await categoryService.update(editingCategory.id, formData);
      } else {
        await categoryService.create(formData);
      }
      setModalVisible(false);
      fetchCategories();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar');
    }
  };

  const handleDelete = (category) => {
    Alert.alert('Excluir', `Deseja excluir a categoria "${category.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await categoryService.delete(category.id);
            fetchCategories();
          } catch (error) {
            Alert.alert('Erro', 'Não foi possível excluir');
          }
        },
      },
    ]);
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'income': return colors.income;
      case 'expense': return colors.expense;
      case 'investment': return colors.investment;
      default: return colors.primary;
    }
  };

  const styles = createStyles(colors);

  const renderCategory = ({ item }) => (
    <TouchableOpacity style={styles.categoryItem} onPress={() => openEditModal(item)} onLongPress={() => handleDelete(item)}>
      <View style={[styles.categoryIcon, { backgroundColor: `${getTypeColor(item.type)}20` }]}>
        <Ionicons name="folder" size={20} color={getTypeColor(item.type)} />
      </View>
      <Text style={styles.categoryName}>{item.name}</Text>
      <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Categorias</Text>
        <TouchableOpacity onPress={openAddModal} style={styles.addButton}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tab, activeTab === 'income' && { backgroundColor: colors.income }]} onPress={() => setActiveTab('income')}>
          <Text style={[styles.tabText, activeTab === 'income' && styles.tabTextActive]}>Receitas</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'expense' && { backgroundColor: colors.expense }]} onPress={() => setActiveTab('expense')}>
          <Text style={[styles.tabText, activeTab === 'expense' && styles.tabTextActive]}>Despesas</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'investment' && { backgroundColor: colors.investment }]} onPress={() => setActiveTab('investment')}>
          <Text style={[styles.tabText, activeTab === 'investment' && styles.tabTextActive]}>Investimentos</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredCategories}
        keyExtractor={(item) => item.id}
        renderItem={renderCategory}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="folder-open-outline" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyText}>Nenhuma categoria</Text>
          </View>
        }
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingCategory ? 'Editar' : 'Nova'} Categoria</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Nome *</Text>
              <TextInput style={styles.input} placeholder="Nome da categoria" placeholderTextColor={colors.textSecondary} value={formData.name} onChangeText={(t) => setFormData({ ...formData, name: t })} autoFocus />

              <Text style={styles.inputLabel}>Tipo</Text>
              <View style={styles.typeSelector}>
                {[{ id: 'income', label: 'Receita' }, { id: 'expense', label: 'Despesa' }, { id: 'investment', label: 'Investimento' }].map((t) => (
                  <TouchableOpacity key={t.id} style={[styles.typeOption, formData.type === t.id && { backgroundColor: getTypeColor(t.id), borderColor: getTypeColor(t.id) }]} onPress={() => setFormData({ ...formData, type: t.id })}>
                    <Text style={[styles.typeOptionText, formData.type === t.id && styles.typeOptionTextSelected]}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>Salvar</Text>
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
  tabContainer: { flexDirection: 'row', marginHorizontal: 20, marginTop: 16, backgroundColor: colors.surface, borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  tabTextActive: { color: '#fff' },
  listContainer: { padding: 20, paddingBottom: 100 },
  categoryItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 8 },
  categoryIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  categoryName: { flex: 1, fontSize: 16, fontWeight: '500', color: colors.text },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, color: colors.textSecondary, marginTop: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontSize: 20, fontWeight: '600', color: colors.text },
  modalBody: { padding: 20 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: colors.background, borderRadius: 12, padding: 16, fontSize: 16, color: colors.text, borderWidth: 1, borderColor: colors.border },
  typeSelector: { flexDirection: 'row', gap: 8 },
  typeOption: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.background, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  typeOptionText: { fontSize: 12, fontWeight: '600', color: colors.text },
  typeOptionTextSelected: { color: '#fff' },
  modalFooter: { flexDirection: 'row', padding: 20, gap: 12, borderTopWidth: 1, borderTopColor: colors.border },
  cancelButton: { flex: 1, paddingVertical: 16, borderRadius: 12, backgroundColor: colors.background, alignItems: 'center' },
  cancelButtonText: { fontSize: 16, fontWeight: '600', color: colors.text },
  saveButton: { flex: 1, paddingVertical: 16, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center' },
  saveButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
