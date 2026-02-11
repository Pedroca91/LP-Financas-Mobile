export const formatCurrency = (value) => {
  if (value === null || value === undefined) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const formatDate = (dateString) => {
  if (!dateString) return '';
  
  // Se a data vier no formato YYYY-MM-DD, parsear manualmente para evitar problema de timezone
  if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = dateString.split('-').map(Number);
    return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
  }
  
  // Se vier com timestamp, usar o formato ISO e extrair apenas a data
  if (typeof dateString === 'string' && dateString.includes('T')) {
    const datePart = dateString.split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);
    return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
  }
  
  // Fallback para outros casos
  const date = new Date(dateString);
  const day = date.getUTCDate();
  const month = date.getUTCMonth() + 1;
  const year = date.getUTCFullYear();
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
};

export const formatDateForInput = (dateString) => {
  if (!dateString) return new Date().toISOString().split('T')[0];
  
  // Se já estiver no formato correto YYYY-MM-DD
  if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateString;
  }
  
  // Se vier com timestamp
  if (typeof dateString === 'string' && dateString.includes('T')) {
    return dateString.split('T')[0];
  }
  
  return new Date().toISOString().split('T')[0];
};

export const formatMonth = (month, year) => {
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  return `${months[month - 1]} ${year}`;
};

export const getMonthName = (month) => {
  const months = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
  ];
  return months[month - 1];
};

export const formatPercentage = (value) => {
  if (value === null || value === undefined) return '0%';
  return `${value.toFixed(1)}%`;
};

// Formatar data para exibição dos alertas (dias restantes)
export const getDaysUntil = (dateString) => {
  if (!dateString) return null;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let targetDate;
  if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = dateString.split('-').map(Number);
    targetDate = new Date(year, month - 1, day);
  } else if (typeof dateString === 'string' && dateString.includes('T')) {
    const [year, month, day] = dateString.split('T')[0].split('-').map(Number);
    targetDate = new Date(year, month - 1, day);
  } else {
    targetDate = new Date(dateString);
  }
  
  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};
