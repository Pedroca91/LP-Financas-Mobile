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

  const styles = createStyles(colors, isDark);

  const renderCard = ({ item }) => {
    const used = getCardUsage(item.id);
    const available = (item.limit || 0) - used;
    const usagePercent = item.limit ? (used / item.limit) * 100 : 0;

    return (
      <TouchableOpacity style={styles.cardItem} onPress={() => openEditModal(item)} onLongPress={() => handleDelete(item)}>
        <LinearGradient
          colors={[colors.cardDark, colors.primaryLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardGradient}
        >
          <View style={styles.cardHeader}>
            <View style={styles.cardIconContainer}>
              <Ionicons name="card" size={24} color={colors.gold} />
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
              <LinearGradient
                colors={usagePercent > 80 ? [colors.expense, '#dc2626'] : [colors.gold, colors.copper]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressFill, { width: `${Math.min(usagePercent, 100)}%` }]}
              />
            </View>
            <Text style={styles.progressText}>{usagePercent.toFixed(0)}% utilizado</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <LinearGradient
        colors={[colors.primary, colors.primaryLight]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Cartões</Text>
          <TouchableOpacity onPress={openAddModal} style={styles.addButton}>
            <Ionicons name="add" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Summary */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryItem}>
          <LinearGradient
            colors={[colors.primary, colors.primaryLight]}
            style={styles.summaryGradient}
          >
            <Text style={styles.summaryLabel}>Limite Total</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalLimit)}</Text>
          </LinearGradient>
        </View>
        <View style={styles.summaryItem}>
          <LinearGradient
            colors={[colors.expense, '#dc2626']}
            style={styles.summaryGradient}
          >
            <Text style={styles.summaryLabel}>Utilizado</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalUsed)}</Text>
          </LinearGradient>
        </View>
        <View style={styles.summaryItem}>
          <LinearGradient
            colors={[colors.income, '#16a34a']}
            style={styles.summaryGradient}
          >
            <Text style={styles.summaryLabel}>Disponível</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalLimit - totalUsed)}</Text>
          </LinearGradient>
        </View>
      </View>

      <FlatList
        data={creditCards}
        keyExtractor={(item) => item.id}
        renderItem={renderCard}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="card-outline" size={64} color={colors.gold} />
            <Text style={styles.emptyText}>Nenhum cartão cadastrado</Text>
          </View>
        }
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={[colors.primary, colors.primaryLight]}
              style={styles.modalHeader}
            >
              <Text style={styles.modalTitle}>{editingCard ? 'Editar' : 'Novo'} Cartão</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </LinearGradient>
            
            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Nome do Cartão *</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Ex: Nubank" 
                placeholderTextColor={colors.textSecondary} 
                value={formData.name} 
                onChangeText={(t) => setFormData({ ...formData, name: t })} 
              />

              <Text style={styles.inputLabel}>Limite *</Text>
              <TextInput 
                style={styles.input} 
                placeholder="0,00" 
                placeholderTextColor={colors.textSecondary} 
                value={formData.limit} 
                onChangeText={(t) => setFormData({ ...formData, limit: t })} 
                keyboardType="decimal-pad" 
              />

              <Text style={styles.inputLabel}>Dia de Fechamento</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Ex: 15" 
                placeholderTextColor={colors.textSecondary} 
                value={formData.closing_day} 
                onChangeText={(t) => setFormData({ ...formData, closing_day: t })} 
                keyboardType="number-pad" 
              />

              <Text style={styles.inputLabel}>Dia de Vencimento</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Ex: 22" 
                placeholderTextColor={colors.textSecondary} 
                value={formData.due_day} 
                onChangeText={(t) => setFormData({ ...formData, due_day: t })} 
                keyboardType="number-pad" 
              />
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
  addButton: { 
    backgroundColor: colors.gold, 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  summaryContainer: { 
    flexDirection: 'row', 
    paddingHorizontal: 20, 
    marginTop: 16,
    marginBottom: 16, 
    gap: 8 
  },
  summaryItem: { 
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
    marginBottom: 4 
  },
  summaryValue: { 
    fontSize: 13, 
    fontWeight: '700', 
    color: '#ffffff' 
  },
  listContainer: { 
    padding: 20, 
    paddingBottom: 100 
  },
  cardItem: { 
    borderRadius: 16, 
    marginBottom: 16, 
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  cardGradient: { 
    padding: 16 
  },
  cardHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 16 
  },
  cardIconContainer: { 
    width: 48, 
    height: 48, 
    borderRadius: 12, 
    backgroundColor: 'rgba(201,166,107,0.2)', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(201,166,107,0.4)',
  },
  cardInfo: { 
    flex: 1 
  },
  cardName: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: '#ffffff' 
  },
  cardDates: { 
    fontSize: 13, 
    color: colors.gold, 
    marginTop: 2 
  },
  cardLimits: { 
    borderTopWidth: 1, 
    borderTopColor: 'rgba(255,255,255,0.1)', 
    paddingTop: 12 
  },
  limitRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 8 
  },
  limitLabel: { 
    fontSize: 14, 
    color: 'rgba(255,255,255,0.7)' 
  },
  limitValue: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#ffffff' 
  },
  progressContainer: { 
    marginTop: 8 
  },
  progressBar: { 
    height: 8, 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    borderRadius: 4, 
    overflow: 'hidden' 
  },
  progressFill: { 
    height: '100%', 
    borderRadius: 4 
  },
  progressText: { 
    fontSize: 12, 
    color: colors.gold, 
    textAlign: 'right', 
    marginTop: 4 
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
    borderTopRightRadius: 24, 
    maxHeight: '85%' 
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
    marginTop: 16 
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
