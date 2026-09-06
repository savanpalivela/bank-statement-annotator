import type { Transaction } from '../types';

/**
 * Per-transaction notes / comments, persisted in IndexedDB.
 *
 * Notes are keyed by a *content* signature rather than the transaction's
 * runtime `id` (which is regenerated on every re-parse). The signature is
 * stable across re-uploads of the same statement and across session
 * save / load, so a note re-attaches to its transaction automatically.
 */

const DB_NAME = 'bank_annotator_notes';
const STORE = 'notes';
const DB_VERSION = 1;

export interface StoredNote {
  key: string;
  note: string;
  updatedAt: number;
}

function normalizeDescription(desc: string): string {
  return desc.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Stable content key for a transaction's note. */
export function noteKey(tx: Pick<Transaction, 'date' | 'description' | 'debit' | 'credit' | 'originalRowIndex'>): string {
  return [
    tx.date.trim(),
    normalizeDescription(tx.description),
    tx.debit.toFixed(2),
    tx.credit.toFixed(2),
    tx.originalRowIndex,
  ].join('|');
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this browser'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const store = t.objectStore(STORE);
        const req = run(store);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      })
  );
}

/** All notes as a Map<key, noteText>. Returns an empty map if IndexedDB is unavailable. */
export async function getAllNotes(): Promise<Map<string, string>> {
  try {
    const rows = (await tx<StoredNote[]>('readonly', (s) => s.getAll() as IDBRequest<StoredNote[]>)) || [];
    const map = new Map<string, string>();
    for (const r of rows) {
      if (r && typeof r.key === 'string' && typeof r.note === 'string' && r.note.length > 0) {
        map.set(r.key, r.note);
      }
    }
    return map;
  } catch {
    return new Map();
  }
}

/** Insert / update / clear one note. An empty string deletes the record. */
export async function putNote(key: string, note: string): Promise<void> {
  try {
    const trimmed = note.trim();
    if (!trimmed) {
      await tx('readwrite', (s) => s.delete(key));
      return;
    }
    await tx('readwrite', (s) => s.put({ key, note: trimmed, updatedAt: Date.now() } satisfies StoredNote));
  } catch {
    /* best effort — persistence is optional */
  }
}

/** Bulk write, used when importing a session's notes. */
export async function bulkPutNotes(entries: Array<{ key: string; note: string }>): Promise<void> {
  const clean = entries.filter((e) => e.key && e.note && e.note.trim());
  if (clean.length === 0) return;
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const t = db.transaction(STORE, 'readwrite');
      const store = t.objectStore(STORE);
      for (const e of clean) {
        store.put({ key: e.key, note: e.note.trim(), updatedAt: Date.now() } satisfies StoredNote);
      }
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
    });
  } catch {
    /* best effort */
  }
}
