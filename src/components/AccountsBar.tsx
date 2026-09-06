import React from 'react';
import { Landmark, Layers, PlusCircle, RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import type { Account } from '../types';

interface AccountsBarProps {
  accounts: Account[];
  /** total transactions across all accounts */
  transactionCount: number;
  /** transactions per account id */
  accountTxCounts: Record<string, number>;
  currentSessionName: string | null;
  onOpenSessions: () => void;
  onAddAccount: () => void;
  onReset: () => void;
  onOpenMapping: (accountId: string) => void;
  onRemoveAccount: (accountId: string) => void;
}

/**
 * The account summary strip. Rendered once, outside the tab views, so switching
 * between the Transactions and Dashboard tabs never re-mounts it.
 */
const AccountsBarComponent: React.FC<AccountsBarProps> = ({
  accounts,
  transactionCount,
  accountTxCounts,
  currentSessionName,
  onOpenSessions,
  onAddAccount,
  onReset,
  onOpenMapping,
  onRemoveAccount,
}) => {
  return (
    <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
          <Landmark className="w-4 h-4 text-indigo-400" />
          Accounts ({accounts.length})
          <span className="ml-1 text-slate-500">— {transactionCount} total transactions</span>
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onOpenSessions}
            className="text-xs bg-slate-700/60 hover:bg-slate-700 text-slate-200 border border-slate-600 px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5 transition-colors"
          >
            <Layers className="w-3.5 h-3.5" />
            {currentSessionName ? `Session: ${currentSessionName}` : 'Sessions'}
          </button>
          <button
            onClick={onAddAccount}
            className="text-xs bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5 transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Add Another Account
          </button>
          <button
            onClick={onReset}
            className="text-xs bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 px-3 py-1.5 rounded-xl font-medium flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      </div>

      {/* Account Cards */}
      <div className="flex flex-wrap gap-2">
        {accounts.map((acc) => (
          <div
            key={acc.id}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium ${acc.color}`}
          >
            <Landmark className="w-3.5 h-3.5 shrink-0" />
            <span className="max-w-[160px] truncate" title={acc.label}>
              {acc.label}
            </span>
            <span className="opacity-60">({accountTxCounts[acc.id] || 0})</span>
            <button
              onClick={() => onOpenMapping(acc.id)}
              title="Configure column mapping for this account"
              className="opacity-60 hover:opacity-100 transition-opacity ml-1"
            >
              <SlidersHorizontal className="w-3 h-3" />
            </button>
            {accounts.length > 1 && (
              <button
                onClick={() => onRemoveAccount(acc.id)}
                title="Remove this account"
                className="opacity-60 hover:opacity-100 hover:text-rose-400 transition-all ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export const AccountsBar = React.memo(AccountsBarComponent);
