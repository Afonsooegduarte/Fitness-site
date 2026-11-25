import type { DB } from './types';

/*
  Sincronização com o Supabase (só na build online: `npm run build:online`).

  A base de dados inteira fica numa linha da tabela `pulso_state` (id = 'main'), com um número de versão.
  As fotos e ficheiros (data URLs grandes) vão à parte para a tabela `pulso_blobs`, e no estado fica só
  uma referência "blob:<id>". Assim cada gravação envia poucos KB em vez das fotos todas.

  Duas pessoas a gravar ao mesmo tempo: cada gravação só é aceite se a versão no servidor for a que
  este browser conhece. Se não for, vai buscar a versão nova e volta a aplicar por cima as alterações
  que ainda não tinham sido enviadas. Nenhuma alteração se perde.

  A chave abaixo é a "publishable" do Supabase, feita para ir dentro do site. Não há login: quem tiver
  o link do site consegue ler e alterar os dados. Serve para um teste fechado, não para produção.
*/

declare const __SYNC__: boolean;
export const SYNC_ENABLED = typeof __SYNC__ !== 'undefined' && __SYNC__;

const BASE = 'https://twjtkcgbyycqtaxhogor.supabase.co/rest/v1';
const KEY = 'sb_publishable_oX6Q4E9tHRz1ZXYAxR62Gg_uEXZ0Shx';
const ROW = 'main';
const BLOB_MIN = 1500; // data URLs maiores do que isto vão para pulso_blobs

export type SyncStatus = 'local' | 'loading' | 'saving' | 'saved' | 'offline' | 'error';

async function api(path: string, init: RequestInit = {}, extra: Record<string, string> = {}) {
  const res = await fetch(BASE + path, {
    ...init,
    headers: { apikey: KEY, 'Content-Type': 'application/json', ...extra, ...(init.headers as Record<string, string> | undefined) },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`Supabase ${res.status}: ${text.slice(0, 300)}`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  const t = await res.text();
  return t ? JSON.parse(t) : null;
}

/* ---------- Fotos e ficheiros à parte ---------- */

// Hash rápido e estável (cyrb53) para dar um id a cada data URL.
function hash(str: string) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36) + '_' + str.length.toString(36);
}

const blobCache = new Map<string, string>(); // "blob:id" -> data URL
const uploaded = new Set<string>();

// Substitui data URLs grandes por referências e envia as que o servidor ainda não tem.
export async function deflate(db: DB): Promise<unknown> {
  const fresh: { id: string; data: string }[] = [];
  const json = JSON.stringify(db, (_k, v) => {
    if (typeof v === 'string' && v.length > BLOB_MIN && v.startsWith('data:')) {
      const ref = 'blob:' + hash(v);
      if (!blobCache.has(ref)) blobCache.set(ref, v);
      if (!uploaded.has(ref)) fresh.push({ id: ref.slice(5), data: v });
      return ref;
    }
    return v;
  });
  // Envia em lotes pequenos para não ultrapassar o limite de tamanho de cada pedido.
  const unique = Array.from(new Map(fresh.map((b) => [b.id, b])).values());
  for (let i = 0; i < unique.length; i += 4) {
    const batch = unique.slice(i, i + 4);
    await api('/pulso_blobs?on_conflict=id', { method: 'POST', body: JSON.stringify(batch) }, { Prefer: 'resolution=ignore-duplicates,return=minimal' });
    batch.forEach((b) => uploaded.add('blob:' + b.id));
  }
  return JSON.parse(json);
}

// Repõe as data URLs a partir das referências, indo buscar ao servidor as que ainda não estão em memória.
export async function inflate(data: unknown): Promise<DB> {
  const refs = new Set<string>();
  JSON.stringify(data, (_k, v) => {
    if (typeof v === 'string' && v.startsWith('blob:') && !blobCache.has(v)) refs.add(v);
    return v;
  });
  const ids = Array.from(refs).map((r) => r.slice(5));
  for (let i = 0; i < ids.length; i += 20) {
    const part = ids.slice(i, i + 20);
    const rows: { id: string; data: string }[] = await api(`/pulso_blobs?select=id,data&id=in.(${part.map(encodeURIComponent).join(',')})`);
    for (const r of rows) {
      blobCache.set('blob:' + r.id, r.data);
      uploaded.add('blob:' + r.id);
    }
  }
  return JSON.parse(JSON.stringify(data), (_k, v) => (typeof v === 'string' && v.startsWith('blob:') ? blobCache.get(v) ?? v : v)) as DB;
}

/* ---------- Linha principal ---------- */

async function getRow(): Promise<{ data: unknown; version: number } | null> {
  const rows = await api(`/pulso_state?id=eq.${ROW}&select=data,version`);
  return rows?.[0] ?? null;
}

async function getVersion(): Promise<number | null> {
  const rows = await api(`/pulso_state?id=eq.${ROW}&select=version`);
  return rows?.[0]?.version ?? null;
}

async function insertRow(data: unknown) {
  await api('/pulso_state', { method: 'POST', body: JSON.stringify({ id: ROW, data, version: 1 }) }, { Prefer: 'return=minimal' });
}

// Grava só se a versão no servidor ainda for `version`. Devolve false se outra pessoa gravou entretanto.
async function updateRow(version: number, data: unknown): Promise<boolean> {
  const rows = await api(
    `/pulso_state?id=eq.${ROW}&version=eq.${version}&select=version`,
    { method: 'PATCH', body: JSON.stringify({ data, version: version + 1, updated_at: new Date().toISOString() }) },
    { Prefer: 'return=representation' },
  );
  return Array.isArray(rows) && rows.length > 0;
}

/* ---------- Motor ---------- */

type Fn = (d: DB) => void;

export class SyncEngine {
  private version = 0;
  private pending: Fn[] = [];
  private pushing = false;
  private again = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private poller: ReturnType<typeof setInterval> | undefined;
  private stopped = false;

  constructor(
    private o: {
      get: () => DB;
      set: (db: DB) => void;
      status: (s: SyncStatus, detail?: string) => void;
      seed: () => DB;
      migrate: (db: DB) => DB;
    },
  ) {}

  async start() {
    this.o.status('loading');
    for (;;) {
      try {
        const row = await getRow();
        if (row) {
          this.o.set(this.o.migrate(await inflate(row.data)));
          this.version = row.version;
        } else {
          const seed = this.o.seed();
          try {
            await insertRow(await deflate(seed));
            this.version = 1;
            this.o.set(seed);
          } catch (e: any) {
            if (e?.status === 409) continue; // outro browser criou a linha ao mesmo tempo: volta a ler
            throw e;
          }
        }
        break;
      } catch (e: any) {
        if (this.stopped) return;
        this.o.status(e?.status ? 'error' : 'offline', String(e?.message ?? e));
        await new Promise((r) => setTimeout(r, 4000));
      }
    }
    this.o.status('saved');
    this.poller = setInterval(() => this.poll(), 4000);
    document.addEventListener('visibilitychange', this.onVisible);
  }

  stop() {
    this.stopped = true;
    clearInterval(this.poller);
    clearTimeout(this.timer);
    document.removeEventListener('visibilitychange', this.onVisible);
  }

  private onVisible = () => {
    if (document.visibilityState === 'visible') this.poll();
  };

  // Regista uma alteração local para enviar (e voltar a aplicar se houver conflito).
  queue(fn: Fn) {
    this.pending.push(fn);
    this.o.status('saving');
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.push(), 500);
  }

  private replay(base: DB): DB {
    const d = structuredClone(base);
    for (const fn of this.pending) {
      try { fn(d); } catch { /* alteração que já não se aplica (ex.: item apagado por outra pessoa) */ }
    }
    return d;
  }

  private async pullAndRebase() {
    const row = await getRow();
    if (!row) throw new Error('A linha de dados desapareceu do Supabase.');
    const base = this.o.migrate(await inflate(row.data));
    this.version = row.version;
    this.o.set(this.replay(base));
  }

  private async push() {
    if (this.pushing) { this.again = true; return; }
    this.pushing = true;
    try {
      while (this.pending.length && !this.stopped) {
        const k = this.pending.length;
        const out = await deflate(this.o.get());
        if (await updateRow(this.version, out)) {
          this.version += 1;
          this.pending.splice(0, k);
        } else {
          await this.pullAndRebase();
        }
      }
      this.o.status('saved');
    } catch (e: any) {
      this.o.status(e?.status ? 'error' : 'offline', String(e?.message ?? e));
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.push(), 5000);
    } finally {
      this.pushing = false;
      if (this.again) { this.again = false; if (this.pending.length) this.push(); }
    }
  }

  private async poll() {
    if (this.pushing || this.pending.length || this.stopped) return;
    try {
      const v = await getVersion();
      if (v != null && v > this.version && !this.pushing) await this.pullAndRebase();
      this.o.status(this.pending.length ? 'saving' : 'saved');
    } catch (e: any) {
      this.o.status(e?.status ? 'error' : 'offline', String(e?.message ?? e));
    }
  }
}
