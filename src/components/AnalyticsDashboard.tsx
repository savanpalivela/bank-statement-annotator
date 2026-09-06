import React, { useState } from 'react';
import type { SummaryData } from '../types';
import { TrendingUp, TrendingDown, Wallet, ArrowRightLeft, BarChart3, Ban, Table2, ChevronDown } from 'lucide-react';
import { Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList } from 'recharts';
import { formatCurrency, formatShort } from '../utils/format';
import { CategoryBreakdownModal } from './CategoryBreakdownModal';

interface AnalyticsDashboardProps {
  summary: SummaryData;
}

interface CatRow {
  name: string;
  value: number;
}

// Categorical palette for the 100%-stacked "share" bar — identity of the top
// segments (validated for the dark surface, fixed order, never cycled).
const SLICE_COLORS = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'];
const OTHER_COLOR = '#64748b';

// Single-hue sequential ramps (dark → light) for the ranked bars: darkest = largest.
const INCOME_BAR_RAMP = ['#065f46', '#059669', '#10b981', '#34d399', '#6ee7b7'];
const EXPENSE_BAR_RAMP = ['#9f1239', '#f43f5e', '#fb7185', '#fda4af', '#ffe4e6'];

/** Segments shown in the share bar before the rest collapse into "Other". */
const SHARE_SLICES = 7;
/** Ranked bars shown before the "Show all" toggle. */
const RANKED_LIMIT = 12;
/** Categories below this rupee value are counted as the "long tail". */
const SMALL_CATEGORY = 5000;

/** Collapse everything past `max` categories into a single "Other (N)" row. */
function bucketTop(rows: CatRow[], max: number): CatRow[] {
  if (rows.length <= max) return rows;
  const head = rows.slice(0, max - 1);
  const rest = rows.slice(max - 1);
  const otherValue = rest.reduce((s, r) => s + r.value, 0);
  return [...head, { name: `Other (${rest.length})`, value: Math.round(otherValue * 100) / 100 }];
}

const sliceColor = (name: string, index: number) =>
  name.startsWith('Other') ? OTHER_COLOR : SLICE_COLORS[index % SLICE_COLORS.length];

// ── Sequential ramp interpolation (so N bars get N shades of one hue) ────────
const hexToRgb = (h: string): [number, number, number] => {
  const n = parseInt(h.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgbToHex = (r: number, g: number, b: number) =>
  '#' + [r, g, b].map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('');

/** `t` in [0,1] across the ramp stops (0 = first / darkest, 1 = last / lightest). */
function lerpRamp(stops: string[], t: number): string {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(t) ? t : 0));
  const pos = clamped * (stops.length - 1);
  const i = Math.floor(pos);
  if (i >= stops.length - 1) return stops[stops.length - 1];
  const f = pos - i;
  const a = hexToRgb(stops[i]);
  const b = hexToRgb(stops[i + 1]);
  return rgbToHex(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f);
}

/** Y-axis tick for the ranked bars: truncates long names, full name on hover. */
const RankedYTick: React.FC<any> = ({ x, y, payload }) => {
  const v: string = payload?.value ?? '';
  const short = v.length > 22 ? v.slice(0, 21) + '…' : v;
  return (
    <text x={x} y={y} dy={3} textAnchor="end" fontSize={11} fill="#cbd5e1">
      <title>{v}</title>
      {short}
    </text>
  );
};

const toSortedRows = (totals: Record<string, number> | undefined): CatRow[] =>
  Object.entries(totals || {})
    .filter(([, val]) => val > 0)
    .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }))
    .sort((a, b) => b.value - a.value);

const AnalyticsDashboardComponent: React.FC<AnalyticsDashboardProps> = ({ summary }) => {
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const expenseChartData = toSortedRows(summary.expenseCategoryTotals);
  const incomeChartData = toSortedRows(summary.incomeCategoryTotals);

  const currentChartData = activeTab === 'expense' ? expenseChartData : incomeChartData;
  const barRamp = activeTab === 'expense' ? EXPENSE_BAR_RAMP : INCOME_BAR_RAMP;
  const accentText = activeTab === 'expense' ? 'text-rose-300' : 'text-emerald-300';

  const grandTotal = currentChartData.reduce((s, d) => s + d.value, 0);

  // 100%-stacked share bar: top 6 categories + "Other (N)"
  const shareData = bucketTop(currentChartData, SHARE_SLICES);

  // Concentration headline
  const topN = Math.min(5, currentChartData.length);
  const topNShare = grandTotal
    ? Math.round((currentChartData.slice(0, topN).reduce((s, d) => s + d.value, 0) / grandTotal) * 100)
    : 0;
  const smallCount = currentChartData.filter((d) => d.value < SMALL_CATEGORY).length;

  // Ranked horizontal bars
  const rankedRows = showAll ? currentChartData : currentChartData.slice(0, RANKED_LIMIT);
  const rankedMax = rankedRows.length ? rankedRows[0].value : 1;
  const rankedHeight = Math.max(rankedRows.length * 34 + 8, 120);

  const switchTab = (tab: 'expense' | 'income') => {
    setActiveTab(tab);
    setShowAll(false);
  };

  return (
    <div className="space-y-5 mb-6">
      <CategoryBreakdownModal
        isOpen={breakdownOpen}
        onClose={() => setBreakdownOpen(false)}
        summary={summary}
      />
      {/* 4 Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Opening Balance */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-lg relative overflow-hidden group">
          <div className="absolute right-3 top-3 p-2.5 bg-blue-500/10 text-blue-400 rounded-xl">
            <ArrowRightLeft className="w-5 h-5" />
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Opening Balance</p>
          <h3 className="text-xl font-extrabold text-blue-300 mt-2 font-mono">
            {formatCurrency(summary.openingBalance)}
          </h3>
          <div className="mt-2 text-[11px] text-slate-400">
            Sum of each statement's starting balance
          </div>
        </div>

        {/* Total Income (Credit Aggregate) */}
        <div
          onClick={() => setActiveTab('income')}
          className={`bg-slate-800/80 border rounded-2xl p-4 shadow-lg relative overflow-hidden cursor-pointer transition-all ${
            activeTab === 'income' ? 'border-emerald-500/80 ring-1 ring-emerald-500/50' : 'border-slate-700/80 hover:border-slate-600'
          }`}
        >
          <div className="absolute right-3 top-3 p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Income (Credit)</p>
          <h3 className="text-xl font-extrabold text-emerald-400 mt-2 font-mono">
            {formatCurrency(summary.totalIncome)}
          </h3>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Sum of all Credits</span>
            <span className="text-[10px] text-emerald-400 underline font-medium">View Breakdown &rarr;</span>
          </div>
        </div>

        {/* Total Expenses (Debit Aggregate) */}
        <div
          onClick={() => setActiveTab('expense')}
          className={`bg-slate-800/80 border rounded-2xl p-4 shadow-lg relative overflow-hidden cursor-pointer transition-all ${
            activeTab === 'expense' ? 'border-rose-500/80 ring-1 ring-rose-500/50' : 'border-slate-700/80 hover:border-slate-600'
          }`}
        >
          <div className="absolute right-3 top-3 p-2.5 bg-rose-500/10 text-rose-400 rounded-xl">
            <TrendingDown className="w-5 h-5" />
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Expenses (Debit)</p>
          <h3 className="text-xl font-extrabold text-rose-400 mt-2 font-mono">
            {formatCurrency(summary.totalExpenses)}
          </h3>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Sum of all Debits</span>
            <span className="text-[10px] text-rose-400 underline font-medium">View Breakdown &rarr;</span>
          </div>
        </div>

        {/* Closing Balance */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-lg relative overflow-hidden group">
          <div className="absolute right-3 top-3 p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl">
            <Wallet className="w-5 h-5" />
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Closing Balance</p>
          <h3
            className={`text-xl font-extrabold mt-2 font-mono ${
              summary.closingBalance >= 0 ? 'text-indigo-300' : 'text-rose-400'
            }`}
          >
            {formatCurrency(summary.closingBalance)}
          </h3>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>
              Net{summary.transferCount > 0 ? ' (excl. transfers)' : ''}:{' '}
              <strong className={summary.netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{formatCurrency(summary.netBalance)}</strong>
            </span>
            <span className="text-[10px] text-indigo-400 font-medium">
              {summary.annotatedCount}/{summary.transactionCount} tagged
            </span>
          </div>
        </div>
      </div>

      {/* Internal transfers excluded from spending */}
      {summary.transferCount > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-950/20 px-4 py-3 text-xs">
          <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl shrink-0">
            <Ban className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <span className="font-semibold text-amber-200">Internal transfers excluded</span>
            <span className="text-slate-400">
              {' '}&mdash; {formatCurrency(summary.transferTotal)} across {summary.transferCount}{' '}
              transaction{summary.transferCount === 1 ? '' : 's'} kept out of Total Expenses, Net and the category charts.
            </span>
          </div>
        </div>
      )}

      {/* Category Breakdown — full width */}
      <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-700/60">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-slate-100 m-0">Category Breakdown</h3>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-700 text-xs">
              <button
                onClick={() => switchTab('expense')}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === 'expense' ? 'bg-rose-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <TrendingDown className="w-3.5 h-3.5" />
                Expense ({expenseChartData.length})
              </button>
              <button
                onClick={() => switchTab('income')}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === 'income' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                Income ({incomeChartData.length})
              </button>
            </div>
            <button
              onClick={() => setBreakdownOpen(true)}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg text-slate-300 hover:text-white bg-slate-900/90 hover:bg-slate-700/60 border border-slate-700 transition-colors"
            >
              <Table2 className="w-3.5 h-3.5" />
              Full table
            </button>
          </div>
        </div>

        {currentChartData.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            No tagged {activeTab} transactions yet — annotate some in the Transactions tab.
          </div>
        ) : (
          <>
            {/* Concentration headline */}
            <p className="text-xs text-slate-400 m-0">
              Top <span className="font-semibold text-slate-200">{topN}</span>{' '}
              categor{topN === 1 ? 'y' : 'ies'} ={' '}
              <span className={`font-semibold ${accentText}`}>{topNShare}%</span> of{' '}
              <span className="font-mono text-slate-300">{formatShort(grandTotal)}</span>
              {smallCount > 0 && (
                <>
                  {' · '}
                  <span className="text-slate-300">{smallCount}</span> below ₹5K
                </>
              )}
              {' · '}
              <span className="text-slate-300">{currentChartData.length}</span> categories total
            </p>

            {/* 100%-stacked share bar */}
            <div>
              <div className="flex h-7 w-full gap-px rounded-lg overflow-hidden bg-slate-900">
                {shareData.map((s, i) => {
                  const pct = grandTotal ? (s.value / grandTotal) * 100 : 0;
                  return (
                    <div
                      key={s.name}
                      title={`${s.name}: ${formatCurrency(s.value)} · ${pct.toFixed(1)}%`}
                      style={{ flexGrow: s.value, flexBasis: 0, backgroundColor: sliceColor(s.name, i) }}
                      className="min-w-[3px] flex items-center justify-center overflow-hidden px-1"
                    >
                      {pct >= 9 && (
                        <span className="text-[10px] font-bold text-white/95 tabular-nums">{Math.round(pct)}%</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 list-none p-0 m-0">
                {shareData.map((s, i) => (
                  <li key={s.name} className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <span
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ backgroundColor: sliceColor(s.name, i) }}
                    />
                    <span className="text-slate-300">{s.name}</span>
                    <span className="font-mono tabular-nums text-slate-500">{formatShort(s.value)}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Ranked horizontal bars */}
            <div className="bg-slate-900/70 border border-slate-700/70 rounded-2xl p-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider m-0">
                  {activeTab === 'expense' ? 'Spending' : 'Income'} by category — ranked
                </h4>
                {currentChartData.length > RANKED_LIMIT && (
                  <button
                    onClick={() => setShowAll((v) => !v)}
                    className="text-[11px] font-medium text-indigo-300 hover:text-indigo-200 flex items-center gap-1"
                  >
                    {showAll ? `Show top ${RANKED_LIMIT}` : `Show all ${currentChartData.length}`}
                    <ChevronDown className={`w-3 h-3 transition-transform ${showAll ? 'rotate-180' : ''}`} />
                  </button>
                )}
              </div>
              <div className="max-h-[460px] overflow-y-auto pr-1 -mr-1">
                <ResponsiveContainer width="100%" height={rankedHeight}>
                  <BarChart
                    data={rankedRows}
                    layout="vertical"
                    margin={{ top: 2, right: 72, bottom: 2, left: 4 }}
                    barCategoryGap="20%"
                  >
                    <CartesianGrid horizontal={false} stroke="#334155" strokeDasharray="3 3" />
                    <XAxis type="number" hide domain={[0, 'dataMax']} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={150}
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                      tick={<RankedYTick />}
                    />
                    <Tooltip
                      cursor={{ fill: '#33415533' }}
                      formatter={(val: any) => [formatCurrency(Number(val)), 'Amount']}
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '0.75rem',
                        color: '#f8fafc',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                      {rankedRows.map((d) => (
                        <Cell key={d.name} fill={lerpRamp(barRamp, 1 - d.value / rankedMax)} />
                      ))}
                      <LabelList
                        dataKey="value"
                        position="right"
                        formatter={(v: any) => formatShort(Number(v))}
                        fill="#94a3b8"
                        fontSize={10}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

/**
 * Memoised: `summary` is a stable useMemo in App keyed on `transactions`, so the
 * charts only re-render when the underlying transaction data actually changes —
 * not on every unrelated App state update (toasts, modals, tab switches).
 */
export const AnalyticsDashboard = React.memo(AnalyticsDashboardComponent);
