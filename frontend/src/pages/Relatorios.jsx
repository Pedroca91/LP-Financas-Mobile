import { useState, useEffect } from 'react';
import { useFinance } from '../contexts/FinanceContext';
import { MonthSelector } from '../components/layout/MonthSelector';
import { formatCurrency, getMonthName } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import { FileText, PieChart, BarChart3, Download, FileSpreadsheet } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart as RePieChart,
  Pie,
  Cell
} from 'recharts';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const COLORS = ['hsl(176, 61%, 40%)', 'hsl(24, 95%, 53%)', 'hsl(210, 40%, 60%)', 'hsl(145, 60%, 45%)', 'hsl(340, 75%, 55%)', 'hsl(45, 93%, 47%)', 'hsl(280, 65%, 60%)', 'hsl(200, 70%, 50%)'];
const COLORS_HEX = ['#1a9e8f', '#f97316', '#6b9ac4', '#3cb371', '#e0456e', '#d4a017', '#9b59b6', '#3498db'];

export function Relatorios() {
  const { selectedMonth, selectedYear, summary, incomes, expenses } = useFinance();
  const [incomeReport, setIncomeReport] = useState([]);
  const [expenseReport, setExpenseReport] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchReports();
  }, [selectedMonth, selectedYear]);

  const fetchReports = async () => {
    try {
      const [incomeRes, expenseRes] = await Promise.all([
        axios.get(`${API}/reports/by-category`, {
          params: { month: selectedMonth, year: selectedYear, type: 'income' }
        }),
        axios.get(`${API}/reports/by-category`, {
          params: { month: selectedMonth, year: selectedYear, type: 'expense' }
        })
      ]);
      setIncomeReport(incomeRes.data);
      setExpenseReport(expenseRes.data);
    } catch (error) {
      console.error('Error fetching reports:', error);
    }
  };

  const pieDataIncome = incomeReport.filter(r => r.realized > 0).map((r, i) => ({
    name: r.category_name,
    value: r.realized,
    color: COLORS[i % COLORS.length]
  }));

  const pieDataExpense = expenseReport.filter(r => r.realized > 0).map((r, i) => ({
    name: r.category_name,
    value: r.realized,
    color: COLORS[i % COLORS.length]
  }));

  const barDataIncome = incomeReport.map(r => ({
    name: r.category_name.length > 10 ? r.category_name.substring(0, 10) + '...' : r.category_name,
    Planejado: r.planned,
    Realizado: r.realized
  }));

  const barDataExpense = expenseReport.map(r => ({
    name: r.category_name.length > 10 ? r.category_name.substring(0, 10) + '...' : r.category_name,
    Planejado: r.planned,
    Realizado: r.realized
  }));

  const mesAno = `${getMonthName(selectedMonth)} ${selectedYear}`;

  // ==================== EXPORTAÇÃO PDF ====================
  const exportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Cabeçalho
    doc.setFillColor(22, 163, 74); // verde
    doc.rect(0, 0, pageWidth, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('LP Finanças', 14, 12);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Relatório Financeiro — ${mesAno}`, 14, 22);

    // Resumo Geral
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumo do Mês', 14, 40);

    autoTable(doc, {
      startY: 44,
      head: [['Indicador', 'Valor']],
      body: [
        ['Total Receitas (Recebido)', formatCurrency(summary?.total_income || 0)],
        ['Total Receitas (Pendente)', formatCurrency(summary?.total_income_pending || 0)],
        ['Total Despesas (Pago)', formatCurrency(summary?.total_expense || 0)],
        ['Total Despesas (Pendente)', formatCurrency(summary?.total_expense_pending || 0)],
        ['Investimentos', formatCurrency(summary?.total_contributions || 0)],
        ['Saldo do Mês', formatCurrency(summary?.balance || 0)],
      ],
      headStyles: { fillColor: [22, 163, 74], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [240, 253, 244] },
      styles: { fontSize: 10 },
      columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } }
    });

    // Receitas por Categoria
    const afterSummary = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Receitas por Categoria', 14, afterSummary);

    const incomeRows = incomeReport
      .filter(r => r.realized > 0 || r.planned > 0)
      .map(r => [
        r.category_name,
        formatCurrency(r.planned),
        formatCurrency(r.realized),
        `${r.percentage.toFixed(0)}%`
      ]);

    autoTable(doc, {
      startY: afterSummary + 4,
      head: [['Categoria', 'Planejado', 'Realizado', '%']],
      body: incomeRows.length > 0 ? incomeRows : [['Sem dados', '-', '-', '-']],
      headStyles: { fillColor: [22, 163, 74], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [240, 253, 244] },
      styles: { fontSize: 9 },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } }
    });

    // Despesas por Categoria
    const afterIncome = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Despesas por Categoria', 14, afterIncome);

    const expenseRows = expenseReport
      .filter(r => r.realized > 0 || r.planned > 0)
      .map(r => [
        r.category_name,
        formatCurrency(r.planned),
        formatCurrency(r.realized),
        `${r.percentage.toFixed(0)}%`
      ]);

    autoTable(doc, {
      startY: afterIncome + 4,
      head: [['Categoria', 'Planejado', 'Realizado', '%']],
      body: expenseRows.length > 0 ? expenseRows : [['Sem dados', '-', '-', '-']],
      headStyles: { fillColor: [239, 68, 68], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [254, 242, 242] },
      styles: { fontSize: 9 },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } }
    });

    // Rodapé
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `LP Finanças — Gerado em ${new Date().toLocaleDateString('pt-BR')} — Página ${i} de ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 8,
        { align: 'center' }
      );
    }

    doc.save(`relatorio-lpfinancas-${selectedYear}-${String(selectedMonth).padStart(2, '0')}.pdf`);
  };

  // ==================== EXPORTAÇÃO EXCEL ====================
  const exportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Aba: Resumo
    const resumoData = [
      ['LP Finanças — Relatório Financeiro'],
      [`Período: ${mesAno}`],
      [],
      ['Indicador', 'Valor'],
      ['Total Receitas (Recebido)', summary?.total_income || 0],
      ['Total Receitas (Pendente)', summary?.total_income_pending || 0],
      ['Total Despesas (Pago)', summary?.total_expense || 0],
      ['Total Despesas (Pendente)', summary?.total_expense_pending || 0],
      ['Investimentos', summary?.total_contributions || 0],
      ['Saldo do Mês', summary?.balance || 0],
    ];
    const wsResumo = XLSX.utils.aoa_to_sheet(resumoData);
    wsResumo['!cols'] = [{ wch: 35 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');

    // Aba: Receitas por Categoria
    const incomeData = [
      ['Categoria', 'Planejado (R$)', 'Realizado (R$)', '% Atingido'],
      ...incomeReport.map(r => [r.category_name, r.planned, r.realized, `${r.percentage.toFixed(0)}%`])
    ];
    const wsIncome = XLSX.utils.aoa_to_sheet(incomeData);
    wsIncome['!cols'] = [{ wch: 28 }, { wch: 16 }, { wch: 16 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsIncome, 'Receitas por Categoria');

    // Aba: Despesas por Categoria
    const expenseData = [
      ['Categoria', 'Planejado (R$)', 'Realizado (R$)', '% Atingido'],
      ...expenseReport.map(r => [r.category_name, r.planned, r.realized, `${r.percentage.toFixed(0)}%`])
    ];
    const wsExpense = XLSX.utils.aoa_to_sheet(expenseData);
    wsExpense['!cols'] = [{ wch: 28 }, { wch: 16 }, { wch: 16 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsExpense, 'Despesas por Categoria');

    // Aba: Lançamentos Receitas
    const incomesData = [
      ['Descrição', 'Categoria', 'Valor (R$)', 'Data', 'Status'],
      ...incomes.map(i => [
        i.description || '-',
        i.category_name || i.category_id,
        i.value,
        i.date,
        i.status === 'received' ? 'Recebido' : 'Pendente'
      ])
    ];
    const wsIncomes = XLSX.utils.aoa_to_sheet(incomesData);
    wsIncomes['!cols'] = [{ wch: 30 }, { wch: 22 }, { wch: 14 }, { wch: 12 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsIncomes, 'Lançamentos Receitas');

    // Aba: Lançamentos Despesas
    const expensesData = [
      ['Descrição', 'Categoria', 'Valor (R$)', 'Data', 'Pagamento', 'Status'],
      ...expenses.map(e => [
        e.description || '-',
        e.category_name || e.category_id,
        e.value,
        e.date,
        e.payment_method || '-',
        e.status === 'paid' ? 'Pago' : 'Pendente'
      ])
    ];
    const wsExpenses = XLSX.utils.aoa_to_sheet(expensesData);
    wsExpenses['!cols'] = [{ wch: 30 }, { wch: 22 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsExpenses, 'Lançamentos Despesas');

    XLSX.writeFile(wb, `relatorio-lpfinancas-${selectedYear}-${String(selectedMonth).padStart(2, '0')}.xlsx`);
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="relatorios-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-semibold text-foreground flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            Relatórios
          </h1>
          <p className="text-muted-foreground mt-1">
            Análise financeira de {getMonthName(selectedMonth)} de {selectedYear}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <MonthSelector />
          <Button
            variant="outline"
            size="sm"
            onClick={exportPDF}
            className="gap-2 border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
          >
            <Download className="h-4 w-4" />
            Exportar PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportExcel}
            className="gap-2 border-emerald-300 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Exportar Excel
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="overview" data-testid="tab-overview">
            <BarChart3 className="h-4 w-4 mr-2" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="income" data-testid="tab-income">
            Receitas
          </TabsTrigger>
          <TabsTrigger value="expense" data-testid="tab-expense">
            Despesas
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Income Summary */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="text-lg font-heading text-emerald-600">
                  Receitas por Categoria
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie
                        data={pieDataIncome}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        labelLine={false}
                      >
                        {pieDataIncome.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => formatCurrency(value)}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          borderColor: 'hsl(var(--border))',
                          borderRadius: '0.25rem'
                        }}
                      />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-center mt-4">
                  <p className="text-sm text-muted-foreground">Total Recebido</p>
                  <p className="text-2xl font-mono font-bold text-emerald-600">
                    {formatCurrency(summary?.total_income || 0)}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Expense Summary */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="text-lg font-heading text-red-600">
                  Despesas por Categoria
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie
                        data={pieDataExpense}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        labelLine={false}
                      >
                        {pieDataExpense.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => formatCurrency(value)}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          borderColor: 'hsl(var(--border))',
                          borderRadius: '0.25rem'
                        }}
                      />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-center mt-4">
                  <p className="text-sm text-muted-foreground">Total Gasto</p>
                  <p className="text-2xl font-mono font-bold text-red-600">
                    {formatCurrency(summary?.total_expense || 0)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Income Tab */}
        <TabsContent value="income" className="space-y-6 mt-6">
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="text-lg font-heading">Meta vs Realizado - Receitas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barDataIncome} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => formatCurrency(v)} />
                    <YAxis type="category" dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))' }} width={100} />
                    <Tooltip
                      formatter={(value) => formatCurrency(value)}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '0.25rem'
                      }}
                    />
                    <Legend />
                    <Bar dataKey="Planejado" fill="hsl(var(--chart-3))" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="Realizado" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Income Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-heading">Detalhamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {incomeReport.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-secondary/50 rounded-sm">
                    <span className="font-medium">{item.category_name}</span>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-right">
                        <p className="text-muted-foreground">Planejado</p>
                        <p className="font-mono">{formatCurrency(item.planned)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-muted-foreground">Realizado</p>
                        <p className="font-mono text-emerald-500">{formatCurrency(item.realized)}</p>
                      </div>
                      <div className="text-right w-16">
                        <p className="text-muted-foreground">%</p>
                        <p className={`font-mono ${item.percentage >= 100 ? 'text-emerald-500' : 'text-yellow-500'}`}>
                          {item.percentage.toFixed(0)}%
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expense Tab */}
        <TabsContent value="expense" className="space-y-6 mt-6">
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="text-lg font-heading">Meta vs Realizado - Despesas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barDataExpense} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => formatCurrency(v)} />
                    <YAxis type="category" dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))' }} width={100} />
                    <Tooltip
                      formatter={(value) => formatCurrency(value)}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '0.25rem'
                      }}
                    />
                    <Legend />
                    <Bar dataKey="Planejado" fill="hsl(var(--chart-3))" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="Realizado" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Expense Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-heading">Detalhamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {expenseReport.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-secondary/50 rounded-sm">
                    <span className="font-medium">{item.category_name}</span>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-right">
                        <p className="text-muted-foreground">Planejado</p>
                        <p className="font-mono">{formatCurrency(item.planned)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-muted-foreground">Realizado</p>
                        <p className="font-mono text-red-500">{formatCurrency(item.realized)}</p>
                      </div>
                      <div className="text-right w-16">
                        <p className="text-muted-foreground">%</p>
                        <p className={`font-mono ${item.percentage <= 100 ? 'text-emerald-500' : 'text-red-500'}`}>
                          {item.percentage.toFixed(0)}%
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
