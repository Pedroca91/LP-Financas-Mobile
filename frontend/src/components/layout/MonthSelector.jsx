import { useFinance } from '../../contexts/FinanceContext';
import { getMonthName } from '../../lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Button } from '../ui/button';

export function MonthSelector() {
  const { selectedMonth, setSelectedMonth, selectedYear, setSelectedYear } = useFinance();

  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i);

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-sm">
      <Calendar className="h-5 w-5 text-muted-foreground" />
      
      <Button
        variant="ghost"
        size="icon"
        onClick={handlePrevMonth}
        data-testid="prev-month-btn"
        className="h-8 w-8 rounded-sm"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="flex items-center gap-2">
        <Select
          value={String(selectedMonth)}
          onValueChange={(v) => setSelectedMonth(Number(v))}
        >
          <SelectTrigger className="w-32 rounded-sm" data-testid="month-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map((m) => (
              <SelectItem key={m} value={String(m)}>
                {getMonthName(m)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={String(selectedYear)}
          onValueChange={(v) => setSelectedYear(Number(v))}
        >
          <SelectTrigger className="w-24 rounded-sm" data-testid="year-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={handleNextMonth}
        data-testid="next-month-btn"
        className="h-8 w-8 rounded-sm"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
