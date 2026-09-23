import React, { useEffect, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, PlusCircle } from 'lucide-react';
import type { SessionSummary } from '../utils/sessionStore';

interface MonthYearSwitcherProps {
  sessions: SessionSummary[];
  currentSessionId: string | null;
  /**
   * Called whenever the selected month/year changes (arrows or picker) — the caller auto-loads
   * a matching session. Returns false when a matching session existed but the load was declined
   * (e.g. an unsaved-data confirm was cancelled); the switcher then reverts to the prior month.
   */
  onSwitchMonth: (year: number, month: number) => boolean;
  onCreateSession: (year: number, month: number) => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTH_SHORT = MONTH_NAMES.map((m) => m.slice(0, 3));

function sortKeyFor(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

/**
 * Home-page Month/Year switcher. Lives outside the Sessions modal so it's always
 * visible — stepping or jump-picking a month auto-loads the most recent session
 * saved for it (see handleSwitchMonth in App.tsx), rather than requiring an
 * explicit "Load" click.
 */
export const MonthYearSwitcher: React.FC<MonthYearSwitcherProps> = ({
  sessions,
  currentSessionId,
  onSwitchMonth,
  onCreateSession,
}) => {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Stay in sync when a session gets loaded some other way (e.g. from the Timeline in the Sessions modal).
  useEffect(() => {
    if (!currentSessionId) return;
    const s = sessions.find((x) => x.id === currentSessionId);
    if (!s?.periodSortKey || s.periodSortKey === '0000-00') return;
    const [y, m] = s.periodSortKey.split('-').map(Number);
    setYear(y);
    setMonth(m - 1);
    // Only react to the loaded session actually changing — not to every sessions-list refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSessionId]);

  useEffect(() => {
    if (!pickerOpen) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [pickerOpen]);

  const trySwitch = (y: number, m: number) => {
    const prevYear = year;
    const prevMonth = month;
    setYear(y);
    setMonth(m);
    if (!onSwitchMonth(y, m)) {
      // Load was declined — snap the picker back to what's actually on screen.
      setYear(prevYear);
      setMonth(prevMonth);
    }
  };

  const goToMonth = (deltaMonths: number) => {
    const d = new Date(year, month + deltaMonths, 1);
    trySwitch(d.getFullYear(), d.getMonth());
  };

  const pickMonth = (y: number, m: number) => {
    setPickerOpen(false);
    trySwitch(y, m);
  };

  const matches = sessions.filter((s) => s.periodSortKey === sortKeyFor(year, month));
  const label = `${MONTH_NAMES[month]} ${year}`;
  const isLoadedHere = matches.some((s) => s.id === currentSessionId);

  return (
    <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-2">
        <button
          onClick={() => goToMonth(-1)}
          title="Previous month"
          className="p-1.5 rounded-lg hover:bg-slate-700/60 text-slate-300 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="relative" ref={pickerRef}>
          <button
            onClick={() => setPickerOpen((o) => !o)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-sm font-bold text-slate-100 hover:border-indigo-500/60 transition-colors"
          >
            <CalendarDays className="w-4 h-4 text-indigo-400" />
            {label}
          </button>

          {pickerOpen && (
            <div className="absolute z-20 top-full mt-2 left-0 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-3 w-56">
              <div className="flex items-center justify-between mb-2">
                <button
                  onClick={() => setYear((y) => y - 1)}
                  className="p-1 rounded-md hover:bg-slate-700/60 text-slate-300"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-bold text-slate-200">{year}</span>
                <button
                  onClick={() => setYear((y) => y + 1)}
                  className="p-1 rounded-md hover:bg-slate-700/60 text-slate-300"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {MONTH_SHORT.map((m, idx) => (
                  <button
                    key={m}
                    onClick={() => pickMonth(year, idx)}
                    className={`py-1.5 rounded-md text-[11px] font-semibold transition-colors ${
                      idx === month
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => goToMonth(1)}
          title="Next month"
          className="p-1.5 rounded-lg hover:bg-slate-700/60 text-slate-300 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="text-xs">
        {matches.length > 0 ? (
          <span className="text-slate-400">
            {matches.length} session{matches.length === 1 ? '' : 's'} for {label}
            {isLoadedHere && <span className="ml-1.5 text-emerald-400 font-semibold">— loaded</span>}
          </span>
        ) : (
          <span className="text-slate-500 italic">No session for {label}</span>
        )}
      </div>

      {matches.length === 0 && (
        <button
          onClick={() => onCreateSession(year, month)}
          className="text-xs bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5 transition-colors"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          Create session for {label}
        </button>
      )}
    </div>
  );
};
