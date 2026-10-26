import { useEffect, useState } from 'react';

export type Route =
  | { name: 'plan' }
  | { name: 'exercises' }
  | { name: 'exercise'; id: string }
  | { name: 'game'; phaseIndex: number; day: number }
  | { name: 'practice'; id: string }
  | { name: 'results'; sessionId: number }
  | { name: 'progress' }
  | { name: 'settings' }
  | { name: 'missing' };

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#/, '').split('?')[0] || '/plan';
  const parts = path.split('/').filter(Boolean);
  const head = parts[0] ?? 'plan';
  if (head === 'plan') return { name: 'plan' };
  if (head === 'exercises' && parts[1]) return { name: 'exercise', id: decodeURIComponent(parts[1]) };
  if (head === 'exercises') return { name: 'exercises' };
  if (head === 'progress') return { name: 'progress' };
  if (head === 'settings') return { name: 'settings' };
  if (head === 'practice' && parts[1]) return { name: 'practice', id: decodeURIComponent(parts[1]) };
  if (head === 'game' && parts[1] && parts[2]) {
    const phaseIndex = Number(parts[1]);
    const day = Number(parts[2]);
    if (Number.isInteger(phaseIndex) && Number.isInteger(day)) return { name: 'game', phaseIndex, day };
  }
  if (head === 'results' && parts[1]) {
    const sessionId = Number(parts[1]);
    if (Number.isInteger(sessionId) && sessionId > 0) return { name: 'results', sessionId };
  }
  return { name: 'missing' };
}

export function useRoute(): Route {
  const [hash, setHash] = useState(() => window.location.hash);

  useEffect(() => {
    const sync = () => setHash(window.location.hash);
    window.addEventListener('hashchange', sync);
    if (!window.location.hash) {
      const next = `${window.location.pathname}${window.location.search}#/plan`;
      window.history.replaceState(null, '', next);
      setHash('#/plan');
    }
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  return parseHash(hash);
}
