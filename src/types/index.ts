export interface Transaction {
  id: string;
  originalRowIndex: number;
  date: string;
  description: string;
  credit: number;
  debit: number;
  amount: number; // credit - debit
  type: 'income' | 'expense' | 'neutral';
  category: string;
  runningBalance?: number;
  rawRow: Record<string, any>;
  /** Which account/file this transaction belongs to */
  accountId: string;
  accountLabel: string;
}

export interface Account {
  id: string;
  label: string;      // display name (derived from filename)
  fileName: string;
  columns: string[];
  mapping: ColumnMapping;
  color: string;      // badge color class (tailwind)
}

export type AmountMode = 'single' | 'split';

export interface ColumnMapping {
  dateCol: string;
  descCol: string;
  amountMode: AmountMode;
  amountCol: string;
  debitCol: string;
  creditCol: string;
  balanceCol: string;
  categoryCol: string;
}

export interface Rule {
  id: string;
  name: string;
  field: 'description' | 'amount' | 'date';
  operator: 'contains' | 'equals' | 'startsWith' | 'greaterThan' | 'lessThan';
  value: string;
  targetCategory: string;
  enabled: boolean;
}

export interface CategoryStructure {
  income: string[];
  expense: string[];
}

export interface SummaryData {
  totalIncome: number; // Sum of ALL Credit values
  totalExpenses: number; // Sum of ALL Debit values
  openingBalance: number;
  closingBalance: number;
  netBalance: number; // totalIncome - totalExpenses
  transactionCount: number;
  annotatedCount: number;
  expenseCategoryTotals: Record<string, number>;
  incomeCategoryTotals: Record<string, number>;
}

// Preset color palette for accounts (Tailwind utility strings)
export const ACCOUNT_COLORS: string[] = [
  'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
  'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  'bg-amber-500/20 text-amber-300 border-amber-500/40',
  'bg-rose-500/20 text-rose-300 border-rose-500/40',
  'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  'bg-purple-500/20 text-purple-300 border-purple-500/40',
  'bg-orange-500/20 text-orange-300 border-orange-500/40',
  'bg-teal-500/20 text-teal-300 border-teal-500/40',
];

export const PRESET_EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Groceries',
  'Shopping',
  'Utilities & Bills',
  'Housing & Rent',
  'Transportation & Fuel',
  'Entertainment & Subscriptions',
  'Healthcare & Medical',
  'Business & Supplies',
  'Personal Care',
  'Uncategorized',
];

export const PRESET_INCOME_CATEGORIES = [
  'Income & Salary',
  'Freelance & Side Income',
  'Investments & Dividends',
  'Refunds & Cashbacks',
  'Other Income',
  'Uncategorized',
];
