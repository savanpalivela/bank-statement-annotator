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
  /** Human label for the statement period this session covers, e.g. "July 2026" or "Jun – Jul 2026" */
  periodLabel: string;
  /** Sortable "YYYY-MM" key for the period's start month — groups/orders the timeline */
  periodSortKey: string;
  data: SessionData;
}

/** Lightweight row shown in the sessions list (without the heavy `data` payload). */
export type SessionSummary = Omit<SavedSession, 'data'>;

export interface SessionPeriod {
  label: string;
  sortKey: string;
}

/**
 * Derive the statement period a session covers from its transactions' own
 * dates — not the free-text session name — so the timeline groups sessions
 * correctly even if they weren't named "Month Year".
 */
export function computeSessionPeriod(transactions: { date: string }[]): SessionPeriod {
  let min: Date | null = null;
  let max: Date | null = null;
  for (const tx of transactions) {
    const d = new Date(tx.date);
    if (isNaN(d.getTime())) continue;
    if (!min || d < min) min = d;
    if (!max || d > max) max = d;
  }
  if (!min || !max) return { label: 'Undated', sortKey: '0000-00' };

  const sortKey = `${min.getFullYear()}-${String(min.getMonth() + 1).padStart(2, '0')}`;
  const fullMonthYear = (d: Date) => d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const shortMonth = (d: Date) => d.toLocaleString('en-US', { month: 'short' });

  const sameMonth = min.getFullYear() === max.getFullYear() && min.getMonth() === max.getMonth();
  if (sameMonth) return { label: fullMonthYear(min), sortKey };

  const sameYear = min.getFullYear() === max.getFullYear();
  const label = sameYear
    ? `${shortMonth(min)} – ${shortMonth(max)} ${min.getFullYear()}`
    : `${shortMonth(min)} ${min.getFullYear()} – ${shortMonth(max)} ${max.getFullYear()}`;
  return { label, sortKey };
}

/** Fallback period for sessions saved before periodLabel/periodSortKey existed. */
function periodFromSavedAt(savedAt: number): SessionPeriod {
  const d = new Date(savedAt);
  return {
    label: `${d.toLocaleString('en-US', { month: 'long', year: 'numeric' })} (saved)`,
    sortKey: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
  };
}

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
    .map(({ data: _data, ...summary }) => {
      if (summary.periodLabel && summary.periodSortKey) return summary;
      // Session saved before periodLabel/periodSortKey existed — backfill from savedAt.
      const fallback = periodFromSavedAt(summary.savedAt);
      return { ...summary, periodLabel: summary.periodLabel || fallback.label, periodSortKey: summary.periodSortKey || fallback.sortKey };
    })
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
