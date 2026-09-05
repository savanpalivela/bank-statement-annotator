import type { ColumnMapping } from '../types';
import { Calendar, FileText, DollarSign, Tag, SplitSquareVertical, Wallet } from 'lucide-react';
import React from 'react';

interface ColumnMapperProps {
  columns: string[];
  mapping: ColumnMapping;
  onChangeMapping: (newMapping: ColumnMapping) => void;
  onApplyMapping: () => void;
}

export const ColumnMapper: React.FC<ColumnMapperProps> = ({
  columns,
  mapping,
  onChangeMapping,
  onApplyMapping,
}) => {
  const handleAmountModeChange = (mode: 'single' | 'split') => {
    onChangeMapping({
      ...mapping,
      amountMode: mode,
    });
  };

  return (
    <div className="space-y-5">
      {/* Amount Mode Toggle */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-slate-400">Select which spreadsheet columns match each transaction attribute</p>
        <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700/80 text-xs">
          <button
            onClick={() => handleAmountModeChange('single')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              mapping.amountMode === 'single'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Single Amount Column
          </button>
          <button
            onClick={() => handleAmountModeChange('split')}
            className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
              mapping.amountMode === 'split'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <SplitSquareVertical className="w-3.5 h-3.5" />
            Split Debit & Credit
          </button>
        </div>
      </div>

      {/* Select Grids */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Date Field */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            Date Column *
          </label>
          <select
            value={mapping.dateCol}
            onChange={(e) => onChangeMapping({ ...mapping, dateCol: e.target.value })}
            className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="">-- Select Column --</option>
            {columns.map((col) => (
              <option key={col} value={col}>
                {col}
              </option>
            ))}
          </select>
        </div>

        {/* Description Field */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-indigo-400" />
            Description Column *
          </label>
          <select
            value={mapping.descCol}
            onChange={(e) => onChangeMapping({ ...mapping, descCol: e.target.value })}
            className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="">-- Select Column --</option>
            {columns.map((col) => (
              <option key={col} value={col}>
                {col}
              </option>
            ))}
          </select>
        </div>

        {/* Amount Fields (Single vs Split) */}
        {mapping.amountMode === 'single' ? (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              Amount Column *
            </label>
            <select
              value={mapping.amountCol}
              onChange={(e) => onChangeMapping({ ...mapping, amountCol: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">-- Select Column --</option>
              {columns.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-rose-400" />
                Debit (Out/Expense) Column
              </label>
              <select
                value={mapping.debitCol}
                onChange={(e) => onChangeMapping({ ...mapping, debitCol: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">-- Select Column --</option>
                {columns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                Credit (In/Income) Column
              </label>
              <select
                value={mapping.creditCol}
                onChange={(e) => onChangeMapping({ ...mapping, creditCol: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">-- Select Column --</option>
                {columns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {/* Balance Field */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5 text-blue-400" />
            Balance Column (Optional)
          </label>
          <select
            value={mapping.balanceCol}
            onChange={(e) => onChangeMapping({ ...mapping, balanceCol: e.target.value })}
            className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="">-- None (Calc Net) --</option>
            {columns.map((col) => (
              <option key={col} value={col}>
                {col}
              </option>
            ))}
          </select>
        </div>

        {/* Category Field */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-amber-400" />
            Category Column (Optional)
          </label>
          <select
            value={mapping.categoryCol}
            onChange={(e) => onChangeMapping({ ...mapping, categoryCol: e.target.value })}
            className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="">-- None (Create New) --</option>
            {columns.map((col) => (
              <option key={col} value={col}>
                {col}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-700/50 flex justify-end">
        <button
          onClick={onApplyMapping}
          className="text-xs font-semibold px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-md"
        >
          Re-apply Column Mapping
        </button>
      </div>
    </div>
  );
};
