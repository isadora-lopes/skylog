export function skyTone(
  avgCloudCover: number | null | undefined,
  hasStorm?: boolean,
  hasRain?: boolean,
): 'good' | 'fair' | 'bad' | 'worse' {
  if (hasStorm) return 'worse';
  if (hasRain) return 'bad';
  if (avgCloudCover === null || avgCloudCover === undefined) return 'fair';
  if (avgCloudCover <= 15) return 'good';
  if (avgCloudCover <= 40) return 'fair';
  if (avgCloudCover <= 70) return 'bad';
  return 'worse';
}

export function formatDateLabel(isoDate: string) {
  const [y, m, d] = isoDate.split('-');
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function formatWeekday(isoDate: string, isToday: boolean) {
  if (isToday) return 'Hoje';
  const [y, m, d] = isoDate.split('-');
  const label = new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString('pt-BR', {
    weekday: 'short',
  });
  return label.replace('.', '').slice(0, 3);
}

export function formatShortDate(isoDate: string) {
  const [, m, d] = isoDate.split('-');
  return `${d}/${m}`;
}

export function formatTime(horizonsTimeStr: string | null | undefined) {
  if (!horizonsTimeStr) return '—';
  const parts = horizonsTimeStr.trim().split(' ');
  return parts[parts.length - 1] || horizonsTimeStr;
}

export function formatDegrees(value: number | null | undefined) {
  return value === null || value === undefined ? '—' : `${value}°`;
}

export function formatNightDate(isoDate: string | null | undefined) {
  if (!isoDate) return '—';
  const [, m, d] = isoDate.split('-');
  return `${d}/${m}`;
}
