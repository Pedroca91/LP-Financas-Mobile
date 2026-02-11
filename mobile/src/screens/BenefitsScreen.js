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
import { LinearGradient } from 'expo-linear-gradient';
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

  const openCreditModal = () => {
    setModalType('credit');
    setFormData({
      type: activeTab,
      value: '',
      date: new Date().toISOString().split('T')[0],
    });
    setModalVisible(true);
  };

  const openExpenseModal = () => {
    setModalType('expense');
    setFormData({
      type: activeTab,
      description: '',
      value: '',
      date: new Date().toISOString().split('T')[0],
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formData.value) {
      Alert.alert('Erro', 'Informe o valor');
      return;
    }
    try {
      const data = {
        ...formData,
        value: parseFloat(formData.value.replace(',', '.')) || 0,
        month,
        year,
      };
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

  const handleDelete = (item, type) => {
    Alert.alert('Excluir', 'Deseja excluir este lançamento?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            if (type === 'credit') {
              await api.delete(`/benefits/credits/${item.id}`);
            } else {
              await api.delete(`/benefits/expenses/${item.id}`);
            }
            fetchData();
          } catch (error) {
            Alert.alert('Erro', 'Não foi possível excluir');
          }
        },
      },
    ]);
  };

  const filteredCredits = credits.filter(c => c.type === activeTab);
  const filteredExpenses = expenses.filter(e => e.type === activeTab);
  
  const totalCredits = filteredCredits.reduce((sum, c) => sum + c.value, 0);
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.value, 0);
  const balance = totalCredits - totalExpenses;

  const styles = createStyles(colors, isDark);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <LinearGradient
        colors={[colors.primary, colors.primaryLight]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>VR/VA</Text>
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

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'vr' && styles.tabActive]}
          onPress={() => setActiveTab('vr')}
        >
          <Text style={[styles.tabText, activeTab === 'vr' && styles.tabTextActive]}>VR (Refeição)</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'va' && styles.tabActive]}
          onPress={() => setActiveTab('va')}
        >
          <Text style={[styles.tabText, activeTab === 'va' && styles.tabTextActive]}>VA (Alimentação)</Text>
        </TouchableOpacity>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <TouchableOpacity style={styles.summaryCard} onPress={openCreditModal}>
          <LinearGradient
            colors={[colors.income, '#16a34a']}
            style={styles.summaryGradient}
          >
            <Ionicons name="add-circle" size={20} color="#fff" />
            <Text style={styles.summaryLabel}>Créditos</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalCredits)}</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity style={styles.summaryCard} onPress={openExpenseModal}>
          <LinearGradient
            colors={[colors.gold, colors.copper]}
            style={styles.summaryGradient}
          >
            <Ionicons name="remove-circle" size={20} color="#fff" />
            <Text style={styles.summaryLabel}>Gastos</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalExpenses)}</Text>
          </LinearGradient>
        </TouchableOpacity>
        <View style={styles.summaryCard}>
          <LinearGradient
            colors={balance >= 0 ? [colors.primary, colors.primaryLight] : [colors.expense, '#dc2626']}
            style={styles.summaryGradient}
          >
            <Ionicons name="wallet" size={20} color="#fff" />
            <Text style={styles.summaryLabel}>Saldo</Text>
            <Text style={styles.summaryValue}>{formatCurrency(balance)}</Text>
          </LinearGradient>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
      >
        {/* Credits Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Créditos</Text>
            <TouchableOpacity onPress={openCreditModal}>
              <Ionicons name="add-circle" size={24} color={colors.gold} />
            </TouchableOpacity>
          </View>
          {filteredCredits.length === 0 ? (
            <Text style={styles.emptyText}>Nenhum crédito registrado</Text>
          ) : (
            filteredCredits.map((item) => (
              <TouchableOpacity 
                key={item.id} 
                style={styles.listItem}
                onLongPress={() => handleDelete(item, 'credit')}
              >
                <View style={styles.listItemLeft}>
                  <View style={[styles.listItemIcon, { backgroundColor: `${colors.income}20` }]}>
                    <Ionicons name="arrow-down" size={18} color={colors.income} />
                  </View>
                  <View>
                    <Text style={styles.listItemDate}>{formatDate(item.date)}</Text>
                  </View>
                </View>
                <Text style={[styles.listItemValue, { color: colors.income }]}>
                  +{formatCurrency(item.value)}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Expenses Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Gastos</Text>
            <TouchableOpacity onPress={openExpenseModal}>
              <Ionicons name="add-circle" size={24} color={colors.gold} />
            </TouchableOpacity>
          </View>
          {filteredExpenses.length === 0 ? (
            <Text style={styles.emptyText}>Nenhum gasto registrado</Text>
          ) : (
            filteredExpenses.map((item) => (
              <TouchableOpacity 
                key={item.id} 
                style={styles.listItem}
                onLongPress={() => handleDelete(item, 'expense')}
              >
                <View style={styles.listItemLeft}>
                  <View style={[styles.listItemIcon, { backgroundColor: `${colors.gold}20` }]}>
                    <Ionicons name="arrow-up" size={18} color={colors.gold} />
                  </View>
                  <View>
                    <Text style={styles.listItemDesc}>{item.description || 'Gasto'}</Text>
                    <Text style={styles.listItemDate}>{formatDate(item.date)}</Text>
                  </View>
                </View>
                <Text style={[styles.listItemValue, { color: colors.expense }]}>
                  -{formatCurrency(item.value)}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={[colors.primary, colors.primaryLight]}
              style={styles.modalHeader}
            >
              <Text style={styles.modalTitle}>
                {modalType === 'credit' ? 'Adicionar Crédito' : 'Adicionar Gasto'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </LinearGradient>

            <View style={styles.modalBody}>
              {modalType === 'expense' && (
                <>
                  <Text style={styles.inputLabel}>Descrição</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: Almoço"
                    placeholderTextColor={colors.textSecondary}
                    value={formData.description}
                    onChangeText={(t) => setFormData({ ...formData, description: t })}
                  />
                </>
              )}

              <Text style={styles.inputLabel}>Valor *</Text>
              <TextInput
                style={styles.input}
                placeholder="0,00"
                placeholderTextColor={colors.textSecondary}
                value={formData.value}
                onChangeText={(t) => setFormData({ ...formData, value: t })}
                keyboardType="decimal-pad"
              />

              <Text style={styles.inputLabel}>Data</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textSecondary}
                value={formData.date}
                onChangeText={(t) => setFormData({ ...formData, date: t })}
              />
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
        </View>
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
  monthSelector: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 16 
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
    color: colors.text 
  },
  tabContainer: { 
    flexDirection: 'row', 
    marginHorizontal: 20, 
    backgroundColor: colors.surface, 
    borderRadius: 12, 
    padding: 4 
  },
  tab: { 
    flex: 1, 
    paddingVertical: 12, 
    alignItems: 'center', 
    borderRadius: 10 
  },
  tabActive: { 
    backgroundColor: colors.gold 
  },
  tabText: { 
    fontSize: 13, 
    fontWeight: '600', 
    color: colors.textSecondary 
  },
  tabTextActive: { 
    color: '#fff' 
  },
  summaryContainer: { 
    flexDirection: 'row', 
    paddingHorizontal: 20, 
    marginTop: 16, 
    gap: 8 
  },
  summaryCard: { 
    flex: 1, 
    borderRadius: 12, 
    overflow: 'hidden' 
  },
  summaryGradient: { 
    padding: 12, 
    alignItems: 'center' 
  },
  summaryLabel: { 
    fontSize: 10, 
    color: 'rgba(255,255,255,0.8)', 
    marginTop: 4 
  },
  summaryValue: { 
    fontSize: 12, 
    fontWeight: '700', 
    color: '#ffffff', 
    marginTop: 2 
  },
  content: { 
    flex: 1, 
    padding: 20 
  },
  section: { 
    marginBottom: 24 
  },
  sectionHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 12 
  },
  sectionTitle: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: colors.text 
  },
  emptyText: { 
    fontSize: 14, 
    color: colors.textSecondary, 
    textAlign: 'center', 
    paddingVertical: 20 
  },
  listItem: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    backgroundColor: colors.surface, 
    borderRadius: 12, 
    padding: 14, 
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  listItemLeft: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12 
  },
  listItemIcon: { 
    width: 36, 
    height: 36, 
    borderRadius: 10, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  listItemDesc: { 
    fontSize: 14, 
    fontWeight: '500', 
    color: colors.text 
  },
  listItemDate: { 
    fontSize: 12, 
    color: colors.textSecondary, 
    marginTop: 2 
  },
  listItemValue: { 
    fontSize: 16, 
    fontWeight: '700' 
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
    marginTop: 12 
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
