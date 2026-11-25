import type { DB } from './types';

// Persistência local. Para usar um backend, troca estas duas funções por chamadas à tua API.
const KEY = 'pulso-db-v1';
let memory: string | null = null;

export function loadDB(): DB | null {
  try {
    const raw = localStorage.getItem(KEY) ?? memory;
    return raw ? (JSON.parse(raw) as DB) : null;
  } catch {
    return memory ? (JSON.parse(memory) as DB) : null;
  }
}

export function saveDB(db: DB) {
  const raw = JSON.stringify(db);
  memory = raw;
  try {
    localStorage.setItem(KEY, raw);
    return true;
  } catch {
    return false; // armazenamento cheio ou indisponível: fica em memória
  }
}

export function clearDB() {
  memory = null;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignorar */
  }
}
