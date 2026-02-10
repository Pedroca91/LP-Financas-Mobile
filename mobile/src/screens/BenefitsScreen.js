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
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useFinance } from '../contexts/FinanceContext';
import { formatCurrency, formatDate, formatMonth } from '../utils/formatters';
import api from '../services/api';

export default function BenefitsScreen() {
  const { colors, isDark } = useTheme();
  const { month, year, changeMonth } = useFinance();
  
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('vr');
  const [credits, setCredits] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('credit');
  const [formData, setFormData] = useState({});

  const fetchData = async () => {
    try {
      const [creditsRes, expensesRes] = await Promise.all([
        api.get(`/benefits/credits?month=${month}&year=${year}`),
        api.get(`/benefits/expenses?month=${month}&year=${year}`),
      ]);
      setCredits(creditsRes.data);
      setExpenses(expensesRes.data);
    } catch (error) {
      console.log('Error fetching benefits:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, [month, year]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [month, year]);

  const navigateMonth = (direction) => {
    let newMonth = month + direction;
    let newYear = year;
    if (newMonth > 12) { newMonth = 1; newYear++; }
    else if (newMonth < 1) { newMonth = 12; newYear--; }
    changeMonth(newMonth, newYear);
  };

  const openAddCredit = () => {
    setModalType('credit');
    setFormData({ benefit_type: activeTab, value: '', date: new Date().toISOString().split('T')[0], description: '' });
    setModalVisible(true);
  };

  const openAddExpense = () => {
    setModalType('expense');
    setFormData({ benefit_type: activeTab, category: 'restaurante', description: '', value: '', date: new Date().toISOString().split('T')[0], establishment: '' });
    setModalVisible(true);
  };

  const handleSave = async () => {
    try {
      const data = { ...formData, value: parseFloat(formData.value?.replace(',', '.')) || 0, month, year };
      if (modalType === 'credit') {
        await api.post('/benefits/credits', data);
      } else {
        await api.post('/benefits/expenses', data);
      }
      setModalVisible(false);
      fetchData();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar');
    }
  };

  const handleDelete = async (item, type) => {
    Alert.alert('Excluir', 'Deseja excluir este item?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/benefits/${type}s/${item.id}`);
            fetchData();
          } catch (error) {
            Alert.alert('Erro', 'Não foi possível excluir');
          }
        },
      },
    ]);
  };

  const filteredCredits = credits.filter(c => c.benefit_type === activeTab);
  const filteredExpenses = expenses.filter(e => e.benefit_type === activeTab);
  const totalCredits = filteredCredits.reduce((sum, c) => sum + (c.value || 0), 0);
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (e.value || 0), 0);
  const balance = totalCredits - totalExpenses;

  const categories = [
    { id: 'restaurante', label: 'Restaurante', icon: 'restaurant' },
    { id: 'mercado', label: 'Mercado', icon: 'cart' },
    { id: 'padaria', label: 'Padaria', icon: 'cafe' },
    { id: 'acougue', label: 'Açougue', icon: 'nutrition' },
    { id: 'lanchonete', label: 'Lanchonete', icon: 'fast-food' },
    { id: 'outros', label: 'Outros', icon: 'ellipsis-horizontal' },
  ];

  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>VR/VA</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tab, activeTab === 'vr' && styles.tabActive]} onPress={() => setActiveTab('vr')}>
          <Text style={[styles.tabText, activeTab === 'vr' && styles.tabTextActive]}>Vale Refeição</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'va' && styles.tabActive]} onPress={() => setActiveTab('va')}>
          <Text style={[styles.tabText, activeTab === 'va' && styles.tabTextActive]}>Vale Alimentação</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.monthSelector}>
        <TouchableOpacity onPress={() => navigateMonth(-1)}><Ionicons name="chevron-back" size={24} color={colors.primary} /></TouchableOpacity>
        <Text style={styles.monthText}>{formatMonth(month, year)}</Text>
        <TouchableOpacity onPress={() => navigateMonth(1)}><Ionicons name="chevron-forward" size={24} color={colors.primary} /></TouchableOpacity>
      </View>

      <View style={styles.balanceCard}>
        <View style={styles.balanceRow}>
          <View style={styles.balanceItem}>
            <Text style={styles.balanceLabel}>Créditos</Text>
            <Text style={[styles.balanceValue, { color: colors.income }]}>{formatCurrency(totalCredits)}</Text>
          </View>
          <View style={styles.balanceItem}>
            <Text style={styles.balanceLabel}>Gastos</Text>
            <Text style={[styles.balanceValue, { color: colors.expense }]}>{formatCurrency(totalExpenses)}</Text>
          </View>
          <View style={styles.balanceItem}>
            <Text style={styles.balanceLabel}>Saldo</Text>
            <Text style={[styles.balanceValue, { color: balance >= 0 ? colors.income : colors.expense }]}>{formatCurrency(balance)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.income }]} onPress={openAddCredit}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Crédito</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.expense }]} onPress={openAddExpense}>
          <Ionicons name="remove" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Gasto</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.listContainer} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
        {filteredCredits.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Créditos</Text>
            {filteredCredits.map((item) => (
              <TouchableOpacity key={item.id} style={styles.listItem} onLongPress={() => handleDelete(item, 'credit')}>
                <View style={[styles.itemIcon, { backgroundColor: `${colors.income}20` }]}>
                  <Ionicons name="add-circle" size={20} color={colors.income} />
                </View>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemDescription}>{item.description || 'Crédito'}</Text>
                  <Text style={styles.itemDate}>{formatDate(item.date)}</Text>
                </View>
                <Text style={[styles.itemValue, { color: colors.income }]}>+{formatCurrency(item.value)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {filteredExpenses.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Gastos</Text>
            {filteredExpenses.map((item) => (
              <TouchableOpacity key={item.id} style={styles.listItem} onLongPress={() => handleDelete(item, 'expense')}>
                <View style={[styles.itemIcon, { backgroundColor: `${colors.expense}20` }]}>
                  <Ionicons name={categories.find(c => c.id === item.category)?.icon || 'receipt'} size={20} color={colors.expense} />
                </View>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemDescription}>{item.description}</Text>
                  <Text style={styles.itemDate}>{item.establishment ? `${item.establishment} • ` : ''}{formatDate(item.date)}</Text>
                </View>
                <Text style={[styles.itemValue, { color: colors.expense }]}>-{formatCurrency(item.value)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {filteredCredits.length === 0 && filteredExpenses.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="card-outline" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyText}>Nenhum lançamento</Text>
          </View>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{modalType === 'credit' ? 'Novo Crédito' : 'Novo Gasto'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {modalType === 'expense' && (
                <>
                  <Text style={styles.inputLabel}>Categoria</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {categories.map((cat) => (
                      <TouchableOpacity key={cat.id} style={[styles.categoryChip, formData.category === cat.id && styles.categoryChipSelected]} onPress={() => setFormData({ ...formData, category: cat.id })}>
                        <Ionicons name={cat.icon} size={16} color={formData.category === cat.id ? '#fff' : colors.text} />
                        <Text style={[styles.categoryChipText, formData.category === cat.id && styles.categoryChipTextSelected]}>{cat.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <Text style={styles.inputLabel}>Estabelecimento</Text>
                  <TextInput style={styles.input} placeholder="Nome do local" placeholderTextColor={colors.textSecondary} value={formData.establishment} onChangeText={(t) => setFormData({ ...formData, establishment: t })} />
                </>
              )}
              <Text style={styles.inputLabel}>Descrição</Text>
              <TextInput style={styles.input} placeholder="Descrição" placeholderTextColor={colors.textSecondary} value={formData.description} onChangeText={(t) => setFormData({ ...formData, description: t })} />
              <Text style={styles.inputLabel}>Valor *</Text>
              <TextInput style={styles.input} placeholder="0,00" placeholderTextColor={colors.textSecondary} value={formData.value} onChangeText={(t) => setFormData({ ...formData, value: t })} keyboardType="decimal-pad" />
              <Text style={styles.inputLabel}>Data</Text>
              <TextInput style={styles.input} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textSecondary} value={formData.date} onChangeText={(t) => setFormData({ ...formData, date: t })} />
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}><Text style={styles.cancelButtonText}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}><Text style={styles.saveButtonText}>Salvar</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16, backgroundColor: colors.surface },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: colors.text },
  tabContainer: { flexDirection: 'row', marginHorizontal: 20, marginTop: 16, backgroundColor: colors.surface, borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  tabTextActive: { color: '#fff' },
  monthSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  monthText: { fontSize: 16, fontWeight: '600', color: colors.text },
  balanceCard: { backgroundColor: colors.surface, marginHorizontal: 20, borderRadius: 16, padding: 16 },
  balanceRow: { flexDirection: 'row' },
  balanceItem: { flex: 1, alignItems: 'center' },
  balanceLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 4 },
  balanceValue: { fontSize: 16, fontWeight: '700' },
  actionsRow: { flexDirection: 'row', marginHorizontal: 20, marginTop: 16, gap: 12 },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, gap: 6 },
  actionButtonText: { color: '#fff', fontWeight: '600' },
  listContainer: { flex: 1, marginTop: 16 },
  section: { marginHorizontal: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginBottom: 12, textTransform: 'uppercase' },
  listItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, padding: 12, marginBottom: 8 },
  itemIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  itemInfo: { flex: 1 },
  itemDescription: { fontSize: 15, fontWeight: '500', color: colors.text },
  itemDate: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  itemValue: { fontSize: 15, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, color: colors.textSecondary, marginTop: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontSize: 20, fontWeight: '600', color: colors.text },
  modalBody: { padding: 20 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: colors.background, borderRadius: 12, padding: 16, fontSize: 16, color: colors.text, borderWidth: 1, borderColor: colors.border },
  categoryChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, backgroundColor: colors.background, marginRight: 8, borderWidth: 1, borderColor: colors.border, gap: 6 },
  categoryChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryChipText: { fontSize: 13, color: colors.text },
  categoryChipTextSelected: { color: '#fff' },
  modalFooter: { flexDirection: 'row', padding: 20, gap: 12, borderTopWidth: 1, borderTopColor: colors.border },
  cancelButton: { flex: 1, paddingVertical: 16, borderRadius: 12, backgroundColor: colors.background, alignItems: 'center' },
  cancelButtonText: { fontSize: 16, fontWeight: '600', color: colors.text },
  saveButton: { flex: 1, paddingVertical: 16, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center' },
  saveButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
