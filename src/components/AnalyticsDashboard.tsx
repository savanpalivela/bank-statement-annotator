import React, { useState } from 'react';
import type { SummaryData } from '../types';
import { TrendingUp, TrendingDown, Wallet, PieChart as PieChartIcon, ArrowRightLeft, BarChart3, Ban, Table2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList } from 'recharts';
import { formatCurrency, formatShort } from '../utils/format';
import { CategoryBreakdownModal } from './CategoryBreakdownModal';

interface AnalyticsDashboardProps {
  summary: SummaryData;
}

// Categorical palette for donut slice identity (validated for the dark surface,
// fixed order — never cycled). A 9th+ category folds into "Other".
const SLICE_COLORS = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'];
const OTHER_COLOR = '#64748b';

// Single-hue sequential ramps for the ranked bar chart, darkest = largest value.
const INCOME_BAR_RAMP = ['#065f46', '#059669', '#10b981', '#34d399', '#6ee7b7'];
const EXPENSE_BAR_RAMP = ['#9f1239', '#f43f5e', '#fb7185', '#fda4af', '#ffe4e6'];

const MAX_SLICES = 8;

/** Collapse everything past `max` categories into a single "Other" row. */
function bucketTop(rows: { name: string; value: number }[], max: number) {
  if (rows.length <= max) return rows;
  const head = rows.slice(0, max - 1);
  const rest = rows.slice(max - 1);
  const otherValue = rest.reduce((s, r) => s + r.value, 0);
  return [...head, { name: `Other (${rest.length})`, value: Math.round(otherValue * 100) / 100 }];
}

const sliceColor = (name: string, index: number) =>
  name.startsWith('Other') ? OTHER_COLOR : SLICE_COLORS[index % SLICE_COLORS.length];

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ summary }) => {
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');
  const [breakdownOpen, setBreakdownOpen] = useState(false);

  const expenseChartData = Object.entries(summary.expenseCategoryTotals || {})
    .filter(([, val]) => val > 0)
    .map(([name, value]) => ({
      name,
      value: parseFloat(value.toFixed(2)),
    }))
    .sort((a, b) => b.value - a.value);

  const incomeChartData = Object.entries(summary.incomeCategoryTotals || {})
    .filter(([, val]) => val > 0)
    .map(([name, value]) => ({
      name,
      value: parseFloat(value.toFixed(2)),
    }))
    .sort((a, b) => b.value - a.value);

  const currentChartData = activeTab === 'expense' ? expenseChartData : incomeChartData;
  const barRamp = activeTab === 'expense' ? EXPENSE_BAR_RAMP : INCOME_BAR_RAMP;

  const pieData = bucketTop(currentChartData, MAX_SLICES);
  const pieTotal = pieData.reduce((s, d) => s + d.value, 0);
  const barData = currentChartData.slice(0, 6);

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

      {/* Visual Charts Container with Expense / Income Toggle Tabs */}
      <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-5 shadow-lg space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-700/60">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-slate-100 m-0">Category Breakdown Charts</h3>
            <button
              onClick={() => setBreakdownOpen(true)}
              title="View category totals as a table"
              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-300 hover:bg-slate-700/50 border border-slate-700 transition-colors"
            >
              <Table2 className="w-4 h-4" />
            </button>
          </div>

          {/* Toggle Switch */}
          <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-700 text-xs">
            <button
              onClick={() => setActiveTab('expense')}
              className={`px-3.5 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'expense'
                  ? 'bg-rose-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <TrendingDown className="w-3.5 h-3.5" />
              Expense Categories ({expenseChartData.length})
            </button>
            <button
              onClick={() => setActiveTab('income')}
              className={`px-3.5 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'income'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Income Categories ({incomeChartData.length})
            </button>
          </div>
        </div>

        {currentChartData.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            No tagged {activeTab} transactions available to render charts.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Donut Chart */}
            <div className="bg-slate-900/80 border border-slate-700/70 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <PieChartIcon className={`w-4 h-4 ${activeTab === 'expense' ? 'text-rose-400' : 'text-emerald-400'}`} />
                <h4 className="text-xs font-semibold text-slate-200 m-0 uppercase tracking-wider">
                  {activeTab === 'expense' ? 'Expense' : 'Income'} Share by Category
                </h4>
              </div>
              <div className="h-52 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={86}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="#0f172a"
                      strokeWidth={2}
                      labelLine={false}
                      label={(p: any) =>
                        p.percent >= 0.1 ? (
                          <text
                            x={p.x}
                            y={p.y}
                            fill="#ffffff"
                            fontSize={10}
                            fontWeight={700}
                            textAnchor={p.x > p.cx ? 'start' : 'end'}
                            dominantBaseline="central"
                          >
                            {Math.round(p.percent * 100)}%
                          </text>
                        ) : null
                      }
                    >
                      {pieData.map((d, index) => (
                        <Cell key={`cell-${index}`} fill={sliceColor(d.name, index)} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any) => formatCurrency(Number(value))}
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '0.75rem',
                        color: '#f8fafc',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[9px] text-slate-500 uppercase tracking-wider">Total</span>
                  <span className="text-sm font-bold text-slate-100 font-mono">{formatShort(pieTotal)}</span>
                </div>
              </div>

              {/* Always-visible value legend */}
              <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 list-none p-0 m-0">
                {pieData.map((d, i) => (
                  <li key={d.name} className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-sm shrink-0"
                        style={{ backgroundColor: sliceColor(d.name, i) }}
                      />
                      <span className="truncate text-slate-300">{d.name}</span>
                    </span>
                    <span className="font-mono text-slate-400 shrink-0 tabular-nums">
                      {formatShort(d.value)}
                      <span className="text-slate-600">
                        {' '}· {pieTotal ? Math.round((d.value / pieTotal) * 100) : 0}%
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Bar Chart */}
            <div className="bg-slate-900/80 border border-slate-700/70 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className={`w-4 h-4 ${activeTab === 'expense' ? 'text-rose-400' : 'text-emerald-400'}`} />
                <h4 className="text-xs font-semibold text-slate-200 m-0 uppercase tracking-wider">
                  Top {activeTab === 'expense' ? 'Expenses' : 'Income Streams'} (₹)
                </h4>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 18, right: 10, left: -12, bottom: 20 }} barCategoryGap="22%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="#94a3b8"
                      fontSize={10}
                      tickLine={false}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={10}
                      tickLine={false}
                      width={48}
                      tickFormatter={(v: number) => formatShort(v)}
                    />
                    <Tooltip
                      cursor={{ fill: '#33415533' }}
                      formatter={(val: any) => formatCurrency(Number(val))}
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '0.75rem',
                        color: '#f8fafc',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {barData.map((d, i) => (
                        <Cell key={d.name} fill={barRamp[Math.min(i, barRamp.length - 1)]} />
                      ))}
                      <LabelList
                        dataKey="value"
                        position="top"
                        formatter={(v: any) => formatShort(Number(v))}
                        fill="#94a3b8"
                        fontSize={9}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
