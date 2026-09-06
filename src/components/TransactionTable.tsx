import React, { useState, useMemo } from 'react';
import type { Account, Transaction } from '../types';
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, Ban, ChevronDown, RotateCcw, Pencil } from 'lucide-react';

interface TransactionTableProps {
  transactions: Transaction[];
  categories: string[];
  accounts: Account[];
  onUpdateCategory: (id: string, newCategory: string) => void;
  onRenameAccount: (accountId: string, newLabel: string) => void;
  /** Toggle a transaction's "internal transfer" exclusion flag */
  onToggleExclude: (id: string) => void;
  /** Show the per-row Account column (true when more than one account is loaded) */
  multiAccount: boolean;
}

export const TransactionTable: React.FC<TransactionTableProps> = ({
  transactions,
  categories,
  accounts,
  onUpdateCategory,
  onRenameAccount,
  onToggleExclude,
  multiAccount,
}) => {
  const [renamingAccountId, setRenamingAccountId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'income' | 'expense'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [customTextMap, setCustomTextMap] = useState<Record<string, string>>({});
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [showExcluded, setShowExcluded] = useState(false);

  const hasRunningBalance = useMemo(() => {
    return transactions.some((t) => t.runningBalance !== undefined);
  }, [transactions]);

  // Filtering & Sorting — excluded internal transfers are pulled out into their own section
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (tx.excluded) return false;

      // Search term
      const matchesSearch =
        tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.date.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.category.toLowerCase().includes(searchTerm.toLowerCase());

      // Category filter
      const matchesCategory =
        categoryFilter === 'ALL'
          ? true
          : categoryFilter === 'Uncategorized'
          ? !tx.category || tx.category === 'Uncategorized'
          : tx.category === categoryFilter;

      // Type filter
      const matchesType = typeFilter === 'ALL' ? true : tx.type === typeFilter;

      return matchesSearch && matchesCategory && matchesType;
    });
  }, [transactions, searchTerm, categoryFilter, typeFilter]);

  const excludedTransactions = useMemo(
    () =>
      transactions
        .filter((tx) => tx.excluded)
        .sort((a, b) => (new Date(a.date).getTime() || 0) - (new Date(b.date).getTime() || 0)),
    [transactions]
  );
  const excludedTotal = useMemo(
    () => excludedTransactions.reduce((sum, tx) => sum + (tx.debit - tx.credit), 0),
    [excludedTransactions]
  );

  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => {
      const timeA = new Date(a.date).getTime() || 0;
      const timeB = new Date(b.date).getTime() || 0;
      return sortAsc ? timeA - timeB : timeB - timeA;
    });
  }, [filteredTransactions, sortAsc]);

  // Pagination
  const totalPages = Math.ceil(sortedTransactions.length / pageSize) || 1;
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedTransactions.slice(start, start + pageSize);
  }, [sortedTransactions, currentPage, pageSize]);

  const handleCategorySelect = (id: string, value: string) => {
    if (value === 'CUSTOM') {
      setEditingId(id);
      const currentTx = transactions.find((t) => t.id === id);
      setCustomTextMap((prev) => ({ ...prev, [id]: currentTx?.category || '' }));
    } else {
      onUpdateCategory(id, value);
      setEditingId(null);
    }
  };

  const handleCustomInputCommit = (id: string) => {
    const text = customTextMap[id];
    if (text !== undefined) {
      onUpdateCategory(id, text.trim() || 'Uncategorized');
    }
    setEditingId(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(Math.abs(amount));
  };

  const commitRename = (id: string) => {
    const v = renameValue.trim();
    if (v) onRenameAccount(id, v);
    setRenamingAccountId(null);
  };

  return (
    <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl shadow-lg flex flex-col overflow-hidden w-full">
      {/* Account rename strip (only with more than one account) */}
      {multiAccount && accounts.length > 0 && (
        <div className="px-4 pt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
          <span className="uppercase tracking-wider font-semibold">Accounts:</span>
          {accounts.map((acc) =>
            renamingAccountId === acc.id ? (
              <input
                key={acc.id}
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => commitRename(acc.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitRename(acc.id);
                  if (e.key === 'Escape') setRenamingAccountId(null);
                }}
                className="bg-slate-900 border border-indigo-500 text-slate-100 rounded-md px-1.5 py-0.5 text-[11px] w-36 focus:outline-none"
              />
            ) : (
              <button
                key={acc.id}
                onClick={() => {
                  setRenamingAccountId(acc.id);
                  setRenameValue(acc.label);
                }}
                title="Rename account"
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border ${acc.color} hover:opacity-80`}
              >
                {acc.label}
                <Pencil className="w-2.5 h-2.5 opacity-60" />
              </button>
            )
          )}
        </div>
      )}

      {/* Controls Bar */}
      <div className="p-4 border-b border-slate-700/60 bg-slate-800/40 flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search description, date, category..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value as any);
              setCurrentPage(1);
            }}
            className="bg-slate-900 border border-slate-700 text-slate-200 rounded-xl px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="ALL">All Types</option>
            <option value="income">Income / Credit (+)</option>
            <option value="expense">Expenses / Debit (-)</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-slate-900 border border-slate-700 text-slate-200 rounded-xl px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none max-w-[150px]"
          >
            <option value="ALL">All Categories</option>
            <option value="Uncategorized">Uncategorized Only</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Items per Page */}
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-slate-900 border border-slate-700 text-slate-200 rounded-xl px-2 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value={10}>10 / page</option>
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
          </select>
        </div>
      </div>

      {/* Responsive Scrollable Container */}
      <div className="overflow-x-auto w-full flex-1">
        <table className="w-full text-left text-xs border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-700/80 font-semibold uppercase tracking-wider">
              <th className="py-3 px-3 w-10 text-center">#</th>
              <th
                onClick={() => setSortAsc(!sortAsc)}
                className="py-3 px-3 cursor-pointer hover:text-slate-200 transition-colors select-none w-28"
              >
                <div className="flex items-center gap-1">
                  Date
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>
              <th className="py-3 px-3 min-w-[180px]">Description</th>
              {multiAccount && <th className="py-3 px-3 w-32">Account</th>}
              <th className="py-3 px-3 text-right w-36">Amount</th>
              {hasRunningBalance && <th className="py-3 px-3 text-right text-blue-300 w-32">Balance</th>}
              <th className="py-3 px-3 min-w-[200px] w-64">Category / Annotation</th>
              <th className="py-3 px-3 w-12 text-center" title="Exclude as internal transfer">&nbsp;</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50 text-slate-300">
            {paginatedTransactions.length === 0 ? (
              <tr>
                <td colSpan={(hasRunningBalance ? 7 : 6) + (multiAccount ? 1 : 0)} className="py-12 text-center text-slate-500">
                  No matching transactions found.
                </td>
              </tr>
            ) : (
              paginatedTransactions.map((tx, idx) => {
                const isIncome = tx.credit > 0;
                const isExpense = tx.debit > 0;

                return (
                  <tr
                    key={tx.id}
                    className={`transition-colors hover:bg-slate-700/30 ${
                      isIncome
                        ? 'bg-emerald-950/20'
                        : isExpense
                        ? 'bg-rose-950/20'
                        : 'bg-transparent'
                    }`}
                  >
                    <td className="py-3 px-3 text-center font-mono text-slate-500 text-[11px]">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </td>

                    <td className="py-3 px-3 font-mono text-slate-400 whitespace-nowrap">{tx.date || 'N/A'}</td>

                    <td className="py-3 px-3 font-medium text-slate-100 break-words max-w-sm" title={tx.description}>
                      {tx.description}
                    </td>

                    {multiAccount && (
                      <td className="py-3 px-3 text-slate-400 whitespace-nowrap max-w-[120px] truncate" title={tx.accountLabel}>
                        {tx.accountLabel}
                      </td>
                    )}

                    {/* Amount Column (combined debit / credit) */}
                    <td className="py-3 px-3 text-right font-mono font-semibold whitespace-nowrap">
                      {isExpense && !isIncome ? (
                        <span className="text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded inline-block">
                          -{formatCurrency(tx.debit)}
                        </span>
                      ) : isIncome && !isExpense ? (
                        <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded inline-block">
                          +{formatCurrency(tx.credit)}
                        </span>
                      ) : isIncome && isExpense ? (
                        <span
                          className={`px-2 py-0.5 rounded inline-block ${
                            tx.credit - tx.debit >= 0
                              ? 'text-emerald-400 bg-emerald-500/10'
                              : 'text-rose-400 bg-rose-500/10'
                          }`}
                        >
                          {tx.credit - tx.debit >= 0 ? '+' : '-'}
                          {formatCurrency(tx.credit - tx.debit)}
                        </span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>

                    {/* Running Balance Column */}
                    {hasRunningBalance && (
                      <td className="py-3 px-3 text-right font-mono text-slate-300 whitespace-nowrap">
                        {tx.runningBalance !== undefined ? formatCurrency(tx.runningBalance) : '-'}
                      </td>
                    )}

                    {/* Inline Editable Category */}
                    <td className="py-2 px-3">
                      {editingId === tx.id ? (
                        <div className="flex items-center gap-1.5 w-full">
                          <input
                            type="text"
                            autoFocus
                            value={customTextMap[tx.id] || ''}
                            onChange={(e) =>
                              setCustomTextMap({ ...customTextMap, [tx.id]: e.target.value })
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleCustomInputCommit(tx.id);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            className="bg-slate-900 border border-indigo-500 text-slate-100 rounded-lg px-2 py-1 text-xs w-full focus:outline-none"
                            placeholder="Type custom category..."
                          />
                          <button
                            onClick={() => handleCustomInputCommit(tx.id)}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1 rounded text-[11px] font-semibold shrink-0"
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 w-full">
                          <select
                            value={
                              categories.includes(tx.category)
                                ? tx.category
                                : tx.category && tx.category !== 'Uncategorized'
                                ? 'CUSTOM'
                                : 'Uncategorized'
                            }
                            onChange={(e) => handleCategorySelect(tx.id, e.target.value)}
                            className={`w-full text-xs rounded-xl px-2.5 py-1.5 font-medium border transition-colors focus:ring-2 focus:ring-indigo-500 focus:outline-none ${
                              tx.category && tx.category !== 'Uncategorized'
                                ? 'bg-indigo-950/60 border-indigo-500/40 text-indigo-200'
                                : 'bg-slate-900 border-slate-700 text-slate-400'
                            }`}
                          >
                            <option value="Uncategorized">Uncategorized</option>
                            {categories.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                            <option value="CUSTOM">✏️ Custom Annotation...</option>
                          </select>

                          {!categories.includes(tx.category) &&
                            tx.category &&
                            tx.category !== 'Uncategorized' && (
                              <span
                                onClick={() => {
                                  setEditingId(tx.id);
                                  setCustomTextMap({ ...customTextMap, [tx.id]: tx.category });
                                }}
                                className="bg-purple-900/50 text-purple-200 border border-purple-500/30 text-[10px] px-2 py-0.5 rounded-full cursor-pointer hover:bg-purple-800/50 whitespace-nowrap shrink-0"
                                title="Click to edit custom annotation"
                              >
                                {tx.category}
                              </span>
                            )}
                        </div>
                      )}
                    </td>

                    {/* Exclude as internal transfer */}
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => onToggleExclude(tx.id)}
                        title="Exclude as internal transfer (e.g. transfer to OD account) — keeps it in the balance but out of expense totals"
                        className="text-slate-500 hover:text-amber-400 transition-colors p-1"
                      >
                        <Ban className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Excluded internal transfers — collapsed section */}
      {excludedTransactions.length > 0 && (
        <div className="border-t border-slate-700/60 bg-amber-950/10">
          <button
            onClick={() => setShowExcluded((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold text-amber-300 hover:bg-amber-950/20 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Ban className="w-3.5 h-3.5" />
              Excluded transfers ({excludedTransactions.length})
              <span className="font-normal text-slate-400">
                &mdash; {formatCurrency(excludedTotal)} kept out of expense totals
              </span>
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showExcluded ? 'rotate-180' : ''}`} />
          </button>

          {showExcluded && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[560px]">
                <tbody className="divide-y divide-slate-800/80 text-slate-400">
                  {excludedTransactions.map((tx) => (
                    <tr key={tx.id} className="opacity-70">
                      <td className="py-2 px-3 font-mono whitespace-nowrap w-28">{tx.date || 'N/A'}</td>
                      <td className="py-2 px-3 break-words" title={tx.description}>
                        {tx.description}
                      </td>
                      <td className="py-2 px-3 text-right font-mono whitespace-nowrap w-32 line-through">
                        {formatCurrency(tx.debit - tx.credit)}
                      </td>
                      <td className="py-2 px-3 text-slate-500 whitespace-nowrap max-w-[140px] truncate" title={tx.accountLabel}>
                        {tx.accountLabel}
                      </td>
                      <td className="py-2 px-3 text-right w-24">
                        <button
                          onClick={() => onToggleExclude(tx.id)}
                          className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors"
                          title="Include this transaction back in the totals"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Include
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Pagination Footer */}
      <div className="p-4 border-t border-slate-700/60 bg-slate-800/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
        <div>
          Showing{' '}
          <strong className="text-slate-200">
            {sortedTransactions.length ? (currentPage - 1) * pageSize + 1 : 0}
          </strong>{' '}
          to{' '}
          <strong className="text-slate-200">
            {Math.min(currentPage * pageSize, sortedTransactions.length)}
          </strong>{' '}
          of <strong className="text-slate-200">{sortedTransactions.length}</strong> transactions
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span>
            Page <strong className="text-slate-200">{currentPage}</strong> of{' '}
            <strong className="text-slate-200">{totalPages}</strong>
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
