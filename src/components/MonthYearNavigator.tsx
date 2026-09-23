import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, FolderOpen, PlusCircle } from 'lucide-react';
import type { SessionSummary } from '../utils/sessionStore';

interface MonthYearNavigatorProps {
  sessions: SessionSummary[];
  onLoad: (id: string) => void;
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
 * Lets the user step or jump to any month/year — not just ones that already
 * have a saved session — and create a blank, period-tagged session for it.
 */
export const MonthYearNavigator: React.FC<MonthYearNavigatorProps> = ({
  sessions,
  onLoad,
  onCreateSession,
}) => {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pickerOpen) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [pickerOpen]);

  const goToMonth = (deltaMonths: number) => {
    const d = new Date(year, month + deltaMonths, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  const jumpToToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  };

  const matches = useMemo(
    () => sessions.filter((s) => s.periodSortKey === sortKeyFor(year, month)),
    [sessions, year, month]
  );

  const label = `${MONTH_NAMES[month]} ${year}`;
  const isCurrentCalendarMonth = year === today.getFullYear() && month === today.getMonth();

  return (
    <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5 space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Navigate to a month
        </label>
        {!isCurrentCalendarMonth && (
          <button onClick={jumpToToday} className="text-[11px] text-indigo-400 hover:text-indigo-300 underline">
            Jump to current month
          </button>
        )}
      </div>

      <div className="flex items-center justify-center gap-2">
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
            <div className="absolute z-20 top-full mt-2 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-3 w-56">
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
                    onClick={() => {
                      setMonth(idx);
                      setPickerOpen(false);
                    }}
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

      {matches.length > 0 ? (
        <div className="space-y-1.5">
          {matches.map((s) => (
            <button
              key={s.id}
              onClick={() => onLoad(s.id)}
              className="w-full flex items-center justify-between gap-2 bg-slate-900/70 hover:bg-slate-900 border border-slate-700/60 rounded-lg px-3 py-2 text-left transition-colors"
            >
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-100 truncate">{s.name}</div>
                <div className="text-[10px] text-slate-500">
                  {s.accountCount} account{s.accountCount === 1 ? '' : 's'} · {s.txCount} transactions
                </div>
              </div>
              <FolderOpen className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            </button>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-500 italic">No sessions saved for {label} yet.</p>
      )}

      <button
        onClick={() => onCreateSession(year, month)}
        className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
      >
        <PlusCircle className="w-3.5 h-3.5" />
        Create session for {label}
      </button>
    </div>
  );
};
