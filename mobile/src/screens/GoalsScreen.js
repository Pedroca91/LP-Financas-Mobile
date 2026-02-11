import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { goalService } from '../services/api';
import { formatCurrency } from '../utils/formatters';

export default function GoalsScreen() {
  const { colors } = useTheme();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [contributionModal, setContributionModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    target_value: '',
    deadline: '',
    description: '',
  });
  const [contributionValue, setContributionValue] = useState('');

  const fetchGoals = useCallback(async () => {
    try {
      const response = await goalService.getAll();
      setGoals(response.data);
    } catch (error) {
      console.error('Error fetching goals:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchGoals();
    setRefreshing(false);
  }, [fetchGoals]);

  const handleCreateGoal = async () => {
    if (!formData.name || !formData.target_value) {
      Alert.alert('Erro', 'Preencha nome e valor da meta');
      return;
    }

    try {
      await goalService.create({
        name: formData.name,
        target_value: parseFloat(formData.target_value),
        deadline: formData.deadline || null,
        description: formData.description || '',
      });
      setModalVisible(false);
      setFormData({ name: '', target_value: '', deadline: '', description: '' });
      fetchGoals();
      Alert.alert('Sucesso', 'Meta criada com sucesso!');
    } catch (error) {
      Alert.alert('Erro', 'Erro ao criar meta');
    }
  };

  const handleAddContribution = async () => {
    if (!contributionValue || !selectedGoal) {
      Alert.alert('Erro', 'Informe o valor do aporte');
      return;
    }

    try {
      await goalService.addContribution(selectedGoal.id, {
        value: parseFloat(contributionValue),
        description: 'Aporte via app',
      });
      setContributionModal(false);
      setContributionValue('');
      setSelectedGoal(null);
      fetchGoals();
      Alert.alert('Sucesso', 'Aporte adicionado!');
    } catch (error) {
      Alert.alert('Erro', 'Erro ao adicionar aporte');
    }
  };

  const handleDeleteGoal = (goal) => {
    Alert.alert(
      'Excluir Meta',
      `Deseja excluir a meta "${goal.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await goalService.delete(goal.id);
              fetchGoals();
            } catch (error) {
              Alert.alert('Erro', 'Erro ao excluir meta');
            }
          },
        },
      ]
    );
  };

  const openContributionModal = (goal) => {
    setSelectedGoal(goal);
    setContributionModal(true);
  };

  const getProgress = (goal) => {
    if (!goal.target_value) return 0;
    return Math.min((goal.current_value / goal.target_value) * 100, 100);
  };

  const getProgressColor = (progress) => {
    if (progress >= 100) return colors.income;
    if (progress >= 75) return '#22c55e';
    if (progress >= 50) return colors.gold;
    if (progress >= 25) return '#f59e0b';
    return colors.expense;
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      backgroundColor: colors.primary,
      paddingHorizontal: 20,
      paddingTop: 60,
      paddingBottom: 20,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.textLight,
    },
    headerSubtitle: {
      fontSize: 14,
      color: colors.textLight,
      opacity: 0.8,
      marginTop: 4,
    },
    content: {
      flex: 1,
      padding: 16,
    },
    addButton: {
      position: 'absolute',
      right: 20,
      bottom: 30,
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: colors.gold,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
    },
    goalCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    goalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    goalName: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      flex: 1,
    },
    goalActions: {
      flexDirection: 'row',
      gap: 8,
    },
    actionButton: {
      padding: 6,
    },
    progressContainer: {
      marginBottom: 12,
    },
    progressBar: {
      height: 12,
      backgroundColor: colors.border,
      borderRadius: 6,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 6,
    },
    progressText: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 8,
    },
    progressLabel: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    progressValue: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
    },
    goalFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 8,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    deadlineText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    contributeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.gold + '20',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      gap: 4,
    },
    contributeText: {
      color: colors.gold,
      fontWeight: '600',
      fontSize: 13,
    },
    completedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.income + '20',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      gap: 4,
    },
    completedText: {
      color: colors.income,
      fontWeight: '600',
      fontSize: 13,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 60,
    },
    emptyText: {
      fontSize: 16,
      color: colors.textSecondary,
      marginTop: 16,
      textAlign: 'center',
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
      padding: 24,
      maxHeight: '80%',
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 20,
      textAlign: 'center',
    },
    inputGroup: {
      marginBottom: 16,
    },
    label: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text,
      marginBottom: 8,
    },
    input: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 14,
      fontSize: 16,
      color: colors.text,
    },
    modalButtons: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 8,
    },
    modalButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
    },
    cancelButton: {
      backgroundColor: colors.border,
    },
    confirmButton: {
      backgroundColor: colors.gold,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '600',
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Metas</Text>
        <Text style={styles.headerSubtitle}>
          {goals.filter(g => !g.is_completed).length} metas em andamento
        </Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {goals.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="flag-outline" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyText}>
              Nenhuma meta cadastrada.{'\n'}Crie sua primeira meta!
            </Text>
          </View>
        ) : (
          goals.map((goal) => {
            const progress = getProgress(goal);
            const progressColor = getProgressColor(progress);

            return (
              <View key={goal.id} style={styles.goalCard}>
                <View style={styles.goalHeader}>
                  <Text style={styles.goalName}>{goal.name}</Text>
                  <View style={styles.goalActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleDeleteGoal(goal)}
                    >
                      <Ionicons name="trash-outline" size={20} color={colors.expense} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${progress}%`, backgroundColor: progressColor },
                      ]}
                    />
                  </View>
                  <View style={styles.progressText}>
                    <Text style={styles.progressLabel}>
                      {formatCurrency(goal.current_value || 0)} de {formatCurrency(goal.target_value)}
                    </Text>
                    <Text style={[styles.progressValue, { color: progressColor }]}>
                      {progress.toFixed(1)}%
                    </Text>
                  </View>
                </View>

                <View style={styles.goalFooter}>
                  {goal.deadline && (
                    <Text style={styles.deadlineText}>
                      Prazo: {new Date(goal.deadline).toLocaleDateString('pt-BR')}
                    </Text>
                  )}
                  {!goal.deadline && <View />}
                  
                  {goal.is_completed ? (
                    <View style={styles.completedBadge}>
                      <Ionicons name="checkmark-circle" size={16} color={colors.income} />
                      <Text style={styles.completedText}>Concluída!</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.contributeButton}
                      onPress={() => openContributionModal(goal)}
                    >
                      <Ionicons name="add-circle" size={16} color={colors.gold} />
                      <Text style={styles.contributeText}>Aportar</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Add Goal Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      {/* Create Goal Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nova Meta</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nome da Meta *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Viagem, Carro, Reserva..."
                placeholderTextColor={colors.textSecondary}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Valor Alvo *</Text>
              <TextInput
                style={styles.input}
                placeholder="0,00"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                value={formData.target_value}
                onChangeText={(text) => setFormData({ ...formData, target_value: text })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Prazo (opcional)</Text>
              <TextInput
                style={styles.input}
                placeholder="AAAA-MM-DD"
                placeholderTextColor={colors.textSecondary}
                value={formData.deadline}
                onChangeText={(text) => setFormData({ ...formData, deadline: text })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Descrição (opcional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Descrição da meta..."
                placeholderTextColor={colors.textSecondary}
                multiline
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={[styles.buttonText, { color: colors.text }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleCreateGoal}
              >
                <Text style={[styles.buttonText, { color: '#fff' }]}>Criar Meta</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Contribution Modal */}
      <Modal
        visible={contributionModal}
        transparent
        animationType="slide"
        onRequestClose={() => setContributionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Adicionar Aporte</Text>
            
            {selectedGoal && (
              <Text style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: 20 }}>
                Meta: {selectedGoal.name}
              </Text>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Valor do Aporte</Text>
              <TextInput
                style={styles.input}
                placeholder="0,00"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                value={contributionValue}
                onChangeText={setContributionValue}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setContributionModal(false);
                  setContributionValue('');
                }}
              >
                <Text style={[styles.buttonText, { color: colors.text }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleAddContribution}
              >
                <Text style={[styles.buttonText, { color: '#fff' }]}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
