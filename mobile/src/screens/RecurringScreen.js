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
  ScrollView,
  Switch,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useFinance } from '../contexts/FinanceContext';
import { formatCurrency } from '../utils/formatters';
import api from '../services/api';

export default function RecurringScreen() {
  const { colors, isDark } = useTheme();
  const { incomeCategories, expenseCategories, creditCards, fetchCategories, fetchCreditCards } = useFinance();
  
  const [refreshing, setRefreshing] = useState(false);
  const [recurring, setRecurring] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    type: 'expense',
    category_id: '',
    description: '',
    value: '',
    frequency: 'monthly',
    start_date: new Date().toISOString().split('T')[0],
    day_of_month: '1',
    is_active: true,
    payment_method: 'cash',
    credit_card_id: null,
  });

  const fetchRecurring = async () => {
    try {
      const response = await api.get('/recurring');
      setRecurring(response.data);
    } catch (error) {
      console.log('Error fetching recurring:', error);
    }
  };

  useEffect(() => {
    fetchRecurring();
    fetchCategories();
    fetchCreditCards();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRecurring();
    setRefreshing(false);
  }, []);

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      type: 'expense',
      category_id: expenseCategories[0]?.id || '',
      description: '',
      value: '',
      frequency: 'monthly',
      start_date: new Date().toISOString().split('T')[0],
      day_of_month: '1',
      is_active: true,
      payment_method: 'cash',
      credit_card_id: null,
    });
    setModalVisible(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      type: item.type,
      category_id: item.category_id,
      description: item.description,
      value: item.value?.toString() || '',
      frequency: item.frequency,
      start_date: item.start_date,
      day_of_month: item.day_of_month?.toString() || '1',
      is_active: item.is_active,
      payment_method: item.payment_method || 'cash',
      credit_card_id: item.credit_card_id,
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formData.category_id || !formData.description || !formData.value) {
      Alert.alert('Erro', 'Preencha todos os campos obrigatórios');
      return;
    }
    try {
      const data = {
        ...formData,
        value: parseFloat(formData.value.replace(',', '.')) || 0,
        day_of_month: parseInt(formData.day_of_month) || 1,
      };
      if (editingItem) {
        await api.put(`/recurring/${editingItem.id}`, data);
      } else {
        await api.post('/recurring', data);
      }
      setModalVisible(false);
      fetchRecurring();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar');
    }
  };

  const handleDelete = (item) => {
    Alert.alert('Excluir', 'Deseja excluir este lançamento recorrente?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/recurring/${item.id}`);
            fetchRecurring();
          } catch (error) {
            Alert.alert('Erro', 'Não foi possível excluir');
          }
        },
      },
    ]);
  };

  const toggleActive = async (item) => {
    try {
      await api.put(`/recurring/${item.id}`, { ...item, is_active: !item.is_active });
      fetchRecurring();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível atualizar');
    }
  };

  const getCategoryName = (categoryId, type) => {
    const categories = type === 'income' ? incomeCategories : expenseCategories;
    const cat = categories.find(c => c.id === categoryId);
    return cat?.name || 'Sem categoria';
  };

  const getFrequencyLabel = (freq) => {
    const labels = { monthly: 'Mensal', weekly: 'Semanal', yearly: 'Anual' };
    return labels[freq] || freq;
  };

  const categories = formData.type === 'income' ? incomeCategories : expenseCategories;
  const activeRecurring = recurring.filter(r => r.is_active);
  const inactiveRecurring = recurring.filter(r => !r.is_active);

  const styles = createStyles(colors);

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.listItem} onPress={() => openEditModal(item)} onLongPress={() => handleDelete(item)}>
      <View style={styles.listItemLeft}>
        <View style={[styles.typeIndicator, { backgroundColor: item.type === 'income' ? colors.income : colors.expense }]} />
        <View style={styles.listItemInfo}>
          <Text style={styles.listItemDescription}>{item.description}</Text>
          <Text style={styles.listItemCategory}>{getCategoryName(item.category_id, item.type)}</Text>
          <Text style={styles.listItemMeta}>{getFrequencyLabel(item.frequency)} • Dia {item.day_of_month}</Text>
        </View>
      </View>
      <View style={styles.listItemRight}>
        <Text style={[styles.listItemValue, { color: item.type === 'income' ? colors.income : colors.expense }]}>
          {formatCurrency(item.value)}
        </Text>
        <Switch
          value={item.is_active}
          onValueChange={() => toggleActive(item)}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor="#fff"
          style={styles.switch}
        />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Recorrentes</Text>
        <TouchableOpacity onPress={openAddModal} style={styles.addButton}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={[...activeRecurring, ...inactiveRecurring]}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="repeat-outline" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyText}>Nenhum lançamento recorrente</Text>
          </View>
        }
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingItem ? 'Editar' : 'Novo'} Recorrente</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Tipo</Text>
              <View style={styles.typeSelector}>
                <TouchableOpacity style={[styles.typeOption, formData.type === 'income' && styles.typeOptionIncomeSelected]} onPress={() => setFormData({ ...formData, type: 'income', category_id: incomeCategories[0]?.id || '' })}>
                  <Text style={[styles.typeOptionText, formData.type === 'income' && styles.typeOptionTextSelected]}>Receita</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.typeOption, formData.type === 'expense' && styles.typeOptionExpenseSelected]} onPress={() => setFormData({ ...formData, type: 'expense', category_id: expenseCategories[0]?.id || '' })}>
                  <Text style={[styles.typeOptionText, formData.type === 'expense' && styles.typeOptionTextSelected]}>Despesa</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Categoria *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {categories.map((cat) => (
                  <TouchableOpacity key={cat.id} style={[styles.categoryChip, formData.category_id === cat.id && styles.categoryChipSelected]} onPress={() => setFormData({ ...formData, category_id: cat.id })}>
                    <Text style={[styles.categoryChipText, formData.category_id === cat.id && styles.categoryChipTextSelected]}>{cat.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>Descrição *</Text>
              <TextInput style={styles.input} placeholder="Ex: Aluguel" placeholderTextColor={colors.textSecondary} value={formData.description} onChangeText={(t) => setFormData({ ...formData, description: t })} />

              <Text style={styles.inputLabel}>Valor *</Text>
              <TextInput style={styles.input} placeholder="0,00" placeholderTextColor={colors.textSecondary} value={formData.value} onChangeText={(t) => setFormData({ ...formData, value: t })} keyboardType="decimal-pad" />

              <Text style={styles.inputLabel}>Frequência</Text>
              <View style={styles.frequencySelector}>
                {['monthly', 'weekly', 'yearly'].map((freq) => (
                  <TouchableOpacity key={freq} style={[styles.frequencyOption, formData.frequency === freq && styles.frequencyOptionSelected]} onPress={() => setFormData({ ...formData, frequency: freq })}>
                    <Text style={[styles.frequencyOptionText, formData.frequency === freq && styles.frequencyOptionTextSelected]}>{getFrequencyLabel(freq)}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Dia do Mês</Text>
              <TextInput style={styles.input} placeholder="1" placeholderTextColor={colors.textSecondary} value={formData.day_of_month} onChangeText={(t) => setFormData({ ...formData, day_of_month: t })} keyboardType="number-pad" />

              {formData.type === 'expense' && (
                <>
                  <Text style={styles.inputLabel}>Forma de Pagamento</Text>
                  <View style={styles.paymentMethods}>
                    {[{ id: 'cash', label: 'Dinheiro' }, { id: 'debit', label: 'Débito' }, { id: 'credit', label: 'Crédito' }].map((m) => (
                      <TouchableOpacity key={m.id} style={[styles.paymentMethod, formData.payment_method === m.id && styles.paymentMethodSelected]} onPress={() => setFormData({ ...formData, payment_method: m.id })}>
                        <Text style={[styles.paymentMethodText, formData.payment_method === m.id && styles.paymentMethodTextSelected]}>{m.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16, backgroundColor: colors.surface },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: colors.text },
  addButton: { backgroundColor: colors.primary, width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  listContainer: { padding: 20, paddingBottom: 100 },
  listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 12 },
  listItemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  typeIndicator: { width: 4, height: 40, borderRadius: 2, marginRight: 12 },
  listItemInfo: { flex: 1 },
  listItemDescription: { fontSize: 16, fontWeight: '600', color: colors.text },
  listItemCategory: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  listItemMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  listItemRight: { alignItems: 'flex-end' },
  listItemValue: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  switch: { transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, color: colors.textSecondary, marginTop: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontSize: 20, fontWeight: '600', color: colors.text },
  modalBody: { padding: 20 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: colors.background, borderRadius: 12, padding: 16, fontSize: 16, color: colors.text, borderWidth: 1, borderColor: colors.border },
  typeSelector: { flexDirection: 'row', gap: 12 },
  typeOption: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.background, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  typeOptionIncomeSelected: { backgroundColor: colors.income, borderColor: colors.income },
  typeOptionExpenseSelected: { backgroundColor: colors.expense, borderColor: colors.expense },
  typeOptionText: { fontSize: 14, fontWeight: '600', color: colors.text },
  typeOptionTextSelected: { color: '#fff' },
  categoryChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: colors.background, marginRight: 8, borderWidth: 1, borderColor: colors.border },
  categoryChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryChipText: { fontSize: 14, color: colors.text },
  categoryChipTextSelected: { color: '#fff' },
  frequencySelector: { flexDirection: 'row', gap: 8 },
  frequencyOption: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.background, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  frequencyOptionSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  frequencyOptionText: { fontSize: 13, fontWeight: '600', color: colors.text },
  frequencyOptionTextSelected: { color: '#fff' },
  paymentMethods: { flexDirection: 'row', gap: 8 },
  paymentMethod: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.background, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  paymentMethodSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  paymentMethodText: { fontSize: 13, fontWeight: '600', color: colors.text },
  paymentMethodTextSelected: { color: '#fff' },
  modalFooter: { flexDirection: 'row', padding: 20, gap: 12, borderTopWidth: 1, borderTopColor: colors.border },
  cancelButton: { flex: 1, paddingVertical: 16, borderRadius: 12, backgroundColor: colors.background, alignItems: 'center' },
  cancelButtonText: { fontSize: 16, fontWeight: '600', color: colors.text },
  saveButton: { flex: 1, paddingVertical: 16, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center' },
  saveButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
