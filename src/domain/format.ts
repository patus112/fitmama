export function formatClock(seconds: number, rounding: 'ceil' | 'round' = 'ceil'): string {
  const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const whole = rounding === 'round' ? Math.round(safe) : Math.ceil(safe);
  const minutes = Math.floor(whole / 60);
  const remain = whole % 60;
  return `${minutes}:${remain.toString().padStart(2, '0')}`;
}

export function formatPoints(points: number): string {
  return Math.max(0, Math.round(points)).toLocaleString('en-US');
}
