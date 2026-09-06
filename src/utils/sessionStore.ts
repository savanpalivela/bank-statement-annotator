import type { Account, Transaction } from '../types';

const KEY = 'bank_annotator_named_sessions_v1';

export interface SessionData {
  accounts: Account[];
  transactions: Transaction[];
  isUsingSample: boolean;
  rejectedFilesList: { fileName: string; reason: string }[];
}

export interface SavedSession {
  id: string;
  name: string;
  savedAt: number;
  accountCount: number;
  txCount: number;
  annotatedCount: number;
  data: SessionData;
}

/** Lightweight row shown in the sessions list (without the heavy `data` payload). */
export type SessionSummary = Omit<SavedSession, 'data'>;

function readAll(): SavedSession[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(sessions: SavedSession[]): void {
  localStorage.setItem(KEY, JSON.stringify(sessions));
}

export function listSessions(): SessionSummary[] {
  return readAll()
    .map(({ data: _data, ...summary }) => summary)
    .sort((a, b) => b.savedAt - a.savedAt);
}

export function getSession(id: string): SavedSession | undefined {
  return readAll().find((s) => s.id === id);
}

/** Insert or overwrite a session by id. Throws on storage-quota failures. */
export function upsertSession(session: SavedSession): void {
  const all = readAll();
  const idx = all.findIndex((s) => s.id === session.id);
  if (idx >= 0) all[idx] = session;
  else all.push(session);
  writeAll(all);
}

export function deleteSession(id: string): void {
  writeAll(readAll().filter((s) => s.id !== id));
}

export function renameSession(id: string, name: string): void {
  const all = readAll();
  const s = all.find((x) => x.id === id);
  if (s) {
    s.name = name;
    writeAll(all);
  }
}

/** A human "time ago" string for the sessions list. */
export function timeAgo(ts: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr${h === 1 ? '' : 's'} ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} day${d === 1 ? '' : 's'} ago`;
  return new Date(ts).toLocaleDateString();
}
