import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import { toast } from '../components/ui/toast-provider';
import { Upload, FileSpreadsheet, Check, X, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { useFinance } from '../contexts/FinanceContext';
import { formatCurrency } from '../lib/utils';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export function ImportExtrato({ open, onOpenChange }) {
  const { categories, fetchIncomes, fetchExpenses, fetchSummary } = useFinance();
  const fileInputRef = useRef(null);
  
  const [step, setStep] = useState(1); // 1: upload, 2: map columns, 3: review, 4: result
  const [loading, setLoading] = useState(false);
  const [csvData, setCsvData] = useState(null);
  const [columnMapping, setColumnMapping] = useState({
    date: null,
    description: null,
    value: null
  });
  const [transactions, setTransactions] = useState([]);
  const [selectedTransactions, setSelectedTransactions] = useState([]);
  const [importResult, setImportResult] = useState(null);
  const [defaultCategory, setDefaultCategory] = useState('');

  const expenseCategories = categories.filter(c => c.type === 'expense');
  const incomeCategories = categories.filter(c => c.type === 'income');

  const resetState = () => {
    setStep(1);
    setCsvData(null);
    setColumnMapping({ date: null, description: null, value: null });
    setTransactions([]);
    setSelectedTransactions([]);
    setImportResult(null);
    setDefaultCategory('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Por favor, selecione um arquivo CSV');
      return;
    }

    setLoading(true);
    try {
      const content = await file.text();
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${BACKEND_URL}/api/import/parse-csv`, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
          'Authorization': `Bearer ${token}`
        },
        body: content
      });

      if (!response.ok) {
        throw new Error('Erro ao processar arquivo');
      }

      const data = await response.json();
      setCsvData(data);
      
      // Auto-set detected columns
      if (data.detected_columns) {
        setColumnMapping({
          date: data.detected_columns.date !== null ? String(data.detected_columns.date) : null,
          description: data.detected_columns.description !== null ? String(data.detected_columns.description) : null,
          value: data.detected_columns.value !== null ? String(data.detected_columns.value) : null
        });
      }
      
      setStep(2);
    } catch (error) {
      console.error('Error parsing CSV:', error);
      toast.error('Erro ao processar arquivo CSV');
    } finally {
      setLoading(false);
    }
  };

  const handleMapColumns = () => {
    if (columnMapping.date === null || columnMapping.description === null || columnMapping.value === null) {
      toast.error('Por favor, mapeie todas as colunas obrigatórias');
      return;
    }

    // Parse transactions
    const parsed = csvData.sample_data.map((row, index) => {
      const dateCol = parseInt(columnMapping.date);
      const descCol = parseInt(columnMapping.description);
      const valueCol = parseInt(columnMapping.value);
      
      let rawValue = row[valueCol] || '0';
      // Clean value: remove currency symbols, spaces, handle Brazilian format
      rawValue = rawValue.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
      const value = parseFloat(rawValue) || 0;
      
      return {
        id: index,
        date: row[dateCol] || '',
        description: row[descCol] || '',
        value: value,
        type: value >= 0 ? 'income' : 'expense',
        selected: true
      };
    }).filter(t => t.value !== 0 && t.description); // Filter out empty/zero transactions

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

  const toggleAllTransactions = () => {
    if (selectedTransactions.length === transactions.length) {
      setSelectedTransactions([]);
    } else {
      setSelectedTransactions(transactions.map(t => t.id));
    }
  };

  const changeTransactionType = (id, newType) => {
    setTransactions(prev => prev.map(t => 
      t.id === id ? { ...t, type: newType } : t
    ));
  };

  const handleImport = async () => {
    const toImport = transactions
      .filter(t => selectedTransactions.includes(t.id))
      .map(t => ({
        date: t.date,
        description: t.description,
        value: t.value,
        type: t.type
      }));

    if (toImport.length === 0) {
      toast.error('Selecione pelo menos uma transação');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/import/bank-statement`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          transactions: toImport,
          default_category_id: defaultCategory || null
        })
      });

      if (!response.ok) {
        throw new Error('Erro ao importar');
      }

      const result = await response.json();
      setImportResult(result);
      setStep(4);
      
      // Refresh data
      fetchIncomes();
      fetchExpenses();
      fetchSummary();
      
    } catch (error) {
      console.error('Error importing:', error);
      toast.error('Erro ao importar transações');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center py-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
          <FileSpreadsheet className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-lg font-medium mb-2">Importar Extrato Bancário</h3>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          Selecione um arquivo CSV do seu banco para importar as transações automaticamente.
        </p>
      </div>

      <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
          id="csv-upload"
        />
        <label htmlFor="csv-upload" className="cursor-pointer">
          <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
          <p className="font-medium">Clique para selecionar arquivo</p>
          <p className="text-sm text-muted-foreground mt-1">
            Suportamos arquivos CSV (.csv)
          </p>
        </label>
      </div>

      <div className="bg-muted/50 rounded-lg p-4 text-sm">
        <p className="font-medium mb-2">Dicas:</p>
        <ul className="space-y-1 text-muted-foreground">
          <li>• Exporte seu extrato do internet banking em formato CSV</li>
          <li>• O arquivo deve ter colunas de data, descrição e valor</li>
          <li>• Valores negativos serão importados como despesas</li>
          <li>• Valores positivos serão importados como receitas</li>
        </ul>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">Mapear Colunas</h3>
        <p className="text-muted-foreground text-sm">
          Identifique quais colunas do seu arquivo correspondem a cada informação.
        </p>
      </div>

      <div className="grid gap-4">
        <div className="space-y-2">
          <Label>Coluna de Data *</Label>
          <Select 
            value={columnMapping.date || ''} 
            onValueChange={(v) => setColumnMapping(prev => ({ ...prev, date: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione a coluna" />
            </SelectTrigger>
            <SelectContent>
              {csvData?.headers.map((header, index) => (
                <SelectItem key={index} value={String(index)}>
                  {header || `Coluna ${index + 1}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Coluna de Descrição *</Label>
          <Select 
            value={columnMapping.description || ''} 
            onValueChange={(v) => setColumnMapping(prev => ({ ...prev, description: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione a coluna" />
            </SelectTrigger>
            <SelectContent>
              {csvData?.headers.map((header, index) => (
                <SelectItem key={index} value={String(index)}>
                  {header || `Coluna ${index + 1}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Coluna de Valor *</Label>
          <Select 
            value={columnMapping.value || ''} 
            onValueChange={(v) => setColumnMapping(prev => ({ ...prev, value: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione a coluna" />
            </SelectTrigger>
            <SelectContent>
              {csvData?.headers.map((header, index) => (
                <SelectItem key={index} value={String(index)}>
                  {header || `Coluna ${index + 1}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {csvData && (
        <div>
          <p className="text-sm font-medium mb-2">Prévia dos dados ({csvData.total_rows} linhas):</p>
          <div className="border rounded-lg overflow-auto max-h-48">
            <Table>
              <TableHeader>
                <TableRow>
                  {csvData.headers.map((header, i) => (
                    <TableHead key={i} className="whitespace-nowrap text-xs">
                      {header || `Col ${i + 1}`}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {csvData.sample_data.slice(0, 5).map((row, i) => (
                  <TableRow key={i}>
                    {row.map((cell, j) => (
                      <TableCell key={j} className="text-xs py-1">
                        {cell?.substring(0, 30) || '-'}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={() => setStep(1)}>
          Voltar
        </Button>
        <Button onClick={handleMapColumns}>
          Continuar <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">Revisar Transações</h3>
        <p className="text-muted-foreground text-sm">
          Selecione as transações que deseja importar e ajuste os tipos se necessário.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Checkbox 
            checked={selectedTransactions.length === transactions.length}
            onCheckedChange={toggleAllTransactions}
          />
          <span className="text-sm">
            {selectedTransactions.length} de {transactions.length} selecionadas
          </span>
        </div>
        <Select value={defaultCategory} onValueChange={setDefaultCategory}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Categoria padrão" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Usar padrão</SelectItem>
            {expenseCategories.map(cat => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name} (Despesa)</SelectItem>
            ))}
            {incomeCategories.map(cat => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name} (Receita)</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg overflow-auto max-h-64">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Tipo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((trans) => (
              <TableRow key={trans.id} className={!selectedTransactions.includes(trans.id) ? 'opacity-50' : ''}>
                <TableCell>
                  <Checkbox 
                    checked={selectedTransactions.includes(trans.id)}
                    onCheckedChange={() => toggleTransaction(trans.id)}
                  />
                </TableCell>
                <TableCell className="text-sm">{trans.date}</TableCell>
                <TableCell className="text-sm max-w-[200px] truncate">{trans.description}</TableCell>
                <TableCell className={`font-mono text-sm ${trans.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                  {trans.type === 'income' ? '+' : '-'}{formatCurrency(Math.abs(trans.value))}
                </TableCell>
                <TableCell>
                  <Select 
                    value={trans.type} 
                    onValueChange={(v) => changeTransactionType(trans.id, v)}
                  >
                    <SelectTrigger className="h-8 w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Receita</SelectItem>
                      <SelectItem value="expense">Despesa</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="bg-muted/50 rounded-lg p-4">
        <div className="flex justify-between text-sm">
          <span>Total Receitas:</span>
          <span className="text-emerald-600 font-mono">
            +{formatCurrency(transactions
              .filter(t => selectedTransactions.includes(t.id) && t.type === 'income')
              .reduce((sum, t) => sum + Math.abs(t.value), 0)
            )}
          </span>
        </div>
        <div className="flex justify-between text-sm mt-1">
          <span>Total Despesas:</span>
          <span className="text-red-600 font-mono">
            -{formatCurrency(transactions
              .filter(t => selectedTransactions.includes(t.id) && t.type === 'expense')
              .reduce((sum, t) => sum + Math.abs(t.value), 0)
            )}
          </span>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={() => setStep(2)}>
          Voltar
        </Button>
        <Button onClick={handleImport} disabled={selectedTransactions.length === 0}>
          Importar {selectedTransactions.length} transações
        </Button>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6 text-center py-4">
      {importResult?.success ? (
        <>
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <Check className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-medium mb-2">Importação Concluída!</h3>
            <p className="text-muted-foreground text-sm">
              {importResult.total_imported} transações foram importadas com sucesso.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto">
            <div className="bg-emerald-100 dark:bg-emerald-900/30 rounded-lg p-4">
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {importResult.imported_incomes}
              </p>
              <p className="text-sm text-emerald-700 dark:text-emerald-300">Receitas</p>
            </div>
            <div className="bg-red-100 dark:bg-red-900/30 rounded-lg p-4">
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {importResult.imported_expenses}
              </p>
              <p className="text-sm text-red-700 dark:text-red-300">Despesas</p>
            </div>
          </div>
          {importResult.errors?.length > 0 && (
            <div className="bg-amber-100 dark:bg-amber-900/30 rounded-lg p-4 text-left">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-300 mb-2">
                Alguns erros ocorreram:
              </p>
              <ul className="text-xs text-amber-600 dark:text-amber-400 space-y-1">
                {importResult.errors.map((err, i) => (
                  <li key={i}>• {err}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="w-16 h-16 mx-auto rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <X className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="text-lg font-medium mb-2">Erro na Importação</h3>
            <p className="text-muted-foreground text-sm">
              Ocorreu um erro ao importar as transações. Por favor, tente novamente.
            </p>
          </div>
        </>
      )}
      <Button onClick={handleClose} className="mt-4">
        Fechar
      </Button>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Extrato
          </DialogTitle>
          <DialogDescription>
            {step === 1 && 'Faça upload do arquivo CSV do seu extrato bancário'}
            {step === 2 && 'Configure o mapeamento das colunas'}
            {step === 3 && 'Revise e confirme as transações'}
            {step === 4 && 'Resultado da importação'}
          </DialogDescription>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 py-4">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                s <= step 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground'
              }`}>
                {s < step ? <Check className="h-4 w-4" /> : s}
              </div>
              {s < 4 && (
                <div className={`w-12 h-1 ${s < step ? 'bg-primary' : 'bg-muted'}`} />
              )}
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Processando...</p>
          </div>
        ) : (
          <>
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
            {step === 4 && renderStep4()}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ImportExtrato;
