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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useFinance } from '../contexts/FinanceContext';
import { formatCurrency, formatDate, formatMonth } from '../utils/formatters';
import { expenseService } from '../services/api';

export default function ExpensesScreen() {
  const { colors, isDark } = useTheme();
  const { month, year, changeMonth, expenses, fetchExpenses, expenseCategories, creditCards, fetchCategories, fetchCreditCards } = useFinance();
  
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [formData, setFormData] = useState({
    category_id: '',
    description: '',
    value: '',
    date: new Date().toISOString().split('T')[0],
    due_date: new Date().toISOString().split('T')[0],
    payment_method: 'cash',
    credit_card_id: null,
    installments: 1,
    status: 'pending',
  });

  useEffect(() => {
    fetchExpenses();
    fetchCategories();
    fetchCreditCards();
  }, [month, year]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchExpenses();
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
    setEditingExpense(null);
    const today = new Date().toISOString().split('T')[0];
    setFormData({
      category_id: expenseCategories[0]?.id || '',
      description: '',
      value: '',
      date: today,
      due_date: today,
      payment_method: 'cash',
      credit_card_id: null,
      installments: 1,
      status: 'pending',
    });
    setModalVisible(true);
  };

  const openEditModal = (expense) => {
    setEditingExpense(expense);
    setFormData({
      category_id: expense.category_id,
      description: expense.description || '',
      value: expense.value.toString(),
      date: expense.date,
      due_date: expense.due_date || expense.date,
      payment_method: expense.payment_method,
      credit_card_id: expense.credit_card_id,
      installments: expense.installments,
      status: expense.status,
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formData.category_id || !formData.value) {
      Alert.alert('Erro', 'Preencha todos os campos obrigatórios');
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      const data = {
        ...formData,
        value: parseFloat(formData.value.replace(',', '.')),
        installments: parseInt(formData.installments) || 1,
        current_installment: 1,
        month,
        year,
        payment_date: formData.status === 'paid' ? today : null,
      };

      if (editingExpense) {
        await expenseService.update(editingExpense.id, data);
      } else {
        await expenseService.create(data);
      }

      setModalVisible(false);
      fetchExpenses();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar');
    }
  };

  const handleDelete = (expense) => {
    Alert.alert(
      'Excluir',
      'Deseja excluir esta despesa?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await expenseService.delete(expense.id);
              fetchExpenses();
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível excluir');
            }
          },
        },
      ]
    );
  };

  const toggleStatus = async (expense) => {
    try {
      const newStatus = expense.status === 'paid' ? 'pending' : 'paid';
      const today = new Date().toISOString().split('T')[0];
      await expenseService.update(expense.id, {
        ...expense,
        status: newStatus,
        payment_date: newStatus === 'paid' ? today : null,
      });
      fetchExpenses();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível atualizar');
    }
  };

  const getCategoryName = (categoryId) => {
    const cat = expenseCategories.find(c => c.id === categoryId);
    return cat?.name || 'Sem categoria';
  };

  const getPaymentMethodIcon = (method) => {
    switch (method) {
      case 'credit': return 'card';
      case 'debit': return 'card-outline';
      default: return 'cash';
    }
  };

  const totalPaid = expenses.filter(e => e.status === 'paid').reduce((sum, e) => sum + e.value, 0);
  const totalPending = expenses.filter(e => e.status === 'pending').reduce((sum, e) => sum + e.value, 0);
  const total = expenses.reduce((sum, e) => sum + e.value, 0);

  const styles = createStyles(colors, isDark);

  const renderExpenseItem = ({ item }) => (
    <TouchableOpacity
      style={styles.listItem}
      onPress={() => openEditModal(item)}
      onLongPress={() => handleDelete(item)}
    >
      <View style={styles.listItemLeft}>
        <TouchableOpacity
          style={[
            styles.statusBadge,
            { backgroundColor: item.status === 'paid' ? `${colors.income}20` : `${colors.warning}20` },
          ]}
          onPress={() => toggleStatus(item)}
        >
          <Ionicons
            name={item.status === 'paid' ? 'checkmark-circle' : 'time'}
            size={20}
            color={item.status === 'paid' ? colors.income : colors.warning}
          />
        </TouchableOpacity>
        <View style={styles.listItemInfo}>
          <Text style={styles.listItemCategory}>{getCategoryName(item.category_id)}</Text>
          {item.description ? (
            <Text style={styles.listItemDescription}>{item.description}</Text>
          ) : null}
          <View style={styles.listItemMeta}>
            <Ionicons name={getPaymentMethodIcon(item.payment_method)} size={14} color={colors.textSecondary} />
            <Text style={styles.listItemDate}>Venc: {formatDate(item.due_date || item.date)}</Text>
            {item.installments > 1 && (
              <Text style={styles.installmentBadge}>
                {item.current_installment}/{item.installments}x
              </Text>
            )}
          </View>
          {item.status === 'paid' && item.payment_date && (
            <View style={styles.paidDateContainer}>
              <Ionicons name="checkmark-circle" size={12} color={colors.income} />
              <Text style={styles.paidDateText}>Pago em: {formatDate(item.payment_date)}</Text>
            </View>
          )}
        </View>
      </View>
      <Text style={[styles.listItemValue, { color: colors.expense }]}>
        {formatCurrency(item.value)}
      </Text>
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
          <Text style={styles.headerTitle}>Despesas</Text>
          <TouchableOpacity onPress={openAddModal} style={styles.addButton}>
            <Ionicons name="add" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Month Selector */}
      <View style={styles.monthSelector}>
        <TouchableOpacity onPress={() => navigateMonth(-1)} style={styles.monthButton}>
          <Ionicons name="chevron-back" size={24} color={colors.gold} />
        </TouchableOpacity>
        <Text style={styles.monthText}>{formatMonth(month, year)}</Text>
        <TouchableOpacity onPress={() => navigateMonth(1)} style={styles.monthButton}>
          <Ionicons name="chevron-forward" size={24} color={colors.gold} />
        </TouchableOpacity>
      </View>

      {/* Summary */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryItem}>
          <LinearGradient
            colors={[colors.gold, colors.copper]}
            style={styles.summaryGradient}
          >
            <Text style={styles.summaryLabel}>Pago</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalPaid)}</Text>
          </LinearGradient>
        </View>
        <View style={styles.summaryItem}>
          <LinearGradient
            colors={[colors.primary, colors.primaryLight]}
            style={styles.summaryGradient}
          >
            <Text style={styles.summaryLabel}>Pendente</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalPending)}</Text>
          </LinearGradient>
        </View>
        <View style={styles.summaryItem}>
          <LinearGradient
            colors={[colors.cardDark, colors.primaryLight]}
            style={styles.summaryGradient}
          >
            <Text style={styles.summaryLabel}>Total</Text>
            <Text style={styles.summaryValue}>{formatCurrency(total)}</Text>
          </LinearGradient>
        </View>
      </View>

      {/* List */}
      <FlatList
        data={expenses}
        keyExtractor={(item) => item.id}
        renderItem={renderExpenseItem}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={64} color={colors.gold} />
            <Text style={styles.emptyText}>Nenhuma despesa cadastrada</Text>
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
                {editingExpense ? 'Editar Despesa' : 'Nova Despesa'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </LinearGradient>

            <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
              <Text style={styles.inputLabel}>Categoria *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                {expenseCategories.map((cat) => (
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

              <Text style={styles.inputLabel}>Data de Vencimento</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textSecondary}
                value={formData.due_date}
                onChangeText={(text) => setFormData({ ...formData, due_date: text })}
              />

              <Text style={styles.inputLabel}>Forma de Pagamento</Text>
              <View style={styles.paymentMethods}>
                {[{ id: 'cash', label: 'Dinheiro', icon: 'cash' },
                  { id: 'debit', label: 'Débito', icon: 'card-outline' },
                  { id: 'credit', label: 'Crédito', icon: 'card' }].map((method) => (
                  <TouchableOpacity
                    key={method.id}
                    style={[
                      styles.paymentMethod,
                      formData.payment_method === method.id && styles.paymentMethodSelected,
                    ]}
                    onPress={() => setFormData({ ...formData, payment_method: method.id })}
                  >
                    <Ionicons
                      name={method.icon}
                      size={20}
                      color={formData.payment_method === method.id ? '#fff' : colors.text}
                    />
                    <Text
                      style={[
                        styles.paymentMethodText,
                        formData.payment_method === method.id && styles.paymentMethodTextSelected,
                      ]}
                    >
                      {method.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {formData.payment_method === 'credit' && (
                <>
                  <Text style={styles.inputLabel}>Cartão de Crédito</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {creditCards.map((card) => (
                      <TouchableOpacity
                        key={card.id}
                        style={[
                          styles.categoryChip,
                          formData.credit_card_id === card.id && styles.categoryChipSelected,
                        ]}
                        onPress={() => setFormData({ ...formData, credit_card_id: card.id })}
                      >
                        <Text
                          style={[
                            styles.categoryChipText,
                            formData.credit_card_id === card.id && styles.categoryChipTextSelected,
                          ]}
                        >
                          {card.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <Text style={styles.inputLabel}>Parcelas</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="1"
                    placeholderTextColor={colors.textSecondary}
                    value={formData.installments.toString()}
                    onChangeText={(text) => setFormData({ ...formData, installments: parseInt(text) || 1 })}
                    keyboardType="number-pad"
                  />
                </>
              )}

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
                    formData.status === 'paid' && styles.statusOptionSelectedRed,
                  ]}
                  onPress={() => setFormData({ ...formData, status: 'paid' })}
                >
                  <Text
                    style={[
                      styles.statusOptionText,
                      formData.status === 'paid' && styles.statusOptionTextSelected,
                    ]}
                  >
                    Pago
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={{ height: 40 }} />
            </ScrollView>

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
    backgroundColor: colors.background,
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
    color: '#ffffff',
  },
  addButton: {
    backgroundColor: colors.gold,
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
    paddingVertical: 16,
  },
  monthButton: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderGold,
  },
  monthText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 8,
  },
  summaryItem: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  summaryGradient: {
    padding: 12,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
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
    borderWidth: 1,
    borderColor: colors.border,
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
  listItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  listItemDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  paidDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  paidDateText: {
    fontSize: 11,
    color: colors.income,
    fontWeight: '500',
  },
  installmentBadge: {
    fontSize: 11,
    color: colors.gold,
    fontWeight: '600',
    backgroundColor: `${colors.gold}20`,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
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
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
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
    borderColor: colors.borderGold,
  },
  categoryChipSelected: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  categoryChipText: {
    fontSize: 14,
    color: colors.text,
  },
  categoryChipTextSelected: {
    color: '#ffffff',
  },
  paymentMethods: {
    flexDirection: 'row',
    gap: 8,
  },
  paymentMethod: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  paymentMethodSelected: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  paymentMethodText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  paymentMethodTextSelected: {
    color: '#ffffff',
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
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  statusOptionSelectedRed: {
    backgroundColor: colors.expense,
    borderColor: colors.expense,
  },
  statusOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  statusOptionTextSelected: {
    color: '#ffffff',
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
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  saveButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
