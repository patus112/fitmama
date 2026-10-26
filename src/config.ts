/** Real sessions are about three minutes. `?fast=1` shortens them for tests. */
export const GAME_SECONDS = 180;
export const FAST_GAME_SECONDS = 12;
export const COUNTDOWN_FROM = 5;
export const FAST_COUNTDOWN_FROM = 1;

const FAST_KEY = 'fitmama-fast';

export function captureFastFlag(): void {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  if (params.get('fast') === '1') sessionStorage.setItem(FAST_KEY, '1');
}

export function isFastMode(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(FAST_KEY) === '1';
}

export function clearFastMode(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(FAST_KEY);
}

export function gameSeconds(): number {
  return isFastMode() ? FAST_GAME_SECONDS : GAME_SECONDS;
}

/** Real days are 10–20 minutes split across blocks. Fast mode keeps the whole day near 12 seconds. */
export function blockPlaySeconds(plannedSeconds: number, blockCount: number): number {
  const planned = Number.isFinite(plannedSeconds) ? Math.max(1, Math.round(plannedSeconds)) : 1;
  if (!isFastMode()) return planned;
  const count = Math.max(1, Math.floor(blockCount));
  return Math.max(6, Math.round(FAST_GAME_SECONDS / count));
}

export function countdownFrom(): number {
  return isFastMode() ? FAST_COUNTDOWN_FROM : COUNTDOWN_FROM;
}
