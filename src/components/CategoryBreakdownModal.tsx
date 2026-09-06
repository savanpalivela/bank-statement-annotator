import React, { useEffect } from 'react';
import type { SummaryData } from '../types';
import { X, Table2, TrendingDown, TrendingUp } from 'lucide-react';
import { formatCurrency } from '../utils/format';

interface CategoryBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: SummaryData;
}

interface Row {
  name: string;
  value: number;
  share: number;
  isUncategorized?: boolean;
}

function buildRows(totals: Record<string, number> | undefined, grandTotal: number): Row[] {
  const entries = Object.entries(totals || {}).filter(([, v]) => v > 0.005);
  const categorized = entries.reduce((s, [, v]) => s + v, 0);
  const rows: Row[] = entries
    .map(([name, value]) => ({ name, value, share: grandTotal > 0 ? value / grandTotal : 0 }))
    .sort((a, b) => b.value - a.value);

  const uncategorized = grandTotal - categorized;
  if (uncategorized > 0.005) {
    rows.push({
      name: 'Uncategorized',
      value: uncategorized,
      share: grandTotal > 0 ? uncategorized / grandTotal : 0,
      isUncategorized: true,
    });
  }
  return rows;
}

const BreakdownTable: React.FC<{
  title: string;
  icon: React.ReactNode;
  accent: string;
  rows: Row[];
  total: number;
}> = ({ title, icon, accent, rows, total }) => (
  <div>
    <div className="flex items-center gap-2 mb-2">
      {icon}
      <h4 className="text-xs font-semibold text-slate-200 m-0 uppercase tracking-wider">{title}</h4>
    </div>
    {rows.length === 0 ? (
      <p className="text-xs text-slate-500 italic px-1 py-3">No transactions in this group.</p>
    ) : (
      <div className="overflow-x-auto rounded-xl border border-slate-700/60">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-900/80 text-slate-400 uppercase tracking-wider text-[10px]">
              <th className="text-left font-semibold py-2 px-3">Category</th>
              <th className="text-right font-semibold py-2 px-3 w-28">Amount</th>
              <th className="text-right font-semibold py-2 px-3 w-24">Share</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.map((r) => (
              <tr key={r.name} className="hover:bg-slate-800/40">
                <td className={`py-2 px-3 ${r.isUncategorized ? 'text-slate-500 italic' : 'text-slate-200'}`}>
                  {r.name}
                </td>
                <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-300 whitespace-nowrap">
                  {formatCurrency(r.value)}
                </td>
                <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-400 whitespace-nowrap">
                  {(r.share * 100).toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className={`border-t-2 border-slate-700 font-semibold ${accent}`}>
              <td className="py-2 px-3">Total</td>
              <td className="py-2 px-3 text-right font-mono tabular-nums whitespace-nowrap">{formatCurrency(total)}</td>
              <td className="py-2 px-3 text-right font-mono tabular-nums">100%</td>
            </tr>
          </tfoot>
        </table>
      </div>
    )}
  </div>
);

export const CategoryBreakdownModal: React.FC<CategoryBreakdownModalProps> = ({ isOpen, onClose, summary }) => {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const expenseRows = buildRows(summary.expenseCategoryTotals, summary.totalExpenses);
  const incomeRows = buildRows(summary.incomeCategoryTotals, summary.totalIncome);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Category Breakdown"
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-lg max-h-[88vh] flex flex-col bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
              <Table2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Category Breakdown</h2>
              <p className="text-xs text-slate-400">Totals and share of spend / income by category</p>
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

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          <BreakdownTable
            title="Expenses"
            icon={<TrendingDown className="w-4 h-4 text-rose-400" />}
            accent="text-rose-300 bg-rose-950/30"
            rows={expenseRows}
            total={summary.totalExpenses}
          />
          <BreakdownTable
            title="Income"
            icon={<TrendingUp className="w-4 h-4 text-emerald-400" />}
            accent="text-emerald-300 bg-emerald-950/30"
            rows={incomeRows}
            total={summary.totalIncome}
          />

          {summary.transferCount > 0 && (
            <p className="text-[11px] text-amber-300/80 bg-amber-950/20 border border-amber-500/20 rounded-lg px-3 py-2">
              {formatCurrency(summary.transferTotal)} across {summary.transferCount} internal transfer
              {summary.transferCount === 1 ? '' : 's'} is excluded from these totals.
            </p>
          )}
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
