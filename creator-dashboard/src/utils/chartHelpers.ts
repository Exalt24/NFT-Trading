export function formatChartDate(dateString: string): string {
  const date = new Date(dateString);
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const day = date.getDate();
  return `${month} ${day}`;
}

export function formatChartValue(value: number, precision: number = 2): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toFixed(precision);
}

export function formatETHValue(value: number): string {
  if (value === 0) return '0';
  if (value < 0.001) return value.toFixed(6);
  if (value < 1) return value.toFixed(4);
  return value.toFixed(2);
}

export function getChartColors() {
  return {
    primary: '#8b5cf6',
    secondary: '#3b82f6',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    grid: '#334155',
    text: '#94a3b8'
  };
}

export function generateEmptyDataPoint(date: string, fields: string[]) {
  const point: Record<string, any> = { date };
  fields.forEach(field => {
    point[field] = 0;
  });
  return point;
}

export function fillMissingDates(
  data: Array<{ date: string; [key: string]: any }>,
  days: number
): Array<{ date: string; count: number; volume: number; amount: number }> {
  if (data.length === 0) {
    const result: Array<{ date: string; count: number; volume: number; amount: number }> = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0]!;
      result.push({
        date: dateStr,
        count: 0,
        volume: 0,
        amount: 0
      });
    }
    return result;
  }

  const dateMap = new Map(data.map(d => [d.date, d]));
  const result: Array<{ date: string; count: number; volume: number; amount: number }> = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0]!;
    
    if (dateMap.has(dateStr)) {
      const existing = dateMap.get(dateStr)!;
      result.push({
        date: dateStr,
        count: existing.count || 0,
        volume: existing.volume || 0,
        amount: existing.amount || 0
      });
    } else {
      result.push({
        date: dateStr,
        count: 0,
        volume: 0,
        amount: 0
      });
    }
  }
  
  return result;
}

export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}