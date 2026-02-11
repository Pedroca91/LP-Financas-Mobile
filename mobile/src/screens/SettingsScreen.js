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
import { LinearGradient } from 'expo-linear-gradient';
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
      default: return colors.gold;
    }
  };

  const styles = createStyles(colors, isDark);

  const renderCategory = ({ item }) => (
    <TouchableOpacity style={styles.listItem} onPress={() => openEditModal(item)} onLongPress={() => handleDelete(item)}>
      <View style={styles.listItemLeft}>
        <View style={[styles.typeIndicator, { backgroundColor: getTypeColor(item.type) }]} />
        <Text style={styles.categoryName}>{item.name}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
    </TouchableOpacity>
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
          <Text style={styles.headerTitle}>Categorias</Text>
          <TouchableOpacity onPress={openAddModal} style={styles.addButton}>
            <Ionicons name="add" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {[
          { id: 'expense', label: 'Despesas', color: colors.expense },
          { id: 'income', label: 'Receitas', color: colors.income },
          { id: 'investment', label: 'Investimentos', color: colors.investment },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && { borderBottomColor: tab.color }]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={[styles.tabText, activeTab === tab.id && { color: tab.color }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      <FlatList
        data={filteredCategories}
        keyExtractor={(item) => item.id}
        renderItem={renderCategory}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="folder-outline" size={64} color={colors.gold} />
            <Text style={styles.emptyText}>Nenhuma categoria cadastrada</Text>
          </View>
        }
      />

      {/* Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <LinearGradient
              colors={[colors.primary, colors.primaryLight]}
              style={styles.modalHeader}
            >
              <Text style={styles.modalTitle}>
                {editingCategory ? 'Editar' : 'Nova'} Categoria
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </LinearGradient>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Nome da Categoria *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Alimentação"
                placeholderTextColor={colors.textSecondary}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
              />

              <Text style={styles.inputLabel}>Tipo</Text>
              <View style={styles.typeSelector}>
                {[
                  { id: 'expense', label: 'Despesa', color: colors.expense },
                  { id: 'income', label: 'Receita', color: colors.income },
                  { id: 'investment', label: 'Investimento', color: colors.investment },
                ].map((type) => (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.typeOption,
                      formData.type === type.id && { backgroundColor: type.color, borderColor: type.color },
                    ]}
                    onPress={() => setFormData({ ...formData, type: type.id })}
                  >
                    <Text style={[styles.typeOptionText, formData.type === type.id && { color: '#fff' }]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <LinearGradient
                  colors={[colors.gold, colors.copper]}
                  style={styles.saveButtonGradient}
                >
                  <Text style={styles.saveButtonText}>Salvar</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
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
    backgroundColor: colors.gold, 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  listContainer: { 
    padding: 20, 
    paddingBottom: 100 
  },
  listItem: { 
    flexDirection: 'row', 
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface, 
    borderRadius: 12, 
    padding: 16, 
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  listItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  typeIndicator: {
    width: 4,
    height: 24,
    borderRadius: 2,
    marginRight: 12,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
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
    borderTopRightRadius: 24 
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
    marginTop: 8 
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
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  typeOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.background,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
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
