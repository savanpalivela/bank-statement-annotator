import React, { useState } from 'react';
import type { SummaryData } from '../types';
import { TrendingUp, TrendingDown, Wallet, PieChart as PieChartIcon, ArrowRightLeft, BarChart3 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface AnalyticsDashboardProps {
  summary: SummaryData;
}

const EXPENSE_COLORS = [
  '#f43f5e', // Rose
  '#fb923c', // Orange
  '#f59e0b', // Amber
  '#eab308', // Yellow
  '#a855f7', // Purple
  '#ec4899', // Pink
  '#6366f1', // Indigo
  '#64748b', // Slate
];

const INCOME_COLORS = [
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#14b8a6', // Teal
  '#84cc16', // Lime
];

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ summary }) => {
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');

  const expenseChartData = Object.entries(summary.expenseCategoryTotals || {})
    .filter(([_, val]) => val > 0)
    .map(([name, value]) => ({
      name,
      value: parseFloat(value.toFixed(2)),
    }))
    .sort((a, b) => b.value - a.value);

  const incomeChartData = Object.entries(summary.incomeCategoryTotals || {})
    .filter(([_, val]) => val > 0)
    .map(([name, value]) => ({
      name,
      value: parseFloat(value.toFixed(2)),
    }))
    .sort((a, b) => b.value - a.value);

  const currentChartData = activeTab === 'expense' ? expenseChartData : incomeChartData;
  const currentColors = activeTab === 'expense' ? EXPENSE_COLORS : INCOME_COLORS;
  const barFillColor = activeTab === 'expense' ? '#f43f5e' : '#10b981';

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val);
  };

  return (
    <div className="space-y-5 mb-6">
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
            Initial balance before 1st transaction
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
              Net Diff: <strong className={summary.netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{formatCurrency(summary.netBalance)}</strong>
            </span>
            <span className="text-[10px] text-indigo-400 font-medium">
              {summary.annotatedCount}/{summary.transactionCount} tagged
            </span>
          </div>
        </div>
      </div>

      {/* Visual Charts Container with Expense / Income Toggle Tabs */}
      <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-5 shadow-lg space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-700/60">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-slate-100 m-0">Category Breakdown Charts</h3>
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
            {/* Pie Chart */}
            <div className="bg-slate-900/80 border border-slate-700/70 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <PieChartIcon className={`w-4 h-4 ${activeTab === 'expense' ? 'text-rose-400' : 'text-emerald-400'}`} />
                <h4 className="text-xs font-semibold text-slate-200 m-0 uppercase tracking-wider">
                  {activeTab === 'expense' ? 'Expense' : 'Income'} Share by Category
                </h4>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={currentChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {currentChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={currentColors[index % currentColors.length]} />
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
              </div>
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
                  <BarChart data={currentChartData.slice(0, 6)} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
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
                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <Tooltip
                      formatter={(val: any) => formatCurrency(Number(val))}
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '0.75rem',
                        color: '#f8fafc',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="value" fill={barFillColor} radius={[6, 6, 0, 0]} />
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
