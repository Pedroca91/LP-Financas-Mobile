import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  FlatList,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useFinance } from '../contexts/FinanceContext';
import { formatCurrency, formatDate, formatMonth } from '../utils/formatters';
import { incomeService } from '../services/api';

export default function IncomesScreen() {
  const { colors, isDark } = useTheme();
  const { month, year, changeMonth, incomes, fetchIncomes, incomeCategories, fetchCategories } = useFinance();
  
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingIncome, setEditingIncome] = useState(null);
  const [formData, setFormData] = useState({
    category_id: '',
    description: '',
    value: '',
    date: new Date().toISOString().split('T')[0],
    status: 'pending',
  });

  useEffect(() => {
    fetchIncomes();
    fetchCategories();
  }, [month, year]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchIncomes();
    setRefreshing(false);
  }, [month, year]);

  const navigateMonth = (direction) => {
    let newMonth = month + direction;
    let newYear = year;
    
    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }
    
    changeMonth(newMonth, newYear);
  };

  const openAddModal = () => {
    setEditingIncome(null);
    setFormData({
      category_id: incomeCategories[0]?.id || '',
      description: '',
      value: '',
      date: new Date().toISOString().split('T')[0],
      status: 'pending',
    });
    setModalVisible(true);
  };

  const openEditModal = (income) => {
    setEditingIncome(income);
    setFormData({
      category_id: income.category_id,
      description: income.description || '',
      value: income.value.toString(),
      date: income.date,
      status: income.status,
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formData.category_id || !formData.value) {
      Alert.alert('Erro', 'Preencha todos os campos obrigatórios');
      return;
    }

    try {
      const data = {
        ...formData,
        value: parseFloat(formData.value.replace(',', '.')),
        month,
        year,
      };

      if (editingIncome) {
        await incomeService.update(editingIncome.id, data);
      } else {
        await incomeService.create(data);
      }

      setModalVisible(false);
      fetchIncomes();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar');
    }
  };

  const handleDelete = (income) => {
    Alert.alert(
      'Excluir',
      'Deseja excluir esta receita?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await incomeService.delete(income.id);
              fetchIncomes();
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível excluir');
            }
          },
        },
      ]
    );
  };

  const toggleStatus = async (income) => {
    try {
      const newStatus = income.status === 'received' ? 'pending' : 'received';
      await incomeService.update(income.id, {
        ...income,
        status: newStatus,
        payment_date: newStatus === 'received' ? new Date().toISOString().split('T')[0] : null,
      });
      fetchIncomes();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível atualizar');
    }
  };

  const getCategoryName = (categoryId) => {
    const cat = incomeCategories.find(c => c.id === categoryId);
    return cat?.name || 'Sem categoria';
  };

  const totalReceived = incomes.filter(i => i.status === 'received').reduce((sum, i) => sum + i.value, 0);
  const totalPending = incomes.filter(i => i.status === 'pending').reduce((sum, i) => sum + i.value, 0);
  const total = incomes.reduce((sum, i) => sum + i.value, 0);

  const styles = createStyles(colors);

  const renderIncomeItem = ({ item }) => (
    <TouchableOpacity
      style={styles.listItem}
      onPress={() => openEditModal(item)}
      onLongPress={() => handleDelete(item)}
    >
      <View style={styles.listItemLeft}>
        <TouchableOpacity
          style={[
            styles.statusBadge,
            { backgroundColor: item.status === 'received' ? `${colors.income}20` : `${colors.warning}20` },
          ]}
          onPress={() => toggleStatus(item)}
        >
          <Ionicons
            name={item.status === 'received' ? 'checkmark-circle' : 'time'}
            size={20}
            color={item.status === 'received' ? colors.income : colors.warning}
          />
        </TouchableOpacity>
        <View style={styles.listItemInfo}>
          <Text style={styles.listItemCategory}>{getCategoryName(item.category_id)}</Text>
          {item.description ? (
            <Text style={styles.listItemDescription}>{item.description}</Text>
          ) : null}
          <Text style={styles.listItemDate}>{formatDate(item.date)}</Text>
        </View>
      </View>
      <Text style={[styles.listItemValue, { color: colors.income }]}>
        {formatCurrency(item.value)}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Receitas</Text>
        <TouchableOpacity onPress={openAddModal} style={styles.addButton}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Month Selector */}
      <View style={styles.monthSelector}>
        <TouchableOpacity onPress={() => navigateMonth(-1)} style={styles.monthButton}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.monthText}>{formatMonth(month, year)}</Text>
        <TouchableOpacity onPress={() => navigateMonth(1)} style={styles.monthButton}>
          <Ionicons name="chevron-forward" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Summary */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Recebido</Text>
          <Text style={[styles.summaryValue, { color: colors.income }]}>{formatCurrency(totalReceived)}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Pendente</Text>
          <Text style={[styles.summaryValue, { color: colors.warning }]}>{formatCurrency(totalPending)}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total</Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>{formatCurrency(total)}</Text>
        </View>
      </View>

      {/* List */}
      <FlatList
        data={incomes}
        keyExtractor={(item) => item.id}
        renderItem={renderIncomeItem}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="wallet-outline" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyText}>Nenhuma receita cadastrada</Text>
          </View>
        }
      />

      {/* Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingIncome ? 'Editar Receita' : 'Nova Receita'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Categoria *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                {incomeCategories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryChip,
                      formData.category_id === cat.id && styles.categoryChipSelected,
                    ]}
                    onPress={() => setFormData({ ...formData, category_id: cat.id })}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        formData.category_id === cat.id && styles.categoryChipTextSelected,
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>Descrição</Text>
              <TextInput
                style={styles.input}
                placeholder="Descrição (opcional)"
                placeholderTextColor={colors.textSecondary}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
              />

              <Text style={styles.inputLabel}>Valor *</Text>
              <TextInput
                style={styles.input}
                placeholder="0,00"
                placeholderTextColor={colors.textSecondary}
                value={formData.value}
                onChangeText={(text) => setFormData({ ...formData, value: text })}
                keyboardType="decimal-pad"
              />

              <Text style={styles.inputLabel}>Data</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textSecondary}
                value={formData.date}
                onChangeText={(text) => setFormData({ ...formData, date: text })}
              />

              <Text style={styles.inputLabel}>Status</Text>
              <View style={styles.statusToggle}>
                <TouchableOpacity
                  style={[
                    styles.statusOption,
                    formData.status === 'pending' && styles.statusOptionSelected,
                  ]}
                  onPress={() => setFormData({ ...formData, status: 'pending' })}
                >
                  <Text
                    style={[
                      styles.statusOptionText,
                      formData.status === 'pending' && styles.statusOptionTextSelected,
                    ]}
                  >
                    Pendente
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.statusOption,
                    formData.status === 'received' && styles.statusOptionSelectedGreen,
                  ]}
                  onPress={() => setFormData({ ...formData, status: 'received' })}
                >
                  <Text
                    style={[
                      styles.statusOptionText,
                      formData.status === 'received' && styles.statusOptionTextSelected,
                    ]}
                  >
                    Recebido
                  </Text>
                </TouchableOpacity>
              </View>
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
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  addButton: {
    backgroundColor: colors.income,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.surface,
  },
  monthButton: {
    padding: 8,
  },
  monthText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  summaryContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  listContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  listItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  listItemInfo: {
    flex: 1,
  },
  listItemCategory: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  listItemDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  listItemDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  listItemValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
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
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryScroll: {
    flexDirection: 'row',
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.background,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: {
    fontSize: 14,
    color: colors.text,
  },
  categoryChipTextSelected: {
    color: '#fff',
  },
  statusToggle: {
    flexDirection: 'row',
    gap: 12,
  },
  statusOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.background,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusOptionSelected: {
    backgroundColor: colors.warning,
    borderColor: colors.warning,
  },
  statusOptionSelectedGreen: {
    backgroundColor: colors.income,
    borderColor: colors.income,
  },
  statusOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  statusOptionTextSelected: {
    color: '#fff',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
