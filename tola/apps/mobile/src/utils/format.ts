export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatINRCompact(amount: number): string {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return formatINR(amount);
}

export function formatGrams(g: number): string {
  return `${g.toFixed(3)}g`;
}

export function formatDateDisplay(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export function formatDateFull(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });
}

export function formatDateShort(dateStr: string): string {
  const [, month, day] = dateStr.split('-');
  return `${day}/${month}`;
}

export function formatMonthYear(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    month: 'long', year: 'numeric',
  });
}

export function today(): string {
  return new Date().toISOString().split('T')[0];
}

export function now(): string {
  return new Date().toISOString();
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export function firstDayOfMonth(dateStr: string): string {
  const d = new Date(dateStr);
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
}

export function lastDayOfMonth(dateStr: string): string {
  const d = new Date(dateStr);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
}

export function prevMonth(dateStr: string): string {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() - 1);
  d.setDate(1);
  return d.toISOString().split('T')[0];
}

export function nextMonth(dateStr: string): string {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + 1);
  d.setDate(1);
  return d.toISOString().split('T')[0];
}
