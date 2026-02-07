import { useState } from 'react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { Search, X } from 'lucide-react';

export function AdvancedFilters({ categories, onFilterChange, type = 'all' }) {
  const [filters, setFilters] = useState({
    search: '',
    category: 'all',
    status: 'all',
    minValue: '',
    maxValue: ''
  });

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const clearedFilters = {
      search: '',
      category: 'all',
      status: 'all',
      minValue: '',
      maxValue: ''
    };
    setFilters(clearedFilters);
    onFilterChange(clearedFilters);
  };

  const hasActiveFilters = filters.search || filters.category !== 'all' || filters.status !== 'all' || filters.minValue || filters.maxValue;

  return (
    <div className="bg-muted/30 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Search className="w-4 h-4" />
          Filtros Avançados
        </h3>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-8 text-xs"
          >
            <X className="w-3 h-3 mr-1" />
            Limpar
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Search */}
        <div className="space-y-2">
          <Label htmlFor="search" className="text-xs">Buscar</Label>
          <Input
            id="search"
            placeholder="Descrição..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="h-9"
          />
        </div>

        {/* Category */}
        <div className="space-y-2">
          <Label className="text-xs">Categoria</Label>
          <Select
            value={filters.category}
            onValueChange={(value) => handleFilterChange('category', value)}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {categories?.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status */}
        <div className="space-y-2">
          <Label className="text-xs">Status</Label>
          <Select
            value={filters.status}
            onValueChange={(value) => handleFilterChange('status', value)}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {type === 'income' ? (
                <>
                  <SelectItem value="received">Recebido</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                </>
              ) : (
                <>
                  <SelectItem value="paid">Pago</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Min Value */}
        <div className="space-y-2">
          <Label htmlFor="minValue" className="text-xs">Valor Mínimo</Label>
          <Input
            id="minValue"
            type="number"
            placeholder="R$ 0,00"
            value={filters.minValue}
            onChange={(e) => handleFilterChange('minValue', e.target.value)}
            className="h-9"
          />
        </div>

        {/* Max Value */}
        <div className="space-y-2">
          <Label htmlFor="maxValue" className="text-xs">Valor Máximo</Label>
          <Input
            id="maxValue"
            type="number"
            placeholder="R$ 9999,99"
            value={filters.maxValue}
            onChange={(e) => handleFilterChange('maxValue', e.target.value)}
            className="h-9"
          />
        </div>
      </div>

      {hasActiveFilters && (
        <div className="text-xs text-muted-foreground">
          Filtros ativos: {Object.values(filters).filter(v => v && v !== 'all').length}
        </div>
      )}
    </div>
  );
}

export function filterTransactions(transactions, filters) {
  return transactions.filter(transaction => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesDescription = transaction.description?.toLowerCase().includes(searchLower);
      if (!matchesDescription) return false;
    }

    // Category filter
    if (filters.category && filters.category !== 'all') {
      if (transaction.category_id !== filters.category) return false;
    }

    // Status filter
    if (filters.status && filters.status !== 'all') {
      if (transaction.status !== filters.status) return false;
    }

    // Min value filter
    if (filters.minValue) {
      const minVal = parseFloat(filters.minValue);
      if (transaction.value < minVal) return false;
    }

    // Max value filter
    if (filters.maxValue) {
      const maxVal = parseFloat(filters.maxValue);
      if (transaction.value > maxVal) return false;
    }

    return true;
  });
}