import React, { useEffect, useState } from 'react';
import { X, Save, Layers } from 'lucide-react';
import type { SessionSummary } from '../utils/sessionStore';
import { listSessions } from '../utils/sessionStore';
import { SessionTimeline } from './SessionTimeline';
import { MonthYearNavigator } from './MonthYearNavigator';

interface SessionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** true when there is data worth saving */
  hasData: boolean;
  currentSessionId: string | null;
  currentSessionName: string | null;
  suggestedName: string;
  onSave: (name: string, mode: 'update' | 'new') => void;
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onCreateForPeriod: (year: number, month: number) => void;
}

export const SessionsModal: React.FC<SessionsModalProps> = ({
  isOpen,
  onClose,
  hasData,
  currentSessionId,
  currentSessionName,
  suggestedName,
  onSave,
  onLoad,
  onDelete,
  onRename,
  onCreateForPeriod,
}) => {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [name, setName] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSessions(listSessions());
      setName(currentSessionName ?? suggestedName);
    }
  }, [isOpen, currentSessionName, suggestedName]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const refresh = () => setSessions(listSessions());
  const trimmed = name.trim();

  const handleSave = (mode: 'update' | 'new') => {
    if (!trimmed) return;
    onSave(trimmed, mode);
    setTimeout(refresh, 0);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Sessions"
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-lg max-h-[88vh] flex flex-col bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Sessions</h2>
              <p className="text-xs text-slate-400">Save your statements and category annotations, reload them later</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Save current */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5 space-y-2.5">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Save current session
            </label>
            {hasData ? (
              <>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Session name…"
                  className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <div className="flex items-center gap-2">
                  {currentSessionId && (
                    <button
                      onClick={() => handleSave('update')}
                      disabled={!trimmed}
                      className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Update “{currentSessionName}”
                    </button>
                  )}
                  <button
                    onClick={() => handleSave('new')}
                    disabled={!trimmed}
                    className={`py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40 ${
                      currentSessionId
                        ? 'px-3 bg-slate-700 hover:bg-slate-600 text-slate-200'
                        : 'flex-1 bg-indigo-600 hover:bg-indigo-500 text-white'
                    }`}
                  >
                    <Save className="w-3.5 h-3.5" />
                    Save as new
                  </button>
                </div>
              </>
            ) : (
              <p className="text-xs text-slate-500 italic">Load some statements first, then you can save the session.</p>
            )}
          </div>

          {/* Jump to any Month/Year — including ones with no session yet — and start one */}
          <MonthYearNavigator
            sessions={sessions}
            onLoad={(id) => {
              onLoad(id);
            }}
            onCreateSession={(year, month) => {
              onCreateForPeriod(year, month);
            }}
          />

          {/* Timeline of saved statement annotations, grouped by Month/Year */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Timeline ({sessions.length})
            </label>
            <SessionTimeline
              sessions={sessions}
              currentSessionId={currentSessionId}
              onLoad={onLoad}
              onRename={(id, newName) => {
                onRename(id, newName);
                setTimeout(refresh, 0);
              }}
              onDelete={(id) => {
                onDelete(id);
                setTimeout(refresh, 0);
              }}
            />
          </div>
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
