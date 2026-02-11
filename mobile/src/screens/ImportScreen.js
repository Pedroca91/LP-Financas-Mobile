import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useTheme } from '../contexts/ThemeContext';
import { importService, categoryService } from '../services/api';
import { formatCurrency } from '../utils/formatters';

export default function ImportScreen({ navigation }) {
  const { colors } = useTheme();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [csvData, setCsvData] = useState(null);
  const [columnMapping, setColumnMapping] = useState({
    date: null,
    description: null,
    value: null,
  });
  const [transactions, setTransactions] = useState([]);
  const [selectedTransactions, setSelectedTransactions] = useState([]);
  const [importResult, setImportResult] = useState(null);

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', '*/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      if (!file.name.toLowerCase().endsWith('.csv')) {
        Alert.alert('Erro', 'Por favor, selecione um arquivo CSV');
        return;
      }

      setLoading(true);
      
      // Read file content
      const content = await FileSystem.readAsStringAsync(file.uri);
      
      // Parse CSV
      const response = await importService.parseCSV(content);
      setCsvData(response.data);
      
      // Auto-set detected columns
      if (response.data.detected_columns) {
        setColumnMapping({
          date: response.data.detected_columns.date,
          description: response.data.detected_columns.description,
          value: response.data.detected_columns.value,
        });
      }
      
      setStep(2);
    } catch (error) {
      console.error('Error picking file:', error);
      Alert.alert('Erro', 'Erro ao processar arquivo CSV');
    } finally {
      setLoading(false);
    }
  };

  const handleMapColumns = () => {
    if (columnMapping.date === null || columnMapping.description === null || columnMapping.value === null) {
      Alert.alert('Erro', 'Mapeie todas as colunas obrigatórias');
      return;
    }

    // Parse transactions
    const parsed = csvData.sample_data.map((row, index) => {
      let rawValue = row[columnMapping.value] || '0';
      rawValue = rawValue.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
      const value = parseFloat(rawValue) || 0;
      
      return {
        id: index,
        date: row[columnMapping.date] || '',
        description: row[columnMapping.description] || '',
        value: value,
        type: value >= 0 ? 'income' : 'expense',
        selected: true,
      };
    }).filter(t => t.value !== 0 && t.description);

    setTransactions(parsed);
    setSelectedTransactions(parsed.map(t => t.id));
    setStep(3);
  };

  const toggleTransaction = (id) => {
    setSelectedTransactions(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : [...prev, id]
    );
  };

  const toggleType = (id) => {
    setTransactions(prev => prev.map(t =>
      t.id === id ? { ...t, type: t.type === 'income' ? 'expense' : 'income' } : t
    ));
  };

  const handleImport = async () => {
    const toImport = transactions
      .filter(t => selectedTransactions.includes(t.id))
      .map(t => ({
        date: t.date,
        description: t.description,
        value: t.value,
        type: t.type,
      }));

    if (toImport.length === 0) {
      Alert.alert('Erro', 'Selecione pelo menos uma transação');
      return;
    }

    setLoading(true);
    try {
      const response = await importService.importTransactions(toImport, null);
      setImportResult(response.data);
      setStep(4);
    } catch (error) {
      console.error('Error importing:', error);
      Alert.alert('Erro', 'Erro ao importar transações');
    } finally {
      setLoading(false);
    }
  };

  const resetAndClose = () => {
    setStep(1);
    setCsvData(null);
    setColumnMapping({ date: null, description: null, value: null });
    setTransactions([]);
    setSelectedTransactions([]);
    setImportResult(null);
    navigation.goBack();
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
      flexDirection: 'row',
      alignItems: 'center',
    },
    backButton: {
      marginRight: 16,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.textLight,
    },
    content: {
      flex: 1,
      padding: 20,
    },
    stepIndicator: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 20,
      gap: 8,
    },
    stepDot: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    stepDotActive: {
      backgroundColor: colors.gold,
    },
    stepDotInactive: {
      backgroundColor: colors.border,
    },
    stepLine: {
      width: 40,
      height: 3,
    },
    stepLineActive: {
      backgroundColor: colors.gold,
    },
    stepLineInactive: {
      backgroundColor: colors.border,
    },
    stepText: {
      color: '#fff',
      fontWeight: '600',
    },
    uploadArea: {
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: colors.border,
      borderRadius: 16,
      padding: 40,
      alignItems: 'center',
      marginVertical: 20,
    },
    uploadText: {
      fontSize: 16,
      color: colors.text,
      marginTop: 16,
      fontWeight: '500',
    },
    uploadSubtext: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 8,
    },
    tipsCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginTop: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tipsTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 12,
    },
    tipItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    tipBullet: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.gold,
      marginRight: 10,
      marginTop: 6,
    },
    tipText: {
      flex: 1,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 16,
    },
    columnButton: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 14,
      marginBottom: 12,
    },
    columnButtonSelected: {
      borderColor: colors.gold,
      backgroundColor: colors.gold + '10',
    },
    columnLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    columnValue: {
      fontSize: 16,
      color: colors.text,
      fontWeight: '500',
    },
    previewTable: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      overflow: 'hidden',
      marginTop: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    previewHeader: {
      flexDirection: 'row',
      backgroundColor: colors.border,
      padding: 10,
    },
    previewHeaderText: {
      flex: 1,
      fontSize: 12,
      fontWeight: '600',
      color: colors.text,
    },
    previewRow: {
      flexDirection: 'row',
      padding: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    previewCell: {
      flex: 1,
      fontSize: 12,
      color: colors.textSecondary,
    },
    transactionItem: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
    },
    transactionSelected: {
      borderColor: colors.gold,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    checkboxChecked: {
      backgroundColor: colors.gold,
      borderColor: colors.gold,
    },
    transactionInfo: {
      flex: 1,
    },
    transactionDate: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    transactionDesc: {
      fontSize: 14,
      color: colors.text,
      fontWeight: '500',
      marginTop: 2,
    },
    transactionValue: {
      fontSize: 16,
      fontWeight: '600',
    },
    typeButton: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      marginLeft: 10,
    },
    typeText: {
      fontSize: 12,
      fontWeight: '600',
    },
    summaryCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginTop: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    summaryLabel: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    summaryValue: {
      fontSize: 14,
      fontWeight: '600',
    },
    buttonsRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 20,
    },
    button: {
      flex: 1,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
    },
    buttonOutline: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.border,
    },
    buttonPrimary: {
      backgroundColor: colors.gold,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    resultContainer: {
      alignItems: 'center',
      paddingVertical: 40,
    },
    resultIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
    },
    resultTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 8,
    },
    resultSubtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    resultStats: {
      flexDirection: 'row',
      gap: 20,
      marginTop: 30,
    },
    resultStat: {
      alignItems: 'center',
      padding: 20,
      borderRadius: 12,
      minWidth: 120,
    },
    resultStatValue: {
      fontSize: 32,
      fontWeight: 'bold',
    },
    resultStatLabel: {
      fontSize: 14,
      marginTop: 4,
    },
  });

  const renderStep1 = () => (
    <View>
      <TouchableOpacity style={styles.uploadArea} onPress={pickFile}>
        <Ionicons name="cloud-upload-outline" size={48} color={colors.gold} />
        <Text style={styles.uploadText}>Selecionar arquivo CSV</Text>
        <Text style={styles.uploadSubtext}>Toque para escolher o arquivo</Text>
      </TouchableOpacity>

      <View style={styles.tipsCard}>
        <Text style={styles.tipsTitle}>💡 Dicas</Text>
        <View style={styles.tipItem}>
          <View style={styles.tipBullet} />
          <Text style={styles.tipText}>Exporte seu extrato do internet banking em formato CSV</Text>
        </View>
        <View style={styles.tipItem}>
          <View style={styles.tipBullet} />
          <Text style={styles.tipText}>O arquivo deve ter colunas de data, descrição e valor</Text>
        </View>
        <View style={styles.tipItem}>
          <View style={styles.tipBullet} />
          <Text style={styles.tipText}>Valores negativos serão importados como despesas</Text>
        </View>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>Mapear Colunas</Text>

      {csvData?.headers.map((header, index) => (
        <TouchableOpacity
          key={index}
          style={[
            styles.columnButton,
            (columnMapping.date === index || columnMapping.description === index || columnMapping.value === index) && styles.columnButtonSelected,
          ]}
          onPress={() => {
            Alert.alert(
              'Selecione o tipo',
              `Coluna: ${header || `Coluna ${index + 1}`}`,
              [
                { text: 'Data', onPress: () => setColumnMapping(p => ({ ...p, date: index })) },
                { text: 'Descrição', onPress: () => setColumnMapping(p => ({ ...p, description: index })) },
                { text: 'Valor', onPress: () => setColumnMapping(p => ({ ...p, value: index })) },
                { text: 'Cancelar', style: 'cancel' },
              ]
            );
          }}
        >
          <Text style={styles.columnLabel}>
            {columnMapping.date === index && '📅 Data'}
            {columnMapping.description === index && '📝 Descrição'}
            {columnMapping.value === index && '💰 Valor'}
            {columnMapping.date !== index && columnMapping.description !== index && columnMapping.value !== index && 'Toque para definir'}
          </Text>
          <Text style={styles.columnValue}>{header || `Coluna ${index + 1}`}</Text>
        </TouchableOpacity>
      ))}

      <View style={styles.buttonsRow}>
        <TouchableOpacity
          style={[styles.button, styles.buttonOutline]}
          onPress={() => setStep(1)}
        >
          <Text style={[styles.buttonText, { color: colors.text }]}>Voltar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.buttonPrimary]}
          onPress={handleMapColumns}
        >
          <Text style={[styles.buttonText, { color: '#fff' }]}>Continuar</Text>
        </TouchableOpacity>
      </View>
      
      <View style={{ height: 40 }} />
    </ScrollView>
  );

  const renderStep3 = () => {
    const totalIncome = transactions
      .filter(t => selectedTransactions.includes(t.id) && t.type === 'income')
      .reduce((sum, t) => sum + Math.abs(t.value), 0);
    const totalExpense = transactions
      .filter(t => selectedTransactions.includes(t.id) && t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(t.value), 0);

    return (
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>
          Revisar Transações ({selectedTransactions.length}/{transactions.length})
        </Text>

        {transactions.map((trans) => (
          <TouchableOpacity
            key={trans.id}
            style={[
              styles.transactionItem,
              selectedTransactions.includes(trans.id) && styles.transactionSelected,
            ]}
            onPress={() => toggleTransaction(trans.id)}
          >
            <View style={[
              styles.checkbox,
              selectedTransactions.includes(trans.id) && styles.checkboxChecked,
            ]}>
              {selectedTransactions.includes(trans.id) && (
                <Ionicons name="checkmark" size={16} color="#fff" />
              )}
            </View>
            
            <View style={styles.transactionInfo}>
              <Text style={styles.transactionDate}>{trans.date}</Text>
              <Text style={styles.transactionDesc} numberOfLines={1}>
                {trans.description}
              </Text>
            </View>
            
            <Text style={[
              styles.transactionValue,
              { color: trans.type === 'income' ? colors.income : colors.expense }
            ]}>
              {trans.type === 'income' ? '+' : '-'}{formatCurrency(Math.abs(trans.value))}
            </Text>
            
            <TouchableOpacity
              style={[
                styles.typeButton,
                { backgroundColor: trans.type === 'income' ? colors.income + '20' : colors.expense + '20' }
              ]}
              onPress={() => toggleType(trans.id)}
            >
              <Text style={[
                styles.typeText,
                { color: trans.type === 'income' ? colors.income : colors.expense }
              ]}>
                {trans.type === 'income' ? 'R' : 'D'}
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Receitas:</Text>
            <Text style={[styles.summaryValue, { color: colors.income }]}>
              +{formatCurrency(totalIncome)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Despesas:</Text>
            <Text style={[styles.summaryValue, { color: colors.expense }]}>
              -{formatCurrency(totalExpense)}
            </Text>
          </View>
        </View>

        <View style={styles.buttonsRow}>
          <TouchableOpacity
            style={[styles.button, styles.buttonOutline]}
            onPress={() => setStep(2)}
          >
            <Text style={[styles.buttonText, { color: colors.text }]}>Voltar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.buttonPrimary]}
            onPress={handleImport}
          >
            <Text style={[styles.buttonText, { color: '#fff' }]}>
              Importar ({selectedTransactions.length})
            </Text>
          </TouchableOpacity>
        </View>
        
        <View style={{ height: 40 }} />
      </ScrollView>
    );
  };

  const renderStep4 = () => (
    <View style={styles.resultContainer}>
      <View style={[styles.resultIcon, { backgroundColor: colors.income + '20' }]}>
        <Ionicons name="checkmark-circle" size={48} color={colors.income} />
      </View>
      
      <Text style={styles.resultTitle}>Importação Concluída!</Text>
      <Text style={styles.resultSubtitle}>
        {importResult?.total_imported || 0} transações importadas
      </Text>

      <View style={styles.resultStats}>
        <View style={[styles.resultStat, { backgroundColor: colors.income + '20' }]}>
          <Text style={[styles.resultStatValue, { color: colors.income }]}>
            {importResult?.imported_incomes || 0}
          </Text>
          <Text style={[styles.resultStatLabel, { color: colors.income }]}>Receitas</Text>
        </View>
        <View style={[styles.resultStat, { backgroundColor: colors.expense + '20' }]}>
          <Text style={[styles.resultStatValue, { color: colors.expense }]}>
            {importResult?.imported_expenses || 0}
          </Text>
          <Text style={[styles.resultStatLabel, { color: colors.expense }]}>Despesas</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.button, styles.buttonPrimary, { marginTop: 40, paddingHorizontal: 40 }]}
        onPress={resetAndClose}
      >
        <Text style={[styles.buttonText, { color: '#fff' }]}>Concluir</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={resetAndClose}>
          <Ionicons name="arrow-back" size={24} color={colors.textLight} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Importar Extrato</Text>
      </View>

      {/* Step Indicator */}
      <View style={styles.stepIndicator}>
        {[1, 2, 3, 4].map((s, i) => (
          <React.Fragment key={s}>
            <View style={[
              styles.stepDot,
              s <= step ? styles.stepDotActive : styles.stepDotInactive,
            ]}>
              {s < step ? (
                <Ionicons name="checkmark" size={18} color="#fff" />
              ) : (
                <Text style={styles.stepText}>{s}</Text>
              )}
            </View>
            {i < 3 && (
              <View style={[
                styles.stepLine,
                s < step ? styles.stepLineActive : styles.stepLineInactive,
              ]} />
            )}
          </React.Fragment>
        ))}
      </View>

      <View style={styles.content}>
        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.gold} />
            <Text style={{ marginTop: 16, color: colors.textSecondary }}>
              Processando...
            </Text>
          </View>
        ) : (
          <>
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
            {step === 4 && renderStep4()}
          </>
        )}
      </View>
    </View>
  );
}
