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
import { formatCurrency, formatMonth } from '../utils/formatters';
import { investmentService } from '../services/api';

export default function InvestmentsScreen() {
  const { colors, isDark } = useTheme();
  const { month, year, changeMonth, investments, fetchInvestments, investmentCategories, fetchCategories } = useFinance();
  
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    category_id: '',
    description: '',
    initial_balance: '',
    contribution: '',
    dividends: '',
    withdrawal: '',
  });

  useEffect(() => {
    fetchInvestments();
    fetchCategories();
  }, [month, year]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchInvestments();
    setRefreshing(false);
  }, [month, year]);

  const navigateMonth = (direction) => {
    let newMonth = month + direction;
    let newYear = year;
    if (newMonth > 12) { newMonth = 1; newYear++; }
    else if (newMonth < 1) { newMonth = 12; newYear--; }
    changeMonth(newMonth, newYear);
  };

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      category_id: investmentCategories[0]?.id || '',
      description: '',
      initial_balance: '0',
      contribution: '0',
      dividends: '0',
      withdrawal: '0',
    });
    setModalVisible(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      category_id: item.category_id,
      description: item.description || '',
      initial_balance: item.initial_balance?.toString() || '0',
      contribution: item.contribution?.toString() || '0',
      dividends: item.dividends?.toString() || '0',
      withdrawal: item.withdrawal?.toString() || '0',
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formData.category_id) {
      Alert.alert('Erro', 'Selecione uma categoria');
      return;
    }
    try {
      const data = {
        ...formData,
        initial_balance: parseFloat(formData.initial_balance.replace(',', '.')) || 0,
        contribution: parseFloat(formData.contribution.replace(',', '.')) || 0,
        dividends: parseFloat(formData.dividends.replace(',', '.')) || 0,
        withdrawal: parseFloat(formData.withdrawal.replace(',', '.')) || 0,
        month,
        year,
      };
      if (editingItem) {
        await investmentService.update(editingItem.id, data);
      } else {
        await investmentService.create(data);
      }
      setModalVisible(false);
      fetchInvestments();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar');
    }
  };

  const handleDelete = (item) => {
    Alert.alert('Excluir', 'Deseja excluir este investimento?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await investmentService.delete(item.id);
            fetchInvestments();
          } catch (error) {
            Alert.alert('Erro', 'Não foi possível excluir');
          }
        },
      },
    ]);
  };

  const getCategoryName = (categoryId) => {
    const cat = investmentCategories.find(c => c.id === categoryId);
    return cat?.name || 'Sem categoria';
  };

  const calculateFinalBalance = (item) => {
    return (item.initial_balance || 0) + (item.contribution || 0) + (item.dividends || 0) - (item.withdrawal || 0);
  };

  const totalInvested = investments.reduce((sum, i) => sum + calculateFinalBalance(i), 0);

  const styles = createStyles(colors);

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.listItem} onPress={() => openEditModal(item)} onLongPress={() => handleDelete(item)}>
      <View style={styles.listItemHeader}>
        <Text style={styles.listItemCategory}>{getCategoryName(item.category_id)}</Text>
        <Text style={[styles.listItemValue, { color: colors.investment }]}>{formatCurrency(calculateFinalBalance(item))}</Text>
      </View>
      <View style={styles.listItemDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Saldo Inicial:</Text>
          <Text style={styles.detailValue}>{formatCurrency(item.initial_balance || 0)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Aportes:</Text>
          <Text style={[styles.detailValue, { color: colors.income }]}>+{formatCurrency(item.contribution || 0)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Dividendos:</Text>
          <Text style={[styles.detailValue, { color: colors.income }]}>+{formatCurrency(item.dividends || 0)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Retiradas:</Text>
          <Text style={[styles.detailValue, { color: colors.expense }]}>-{formatCurrency(item.withdrawal || 0)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Investimentos</Text>
        <TouchableOpacity onPress={openAddModal} style={styles.addButton}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.monthSelector}>
        <TouchableOpacity onPress={() => navigateMonth(-1)} style={styles.monthButton}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.monthText}>{formatMonth(month, year)}</Text>
        <TouchableOpacity onPress={() => navigateMonth(1)} style={styles.monthButton}>
          <Ionicons name="chevron-forward" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Total Investido</Text>
        <Text style={[styles.totalValue, { color: colors.investment }]}>{formatCurrency(totalInvested)}</Text>
      </View>

      <FlatList
        data={investments}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="bar-chart-outline" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyText}>Nenhum investimento cadastrado</Text>
          </View>
        }
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingItem ? 'Editar' : 'Novo'} Investimento</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Categoria *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {investmentCategories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.categoryChip, formData.category_id === cat.id && styles.categoryChipSelected]}
                    onPress={() => setFormData({ ...formData, category_id: cat.id })}
                  >
                    <Text style={[styles.categoryChipText, formData.category_id === cat.id && styles.categoryChipTextSelected]}>{cat.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>Descrição</Text>
              <TextInput style={styles.input} placeholder="Descrição" placeholderTextColor={colors.textSecondary} value={formData.description} onChangeText={(t) => setFormData({ ...formData, description: t })} />

              <Text style={styles.inputLabel}>Saldo Inicial</Text>
              <TextInput style={styles.input} placeholder="0,00" placeholderTextColor={colors.textSecondary} value={formData.initial_balance} onChangeText={(t) => setFormData({ ...formData, initial_balance: t })} keyboardType="decimal-pad" />

              <Text style={styles.inputLabel}>Aportes</Text>
              <TextInput style={styles.input} placeholder="0,00" placeholderTextColor={colors.textSecondary} value={formData.contribution} onChangeText={(t) => setFormData({ ...formData, contribution: t })} keyboardType="decimal-pad" />

              <Text style={styles.inputLabel}>Dividendos</Text>
              <TextInput style={styles.input} placeholder="0,00" placeholderTextColor={colors.textSecondary} value={formData.dividends} onChangeText={(t) => setFormData({ ...formData, dividends: t })} keyboardType="decimal-pad" />

              <Text style={styles.inputLabel}>Retiradas</Text>
              <TextInput style={styles.input} placeholder="0,00" placeholderTextColor={colors.textSecondary} value={formData.withdrawal} onChangeText={(t) => setFormData({ ...formData, withdrawal: t })} keyboardType="decimal-pad" />
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
  addButton: { backgroundColor: colors.investment, width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  monthSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: colors.surface },
  monthButton: { padding: 8 },
  monthText: { fontSize: 16, fontWeight: '600', color: colors.text },
  totalCard: { backgroundColor: colors.surface, marginHorizontal: 20, marginTop: 16, padding: 20, borderRadius: 16, alignItems: 'center' },
  totalLabel: { fontSize: 14, color: colors.textSecondary },
  totalValue: { fontSize: 28, fontWeight: 'bold', marginTop: 4 },
  listContainer: { padding: 20, paddingBottom: 100 },
  listItem: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 12 },
  listItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  listItemCategory: { fontSize: 16, fontWeight: '600', color: colors.text },
  listItemValue: { fontSize: 18, fontWeight: '700' },
  listItemDetails: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  detailLabel: { fontSize: 13, color: colors.textSecondary },
  detailValue: { fontSize: 13, fontWeight: '500', color: colors.text },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, color: colors.textSecondary, marginTop: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontSize: 20, fontWeight: '600', color: colors.text },
  modalBody: { padding: 20 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: colors.background, borderRadius: 12, padding: 16, fontSize: 16, color: colors.text, borderWidth: 1, borderColor: colors.border },
  categoryChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: colors.background, marginRight: 8, borderWidth: 1, borderColor: colors.border },
  categoryChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryChipText: { fontSize: 14, color: colors.text },
  categoryChipTextSelected: { color: '#fff' },
  modalFooter: { flexDirection: 'row', padding: 20, gap: 12, borderTopWidth: 1, borderTopColor: colors.border },
  cancelButton: { flex: 1, paddingVertical: 16, borderRadius: 12, backgroundColor: colors.background, alignItems: 'center' },
  cancelButtonText: { fontSize: 16, fontWeight: '600', color: colors.text },
  saveButton: { flex: 1, paddingVertical: 16, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center' },
  saveButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
