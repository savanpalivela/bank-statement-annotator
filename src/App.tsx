import { useState, useEffect, useMemo, useRef } from 'react';
import type { Transaction, ColumnMapping, Rule, SummaryData, CategoryStructure, Account } from './types';
import { PRESET_EXPENSE_CATEGORIES, PRESET_INCOME_CATEGORIES, ACCOUNT_COLORS } from './types';
import { Header } from './components/Header';
import { FileUploader } from './components/FileUploader';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { TransactionTable } from './components/TransactionTable';
import { CategoryManagerModal } from './components/CategoryManagerModal';
import { SmartRulesModal } from './components/SmartRulesModal';
import { ColumnMappingModal } from './components/ColumnMappingModal';
import {
  SAMPLE_RAW_DATA,
  DEFAULT_SAMPLE_COLUMNS,
  DEFAULT_SAMPLE_MAPPING,
  parseRawDataToTransactions,
  computeMergedRunningBalance,
} from './utils/sampleData';
import { parseMultipleExcelFiles, parseExcelFileAsNewAccount, exportTransactionsToExcel } from './utils/excelParser';
import type { MultiFileParseResult } from './utils/excelParser';
import { INITIAL_RULES, applyRulesToTransactions } from './utils/ruleEngine';
import { CheckCircle, AlertCircle, Files, AlertTriangle, RotateCcw, PlusCircle, X, Landmark } from 'lucide-react';

const LOCAL_STORAGE_RULES_KEY = 'bank_annotator_smart_rules_v1';
const LOCAL_STORAGE_SESSION_KEY = 'bank_annotator_session_state_v2'; // bumped version for new schema
const LOCAL_STORAGE_CATEGORIES_KEY = 'bank_annotator_categories_v2';

/** Create a short display label from a filename */
function fileNameToLabel(fileName: string, index: number): string {
  const base = fileName.replace(/\.(xlsx|xls)$/i, '');
  return base.length > 24 ? `Account ${index + 1}` : base;
}

export function App() {
  // ── Categories ────────────────────────────────────────────────────────────
  const [categories, setCategories] = useState<CategoryStructure>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_CATEGORIES_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return { expense: PRESET_EXPENSE_CATEGORIES, income: PRESET_INCOME_CATEGORIES };
  });

  // ── Modal open states ─────────────────────────────────────────────────────
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [isMappingModalOpen, setIsMappingModalOpen] = useState<string | null>(null); // accountId
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);

  // ── Rules ─────────────────────────────────────────────────────────────────
  const [rules, setRules] = useState<Rule[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_RULES_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_RULES;
  });

  // ── Accounts: each loaded file/group is an Account ───────────────────────
  const [accounts, setAccounts] = useState<Account[]>([]);

  // ── Transactions (merged across all accounts) ─────────────────────────────
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // ── Legacy single-mapping for column mapping modal (uses active account) ──
  const [isUsingSample, setIsUsingSample] = useState(false);
  const [rejectedFilesList, setRejectedFilesList] = useState<{ fileName: string; reason: string }[]>([]);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  // Ref to avoid double-restore
  const sessionRestoredRef = useRef(false);

  // ── Derived ───────────────────────────────────────────────────────────────
  const allCategories = useMemo(() => {
    return Array.from(new Set([...categories.expense, ...categories.income]));
  }, [categories]);

  const fileName = useMemo(() => {
    if (accounts.length === 0) return '';
    if (accounts.length === 1) return accounts[0].fileName;
    return `${accounts.length} accounts`;
  }, [accounts]);

  // ── Persist categories ────────────────────────────────────────────────────
  useEffect(() => {
    try { localStorage.setItem(LOCAL_STORAGE_CATEGORIES_KEY, JSON.stringify(categories)); } catch {}
  }, [categories]);

  // ── Persist rules ─────────────────────────────────────────────────────────
  useEffect(() => {
    try { localStorage.setItem(LOCAL_STORAGE_RULES_KEY, JSON.stringify(rules)); } catch {}
  }, [rules]);

  // ── Restore session ───────────────────────────────────────────────────────
  useEffect(() => {
    if (sessionRestoredRef.current) return;
    sessionRestoredRef.current = true;
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_SESSION_KEY);
      if (saved) {
        const { accounts: savedAccounts, transactions: savedTxs, isUsingSample: savedSample, rejectedFilesList: savedRejected } = JSON.parse(saved);
        if (savedTxs && savedTxs.length > 0) {
          setAccounts(savedAccounts || []);
          setTransactions(savedTxs);
          setIsUsingSample(!!savedSample);
          setRejectedFilesList(savedRejected || []);
        }
      }
    } catch (e) {
      console.error('Failed to restore session', e);
    }
  }, []);

  // ── Save session ──────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      if (transactions.length > 0) {
        localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify({
          accounts,
          transactions,
          isUsingSample,
          rejectedFilesList,
          timestamp: Date.now(),
        }));
      } else {
        localStorage.removeItem(LOCAL_STORAGE_SESSION_KEY);
      }
    } catch {}
  }, [accounts, transactions, isUsingSample, rejectedFilesList]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const triggerNotification = (message: string, type: 'success' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  /**
   * Re-parse all accounts and merge into a single sorted+running-balance list.
   * Preserves existing category annotations on matching transaction IDs.
   */
  const rebuildTransactions = (
    updatedAccounts: Account[],
    rawDataMap: Map<string, Record<string, any>[]>,
    categoryOverrides?: Map<string, string>
  ): Transaction[] => {
    const all: Transaction[] = [];
    updatedAccounts.forEach((acc) => {
      const rows = rawDataMap.get(acc.id) || [];
      const txs = parseRawDataToTransactions(rows, acc.mapping, acc.id, acc.label);
      txs.forEach((tx) => {
        if (categoryOverrides && categoryOverrides.has(tx.id)) {
          tx.category = categoryOverrides.get(tx.id)!;
        }
        all.push(tx);
      });
    });
    return computeMergedRunningBalance(all);
  };

  // Raw data keyed by accountId (not in state to avoid bloat; rebuilt on each load)
  const rawDataMapRef = useRef<Map<string, Record<string, any>[]>>(new Map());

  // ── Category Handlers ─────────────────────────────────────────────────────
  const handleAddCategory = (type: 'income' | 'expense', newCat: string) => {
    if (!categories[type].includes(newCat)) {
      setCategories((p) => ({ ...p, [type]: [...p[type], newCat] }));
      triggerNotification(`Added ${type} category "${newCat}"`);
    }
  };

  const handleUpdateCategoryName = (type: 'income' | 'expense', oldCat: string, newCat: string) => {
    setCategories((p) => ({ ...p, [type]: p[type].map((c) => (c === oldCat ? newCat : c)) }));
    setTransactions((p) => p.map((tx) => (tx.category === oldCat ? { ...tx, category: newCat } : tx)));
    setRules((p) => p.map((r) => (r.targetCategory === oldCat ? { ...r, targetCategory: newCat } : r)));
    triggerNotification(`Renamed category "${oldCat}" to "${newCat}"`);
  };

  const handleDeleteCategory = (type: 'income' | 'expense', catToDelete: string) => {
    if (catToDelete === 'Uncategorized') return;
    setCategories((p) => ({ ...p, [type]: p[type].filter((c) => c !== catToDelete) }));
    setTransactions((p) => p.map((tx) => (tx.category === catToDelete ? { ...tx, category: 'Uncategorized' } : tx)));
    triggerNotification(`Deleted ${type} category "${catToDelete}"`, 'info');
  };

  // ── Session Reset ─────────────────────────────────────────────────────────
  const handleClearSession = () => {
    setAccounts([]);
    rawDataMapRef.current.clear();
    setTransactions([]);
    setRejectedFilesList([]);
    setIsUsingSample(false);
    localStorage.removeItem(LOCAL_STORAGE_SESSION_KEY);
    triggerNotification('Session cleared successfully!', 'info');
  };

  // ── Demo Sample ───────────────────────────────────────────────────────────
  const handleLoadSampleData = () => {
    const accountId = 'sample-account';
    const accountLabel = 'Sample Account';
    const color = ACCOUNT_COLORS[0];
    const newAccount: Account = {
      id: accountId,
      label: accountLabel,
      fileName: 'sample_bank_statement.xlsx',
      columns: DEFAULT_SAMPLE_COLUMNS,
      mapping: DEFAULT_SAMPLE_MAPPING,
      color,
    };

    rawDataMapRef.current.set(accountId, SAMPLE_RAW_DATA);
    setAccounts([newAccount]);
    setIsUsingSample(true);
    setRejectedFilesList([]);

    const parsed = parseRawDataToTransactions(SAMPLE_RAW_DATA, DEFAULT_SAMPLE_MAPPING, accountId, accountLabel);
    const merged = computeMergedRunningBalance(parsed);
    const { updatedTransactions, matchesCount } = applyRulesToTransactions(merged, rules, false);
    setTransactions(updatedTransactions);

    triggerNotification(`Loaded demo sample (${merged.length} transactions). Auto-categorised ${matchesCount}.`);
  };

  // ── Initial file upload (first account or same-format batch) ──────────────
  const handleMultiFilesParsed = (result: MultiFileParseResult) => {
    if (!result.acceptedResults || result.acceptedResults.length === 0) {
      if (result.rejectedFiles.length > 0) setRejectedFilesList(result.rejectedFiles);
      return;
    }

    // All accepted files share the same format → treated as the same account (batched)
    const firstResult = result.acceptedResults[0];
    const accountId = `acc-${Date.now()}`;
    const accountLabel = result.acceptedResults.length === 1
      ? fileNameToLabel(firstResult.fileName, 0)
      : `Account 1 (${result.acceptedResults.length} files)`;

    const combinedRaw: Record<string, any>[] = [];
    result.acceptedResults.forEach((r) => combinedRaw.push(...r.rawData));
    rawDataMapRef.current.clear();
    rawDataMapRef.current.set(accountId, combinedRaw);

    const newAccount: Account = {
      id: accountId,
      label: accountLabel,
      fileName: result.acceptedResults.length === 1 ? firstResult.fileName : `${result.acceptedResults.length} files`,
      columns: firstResult.columns,
      mapping: firstResult.suggestedMapping,
      color: ACCOUNT_COLORS[0],
    };

    setAccounts([newAccount]);
    setRejectedFilesList(result.rejectedFiles);
    setIsUsingSample(false);

    const parsed = parseRawDataToTransactions(combinedRaw, firstResult.suggestedMapping, accountId, accountLabel);
    const merged = computeMergedRunningBalance(parsed);
    const { updatedTransactions, matchesCount } = applyRulesToTransactions(merged, rules, false);
    setTransactions(updatedTransactions);

    let msg = `Loaded ${result.acceptedResults.length} file(s) as Account 1 (${merged.length} rows). Auto-categorised ${matchesCount}.`;
    if (result.rejectedFiles.length > 0) msg += ` ${result.rejectedFiles.length} file(s) rejected.`;
    triggerNotification(msg, result.rejectedFiles.length > 0 ? 'info' : 'success');
  };

  // ── Add New Account (different format file) ───────────────────────────────
  const handleAddNewAccount = async (file: File) => {
    try {
      const parsed = await parseExcelFileAsNewAccount(file);
      const newIndex = accounts.length;
      const accountId = `acc-${Date.now()}`;
      const accountLabel = fileNameToLabel(file.name, newIndex);
      const color = ACCOUNT_COLORS[newIndex % ACCOUNT_COLORS.length];

      rawDataMapRef.current.set(accountId, parsed.rawData);

      const newAccount: Account = {
        id: accountId,
        label: accountLabel,
        fileName: file.name,
        columns: parsed.columns,
        mapping: parsed.suggestedMapping,
        color,
      };

      const updatedAccounts = [...accounts, newAccount];
      setAccounts(updatedAccounts);

      // Preserve category overrides on existing transactions
      const categoryOverrides = new Map(transactions.map((tx) => [tx.id, tx.category]));
      const merged = rebuildTransactions(updatedAccounts, rawDataMapRef.current, categoryOverrides);
      const { updatedTransactions, matchesCount } = applyRulesToTransactions(merged, rules, false);
      setTransactions(updatedTransactions);

      triggerNotification(`Added new account "${accountLabel}" (${parsed.rawData.length} rows). Auto-categorised ${matchesCount}.`);
      setIsAddAccountOpen(false);
    } catch (err: any) {
      triggerNotification(`Failed to add account: ${err.message}`, 'info');
    }
  };

  // ── Remove an Account ─────────────────────────────────────────────────────
  const handleRemoveAccount = (accountId: string) => {
    const updatedAccounts = accounts.filter((a) => a.id !== accountId);
    rawDataMapRef.current.delete(accountId);
    setAccounts(updatedAccounts);

    if (updatedAccounts.length === 0) {
      setTransactions([]);
    } else {
      const categoryOverrides = new Map(transactions.map((tx) => [tx.id, tx.category]));
      const merged = rebuildTransactions(updatedAccounts, rawDataMapRef.current, categoryOverrides);
      setTransactions(merged);
    }
    triggerNotification('Account removed.', 'info');
  };

  // ── Rename Account ────────────────────────────────────────────────────────
  const handleRenameAccount = (accountId: string, newLabel: string) => {
    const updatedAccounts = accounts.map((a) => a.id === accountId ? { ...a, label: newLabel } : a);
    setAccounts(updatedAccounts);
    setTransactions((prev) => prev.map((tx) => tx.accountId === accountId ? { ...tx, accountLabel: newLabel } : tx));
  };

  // ── Re-apply Column Mapping for an Account ────────────────────────────────
  const handleApplyMapping = (accountId: string, newMapping: ColumnMapping) => {
    const updatedAccounts = accounts.map((a) => a.id === accountId ? { ...a, mapping: newMapping } : a);
    setAccounts(updatedAccounts);
    const categoryOverrides = new Map(transactions.map((tx) => [tx.id, tx.category]));
    const merged = rebuildTransactions(updatedAccounts, rawDataMapRef.current, categoryOverrides);
    setTransactions(merged);
    triggerNotification('Column mapping updated and transactions recalculated.', 'info');
  };

  // ── Inline Category Update ────────────────────────────────────────────────
  const handleUpdateCategory = (id: string, newCategory: string) => {
    if (newCategory && !allCategories.includes(newCategory)) {
      const targetTx = transactions.find((t) => t.id === id);
      const targetType = targetTx && targetTx.debit > 0 ? 'expense' : 'income';
      setCategories((prev) => ({ ...prev, [targetType]: [...prev[targetType], newCategory] }));
    }
    setTransactions((prev) => prev.map((tx) => (tx.id === id ? { ...tx, category: newCategory } : tx)));
  };

  // ── Rule Handlers ─────────────────────────────────────────────────────────
  const handleAddRule = (rule: Rule) => {
    setRules((p) => [rule, ...p]);
    triggerNotification(`Added rule "${rule.name}".`);
  };
  const handleUpdateRule = (updatedRule: Rule) => {
    setRules((p) => p.map((r) => (r.id === updatedRule.id ? updatedRule : r)));
    triggerNotification(`Updated rule "${updatedRule.name}".`);
  };
  const handleDeleteRule = (id: string) => {
    setRules((p) => p.filter((r) => r.id !== id));
    triggerNotification('Rule removed.', 'info');
  };
  const handleToggleRule = (id: string) => {
    setRules((p) => p.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
  };
  const handleRunRules = (overrideExisting: boolean) => {
    if (transactions.length === 0) return;
    const { updatedTransactions, matchesCount } = applyRulesToTransactions(transactions, rules, overrideExisting);
    setTransactions(updatedTransactions);
    triggerNotification(`Rules applied! Updated ${matchesCount} categories.`);
  };

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExport = () => {
    if (transactions.length === 0) return;
    const exportName = `annotated_${fileName || 'bank_statement'}.xlsx`;
    const primaryAccount = accounts[0];
    const categoryCol = primaryAccount?.mapping.categoryCol || 'Category / Annotation';
    exportTransactionsToExcel(transactions, primaryAccount?.columns || [], categoryCol, exportName);
    triggerNotification(`Exported: ${exportName}`);
  };

  // ── Summary Data ──────────────────────────────────────────────────────────
  const summaryData: SummaryData = useMemo(() => {
    let totalIncome = 0, totalExpenses = 0, annotatedCount = 0;
    const expenseCategoryTotals: Record<string, number> = {};
    const incomeCategoryTotals: Record<string, number> = {};

    transactions.forEach((tx) => {
      totalIncome += tx.credit;
      totalExpenses += tx.debit;
      if (tx.category && tx.category !== 'Uncategorized') {
        annotatedCount++;
        if (tx.debit > 0) {
          expenseCategoryTotals[tx.category] = (expenseCategoryTotals[tx.category] || 0) + tx.debit;
        } else if (tx.credit > 0) {
          incomeCategoryTotals[tx.category] = (incomeCategoryTotals[tx.category] || 0) + tx.credit;
        }
      }
    });

    // Merged running balance: first tx balance before its own effect = opening
    const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const firstTx = sorted[0];
    const lastTx = sorted[sorted.length - 1];

    const closingBalance = lastTx?.runningBalance ?? (totalIncome - totalExpenses);
    const openingBalance = firstTx?.runningBalance !== undefined
      ? firstTx.runningBalance - (firstTx.credit - firstTx.debit)
      : 0;

    return {
      totalIncome,
      totalExpenses,
      openingBalance,
      closingBalance,
      netBalance: totalIncome - totalExpenses,
      transactionCount: transactions.length,
      annotatedCount,
      expenseCategoryTotals,
      incomeCategoryTotals,
    };
  }, [transactions]);

  // ── Active mapping for ColumnMappingModal ─────────────────────────────────
  const activeAccount = accounts.find((a) => a.id === isMappingModalOpen);

  // ── Add-Account Dropzone ──────────────────────────────────────────────────
  const addAccountInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Toast */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className="bg-slate-800 border border-indigo-500/50 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs max-w-md">
            {notification.type === 'success'
              ? <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              : <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0" />}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <Header
        fileName={fileName}
        txCount={transactions.length}
        annotatedCount={summaryData.annotatedCount}
        onExport={handleExport}
        onLoadSample={handleLoadSampleData}
        onOpenCategoryManager={() => setIsCategoryModalOpen(true)}
        isUsingSample={isUsingSample}
      />

      {/* Category Manager Modal */}
      <CategoryManagerModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categories={categories}
        onAddCategory={handleAddCategory}
        onUpdateCategory={handleUpdateCategoryName}
        onDeleteCategory={handleDeleteCategory}
      />

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        {transactions.length === 0 ? (
          <div className="max-w-2xl mx-auto py-12">
            <FileUploader
              onMultiFilesParsed={handleMultiFilesParsed}
              onLoadSample={handleLoadSampleData}
              existingBaseColumns={[]}
            />
          </div>
        ) : (
          <>
            {/* ── Accounts Bar ─────────────────────────────────────────────── */}
            <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                  <Landmark className="w-4 h-4 text-indigo-400" />
                  Accounts ({accounts.length})
                  <span className="ml-1 text-slate-500">— {transactions.length} total transactions</span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsAddAccountOpen(true)}
                    className="text-xs bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    Add Another Account
                  </button>
                  <button
                    onClick={handleClearSession}
                    className="text-xs bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 px-3 py-1.5 rounded-xl font-medium flex items-center gap-1 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset
                  </button>
                </div>
              </div>

              {/* Account Cards */}
              <div className="flex flex-wrap gap-2">
                {accounts.map((acc) => {
                  const accTxCount = transactions.filter((tx) => tx.accountId === acc.id).length;
                  return (
                    <div
                      key={acc.id}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium ${acc.color}`}
                    >
                      <Landmark className="w-3.5 h-3.5 shrink-0" />
                      <span className="max-w-[160px] truncate" title={acc.label}>{acc.label}</span>
                      <span className="opacity-60">({accTxCount})</span>
                      <button
                        onClick={() => setIsMappingModalOpen(acc.id)}
                        title="Configure column mapping for this account"
                        className="opacity-60 hover:opacity-100 transition-opacity ml-1"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>
                      </button>
                      {accounts.length > 1 && (
                        <button
                          onClick={() => handleRemoveAccount(acc.id)}
                          title="Remove this account"
                          className="opacity-60 hover:opacity-100 hover:text-rose-400 transition-all ml-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Rejected Files Banner */}
            {rejectedFilesList.length > 0 && (
              <div className="bg-rose-950/60 border border-rose-500/40 rounded-2xl p-4 text-rose-300 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-rose-200">
                    <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                    <span>{rejectedFilesList.length} file(s) rejected:</span>
                  </div>
                  <button onClick={() => setRejectedFilesList([])} className="text-[11px] text-rose-400 hover:text-white underline">Dismiss</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {rejectedFilesList.map((rej, idx) => (
                    <div key={idx} className="bg-slate-900/80 p-2.5 rounded-xl border border-rose-900/60 font-mono text-[11px]">
                      <span className="text-rose-300 font-bold">{rej.fileName}:</span>{' '}
                      <span className="text-rose-200/80">{rej.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Analytics */}
            <AnalyticsDashboard summary={summaryData} />

            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setIsRulesModalOpen(true)}
                className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                Smart Rules
                {rules.length > 0 && (
                  <span className="bg-amber-500/30 text-amber-200 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {rules.filter(r => r.enabled).length}/{rules.length}
                  </span>
                )}
              </button>
              {accounts.map((acc) => (
                <button
                  key={acc.id}
                  onClick={() => setIsMappingModalOpen(acc.id)}
                  className={`flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl border transition-colors ${acc.color}`}
                  title={`Configure mapping for ${acc.label}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>
                  {acc.label}: Mapping
                </button>
              ))}
            </div>

            {/* Transaction Table */}
            <TransactionTable
              transactions={transactions}
              categories={allCategories}
              accounts={accounts}
              onUpdateCategory={handleUpdateCategory}
              onRenameAccount={handleRenameAccount}
            />
          </>
        )}
      </main>

      {/* Smart Rules Modal */}
      <SmartRulesModal
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
        rules={rules}
        categories={allCategories}
        onAddRule={handleAddRule}
        onUpdateRule={handleUpdateRule}
        onDeleteRule={handleDeleteRule}
        onToggleRule={handleToggleRule}
        onRunRules={handleRunRules}
      />

      {/* Column Mapping Modal — per account */}
      {activeAccount && (
        <ColumnMappingModal
          isOpen={!!isMappingModalOpen}
          onClose={() => setIsMappingModalOpen(null)}
          columns={activeAccount.columns}
          mapping={activeAccount.mapping}
          onChangeMapping={(newMapping) => setAccounts((p) => p.map((a) => a.id === activeAccount.id ? { ...a, mapping: newMapping } : a))}
          onApplyMapping={() => handleApplyMapping(activeAccount.id, activeAccount.mapping)}
          accountLabel={activeAccount.label}
        />
      )}

      {/* Add New Account Modal */}
      {isAddAccountOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsAddAccountOpen(false)} />
          <div className="relative z-10 w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-100">Add New Account</h2>
                  <p className="text-xs text-slate-400">Upload a file with any column format</p>
                </div>
              </div>
              <button onClick={() => setIsAddAccountOpen(false)} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700/60 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div
              className="border-2 border-dashed border-slate-600 hover:border-indigo-500/60 bg-slate-800/40 rounded-xl p-8 text-center cursor-pointer transition-all"
              onClick={() => addAccountInputRef.current?.click()}
            >
              <Files className="w-8 h-8 text-indigo-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-200 mb-1">Click to select a file</p>
              <p className="text-xs text-slate-500">Accepts .xlsx and .xls — any column format</p>
              <input
                ref={addAccountInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleAddNewAccount(e.target.files[0]);
                  }
                }}
              />
            </div>

            <p className="text-[11px] text-slate-500 text-center">
              Each account's transactions will be merged and sorted chronologically.<br />
              A merged running balance is computed across all accounts.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
