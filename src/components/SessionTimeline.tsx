import React, { useMemo, useState } from 'react';
import { Calendar, Check, FolderOpen, Pencil, Trash2 } from 'lucide-react';
import type { SessionSummary } from '../utils/sessionStore';
import { timeAgo } from '../utils/sessionStore';

interface SessionTimelineProps {
  sessions: SessionSummary[];
  currentSessionId: string | null;
  onLoad: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

interface PeriodGroup {
  sortKey: string;
  label: string;
  sessions: SessionSummary[];
}

/**
 * Groups saved sessions by the statement period their own transactions cover
 * (see `computeSessionPeriod`) and renders them as a vertical timeline —
 * newest month first — instead of a flat "recently saved" list.
 */
export const SessionTimeline: React.FC<SessionTimelineProps> = ({
  sessions,
  currentSessionId,
  onLoad,
  onRename,
  onDelete,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const groups = useMemo<PeriodGroup[]>(() => {
    const map = new Map<string, PeriodGroup>();
    for (const s of sessions) {
      const sortKey = s.periodSortKey || '0000-00';
      const label = s.periodLabel || 'Undated';
      if (!map.has(sortKey)) map.set(sortKey, { sortKey, label, sessions: [] });
      map.get(sortKey)!.sessions.push(s);
    }
    return Array.from(map.values()).sort((a, b) => b.sortKey.localeCompare(a.sortKey));
  }, [sessions]);

  const commitRename = (id: string) => {
    if (editName.trim()) onRename(id, editName.trim());
    setEditingId(null);
  };

  if (sessions.length === 0) {
    return <p className="text-xs text-slate-500 italic px-1 py-3">No saved sessions yet.</p>;
  }

  return (
    <div className="relative">
      {/* connecting line running the full height of the timeline */}
      <div className="absolute left-[5px] top-2 bottom-2 w-px bg-slate-700" aria-hidden="true" />

      <div className="space-y-5">
        {groups.map((group) => (
          <div key={group.sortKey} className="relative pl-6">
            <span className="absolute left-0 top-1 w-[11px] h-[11px] rounded-full bg-indigo-500 border-2 border-slate-900 shadow-[0_0_0_1px_rgba(99,102,241,0.4)]" />

            <div className="flex items-center gap-1.5 mb-2">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <h4 className="text-xs font-bold text-slate-100">{group.label}</h4>
              <span className="text-[10px] text-slate-500">
                {group.sessions.length} session{group.sessions.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="space-y-2">
              {group.sessions.map((s) => (
                <div
                  key={s.id}
                  className={`rounded-xl border p-3 ${
                    s.id === currentSessionId
                      ? 'bg-indigo-950/40 border-indigo-500/50'
                      : 'bg-slate-800/50 border-slate-700/60'
                  }`}
                >
                  {editingId === s.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitRename(s.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        className="flex-1 bg-slate-900 border border-indigo-500 text-slate-100 rounded-lg px-2 py-1 text-xs focus:outline-none"
                      />
                      <button
                        onClick={() => commitRename(s.id)}
                        className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-100 truncate">{s.name}</span>
                          {s.id === currentSessionId && (
                            <span className="text-[9px] uppercase tracking-wider text-indigo-300 bg-indigo-500/20 px-1.5 py-0.5 rounded-full shrink-0">
                              current
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {s.accountCount} account{s.accountCount === 1 ? '' : 's'} · {s.txCount} transactions ·{' '}
                          {s.annotatedCount} tagged · saved {timeAgo(s.savedAt)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => onLoad(s.id)}
                          title="Load this session"
                          className="p-1.5 text-slate-400 hover:text-indigo-300 rounded-md transition-colors"
                        >
                          <FolderOpen className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(s.id);
                            setEditName(s.name);
                          }}
                          title="Rename"
                          className="p-1.5 text-slate-400 hover:text-indigo-300 rounded-md transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDelete(s.id)}
                          title="Delete"
                          className="p-1.5 text-slate-400 hover:text-rose-400 rounded-md transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
