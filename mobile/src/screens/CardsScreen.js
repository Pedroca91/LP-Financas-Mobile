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
import { formatCurrency } from '../utils/formatters';
import { creditCardService } from '../services/api';

export default function CardsScreen() {
  const { colors, isDark } = useTheme();
  const { creditCards, fetchCreditCards, expenses } = useFinance();
  
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    limit: '',
    closing_day: '',
    due_day: '',
  });

  useEffect(() => {
    fetchCreditCards();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchCreditCards();
    setRefreshing(false);
  }, []);

  const openAddModal = () => {
    setEditingCard(null);
    setFormData({ name: '', limit: '', closing_day: '', due_day: '' });
    setModalVisible(true);
  };

  const openEditModal = (card) => {
    setEditingCard(card);
    setFormData({
      name: card.name,
      limit: card.limit?.toString() || '',
      closing_day: card.closing_day?.toString() || '',
      due_day: card.due_day?.toString() || '',
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.limit) {
      Alert.alert('Erro', 'Preencha nome e limite');
      return;
    }
    try {
      const data = {
        name: formData.name,
        limit: parseFloat(formData.limit.replace(',', '.')) || 0,
        closing_day: parseInt(formData.closing_day) || 1,
        due_day: parseInt(formData.due_day) || 10,
      };
      if (editingCard) {
        await creditCardService.update(editingCard.id, data);
      } else {
        await creditCardService.create(data);
      }
      setModalVisible(false);
      fetchCreditCards();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar');
    }
  };

  const handleDelete = (card) => {
    Alert.alert('Excluir', `Deseja excluir o cartão ${card.name}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await creditCardService.delete(card.id);
            fetchCreditCards();
          } catch (error) {
            Alert.alert('Erro', 'Não foi possível excluir');
          }
        },
      },
    ]);
  };

  const getCardUsage = (cardId) => {
    return expenses
      .filter(e => e.credit_card_id === cardId && e.status === 'pending')
      .reduce((sum, e) => sum + e.value, 0);
  };

  const totalLimit = creditCards.reduce((sum, c) => sum + (c.limit || 0), 0);
  const totalUsed = creditCards.reduce((sum, c) => sum + getCardUsage(c.id), 0);

  const styles = createStyles(colors);

  const renderCard = ({ item }) => {
    const used = getCardUsage(item.id);
    const available = (item.limit || 0) - used;
    const usagePercent = item.limit ? (used / item.limit) * 100 : 0;

    return (
      <TouchableOpacity style={styles.cardItem} onPress={() => openEditModal(item)} onLongPress={() => handleDelete(item)}>
        <View style={styles.cardHeader}>
          <View style={styles.cardIconContainer}>
            <Ionicons name="card" size={24} color={colors.primary} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardName}>{item.name}</Text>
            <Text style={styles.cardDates}>Fecha dia {item.closing_day} • Vence dia {item.due_day}</Text>
          </View>
        </View>
        
        <View style={styles.cardLimits}>
          <View style={styles.limitRow}>
            <Text style={styles.limitLabel}>Limite Total</Text>
            <Text style={styles.limitValue}>{formatCurrency(item.limit || 0)}</Text>
          </View>
          <View style={styles.limitRow}>
            <Text style={styles.limitLabel}>Utilizado</Text>
            <Text style={[styles.limitValue, { color: colors.expense }]}>{formatCurrency(used)}</Text>
          </View>
          <View style={styles.limitRow}>
            <Text style={styles.limitLabel}>Disponível</Text>
            <Text style={[styles.limitValue, { color: colors.income }]}>{formatCurrency(available)}</Text>
          </View>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${Math.min(usagePercent, 100)}%`, backgroundColor: usagePercent > 80 ? colors.expense : colors.primary }]} />
          </View>
          <Text style={styles.progressText}>{usagePercent.toFixed(0)}% utilizado</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Cartões</Text>
        <TouchableOpacity onPress={openAddModal} style={styles.addButton}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.summaryContainer}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Limite Total</Text>
          <Text style={styles.summaryValue}>{formatCurrency(totalLimit)}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Utilizado</Text>
          <Text style={[styles.summaryValue, { color: colors.expense }]}>{formatCurrency(totalUsed)}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Disponível</Text>
          <Text style={[styles.summaryValue, { color: colors.income }]}>{formatCurrency(totalLimit - totalUsed)}</Text>
        </View>
      </View>

      <FlatList
        data={creditCards}
        keyExtractor={(item) => item.id}
        renderItem={renderCard}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="card-outline" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyText}>Nenhum cartão cadastrado</Text>
          </View>
        }
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingCard ? 'Editar' : 'Novo'} Cartão</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Nome do Cartão *</Text>
              <TextInput style={styles.input} placeholder="Ex: Nubank" placeholderTextColor={colors.textSecondary} value={formData.name} onChangeText={(t) => setFormData({ ...formData, name: t })} />

              <Text style={styles.inputLabel}>Limite *</Text>
              <TextInput style={styles.input} placeholder="0,00" placeholderTextColor={colors.textSecondary} value={formData.limit} onChangeText={(t) => setFormData({ ...formData, limit: t })} keyboardType="decimal-pad" />

              <Text style={styles.inputLabel}>Dia de Fechamento</Text>
              <TextInput style={styles.input} placeholder="Ex: 15" placeholderTextColor={colors.textSecondary} value={formData.closing_day} onChangeText={(t) => setFormData({ ...formData, closing_day: t })} keyboardType="number-pad" />

              <Text style={styles.inputLabel}>Dia de Vencimento</Text>
              <TextInput style={styles.input} placeholder="Ex: 22" placeholderTextColor={colors.textSecondary} value={formData.due_day} onChangeText={(t) => setFormData({ ...formData, due_day: t })} keyboardType="number-pad" />
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
  addButton: { backgroundColor: colors.warning, width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  summaryContainer: { flexDirection: 'row', backgroundColor: colors.surface, marginHorizontal: 20, marginTop: 16, borderRadius: 12, padding: 16 },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryDivider: { width: 1, backgroundColor: colors.border },
  summaryLabel: { fontSize: 11, color: colors.textSecondary, marginBottom: 4 },
  summaryValue: { fontSize: 14, fontWeight: '700', color: colors.text },
  listContainer: { padding: 20, paddingBottom: 100 },
  cardItem: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  cardIconContainer: { width: 48, height: 48, borderRadius: 12, backgroundColor: `${colors.primary}20`, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 18, fontWeight: '600', color: colors.text },
  cardDates: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  cardLimits: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
  limitRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  limitLabel: { fontSize: 14, color: colors.textSecondary },
  limitValue: { fontSize: 14, fontWeight: '600', color: colors.text },
  progressContainer: { marginTop: 8 },
  progressBar: { height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  progressText: { fontSize: 12, color: colors.textSecondary, textAlign: 'right', marginTop: 4 },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, color: colors.textSecondary, marginTop: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontSize: 20, fontWeight: '600', color: colors.text },
  modalBody: { padding: 20 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: colors.background, borderRadius: 12, padding: 16, fontSize: 16, color: colors.text, borderWidth: 1, borderColor: colors.border },
  modalFooter: { flexDirection: 'row', padding: 20, gap: 12, borderTopWidth: 1, borderTopColor: colors.border },
  cancelButton: { flex: 1, paddingVertical: 16, borderRadius: 12, backgroundColor: colors.background, alignItems: 'center' },
  cancelButtonText: { fontSize: 16, fontWeight: '600', color: colors.text },
  saveButton: { flex: 1, paddingVertical: 16, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center' },
  saveButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
