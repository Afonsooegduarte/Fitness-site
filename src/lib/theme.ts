import { useEffect, useState } from 'react';

// Preferência de tema guardada só neste browser. Sem escolha guardada, segue o sistema.
export type Theme = 'light' | 'dark';
const KEY = 'pulso-theme';

const stored = (): Theme | null => {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null;
  }
};
const system = (): Theme => (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

let current: Theme = stored() ?? system();
const listeners = new Set<(t: Theme) => void>();
const apply = (t: Theme) => document.documentElement.setAttribute('data-theme', t);

export function initTheme() {
  apply(current);
  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', (e) => {
    if (stored()) return;
    current = e.matches ? 'dark' : 'light';
    apply(current);
    listeners.forEach((l) => l(current));
  });
}

export function setTheme(t: Theme) {
  current = t;
  try { localStorage.setItem(KEY, t); } catch { /* fica só nesta sessão */ }
  apply(t);
  listeners.forEach((l) => l(t));
}

export function useTheme() {
  const [t, setT] = useState<Theme>(current);
  useEffect(() => {
    listeners.add(setT);
    return () => void listeners.delete(setT);
  }, []);
  return [t, () => setTheme(t === 'dark' ? 'light' : 'dark')] as const;
}
